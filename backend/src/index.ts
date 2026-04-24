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
import { requireAuth } from './middleware/auth';
import { runFetchFeeds } from './jobs/fetchFeeds';
import { runMatchFollows } from './jobs/matchFollows';
import { runCleanup } from './jobs/cleanup';
import { feedRouter } from './routes/feed';
import { articlesRouter } from './routes/articles';
import { sourcesRouter } from './routes/sources';
import { followsRouter } from './routes/follows';
import { adminRouter } from './routes/admin';

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
    'https://ruifgcosta.github.io',    // GitHub Pages
  ],
  allowMethods: ['GET', 'POST', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

// ─── Rotas ────────────────────────────────────────────────────────────────────

app.route('/api/feed', feedRouter);
app.route('/api/articles', articlesRouter);
app.route('/api/sources', sourcesRouter);
app.route('/api/follows', followsRouter);
app.route('/api/admin', adminRouter);

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
 * Devolve o userId e isAdmin do token Clerk.
 */
app.get('/api/me', requireAuth, (c) => {
  return c.json({
    userId: c.get('userId'),
    isAdmin: c.get('isAdmin') ?? false,
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
      case '0 * * * *':
        await runFetchFeeds(env);
        break;
      case '30 * * * *':
        await runMatchFollows(env);
        break;
      case '0 3 * * *':
        await runCleanup(env);
        break;
      default:
        console.error('[grain] Cron desconhecido:', event.cron);
    }
  },
};
