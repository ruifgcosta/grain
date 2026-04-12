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

// Criar a aplicação Hono tipada com o nosso Env
const app = new Hono<{ Bindings: Env }>();

// ─── Middlewares globais ───────────────────────────────────────────────────────

// Logger de pedidos em desenvolvimento
app.use('*', logger());

// Pretty print de JSON em desenvolvimento
app.use('*', prettyJSON());

// CORS — permitir apenas o domínio do frontend
app.use('/api/*', cors({
  origin: [
    'http://localhost:5173',                // dev local Vite
    'https://ruifgomesc.github.io',         // GitHub Pages (ajustar ao repositório)
  ],
  allowMethods: ['GET', 'POST', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

// ─── Rota de saúde ────────────────────────────────────────────────────────────

/**
 * GET /api/health
 * Verifica que o Worker está vivo e responde.
 * Usado para confirmar que o deploy funcionou.
 */
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'grain-backend',
    timestamp: new Date().toISOString(),
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
  /**
   * Handler HTTP — processa todos os pedidos web.
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return app.fetch(request, env, ctx);
  },

  /**
   * Handler de Cron Triggers — executa jobs agendados.
   * Os crons são definidos em wrangler.toml.
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('[grain] Cron disparado:', event.cron, 'às', new Date().toISOString());

    switch (event.cron) {
      case '*/30 * * * *':
        // JOB 1 — Ir buscar feeds RSS e processar artigos novos
        // Implementado no Passo 2.4
        console.log('[grain] JOB fetchFeeds — a implementar no Passo 2.4');
        break;

      case '0 * * * *':
        // JOB 2 — Fazer correspondência de temas seguidos com artigos novos
        // Implementado no Passo 2.9
        console.log('[grain] JOB matchFollows — a implementar no Passo 2.9');
        break;

      case '0 3 * * *':
        // JOB 3 — Limpeza de artigos expirados
        // Implementado no Passo 2.10
        console.log('[grain] JOB cleanup — a implementar no Passo 2.10');
        break;

      default:
        console.error('[grain] Cron desconhecido:', event.cron);
    }
  },
};
