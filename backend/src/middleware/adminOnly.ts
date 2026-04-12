/**
 * Middleware adminOnly — bloqueia acesso a quem não for admin.
 *
 * Deve ser usado DEPOIS do requireAuth (que injeta o isAdmin).
 * Se chamado sem requireAuth antes, retorna 401.
 *
 * @example
 * app.use('/api/admin/*', requireAuth, adminOnly)
 */

import type { Context, Next } from 'hono';
import type { Env } from '../types/index';

type AdminVariables = {
  userId: string;
  isAdmin: boolean;
};

/**
 * Verifica se o utilizador autenticado tem role de admin.
 * Admin é definido pelo ADMIN_USER_ID no wrangler.toml / .dev.vars.
 */
export async function adminOnly(
  c: Context<{ Bindings: Env; Variables: AdminVariables }>,
  next: Next
): Promise<Response | void> {
  const userId = c.get('userId');

  if (!userId) {
    // requireAuth não foi aplicado antes — erro de configuração
    return c.json({ error: 'Autenticação necessária' }, 401);
  }

  if (!c.get('isAdmin')) {
    return c.json({ error: 'Acesso restrito a administradores' }, 403);
  }

  await next();
}
