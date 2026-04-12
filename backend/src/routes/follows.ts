/**
 * Rotas de follows (temas seguidos):
 * - GET    /api/follows                              — lista temas com unread_count
 * - POST   /api/follows                              — seguir novo tema
 * - DELETE /api/follows/:id                          — deixar de seguir
 * - GET    /api/follows/:id/articles                 — artigos correspondentes
 * - PATCH  /api/follows/:id/articles/:articleId/read — marcar artigo como lido
 *
 * Todas as rotas requerem autenticação.
 */

import { Hono } from 'hono';
import type { Env } from '../types/index';
import { requireAuth } from '../middleware/auth';
import { generateEmbeddingsBatch, extractTopic } from '../services/gemini';

type Variables = {
  userId?: string;
  isAdmin?: boolean;
};

const followsRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

// Todas as rotas de follows requerem autenticação
followsRouter.use('*', requireAuth);

// ─── GET /api/follows ─────────────────────────────────────────────────────────

/**
 * Lista todos os temas activos do utilizador com contagem de artigos não lidos.
 */
followsRouter.get('/', async (c) => {
  const userId = c.get('userId')!;

  const { results } = await c.env.DB
    .prepare(`
      SELECT
        ft.id, ft.name, ft.emoji, ft.created_at, ft.last_match_at, ft.is_active,
        COUNT(CASE WHEN fm.is_read = 0 THEN 1 END) AS unread_count
      FROM follow_topics ft
      LEFT JOIN follow_matches fm ON fm.topic_id = ft.id
      WHERE ft.user_id = ? AND ft.is_active = 1
      GROUP BY ft.id
      ORDER BY ft.created_at DESC
    `)
    .bind(userId)
    .all<{
      id: string;
      name: string;
      emoji: string | null;
      created_at: number;
      last_match_at: number | null;
      is_active: number;
      unread_count: number;
    }>();

  return c.json({ topics: results });
});

// ─── POST /api/follows ────────────────────────────────────────────────────────

/**
 * Seguir um novo tema.
 * Body: { text: string, emoji?: string }
 *
 * Fluxo:
 * 1. Extrair tema em 3-5 palavras PT via Gemini extractTopic
 * 2. Gerar embedding do tema via Gemini
 * 3. Guardar em follow_topics
 *
 * Limita a MAX_FOLLOWS_PER_USER temas activos por utilizador.
 */
followsRouter.post('/', async (c) => {
  const userId = c.get('userId')!;

  let body: { text?: string; emoji?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Body JSON inválido' }, 400);
  }

  const text = body.text?.trim();
  if (!text || text.length < 3) {
    return c.json({ error: 'Campo "text" obrigatório (mínimo 3 caracteres)' }, 400);
  }

  // Verificar limite de follows
  const maxFollows = parseInt(c.env.MAX_FOLLOWS_PER_USER) || 20;
  const countRow = await c.env.DB
    .prepare('SELECT COUNT(*) as cnt FROM follow_topics WHERE user_id = ? AND is_active = 1')
    .bind(userId)
    .first<{ cnt: number }>();

  if ((countRow?.cnt ?? 0) >= maxFollows) {
    return c.json({
      error: `Limite de ${maxFollows} temas seguidos atingido`,
      code: 'MAX_FOLLOWS_REACHED',
    }, 422);
  }

  // Extrair tema normalizado e gerar embedding
  let topicName: string;
  let embedding: number[];

  try {
    topicName = await extractTopic(text, c.env.GEMINI_API_KEY);
    const embeddings = await generateEmbeddingsBatch([topicName], c.env.GEMINI_API_KEY);
    embedding = embeddings[0];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[grain/follows] Erro ao processar tema:', msg);
    return c.json({ error: 'Não foi possível processar o tema. Tenta de novo.' }, 503);
  }

  const topicId = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  await c.env.DB
    .prepare(`
      INSERT INTO follow_topics (id, user_id, name, emoji, embedding, created_at, last_match_at, is_active)
      VALUES (?, ?, ?, ?, ?, ?, NULL, 1)
    `)
    .bind(topicId, userId, topicName, body.emoji ?? null, JSON.stringify(embedding), now)
    .run();

  return c.json({
    id: topicId,
    name: topicName,
    emoji: body.emoji ?? null,
    created_at: now,
    unread_count: 0,
  }, 201);
});

// ─── DELETE /api/follows/:id ──────────────────────────────────────────────────

/**
 * Deixar de seguir um tema (soft delete — is_active = 0).
 */
followsRouter.delete('/:id', async (c) => {
  const userId = c.get('userId')!;
  const topicId = c.req.param('id');

  const result = await c.env.DB
    .prepare(`
      UPDATE follow_topics SET is_active = 0
      WHERE id = ? AND user_id = ? AND is_active = 1
    `)
    .bind(topicId, userId)
    .run();

  if (result.meta.changes === 0) {
    return c.json({ error: 'Tema não encontrado' }, 404);
  }

  return c.json({ id: topicId, deleted: true });
});

// ─── GET /api/follows/:id/articles ───────────────────────────────────────────

/**
 * Lista artigos que correspondem a um tema, do mais recente para o mais antigo.
 * Inclui o estado de leitura (is_read).
 */
followsRouter.get('/:id/articles', async (c) => {
  const userId = c.get('userId')!;
  const topicId = c.req.param('id');

  // Verificar que o tema pertence ao utilizador
  const topic = await c.env.DB
    .prepare('SELECT id FROM follow_topics WHERE id = ? AND user_id = ? AND is_active = 1')
    .bind(topicId, userId)
    .first<{ id: string }>();

  if (!topic) {
    return c.json({ error: 'Tema não encontrado' }, 404);
  }

  const { results } = await c.env.DB
    .prepare(`
      SELECT
        fm.id AS match_id, fm.similarity, fm.is_read, fm.matched_at,
        a.id, a.source_id, a.original_url, a.original_title, a.original_desc,
        a.translated_title, a.translated_desc, a.image_url, a.language, a.tag,
        a.published_at, a.fetched_at, a.expires_at,
        s.name AS source_name, s.color AS source_color, s.logo_url AS source_logo,
        CASE WHEN ai.article_id IS NOT NULL THEN 1 ELSE 0 END AS has_summary
      FROM follow_matches fm
      JOIN articles a ON a.id = fm.article_id
      JOIN sources s ON s.id = a.source_id
      LEFT JOIN ai_summaries ai ON ai.article_id = a.id
      WHERE fm.topic_id = ?
        AND a.expires_at > unixepoch()
      ORDER BY fm.matched_at DESC
      LIMIT 50
    `)
    .bind(topicId)
    .all<{
      match_id: string;
      similarity: number;
      is_read: number;
      matched_at: number;
      id: string;
      source_id: string;
      original_url: string;
      original_title: string;
      original_desc: string | null;
      translated_title: string | null;
      translated_desc: string | null;
      image_url: string | null;
      language: string | null;
      tag: string | null;
      published_at: number;
      fetched_at: number;
      expires_at: number;
      source_name: string;
      source_color: string | null;
      source_logo: string | null;
      has_summary: number;
    }>();

  return c.json({ articles: results });
});

// ─── PATCH /api/follows/:id/articles/:articleId/read ─────────────────────────

/**
 * Marcar um artigo de um follow como lido.
 */
followsRouter.patch('/:id/articles/:articleId/read', async (c) => {
  const userId = c.get('userId')!;
  const topicId = c.req.param('id');
  const articleId = c.req.param('articleId');

  // Verificar que o tema pertence ao utilizador
  const topic = await c.env.DB
    .prepare('SELECT id FROM follow_topics WHERE id = ? AND user_id = ?')
    .bind(topicId, userId)
    .first<{ id: string }>();

  if (!topic) {
    return c.json({ error: 'Tema não encontrado' }, 404);
  }

  const result = await c.env.DB
    .prepare(`
      UPDATE follow_matches SET is_read = 1
      WHERE topic_id = ? AND article_id = ? AND is_read = 0
    `)
    .bind(topicId, articleId)
    .run();

  if (result.meta.changes === 0) {
    return c.json({ error: 'Artigo não encontrado ou já lido' }, 404);
  }

  return c.json({ topic_id: topicId, article_id: articleId, is_read: true });
});

export { followsRouter };
