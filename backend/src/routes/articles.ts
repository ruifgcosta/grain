/**
 * Rotas de artigos:
 * - GET /api/articles/:id/summary — resumo IA on-demand (cache permanente)
 */

import { Hono } from 'hono';
import type { Env } from '../types/index';
import { generateSummary } from '../services/gemini';

type Variables = {
  userId?: string;
  isAdmin?: boolean;
};

const articlesRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * GET /api/articles/:id/summary
 *
 * Fluxo:
 * 1. Verificar se já existe resumo em ai_summaries → devolver imediatamente
 * 2. Se não existe → buscar artigo em D1 → gerar resumo via Gemini
 * 3. Guardar resumo em ai_summaries (permanente — partilhado entre utilizadores)
 * 4. Devolver resumo
 *
 * Sem autenticação obrigatória — resumos são públicos (qualquer um pode pedir).
 * O custo Gemini é amortizado: o primeiro utilizador paga, todos os outros recebem do cache.
 */
articlesRouter.get('/:id/summary', async (c) => {
  const articleId = c.req.param('id');

  // ── 1. Verificar cache permanente ─────────────────────────────────────────
  const cached = await c.env.DB
    .prepare('SELECT summary FROM ai_summaries WHERE article_id = ?')
    .bind(articleId)
    .first<{ summary: string }>();

  if (cached) {
    return c.json({ summary: cached.summary, cached: true });
  }

  // ── 2. Buscar artigo ──────────────────────────────────────────────────────
  const article = await c.env.DB
    .prepare(`
      SELECT translated_title, translated_desc, original_title, original_desc
      FROM articles WHERE id = ?
    `)
    .bind(articleId)
    .first<{
      translated_title: string | null;
      translated_desc: string | null;
      original_title: string;
      original_desc: string | null;
    }>();

  if (!article) {
    return c.json({ error: 'Artigo não encontrado' }, 404);
  }

  // Usar título/descrição traduzidos se disponíveis, fallback para originais
  const title = article.translated_title ?? article.original_title;
  const desc  = article.translated_desc  ?? article.original_desc ?? '';
  const text  = `${title}\n\n${desc}`.trim();

  // ── 3. Gerar resumo via Gemini ────────────────────────────────────────────
  let summary: string;
  try {
    summary = await generateSummary(text, c.env.GEMINI_API_KEY);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[grain/articles] Erro ao gerar resumo para ${articleId}:`, msg);
    // Passar a mensagem real para o frontend — distingue rate-limit de outros erros
    return c.json({ error: msg }, 503);
  }

  // ── 4. Guardar resumo permanente ─────────────────────────────────────────
  const now = Math.floor(Date.now() / 1000);
  await c.env.DB
    .prepare('INSERT OR IGNORE INTO ai_summaries (article_id, summary, created_at) VALUES (?, ?, ?)')
    .bind(articleId, summary, now)
    .run();

  // Invalidar cache do feed para reflectir has_summary = 1
  await c.env.CACHE.delete(`feed:default:${Math.floor(Date.now() / 1000)}`);

  return c.json({ summary, cached: false });
});

export { articlesRouter };
