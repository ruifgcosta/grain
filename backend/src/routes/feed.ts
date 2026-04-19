/**
 * Rota GET /api/feed
 *
 * Devolve artigos paginados ordenados por published_at DESC.
 *
 * Estratégia de cache:
 * - KV-first: cache de 5 minutos por chave feed:{userId|default}:{cursor}
 * - Se KV vazio ou expirado → D1 → guarda em KV
 *
 * Filtro de fontes:
 * - Visitante (sem auth): is_default = 1
 * - Autenticado: is_default = 1 + fontes activadas em user_sources
 *
 * Paginação por cursor:
 * - Parâmetro ?before={published_at} (timestamp Unix)
 * - Devolve PAGE_SIZE artigos com published_at < before
 * - has_more = true se existirem mais artigos
 */

import { Hono } from 'hono';
import type { Env } from '../types/index';
import type { ArticleWithSource, FeedResponse } from '../types/index';
import { optionalAuth } from '../middleware/auth';

// Artigos por página
const PAGE_SIZE = 20;

// TTL do cache KV em segundos (5 minutos)
const CACHE_TTL = 5 * 60;

type Variables = {
  userId?: string;
  isAdmin?: boolean;
};

const feedRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * GET /api/feed/stories
 *
 * Artigos das últimas 24h para o StoryRail.
 * Devolve até 200 artigos sem paginação — usado apenas para o rail de stories.
 * Cache de 5 minutos partilhada por utilizador.
 */
feedRouter.get('/stories', optionalAuth, async (c) => {
  const userId = c.get('userId') ?? null;
  const since  = Math.floor(Date.now() / 1000) - 86400; // 24h atrás

  const cacheKey = `stories:${userId ?? 'default'}`;

  const cached = await c.env.CACHE.get(cacheKey, 'json') as { articles: ArticleWithSource[] } | null;
  if (cached) {
    return c.json(cached, 200, { 'X-Cache': 'HIT' });
  }

  let articles: ArticleWithSource[];

  if (userId) {
    const { results } = await c.env.DB
      .prepare(`
        SELECT
          a.id, a.source_id, a.original_url, a.original_title, a.original_desc,
          a.translated_title, a.translated_desc, a.image_url, a.language, a.tag,
          a.published_at, a.fetched_at, a.expires_at,
          s.name  AS source_name,
          s.color AS source_color,
          s.logo_url AS source_logo,
          CASE WHEN ai.article_id IS NOT NULL THEN 1 ELSE 0 END AS has_summary
        FROM articles a
        JOIN sources s ON s.id = a.source_id
        LEFT JOIN ai_summaries ai ON ai.article_id = a.id
        WHERE a.published_at >= ?
          AND a.expires_at > unixepoch()
          AND (
            s.is_default = 1
            OR s.id IN (
              SELECT source_id FROM user_sources
              WHERE user_id = ? AND is_active = 1
            )
          )
        ORDER BY a.published_at DESC
        LIMIT 200
      `)
      .bind(since, userId)
      .all<ArticleWithSource>();
    articles = results;
  } else {
    const { results } = await c.env.DB
      .prepare(`
        SELECT
          a.id, a.source_id, a.original_url, a.original_title, a.original_desc,
          a.translated_title, a.translated_desc, a.image_url, a.language, a.tag,
          a.published_at, a.fetched_at, a.expires_at,
          s.name  AS source_name,
          s.color AS source_color,
          s.logo_url AS source_logo,
          CASE WHEN ai.article_id IS NOT NULL THEN 1 ELSE 0 END AS has_summary
        FROM articles a
        JOIN sources s ON s.id = a.source_id
        LEFT JOIN ai_summaries ai ON ai.article_id = a.id
        WHERE a.published_at >= ?
          AND a.expires_at > unixepoch()
          AND s.is_default = 1
        ORDER BY a.published_at DESC
        LIMIT 200
      `)
      .bind(since)
      .all<ArticleWithSource>();
    articles = results;
  }

  const response = { articles };
  await c.env.CACHE.put(cacheKey, JSON.stringify(response), { expirationTtl: CACHE_TTL });

  return c.json(response, 200, { 'X-Cache': 'MISS' });
});

feedRouter.get('/', optionalAuth, async (c) => {
  const userId = c.get('userId') ?? null;
  const beforeParam = c.req.query('before');
  const before = beforeParam ? parseInt(beforeParam, 10) : Math.floor(Date.now() / 1000);

  if (isNaN(before) || before <= 0) {
    return c.json({ error: 'Parâmetro before inválido' }, 400);
  }

  // ── Chave de cache ────────────────────────────────────────────────────────
  // Separar cache por utilizador para respeitar fontes personalizadas
  const cacheKey = `feed:${userId ?? 'default'}:${before}`;

  // ── KV-first ─────────────────────────────────────────────────────────────
  const cached = await c.env.CACHE.get(cacheKey, 'json') as FeedResponse | null;
  if (cached) {
    return c.json(cached, 200, { 'X-Cache': 'HIT' });
  }

  // ── D1 query ──────────────────────────────────────────────────────────────
  let articles: ArticleWithSource[];

  if (userId) {
    // Autenticado: fontes default + fontes activadas pelo utilizador
    const { results } = await c.env.DB
      .prepare(`
        SELECT
          a.id, a.source_id, a.original_url, a.original_title, a.original_desc,
          a.translated_title, a.translated_desc, a.image_url, a.language, a.tag,
          a.published_at, a.fetched_at, a.expires_at,
          s.name  AS source_name,
          s.color AS source_color,
          s.logo_url AS source_logo,
          CASE WHEN ai.article_id IS NOT NULL THEN 1 ELSE 0 END AS has_summary
        FROM articles a
        JOIN sources s ON s.id = a.source_id
        LEFT JOIN ai_summaries ai ON ai.article_id = a.id
        WHERE a.published_at < ?
          AND a.expires_at > unixepoch()
          AND (
            s.is_default = 1
            OR s.id IN (
              SELECT source_id FROM user_sources
              WHERE user_id = ? AND is_active = 1
            )
          )
        ORDER BY a.published_at DESC
        LIMIT ?
      `)
      .bind(before, userId, PAGE_SIZE + 1)
      .all<ArticleWithSource>();

    articles = results;
  } else {
    // Visitante: apenas fontes default
    const { results } = await c.env.DB
      .prepare(`
        SELECT
          a.id, a.source_id, a.original_url, a.original_title, a.original_desc,
          a.translated_title, a.translated_desc, a.image_url, a.language, a.tag,
          a.published_at, a.fetched_at, a.expires_at,
          s.name  AS source_name,
          s.color AS source_color,
          s.logo_url AS source_logo,
          CASE WHEN ai.article_id IS NOT NULL THEN 1 ELSE 0 END AS has_summary
        FROM articles a
        JOIN sources s ON s.id = a.source_id
        LEFT JOIN ai_summaries ai ON ai.article_id = a.id
        WHERE a.published_at < ?
          AND a.expires_at > unixepoch()
          AND s.is_default = 1
        ORDER BY a.published_at DESC
        LIMIT ?
      `)
      .bind(before, PAGE_SIZE + 1)
      .all<ArticleWithSource>();

    articles = results;
  }

  // ── Paginação ─────────────────────────────────────────────────────────────
  const hasMore = articles.length > PAGE_SIZE;
  if (hasMore) articles.pop(); // remover o artigo extra usado para detectar has_more

  const response: FeedResponse = {
    articles,
    page: Math.ceil(before / 1000), // não usado pelo frontend, mas útil para debug
    has_more: hasMore,
  };

  // ── Guardar em KV ─────────────────────────────────────────────────────────
  // Só cachear a primeira página (sem cursor) para não inflar o KV
  if (!beforeParam) {
    await c.env.CACHE.put(cacheKey, JSON.stringify(response), { expirationTtl: CACHE_TTL });
  }

  return c.json(response, 200, { 'X-Cache': 'MISS' });
});

export { feedRouter };
