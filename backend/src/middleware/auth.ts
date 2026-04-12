/**
 * Middleware de autenticação — valida JWTs do Clerk.
 *
 * Como funciona:
 * 1. Extrai o Bearer token do header Authorization
 * 2. Usa verifyToken do @clerk/backend para verificar a assinatura
 * 3. Injeta o userId no contexto Hono para as rotas usarem
 *
 * Rotas públicas: não usam este middleware
 * Rotas protegidas: retornam 401 se o token for inválido ou ausente
 */

import { verifyToken } from '@clerk/backend';
import type { Context, Next } from 'hono';
import type { Env } from '../types/index';

// Tipo das variáveis injectadas no contexto Hono
type AuthVariables = {
  userId: string;
  isAdmin: boolean;
};

/**
 * Extrai e verifica o JWT do header Authorization.
 * Devolve o userId ou null se o token for inválido/ausente.
 */
async function extractUserId(
  authHeader: string | undefined,
  secretKey: string
): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);

  try {
    const payload = await verifyToken(token, { secretKey });
    return payload.sub;
  } catch {
    return null;
  }
}

/**
 * Middleware que torna a autenticação obrigatória.
 * Usar nas rotas que requerem login.
 *
 * @example
 * app.post('/api/follow', requireAuth, (c) => { ... })
 */
export async function requireAuth(
  c: Context<{ Bindings: Env; Variables: AuthVariables }>,
  next: Next
): Promise<Response | void> {
  const userId = await extractUserId(
    c.req.header('Authorization'),
    c.env.CLERK_SECRET_KEY
  );

  if (!userId) {
    return c.json({ error: 'Autenticação necessária' }, 401);
  }

  c.set('userId', userId);
  c.set('isAdmin', c.env.ADMIN_USER_ID ? userId === c.env.ADMIN_USER_ID : false);

  await next();
}

/**
 * Middleware que tenta autenticar mas não bloqueia se não houver token.
 * Usar nas rotas públicas com comportamento diferenciado para autenticados.
 *
 * @example
 * app.get('/api/feed', optionalAuth, (c) => {
 *   const userId = c.get('userId'); // pode ser undefined
 * })
 */
export async function optionalAuth(
  c: Context<{ Bindings: Env; Variables: Partial<AuthVariables> }>,
  next: Next
): Promise<void> {
  const userId = await extractUserId(
    c.req.header('Authorization'),
    c.env.CLERK_SECRET_KEY
  );

  if (userId) {
    c.set('userId', userId);
    c.set('isAdmin', c.env.ADMIN_USER_ID ? userId === c.env.ADMIN_USER_ID : false);
  }

  await next();
}
