/**
 * Rotas de fontes RSS:
 * - GET  /api/sources         — lista todas as fontes com estado do utilizador
 * - PATCH /api/sources/:id    — activar/desactivar fonte para o utilizador (auth obrigatória)
 * - POST /api/sources/suggest — sugerir nova fonte (auth opcional)
 */

import { Hono } from 'hono';
import type { Env } from '../types/index';
import { requireAuth, optionalAuth } from '../middleware/auth';

type Variables = {
  userId?: string;
  isAdmin?: boolean;
};

const sourcesRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

// ─── GET /api/sources ─────────────────────────────────────────────────────────

/**
 * Lista todas as fontes activas.
 * Para utilizadores autenticados inclui o estado de activação pessoal.
 * Para visitantes todas as fontes is_default=1 aparecem como activas.
 */
sourcesRouter.get('/', optionalAuth, async (c) => {
  const userId = c.get('userId') ?? null;

  if (userId) {
    // Incluir estado user_sources para este utilizador
    const { results } = await c.env.DB
      .prepare(`
        SELECT
          s.id, s.name, s.website_url, s.logo_url, s.color, s.language,
          s.is_default,
          COALESCE(us.is_active, s.is_default) AS user_active
        FROM sources s
        LEFT JOIN user_sources us ON us.source_id = s.id AND us.user_id = ?
        WHERE s.is_active = 1
        ORDER BY s.is_default DESC, s.name ASC
      `)
      .bind(userId)
      .all<{
        id: string;
        name: string;
        website_url: string;
        logo_url: string | null;
        color: string | null;
        language: string;
        is_default: number;
        user_active: number;
      }>();

    return c.json({ sources: results });
  } else {
    // Visitante: todas as fontes, is_default indica activação por omissão
    const { results } = await c.env.DB
      .prepare(`
        SELECT id, name, website_url, logo_url, color, language, is_default,
               is_default AS user_active
        FROM sources
        WHERE is_active = 1
        ORDER BY is_default DESC, name ASC
      `)
      .all<{
        id: string;
        name: string;
        website_url: string;
        logo_url: string | null;
        color: string | null;
        language: string;
        is_default: number;
        user_active: number;
      }>();

    return c.json({ sources: results });
  }
});

// ─── PATCH /api/sources/:id ───────────────────────────────────────────────────

/**
 * Activar ou desactivar uma fonte para o utilizador autenticado.
 * Body: { "active": true | false }
 *
 * Limita a MAX_SOURCES_PER_USER fontes activas por utilizador.
 */
sourcesRouter.patch('/:id', requireAuth, async (c) => {
  const userId = c.get('userId')!;
  const sourceId = c.req.param('id');

  let body: { active?: boolean };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Body JSON inválido' }, 400);
  }

  if (typeof body.active !== 'boolean') {
    return c.json({ error: 'Campo "active" obrigatório (boolean)' }, 400);
  }

  // Verificar se a fonte existe
  const source = await c.env.DB
    .prepare('SELECT id FROM sources WHERE id = ? AND is_active = 1')
    .bind(sourceId)
    .first<{ id: string }>();

  if (!source) {
    return c.json({ error: 'Fonte não encontrada' }, 404);
  }

  // Verificar limite de fontes activas (só ao activar)
  if (body.active) {
    const maxSources = parseInt(c.env.MAX_SOURCES_PER_USER) || 10;
    const { results: activeSources } = await c.env.DB
      .prepare(`
        SELECT COUNT(*) as cnt FROM (
          SELECT s.id FROM sources s
          LEFT JOIN user_sources us ON us.source_id = s.id AND us.user_id = ?
          WHERE s.is_active = 1
            AND COALESCE(us.is_active, s.is_default) = 1
        )
      `)
      .bind(userId)
      .all<{ cnt: number }>();

    const activeCount = activeSources[0]?.cnt ?? 0;
    if (activeCount >= maxSources) {
      return c.json({
        error: `Limite de ${maxSources} fontes activas atingido`,
        code: 'MAX_SOURCES_REACHED',
      }, 422);
    }
  }

  const now = Math.floor(Date.now() / 1000);

  // Upsert: inserir ou actualizar o registo user_sources
  await c.env.DB
    .prepare(`
      INSERT INTO user_sources (user_id, source_id, is_active, added_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT (user_id, source_id) DO UPDATE SET is_active = excluded.is_active
    `)
    .bind(userId, sourceId, body.active ? 1 : 0, now)
    .run();

  // Invalidar cache do feed deste utilizador
  await c.env.CACHE.delete(`feed:${userId}:${Math.floor(Date.now() / 1000)}`);

  return c.json({ source_id: sourceId, active: body.active });
});

// ─── POST /api/sources/suggest ────────────────────────────────────────────────

/**
 * Submeter uma sugestão de nova fonte RSS.
 * Body: { name: string, url: string, rss_url?: string }
 *
 * Utilizador não precisa de estar autenticado, mas regista o user_id se disponível.
 */
sourcesRouter.post('/suggest', optionalAuth, async (c) => {
  const userId = c.get('userId') ?? null;

  let body: { name?: string; url?: string; rss_url?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Body JSON inválido' }, 400);
  }

  const name = body.name?.trim();
  const url  = body.url?.trim();

  if (!name || !url) {
    return c.json({ error: 'Campos "name" e "url" obrigatórios' }, 400);
  }

  if (!url.startsWith('http')) {
    return c.json({ error: 'URL inválido' }, 400);
  }

  const suggestionId = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  await c.env.DB
    .prepare(`
      INSERT INTO source_suggestions (id, user_id, name, url, rss_url, status, notes, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', NULL, ?)
    `)
    .bind(suggestionId, userId, name, url, body.rss_url ?? null, now)
    .run();

  return c.json({ id: suggestionId, status: 'pending' }, 201);
});

export { sourcesRouter };
