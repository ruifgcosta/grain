/**
 * Job generateSummaries — corre a cada minuto via Cloudflare Cron Trigger.
 *
 * Processa 1 artigo por execução:
 * 1. Busca o artigo mais recente sem resumo
 * 2. Tenta obter texto completo via Jina.ai Reader
 * 3. Gera resumo detalhado com Gemini
 * 4. Guarda em ai_summaries → artigo fica visível no feed
 *
 * Ritmo: 1/minuto = 60/hora = 1440/dia (bem abaixo do limite de 1500 RPD do Gemini 2.0 Flash)
 * Se Gemini devolver 429, o artigo é saltado e tentado no próximo minuto.
 */

import { fetchArticleText } from '../services/scraper';
import { generateSummaryBatch, generateSummary } from '../services/gemini';
import type { Env } from '../types/index';

export async function runGenerateSummaries(env: Env): Promise<void> {
  // Buscar 1 artigo sem resumo, do mais recente para o mais antigo
  const article = await env.DB
    .prepare(`
      SELECT a.id, a.original_url,
             a.translated_title, a.original_title,
             a.translated_desc,  a.original_desc
      FROM articles a
      LEFT JOIN ai_summaries ai ON ai.article_id = a.id
      WHERE ai.article_id IS NULL
        AND a.expires_at > unixepoch()
      ORDER BY a.published_at DESC
      LIMIT 1
    `)
    .first<{
      id: string;
      original_url: string;
      translated_title: string | null;
      original_title: string;
      translated_desc: string | null;
      original_desc: string | null;
    }>();

  if (!article) {
    // Nada para resumir
    return;
  }

  console.log(`[grain/summaries] A processar: ${article.id} — ${article.translated_title ?? article.original_title}`);

  try {
    // 1. Tentar obter texto completo via Jina.ai (timeout de 12s)
    const fullText = await fetchArticleText(article.original_url, env.JINA_API_KEY || undefined);

    // 2. Construir texto para o resumo
    const rssText = [
      article.translated_title ?? article.original_title,
      article.translated_desc  ?? article.original_desc ?? '',
    ].join('\n\n').trim();

    const textForSummary = fullText.length > 200 ? fullText : rssText;

    // 3. Saltar artigos com texto insuficiente para um resumo de qualidade
    //    (ex: artigos paywalled cujo RSS só tem o título)
    if (textForSummary.length < 80) {
      console.warn(`[grain/summaries] Texto insuficiente (${textForSummary.length} chars), a saltar: ${article.id}`);
      // Inserir placeholder para não tentar de novo continuamente
      const now = Math.floor(Date.now() / 1000);
      await env.DB
        .prepare('INSERT OR REPLACE INTO ai_summaries (article_id, summary, created_at) VALUES (?, ?, ?)')
        .bind(article.id, rssText || (article.translated_title ?? article.original_title), now)
        .run();
      return;
    }

    // 4. Gerar resumo — tentar 2.0-flash primeiro, cair para 2.5-flash em caso de 429
    let summary: string;
    try {
      summary = await generateSummaryBatch(textForSummary, env.GEMINI_API_KEY);
    } catch (err) {
      const msg = (err as Error).message ?? '';
      if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
        // Quota do 2.0-flash esgotada → fallback para 2.5-flash
        console.warn(`[grain/summaries] 2.0-flash quota esgotada, a usar 2.5-flash para: ${article.id}`);
        summary = await generateSummary(textForSummary, env.GEMINI_API_KEY);
      } else {
        throw err;
      }
    }

    // 5. Guardar na DB
    const now = Math.floor(Date.now() / 1000);
    await env.DB
      .prepare('INSERT OR REPLACE INTO ai_summaries (article_id, summary, created_at) VALUES (?, ?, ?)')
      .bind(article.id, summary, now)
      .run();

    // 6. Invalidar cache para que o artigo apareça imediatamente no feed
    await Promise.all([
      env.CACHE.delete('stories:default'),
      env.CACHE.delete('stories:null'),
    ]);

    console.log(`[grain/summaries] ✓ ${article.id} (${summary.length} chars)`);
  } catch (err) {
    const msg = (err as Error).message ?? String(err);
    console.error(`[grain/summaries] ✗ ${article.id}: ${msg}`);
  }
}
