/**
 * Cliente HTTP do grain.
 *
 * Todas as chamadas à API passam por aqui.
 * Em desenvolvimento, o proxy do Vite reencaminha /api → localhost:8787.
 * Em produção, usa o URL do Worker Cloudflare.
 */

import type {
  FeedResponse,
  Source,
  FollowTopic,
  FollowMatch,
  AISummary,
  UnreadCounts,
} from '@/types';

// URL base da API — em produção definida via variável de ambiente Vite
const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

// ─── Utilitário de fetch com tratamento de erros ──────────────────────────────

/**
 * Faz um pedido autenticado à API.
 * @param path - Caminho relativo à API (ex: '/feed?page=1')
 * @param token - JWT do Clerk para pedidos autenticados (opcional)
 * @param options - Opções adicionais do fetch
 */
async function apiFetch<T>(
  path: string,
  token?: string | null,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Adicionar Authorization se tivermos token
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error((body as { error: string }).error ?? `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// ─── Feed ─────────────────────────────────────────────────────────────────────

/**
 * Obtém a página do feed.
 * @param page - Número da página (começa em 1)
 * @param token - JWT do utilizador (opcional — visitantes vêem fontes default)
 */
export const getFeed = (page: number, token?: string | null) =>
  apiFetch<FeedResponse>(`/feed?page=${page}&limit=20`, token);

// ─── Resumo IA ────────────────────────────────────────────────────────────────

/**
 * Obtém ou gera o resumo IA de um artigo.
 * Requer autenticação.
 * @param articleId - ID do artigo
 * @param token - JWT obrigatório
 */
export const getAISummary = (articleId: string, token: string) =>
  apiFetch<AISummary>(`/articles/${articleId}/summary`, token);

// ─── Fontes ───────────────────────────────────────────────────────────────────

/** Obtém todas as fontes activas. */
export const getSources = (token?: string | null) =>
  apiFetch<Source[]>('/sources', token);

/**
 * Activa uma fonte para o utilizador autenticado.
 * @param sourceId - ID da fonte
 * @param token - JWT obrigatório
 */
export const enableSource = (sourceId: string, token: string) =>
  apiFetch<{ ok: boolean }>(`/sources/${sourceId}/enable`, token, { method: 'POST' });

/**
 * Desactiva uma fonte para o utilizador autenticado.
 */
export const disableSource = (sourceId: string, token: string) =>
  apiFetch<{ ok: boolean }>(`/sources/${sourceId}/disable`, token, { method: 'POST' });

/**
 * Envia uma sugestão de nova fonte.
 */
export const suggestSource = (
  data: { name: string; url: string },
  token?: string | null
) =>
  apiFetch<{ ok: boolean }>('/suggest', token, {
    method: 'POST',
    body: JSON.stringify(data),
  });

// ─── Follow ───────────────────────────────────────────────────────────────────

/** Obtém todos os temas seguidos pelo utilizador. */
export const getFollowTopics = (token: string) =>
  apiFetch<FollowTopic[]>('/follow/topics', token);

/**
 * Obtém os artigos correspondentes a um tema.
 * @param topicId - ID do tema
 * @param token - JWT obrigatório
 */
export const getTopicArticles = (topicId: string, token: string) =>
  apiFetch<FollowMatch[]>(`/follow/topics/${topicId}/articles`, token);

/** Obtém as contagens de não lidos por tema. */
export const getUnreadCounts = (token: string) =>
  apiFetch<UnreadCounts>('/follow/unread-counts', token);

/**
 * Começa a seguir o tema de um artigo.
 * O backend extrai o tema e gera o embedding via Gemini.
 * @param articleId - ID do artigo de onde extrair o tema
 * @param token - JWT obrigatório
 */
export const followArticle = (articleId: string, token: string) =>
  apiFetch<FollowTopic>('/follow', token, {
    method: 'POST',
    body: JSON.stringify({ article_id: articleId }),
  });

/**
 * Deixa de seguir um tema (apaga em cascade).
 * @param topicId - ID do tema a remover
 * @param token - JWT obrigatório
 */
export const unfollowTopic = (topicId: string, token: string) =>
  apiFetch<{ ok: boolean }>(`/follow/${topicId}`, token, { method: 'DELETE' });

/**
 * Marca todos os artigos de um tema como lidos.
 * @param topicId - ID do tema
 * @param token - JWT obrigatório
 */
export const markTopicRead = (topicId: string, token: string) =>
  apiFetch<{ ok: boolean }>(`/follow/${topicId}/read`, token, { method: 'POST' });
