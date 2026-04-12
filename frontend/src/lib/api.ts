/**
 * Cliente HTTP do grain.
 * O proxy Vite em dev reencaminha /api → localhost:8787.
 */

import type {
  FeedResponse,
  Source,
  SummaryResponse,
  FollowTopic,
  FollowArticle,
} from '@/types';

const API_BASE = '/api';

async function apiFetch<T>(
  path: string,
  token?: string | null,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error((body as { error: string }).error ?? `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// ─── Feed ─────────────────────────────────────────────────────────────────────

export const getFeed = (before?: number, token?: string | null) => {
  const params = before ? `?before=${before}` : '';
  return apiFetch<FeedResponse>(`/feed${params}`, token);
};

// ─── Resumo IA ────────────────────────────────────────────────────────────────

export const getAISummary = (articleId: string, token?: string | null) =>
  apiFetch<SummaryResponse>(`/articles/${articleId}/summary`, token);

// ─── Fontes ───────────────────────────────────────────────────────────────────

export const getSources = (token?: string | null) =>
  apiFetch<{ sources: Source[] }>('/sources', token);

export const toggleSource = (sourceId: string, active: boolean, token: string) =>
  apiFetch<{ source_id: string; active: boolean }>(`/sources/${sourceId}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ active }),
  });

export const suggestSource = (data: { name: string; url: string; rss_url?: string }, token?: string | null) =>
  apiFetch<{ id: string; status: string }>('/sources/suggest', token, {
    method: 'POST',
    body: JSON.stringify(data),
  });

// ─── Follows ─────────────────────────────────────────────────────────────────

export const getFollowTopics = (token: string) =>
  apiFetch<{ topics: FollowTopic[] }>('/follows', token);

export const followTopic = (text: string, emoji: string | null, token: string) =>
  apiFetch<FollowTopic>('/follows', token, {
    method: 'POST',
    body: JSON.stringify({ text, emoji }),
  });

export const unfollowTopic = (topicId: string, token: string) =>
  apiFetch<{ id: string; deleted: boolean }>(`/follows/${topicId}`, token, {
    method: 'DELETE',
  });

export const getTopicArticles = (topicId: string, token: string) =>
  apiFetch<{ articles: FollowArticle[] }>(`/follows/${topicId}/articles`, token);

export const markArticleRead = (topicId: string, articleId: string, token: string) =>
  apiFetch<{ is_read: boolean }>(`/follows/${topicId}/articles/${articleId}/read`, token, {
    method: 'PATCH',
  });
