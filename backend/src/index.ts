/**
 * grain — Worker principal
 *
 * Ponto de entrada do Cloudflare Worker.
 * Configura o Hono, regista os middlewares e as rotas,
 * e exporta o handler de cron triggers.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import type { Env } from './types/index';
import { requireAuth, optionalAuth } from './middleware/auth';
import { adminOnly } from './middleware/adminOnly';
import { fetchRSSFeed, parseArticles } from './services/rss';
import { translateBatch, generateEmbeddingsBatch, generateSummary, extractTopic } from './services/gemini';

// Variáveis injectadas pelos middlewares de autenticação
type Variables = {
  userId?: string;
  isAdmin?: boolean;
};

// Criar a aplicação Hono tipada com o nosso Env e Variables
const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// ─── Middlewares globais ───────────────────────────────────────────────────────

app.use('*', logger());
app.use('*', prettyJSON());

// CORS — permitir apenas o domínio do frontend
app.use('/api/*', cors({
  origin: [
    'http://localhost:5173',           // dev local Vite
    'https://ruifgomesc.github.io',    // GitHub Pages
  ],
  allowMethods: ['GET', 'POST', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

// ─── Rotas públicas ────────────────────────────────────────────────────────────

/**
 * GET /api/health
 * Verifica que o Worker está vivo. Sem autenticação.
 */
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'grain-backend',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/me
 * Rota de teste de autenticação — devolve o userId e isAdmin do token.
 * Usada no Passo 1.4 para confirmar que o Clerk está a funcionar.
 */
app.get('/api/me', requireAuth, (c) => {
  return c.json({
    userId: c.get('userId'),
    isAdmin: c.get('isAdmin') ?? false,
  });
});

/**
 * GET /api/admin/test
 * Rota de teste do middleware adminOnly.
 */
/**
 * GET /api/test/rss?url=...
 * Rota de teste temporária para o Passo 2.1 — remover depois.
 */
app.get('/api/test/rss', async (c) => {
  const url = c.req.query('url');
  const sourceId = c.req.query('source') ?? 'test';
  if (!url) return c.json({ error: 'Parâmetro url em falta' }, 400);
  try {
    const xml = await fetchRSSFeed(url);
    const articles = parseArticles(xml, sourceId);
    return c.json({ total: articles.length, articles: articles.slice(0, 3) });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

/**
 * GET /api/test/gemini
 * Rota de teste temporária para o Passo 2.2 — remover depois.
 * Testa tradução, embeddings, resumo e extracção de tema.
 */
app.get('/api/test/gemini', async (c) => {
  const apiKey = c.env.GEMINI_API_KEY;
  if (!apiKey) return c.json({ error: 'GEMINI_API_KEY não configurada' }, 500);

  try {
    // Artigo de teste (BBC em inglês)
    const testTitle = 'EU announces new climate targets for 2035';
    const testDesc = 'The European Union has set ambitious new climate goals, aiming to reduce emissions by 90% compared to 1990 levels by 2040, as part of its Green Deal strategy.';

    // 1. Tradução
    const [translated] = await translateBatch(
      [{ id: 'test1', title: testTitle, desc: testDesc }],
      apiKey
    );

    // 2. Embedding do título traduzido
    const [embedding] = await generateEmbeddingsBatch([translated.translated_title], apiKey);

    // 3. Resumo
    const summary = await generateSummary(`${testTitle}\n${testDesc}`, apiKey);

    // 4. Tema
    const topic = await extractTopic(`${testTitle}\n${testDesc}`, apiKey);

    return c.json({
      translation: {
        title: translated.translated_title,
        desc: translated.translated_desc,
      },
      embedding_dims: embedding.length,
      embedding_sample: embedding.slice(0, 5),
      summary,
      topic,
    });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

app.get('/api/admin/test', requireAuth, adminOnly, (c) => {
  return c.json({
    message: 'Acesso admin confirmado',
    userId: c.get('userId'),
  });
});

// ─── Rota de fallback 404 ─────────────────────────────────────────────────────

app.notFound((c) => {
  return c.json({ error: 'Rota não encontrada' }, 404);
});

// ─── Handler de erros globais ─────────────────────────────────────────────────

app.onError((err, c) => {
  console.error('[grain] Erro não tratado:', err.message, err.stack);
  return c.json({ error: 'Erro interno do servidor' }, 500);
});

// ─── Export do Worker ─────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return app.fetch(request, env, ctx);
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('[grain] Cron disparado:', event.cron, 'às', new Date().toISOString());

    switch (event.cron) {
      case '*/30 * * * *':
        console.log('[grain] JOB fetchFeeds — a implementar no Passo 2.4');
        break;
      case '0 * * * *':
        console.log('[grain] JOB matchFollows — a implementar no Passo 2.9');
        break;
      case '0 3 * * *':
        console.log('[grain] JOB cleanup — a implementar no Passo 2.10');
        break;
      default:
        console.error('[grain] Cron desconhecido:', event.cron);
    }
  },
};
