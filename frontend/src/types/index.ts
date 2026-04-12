/**
 * Tipos partilhados do frontend grain.
 * Os timestamps vêm do backend como números Unix (segundos).
 */

// ─── Fonte RSS ────────────────────────────────────────────────────────────────

export interface Source {
  id: string;
  name: string;
  website_url: string;
  logo_url: string | null;
  color: string | null;
  language: string;
  is_default: number;   // 0 | 1
  user_active: number;  // 0 | 1
}

// ─── Artigo ───────────────────────────────────────────────────────────────────

export interface Article {
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
  published_at: number;  // Unix timestamp (segundos)
  fetched_at: number;
  expires_at: number;
  source_name: string;
  source_color: string | null;
  source_logo: string | null;
  has_summary: number;   // 0 | 1
}

// ─── Artigo de follow (com campos extra) ─────────────────────────────────────

export interface FollowArticle extends Article {
  match_id: string;
  similarity: number;
  is_read: number;       // 0 | 1
  matched_at: number;
}

// ─── Feed ─────────────────────────────────────────────────────────────────────

export interface FeedResponse {
  articles: Article[];
  page: number;
  has_more: boolean;
}

// ─── Resumo IA ────────────────────────────────────────────────────────────────

export interface SummaryResponse {
  summary: string;
  cached: boolean;
}

// ─── Follow ───────────────────────────────────────────────────────────────────

export interface FollowTopic {
  id: string;
  name: string;
  emoji: string | null;
  created_at: number;
  last_match_at: number | null;
  is_active: number;
  unread_count: number;
}

// ─── Respostas genéricas ──────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  code?: string;
}
