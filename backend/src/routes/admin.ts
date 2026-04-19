/**
 * Rotas de administração — requerem requireAuth + adminOnly.
 *
 * - GET   /api/admin/stats              — estatísticas gerais
 * - GET   /api/admin/sources            — todas as fontes com stats
 * - POST  /api/admin/sources            — adicionar nova fonte
 * - PATCH /api/admin/sources/:id        — editar/activar/desactivar fonte
 * - GET   /api/admin/suggestions        — sugestões pendentes
 * - PATCH /api/admin/suggestions/:id    — aceitar ou rejeitar sugestão
 * - GET   /api/admin/fetch-log          — histórico de fetches
 */

import { Hono } from 'hono';
import type { Env } from '../types/index';
import { requireAuth } from '../middleware/auth';
import { adminOnly } from '../middleware/adminOnly';
import { runFetchFeeds } from '../jobs/fetchFeeds';

type Variables = {
  userId?: string;
  isAdmin?: boolean;
};

const adminRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

// Todas as rotas de admin requerem autenticação + flag admin
adminRouter.use('*', requireAuth, adminOnly);

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────

adminRouter.get('/stats', async (c) => {
  const [articles, users, topics, sources, suggestions] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as cnt FROM articles').first<{ cnt: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as cnt FROM users').first<{ cnt: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as cnt FROM follow_topics WHERE is_active = 1').first<{ cnt: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as cnt FROM sources WHERE is_active = 1').first<{ cnt: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as cnt FROM source_suggestions WHERE status = 'pending'").first<{ cnt: number }>(),
  ]);

  return c.json({
    articles: articles?.cnt ?? 0,
    users: users?.cnt ?? 0,
    active_topics: topics?.cnt ?? 0,
    active_sources: sources?.cnt ?? 0,
    pending_suggestions: suggestions?.cnt ?? 0,
  });
});

// ─── GET /api/admin/sources ───────────────────────────────────────────────────

adminRouter.get('/sources', async (c) => {
  const { results } = await c.env.DB
    .prepare(`
      SELECT
        s.id, s.name, s.rss_url, s.website_url, s.color, s.language,
        s.is_default, s.is_active, s.created_at,
        COUNT(a.id) AS article_count,
        MAX(fl.fetched_at) AS last_fetched_at
      FROM sources s
      LEFT JOIN articles a ON a.source_id = s.id
      LEFT JOIN fetch_log fl ON fl.source_id = s.id AND fl.status = 'ok'
      GROUP BY s.id
      ORDER BY s.is_active DESC, s.is_default DESC, s.name ASC
    `)
    .all();

  return c.json({ sources: results });
});

// ─── POST /api/admin/sources ──────────────────────────────────────────────────

adminRouter.post('/sources', async (c) => {
  let body: {
    id?: string;
    name?: string;
    rss_url?: string;
    website_url?: string;
    color?: string;
    language?: string;
    is_default?: boolean;
  };

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Body JSON inválido' }, 400);
  }

  const { id, name, rss_url, website_url } = body;

  if (!id || !name || !rss_url || !website_url) {
    return c.json({ error: 'Campos id, name, rss_url e website_url são obrigatórios' }, 400);
  }

  if (!/^[a-z0-9_-]+$/.test(id)) {
    return c.json({ error: 'ID deve conter apenas letras minúsculas, números e hífens' }, 400);
  }

  const now = Math.floor(Date.now() / 1000);

  try {
    await c.env.DB
      .prepare(`
        INSERT INTO sources (id, name, rss_url, website_url, logo_url, color, language, is_default, is_active, created_at)
        VALUES (?, ?, ?, ?, NULL, ?, ?, ?, 1, ?)
      `)
      .bind(
        id, name, rss_url, website_url,
        body.color ?? null,
        body.language ?? 'en',
        body.is_default ? 1 : 0,
        now
      )
      .run();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('UNIQUE') || msg.includes('already exists')) {
      return c.json({ error: `Fonte com ID '${id}' já existe` }, 409);
    }
    throw err;
  }

  return c.json({ id, created: true }, 201);
});

// ─── PATCH /api/admin/sources/:id ────────────────────────────────────────────

adminRouter.patch('/sources/:id', async (c) => {
  const sourceId = c.req.param('id');

  let body: {
    name?: string;
    rss_url?: string;
    website_url?: string;
    color?: string;
    language?: string;
    is_default?: boolean;
    is_active?: boolean;
  };

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Body JSON inválido' }, 400);
  }

  // Construir query dinâmica com os campos fornecidos
  const fields: string[] = [];
  const values: unknown[] = [];

  if (body.name       !== undefined) { fields.push('name = ?');        values.push(body.name); }
  if (body.rss_url    !== undefined) { fields.push('rss_url = ?');     values.push(body.rss_url); }
  if (body.website_url !== undefined){ fields.push('website_url = ?'); values.push(body.website_url); }
  if (body.color      !== undefined) { fields.push('color = ?');       values.push(body.color); }
  if (body.language   !== undefined) { fields.push('language = ?');    values.push(body.language); }
  if (body.is_default !== undefined) { fields.push('is_default = ?');  values.push(body.is_default ? 1 : 0); }
  if (body.is_active  !== undefined) { fields.push('is_active = ?');   values.push(body.is_active ? 1 : 0); }

  if (fields.length === 0) {
    return c.json({ error: 'Nenhum campo para actualizar' }, 400);
  }

  values.push(sourceId);

  const result = await c.env.DB
    .prepare(`UPDATE sources SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  if (result.meta.changes === 0) {
    return c.json({ error: 'Fonte não encontrada' }, 404);
  }

  // Invalidar cache da fonte se desactivada
  if (body.is_active === false) {
    await c.env.CACHE.delete(`feed:${sourceId}`);
    await c.env.CACHE.delete('feed:global');
  }

  return c.json({ id: sourceId, updated: true });
});

// ─── GET /api/admin/suggestions ───────────────────────────────────────────────

adminRouter.get('/suggestions', async (c) => {
  const status = c.req.query('status') ?? 'pending';

  const { results } = await c.env.DB
    .prepare(`
      SELECT id, user_id, name, url, rss_url, status, notes, created_at
      FROM source_suggestions
      WHERE status = ?
      ORDER BY created_at DESC
      LIMIT 100
    `)
    .bind(status)
    .all();

  return c.json({ suggestions: results });
});

// ─── PATCH /api/admin/suggestions/:id ────────────────────────────────────────

adminRouter.patch('/suggestions/:id', async (c) => {
  const suggestionId = c.req.param('id');

  let body: { status?: 'accepted' | 'rejected'; notes?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Body JSON inválido' }, 400);
  }

  if (!body.status || !['accepted', 'rejected'].includes(body.status)) {
    return c.json({ error: 'status deve ser "accepted" ou "rejected"' }, 400);
  }

  const result = await c.env.DB
    .prepare(`
      UPDATE source_suggestions SET status = ?, notes = ?
      WHERE id = ? AND status = 'pending'
    `)
    .bind(body.status, body.notes ?? null, suggestionId)
    .run();

  if (result.meta.changes === 0) {
    return c.json({ error: 'Sugestão não encontrada ou já processada' }, 404);
  }

  return c.json({ id: suggestionId, status: body.status });
});

// ─── GET /api/admin/fetch-log ─────────────────────────────────────────────────

adminRouter.get('/fetch-log', async (c) => {
  const limit = Math.min(parseInt(c.req.query('limit') ?? '50', 10), 200);

  const { results } = await c.env.DB
    .prepare(`
      SELECT fl.id, fl.source_id, s.name AS source_name,
             fl.fetched_at, fl.articles_new, fl.articles_dup, fl.status, fl.error_msg
      FROM fetch_log fl
      JOIN sources s ON s.id = fl.source_id
      ORDER BY fl.fetched_at DESC
      LIMIT ?
    `)
    .bind(limit)
    .all();

  return c.json({ logs: results });
});

// ─── POST /api/admin/fetch-now ────────────────────────────────────────────────

adminRouter.post('/fetch-now', async (c) => {
  // Disparar fetchFeeds em background (não aguardar conclusão para evitar timeout HTTP)
  c.executionCtx.waitUntil(runFetchFeeds(c.env));
  return c.json({ status: 'started', message: 'Feed fetch iniciado em background' });
});

// ─── POST /api/admin/fix-images ───────────────────────────────────────────────

adminRouter.post('/fix-images', async (c) => {
  // Corrigir URLs de imagens com &amp; na DB (legado de artigos mal inseridos)
  const result = await c.env.DB
    .prepare("UPDATE articles SET image_url = REPLACE(image_url, '&amp;', '&') WHERE image_url LIKE '%&amp;%'")
    .run();

  return c.json({
    fixed: result.meta.changes ?? 0,
    message: `${result.meta.changes ?? 0} artigos corrigidos`,
  });
});

export { adminRouter };
