/**
 * Serviço Gemini — integração com a Google Gemini API.
 *
 * Funções disponíveis:
 * - translateBatch:        traduz N artigos de uma vez (1 pedido)
 * - generateEmbeddingsBatch: gera embeddings para N textos (1 pedido)
 * - generateSummary:       resumo de um artigo até 250 palavras
 * - extractTopic:          extrai tema de um artigo em 3-5 palavras
 *
 * Modelos usados:
 * - Geração de texto:  gemini-2.0-flash (rápido, eficiente, grátis)
 * - Embeddings:        text-embedding-004 (768 dimensões, grátis)
 *
 * Rate limiting: 15 req/min no free tier — o código respeita isso
 * agrupando pedidos em batch.
 */

// ─── Constantes ───────────────────────────────────────────────────────────────

// v1  — stable endpoint; gemini-2.0-flash disponível aqui (1500 RPD free tier)
// v1beta — preview endpoint; gemini-2.5-flash + batchEmbedContents disponíveis aqui
const GEMINI_V1    = 'https://generativelanguage.googleapis.com/v1';
const GEMINI_V1B   = 'https://generativelanguage.googleapis.com/v1beta';

// Operações de cron/batch: gemini-2.0-flash no v1 (1500 req/dia free tier)
const MODEL_BATCH  = 'gemini-2.0-flash';
// Resumos on-demand: gemini-2.5-flash no v1beta (250 req/dia, mas alta qualidade)
const MODEL_FAST   = 'gemini-2.5-flash';
// Embeddings: modelo dedicado, quota própria separada
const MODEL_EMBED  = 'gemini-embedding-001';

// ─── Tipos internos ───────────────────────────────────────────────────────────

/** Item a traduzir — título e descrição opcionais */
export interface TranslateItem {
  id: string;
  title: string;
  desc: string | null;
}

/** Resultado da tradução de um artigo */
export interface TranslatedItem {
  id: string;
  translated_title: string;
  translated_desc: string | null;
}

// ─── Rate limiter ─────────────────────────────────────────────────────────────

// Rastreamento de pedidos para auto-throttling (15 RPM free tier).
// Workers são single-threaded — este estado é partilhado dentro do mesmo isolate.
const _reqTimestamps: number[] = [];
const RATE_WINDOW_MS = 60_000;
const MAX_REQ_PER_MIN = 8;  // conservador: 8 de 10 RPM free tier — reserva margem para on-demand

async function throttleGemini(): Promise<void> {
  const now = Date.now();
  // Descartar timestamps fora da janela de 1 minuto
  while (_reqTimestamps.length > 0 && now - _reqTimestamps[0] >= RATE_WINDOW_MS) {
    _reqTimestamps.shift();
  }

  if (_reqTimestamps.length >= MAX_REQ_PER_MIN) {
    // Aguardar até o timestamp mais antigo sair da janela
    const waitMs = RATE_WINDOW_MS - (now - _reqTimestamps[0]) + 500;
    console.log(`[grain/gemini] Throttle — ${_reqTimestamps.length} pedidos/min, a aguardar ${waitMs}ms`);
    await new Promise(r => setTimeout(r, waitMs));
    // Limpar timestamps expirados após a espera
    const after = Date.now();
    while (_reqTimestamps.length > 0 && after - _reqTimestamps[0] >= RATE_WINDOW_MS) {
      _reqTimestamps.shift();
    }
  }

  _reqTimestamps.push(Date.now());
}

// ─── Fetch rápido para pedidos on-demand (sem rate limiter) ──────────────────

/**
 * Versão rápida do geminiPost — SEM rate limiter, com timeout de 20s por tentativa.
 * Usada para resumos on-demand iniciados pelo utilizador.
 *
 * Em caso de 429, lê o header Retry-After (ou espera 8s) e tenta uma vez mais.
 * Orçamento total: 12s espera máx + 20s timeout = 32s → dentro do limite Cloudflare
 * porque o timer de abort só conta o tempo de rede, não a espera.
 */
async function geminiPostFast(url: string, body: unknown, apiKey: string): Promise<unknown> {
  const fullUrl = `${url}?key=${apiKey}`;

  for (let attempt = 0; attempt < 2; attempt++) {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);

    try {
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });

      if (response.status === 429) {
        if (attempt === 0) {
          // Usar o Retry-After do Gemini se disponível, senão esperar 8s
          const retryAfter = parseInt(response.headers.get('Retry-After') ?? '8', 10);
          const waitMs = Math.min(retryAfter * 1000, 12000); // máx 12s
          console.warn(`[grain/gemini] geminiPostFast 429 — a aguardar ${waitMs}ms para retry`);
          await new Promise(r => setTimeout(r, waitMs));
          continue;
        }
        throw new Error('Serviço temporariamente sobrecarregado. Aguarda 1 minuto e tenta de novo.');
      }

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Gemini ${response.status}: ${text.slice(0, 200)}`);
      }

      return response.json();
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        throw new Error('O resumo demorou demasiado — tenta de novo.');
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error('Serviço temporariamente sobrecarregado. Aguarda 1 minuto e tenta de novo.');
}

// ─── Utilitário de fetch com retry ────────────────────────────────────────────

/**
 * Faz um pedido à Gemini API com throttling automático e retry em caso de 429.
 * O throttler limita a 13 pedidos/minuto para respeitar o free tier (15 RPM).
 *
 * @param url - URL completo do endpoint Gemini
 * @param body - Corpo do pedido JSON
 * @param apiKey - Chave de API Gemini
 */
async function geminiPost(
  url: string,
  body: unknown,
  apiKey: string
): Promise<unknown> {
  await throttleGemini();

  const fullUrl = `${url}?key=${apiKey}`;

  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    // Rate limit residual — esperar e tentar de novo
    if (response.status === 429) {
      const waitMs = (attempt + 1) * 15000; // 15s, 30s, 45s
      console.warn(`[grain/gemini] Rate limit (429) — a aguardar ${waitMs}ms`);
      await new Promise(r => setTimeout(r, waitMs));
      continue;
    }

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini API erro ${response.status}: ${err.slice(0, 200)}`);
    }

    return response.json();
  }

  throw new Error('Gemini API: máximo de retries atingido (rate limit persistente)');
}

// ─── Tradução batch ───────────────────────────────────────────────────────────

/**
 * Traduz um array de artigos para Português Europeu num único pedido Gemini.
 *
 * Estratégia: envia todos os títulos e descrições num único prompt estruturado.
 * O modelo devolve JSON com os mesmos IDs — mapeamento garantido.
 *
 * Artigos já em português (language === 'pt') são ignorados — o caller
 * deve filtrar antes de chamar esta função.
 *
 * @param items - Array de artigos a traduzir
 * @param apiKey - Chave de API Gemini
 * @returns Array com as traduções, na mesma ordem dos items de entrada
 */
export async function translateBatch(
  items: TranslateItem[],
  apiKey: string
): Promise<TranslatedItem[]> {
  if (items.length === 0) return [];

  // Construir o payload para o modelo
  // Formato JSON estruturado para parsing fiável da resposta
  const articlesJson = JSON.stringify(
    items.map(i => ({
      id: i.id,
      title: i.title,
      desc: i.desc ?? '',
    }))
  );

  const prompt = `Traduz os seguintes artigos de notícias para Português Europeu de Portugal.
Mantém o mesmo tom jornalístico. Não adiciones informação. Não uses expressões brasileiras.
Devolve APENAS um array JSON válido com esta estrutura exacta, sem markdown nem explicações:
[{"id":"...","title":"...","desc":"..."}]

Artigos a traduzir:
${articlesJson}`;

  const responseData = await geminiPost(
    `${GEMINI_V1}/models/${MODEL_BATCH}:generateContent`,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        maxOutputTokens: 8192,
      },
    },
    apiKey
  ) as { candidates: Array<{ content: { parts: Array<{ text: string }> } }> };

  // Extrair o texto da resposta
  const rawText = responseData.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';

  let translated: Array<{ id: string; title: string; desc: string }>;
  try {
    translated = JSON.parse(rawText);
  } catch {
    console.error('[grain/gemini] translateBatch: resposta JSON inválida:', rawText.slice(0, 200));
    // Fallback: devolver títulos originais sem tradução
    return items.map(i => ({
      id: i.id,
      translated_title: i.title,
      translated_desc: i.desc,
    }));
  }

  // Mapear por ID para garantir a correspondência correcta
  const translatedMap = new Map(translated.map(t => [t.id, t]));

  return items.map(i => {
    const t = translatedMap.get(i.id);
    return {
      id: i.id,
      translated_title: t?.title ?? i.title,
      translated_desc: t?.desc || i.desc,
    };
  });
}

// ─── Embeddings batch ─────────────────────────────────────────────────────────

/**
 * Gera embeddings para um array de textos num único pedido Gemini.
 *
 * Usa o modelo text-embedding-004 (768 dimensões).
 * Os embeddings são guardados como JSON serializado na base de dados.
 *
 * @param texts - Array de strings a vectorizar
 * @param apiKey - Chave de API Gemini
 * @returns Array de vectores float, na mesma ordem dos textos de entrada
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  apiKey: string
): Promise<number[][]> {
  if (texts.length === 0) return [];

  // A API de embeddings suporta batchEmbedContents para múltiplos textos
  const responseData = await geminiPost(
    `${GEMINI_V1B}/models/${MODEL_EMBED}:batchEmbedContents`,
    {
      requests: texts.map(text => ({
        model: `models/${MODEL_EMBED}`,
        content: { parts: [{ text }] },
        taskType: 'SEMANTIC_SIMILARITY', // Optimizar para similaridade cosseno
      })),
    },
    apiKey
  ) as { embeddings: Array<{ values: number[] }> };

  if (!responseData.embeddings) {
    throw new Error('Gemini batchEmbedContents: resposta sem campo embeddings');
  }

  return responseData.embeddings.map(e => e.values);
}

// ─── Resumo IA ────────────────────────────────────────────────────────────────

/**
 * Gera um resumo em Português Europeu de um artigo completo.
 *
 * O resumo é gerado on-demand (quando o utilizador carrega em "summary")
 * e guardado permanentemente em ai_summaries para partilhar entre utilizadores.
 *
 * @param text - Texto completo do artigo (título + descrição ou body)
 * @param apiKey - Chave de API Gemini
 * @returns Resumo em PT-PT com no máximo 250 palavras
 */
export async function generateSummary(
  text: string,
  apiKey: string
): Promise<string> {
  // Limitar o input para não aumentar a latência (título + descrição já são suficientes)
  const trimmedText = text.slice(0, 800);

  const prompt = `Resume em 3-4 frases curtas em Português Europeu. Sê directo e factual. Sem bullet points.

${trimmedText}`;

  const responseData = await geminiPostFast(
    `${GEMINI_V1B}/models/${MODEL_FAST}:generateContent`,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 350,  // ~80 palavras — gera muito mais rápido
      },
    },
    apiKey
  ) as { candidates: Array<{ content: { parts: Array<{ text: string }> } }> };

  const summary = responseData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!summary) throw new Error('Gemini generateSummary: resposta vazia');

  return summary;
}

// ─── Resumo batch (cron) ──────────────────────────────────────────────────────

/**
 * Gera resumo em PT-PT a partir de texto completo do artigo.
 * Versão para uso em cron (batch) — usa gemini-2.0-flash com rate limiter.
 * Ao contrário de generateSummary (on-demand), esta função não tem timeout agressivo.
 *
 * @param fullText - Texto completo extraído via Jina.ai (até 4000 chars)
 * @param apiKey   - Chave de API Gemini
 * @returns Resumo em PT-PT com 3-4 frases
 */
export async function generateSummaryBatch(
  fullText: string,
  apiKey: string
): Promise<string> {
  const prompt = `Resume em 3-4 frases em Português Europeu de Portugal. Sê directo e factual. Sem bullet points. Sem frases introdutórias como "O artigo fala sobre" ou "Este artigo descreve".

${fullText.slice(0, 4000)}`;

  const responseData = await geminiPost(
    `${GEMINI_V1}/models/${MODEL_BATCH}:generateContent`,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 350,
      },
    },
    apiKey
  ) as { candidates: Array<{ content: { parts: Array<{ text: string }> } }> };

  const summary = responseData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!summary) throw new Error('Gemini generateSummaryBatch: resposta vazia');
  return summary;
}

// ─── Extracção de tema ────────────────────────────────────────────────────────

/**
 * Extrai o tema central de um artigo em 3-5 palavras PT-PT.
 *
 * Usado quando o utilizador carrega em "+ follow" num artigo.
 * O tema extraído é depois vectorizado com generateEmbeddingsBatch
 * para fazer o matching semântico com artigos futuros.
 *
 * @param text - Título e/ou descrição do artigo
 * @param apiKey - Chave de API Gemini
 * @returns Tema em 3-5 palavras em PT-PT (ex: "inteligência artificial europa")
 */
export async function extractTopic(
  text: string,
  apiKey: string
): Promise<string> {
  const prompt = `Extrai o tema central deste artigo em 3 a 5 palavras em Português Europeu. Responde apenas com o tema, sem pontuação, em minúsculas.

${text}`;

  const responseData = await geminiPost(
    `${GEMINI_V1}/models/${MODEL_BATCH}:generateContent`,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 512,
      },
    },
    apiKey
  ) as { candidates: Array<{ content: { parts: Array<{ text: string }> } }> };

  const topic = responseData.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase();
  if (!topic) throw new Error('Gemini extractTopic: resposta vazia');

  return topic;
}
