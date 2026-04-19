/**
 * Job fetchFeeds — corre a cada 30 minutos via Cloudflare Cron Trigger.
 *
 * Fluxo completo por execução:
 * 1. Busca todas as fontes activas na D1
 * 2. Para cada fonte (em paralelo controlado):
 *    a. Fetch RSS + parse de artigos
 *    b. Filtra URLs já existentes na D1 (deduplicação por URL)
 *    c. Traduz artigos novos em batch via Gemini (só os não-PT)
 *    d. Gera embeddings em batch via Gemini
 *    e. Insere artigos + embeddings na D1 (em transacção)
 *    f. Actualiza cache KV da fonte
 *    g. Regista resultado em fetch_log
 *
 * Limites considerados:
 * - Workers: 30s de CPU time no free plan
 * - Gemini: 15 req/min → processamos fontes sequencialmente para não estourar
 * - D1: batch inserts para minimizar round-trips
 */

import { fetchRSSFeed, parseArticles, type RawArticle } from '../services/rss';
import { translateBatch, generateEmbeddingsBatch, type TranslateItem } from '../services/gemini';
import type { Env } from '../types/index';

// Dias de TTL para artigos normais (convertido depois para timestamp)
const ARTICLE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 dias em segundos

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface SourceRow {
  id: string;
  name: string;
  rss_url: string;
  language: string;
}

interface FetchResult {
  source_id: string;
  articles_new: number;
  articles_dup: number;
  status: 'ok' | 'error';
  error_msg: string | null;
}

// ─── Utilitários ─────────────────────────────────────────────────────────────

/**
 * Gera um ID único para registos de fetch_log e follow_matches.
 * Usa crypto.randomUUID() disponível nativamente no Workers runtime.
 */
function newId(): string {
  return crypto.randomUUID();
}

/**
 * Divide um array em chunks de tamanho máximo `size`.
 * Usado para processar embeddings em lotes (máximo 100 por pedido Gemini).
 */
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ─── Processamento de uma fonte ───────────────────────────────────────────────

/**
 * Processa uma única fonte RSS:
 * fetch → parse → dedup → tradução → embeddings → inserção → KV.
 *
 * @param source  - Dados da fonte (id, rss_url, language)
 * @param env     - Bindings do Worker (DB, CACHE, variáveis)
 * @returns Resultado com contagens de artigos novos/duplicados
 */
async function processSource(source: SourceRow, env: Env): Promise<FetchResult> {
  const now = Math.floor(Date.now() / 1000);
  const ttlDays = parseInt(env.ARTICLE_TTL_DAYS) || 7;
  const expiresAt = now + ttlDays * 24 * 60 * 60;

  try {
    // ── 1. Fetch e parse do feed ──────────────────────────────────────────────
    const xml = await fetchRSSFeed(source.rss_url);
    const rawArticles = parseArticles(xml, source.id);

    if (rawArticles.length === 0) {
      return { source_id: source.id, articles_new: 0, articles_dup: 0, status: 'ok', error_msg: null };
    }

    // ── 2. Deduplicação por URL — filtrar o que já existe na D1 ──────────────
    // Construímos lista de URLs candidatas e verificamos na D1 em batch
    const candidateUrls = rawArticles.map(a => a.original_url);

    // Placeholders para a query: (?,?,?,...) até 100 de cada vez
    const existingUrls = new Set<string>();

    for (const urlChunk of chunk(candidateUrls, 50)) {
      const placeholders = urlChunk.map(() => '?').join(',');
      // Query: buscar URLs que já existem na D1
      const { results } = await env.DB
        .prepare(`SELECT original_url FROM articles WHERE original_url IN (${placeholders})`)
        .bind(...urlChunk)
        .all<{ original_url: string }>();

      results.forEach(r => existingUrls.add(r.original_url));
    }

    // Manter apenas artigos novos (URL não existe ainda)
    const newArticles = rawArticles.filter(a => !existingUrls.has(a.original_url));
    const dupCount = rawArticles.length - newArticles.length;

    // ── 2b. Actualizar image_url de artigos já existentes que não tinham imagem ─
    // Necessário para corrigir artigos importados antes do fallback de imagem HTML.
    const toUpdateImage = rawArticles.filter(
      a => existingUrls.has(a.original_url) && a.image_url !== null
    );
    if (toUpdateImage.length > 0) {
      const imgStmts = toUpdateImage.map(a =>
        env.DB
          .prepare('UPDATE articles SET image_url = ? WHERE original_url = ? AND image_url IS NULL')
          .bind(a.image_url, a.original_url)
      );
      for (const stmtChunk of chunk(imgStmts, 100)) {
        await env.DB.batch(stmtChunk);
      }
    }

    if (newArticles.length === 0) {
      return { source_id: source.id, articles_new: 0, articles_dup: dupCount, status: 'ok', error_msg: null };
    }

    // ── 3. Tradução batch (só artigos não-PT) ─────────────────────────────────
    const toTranslate: TranslateItem[] = newArticles
      .filter(() => source.language !== 'pt')  // Artigos PT não precisam tradução
      .map(a => ({ id: a.id, title: a.original_title, desc: a.original_desc }));

    // Mapa id → tradução para lookup rápido depois
    const translationsMap = new Map<string, { title: string; desc: string | null }>();

    if (toTranslate.length > 0) {
      // Processar em chunks de 20 para não sobrecarregar o prompt
      for (const translationChunk of chunk(toTranslate, 20)) {
        const translations = await translateBatch(translationChunk, env.GEMINI_API_KEY);
        translations.forEach(t => {
          translationsMap.set(t.id, {
            title: t.translated_title,
            desc: t.translated_desc,
          });
        });
      }
    }

    // ── 4. Embeddings batch ───────────────────────────────────────────────────
    // Usar título + descrição traduzidos (ou originais se PT) para o embedding.
    // Truncar a 500 chars para evitar erros 400 da Gemini em textos muito longos.
    const textsForEmbedding = newArticles.map(a => {
      const translation = translationsMap.get(a.id);
      const title = translation?.title ?? a.original_title;
      const desc  = translation?.desc  ?? a.original_desc ?? '';
      return `${title} ${desc}`.slice(0, 500);
    });

    const embeddingsMap = new Map<string, number[]>();

    // Gemini suporta até 100 textos por pedido de batch embeddings
    for (const [i, embChunk] of chunk(textsForEmbedding, 100).entries()) {
      const startIdx = i * 100;
      const embeddings = await generateEmbeddingsBatch(embChunk, env.GEMINI_API_KEY);
      embeddings.forEach((emb, j) => {
        embeddingsMap.set(newArticles[startIdx + j].id, emb);
      });
    }

    // ── 5. Inserção na D1 ─────────────────────────────────────────────────────
    // Usar batch statements para minimizar round-trips
    const articleStmts = newArticles.map(a => {
      const translation = translationsMap.get(a.id);

      return env.DB
        .prepare(`
          INSERT OR IGNORE INTO articles
            (id, source_id, original_url, original_title, original_desc,
             translated_title, translated_desc, image_url, language, tag,
             published_at, fetched_at, expires_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          a.id,
          a.source_id,
          a.original_url,
          a.original_title,
          a.original_desc,
          translation?.title ?? a.original_title,   // fallback para original se não traduzido
          translation?.desc ?? a.original_desc,
          a.image_url,
          source.language,
          a.tag,
          a.published_at,
          now,
          expiresAt
        );
    });

    const embeddingStmts = newArticles
      .filter(a => embeddingsMap.has(a.id))
      .map(a => {
        const embedding = embeddingsMap.get(a.id)!;
        return env.DB
          .prepare(`
            INSERT OR IGNORE INTO article_embeddings (article_id, embedding, created_at)
            VALUES (?, ?, ?)
          `)
          .bind(a.id, JSON.stringify(embedding), now);
      });

    // Executar todos os inserts em batch (D1 suporta até 100 statements por batch)
    const allStmts = [...articleStmts, ...embeddingStmts];
    for (const stmtChunk of chunk(allStmts, 100)) {
      await env.DB.batch(stmtChunk);
    }

    // ── 6. Actualizar cache KV ────────────────────────────────────────────────
    // Invalidar a cache desta fonte para forçar reload no próximo pedido
    // (a cache é reconstruída lazy na rota /api/feed)
    await env.CACHE.delete(`feed:${source.id}`);
    await env.CACHE.delete('feed:global');
    // Invalidar cache de stories (24h) — artigos novos podem aparecer no rail
    await env.CACHE.delete('stories:default');

    console.log(`[grain/fetchFeeds] ${source.id}: +${newArticles.length} novos, ${dupCount} dup`);

    return {
      source_id: source.id,
      articles_new: newArticles.length,
      articles_dup: dupCount,
      status: 'ok',
      error_msg: null,
    };

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[grain/fetchFeeds] Erro na fonte ${source.id}:`, errorMsg);

    return {
      source_id: source.id,
      articles_new: 0,
      articles_dup: 0,
      status: 'error',
      error_msg: errorMsg.slice(0, 500),
    };
  }
}

// ─── Job principal ────────────────────────────────────────────────────────────

/**
 * Executa o job de fetch de todos os feeds activos.
 * Chamado pelo handler `scheduled` no index.ts a cada 30 minutos.
 *
 * @param env - Bindings do Worker
 */
export async function runFetchFeeds(env: Env): Promise<void> {
  const startedAt = Date.now();
  console.log('[grain/fetchFeeds] A iniciar fetch de feeds —', new Date().toISOString());

  // ── Corrigir URLs de imagens com &amp; (backfill incremental) ──────────────
  // Guardian e outros feeds em XML codificam &amp; no URL do atributo.
  // Corremos um UPDATE barato a cada execução — o WHERE garante que só afecta
  // as linhas que realmente têm o problema (normalmente zero após a primeira corrida).
  await env.DB
    .prepare("UPDATE articles SET image_url = REPLACE(image_url, '&amp;', '&') WHERE image_url LIKE '%&amp;%'")
    .run();

  // ── Buscar fontes activas ──────────────────────────────────────────────────
  const { results: sources } = await env.DB
    .prepare('SELECT id, name, rss_url, language FROM sources WHERE is_active = 1')
    .all<SourceRow>();

  if (sources.length === 0) {
    console.log('[grain/fetchFeeds] Nenhuma fonte activa encontrada');
    return;
  }

  console.log(`[grain/fetchFeeds] ${sources.length} fontes activas para processar`);

  // ── Processar fontes sequencialmente ──────────────────────────────────────
  // Sequencial (não paralelo) para respeitar o rate limit do Gemini (15 req/min).
  // Cada fonte faz 2 pedidos Gemini (tradução + embeddings) → 10 fontes = 20 req
  // em ~2 minutos → dentro do limite.
  const results: FetchResult[] = [];

  for (const source of sources) {
    const result = await processSource(source, env);
    results.push(result);

    // Pausa mínima entre fontes — o rate limiting é gerido pelo throttler em gemini.ts.
    if (sources.indexOf(source) < sources.length - 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // ── Registar resultados no fetch_log ──────────────────────────────────────
  const now = Math.floor(Date.now() / 1000);
  const logStmts = results.map(r =>
    env.DB
      .prepare(`
        INSERT INTO fetch_log (id, source_id, fetched_at, articles_new, articles_dup, status, error_msg)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(newId(), r.source_id, now, r.articles_new, r.articles_dup, r.status, r.error_msg)
  );

  if (logStmts.length > 0) {
    await env.DB.batch(logStmts);
  }

  // ── Sumário final ─────────────────────────────────────────────────────────
  const totalNew = results.reduce((s, r) => s + r.articles_new, 0);
  const totalDup = results.reduce((s, r) => s + r.articles_dup, 0);
  const errors   = results.filter(r => r.status === 'error').length;
  const elapsed  = ((Date.now() - startedAt) / 1000).toFixed(1);

  console.log(
    `[grain/fetchFeeds] Concluído em ${elapsed}s — ` +
    `${totalNew} novos, ${totalDup} duplicados, ${errors} erros`
  );
}
