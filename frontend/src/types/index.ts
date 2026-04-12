/**
 * Tipos partilhados do frontend grain.
 * Espelham os tipos do backend mas adaptados para o cliente:
 * - datas como string ISO (JSON) em vez de Unix timestamp
 * - campos calculados adicionados pelo backend
 */

// ─── Fonte RSS ────────────────────────────────────────────────────────────────

export interface Source {
  id: string;
  name: string;
  rss_url: string;
  website_url: string;
  logo_url: string | null;
  color: string | null;
  language: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
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
  published_at: string;
  fetched_at: string;
  expires_at: string;
  // Campos adicionados pelo backend no join com sources
  source_name: string;
  source_color: string | null;
  source_logo: string | null;
  has_summary: boolean;
}

// ─── Feed ─────────────────────────────────────────────────────────────────────

export interface FeedResponse {
  articles: Article[];
  page: number;
  has_more: boolean;
}

// ─── Resumo IA ────────────────────────────────────────────────────────────────

export interface AISummary {
  article_id: string;
  summary: string;
  created_at: string;
}

// ─── Follow ───────────────────────────────────────────────────────────────────

export interface FollowTopic {
  id: string;
  user_id: string;
  name: string;
  emoji: string | null;
  created_at: string;
  last_match_at: string | null;
  is_active: boolean;
  unread_count: number;
}

export interface FollowMatch {
  id: string;
  topic_id: string;
  article_id: string;
  similarity: number;
  is_read: boolean;
  matched_at: string;
  // Artigo completo no join
  article: Article;
}

// ─── Sugestão de fonte ────────────────────────────────────────────────────────

export interface SourceSuggestion {
  id: string;
  user_id: string | null;
  name: string;
  url: string;
  rss_url: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  notes: string | null;
  created_at: string;
}

// ─── Utilizador ───────────────────────────────────────────────────────────────

export interface GrainUser {
  id: string;
  email: string | null;
  created_at: string;
  last_seen_at: string | null;
  preferences: Record<string, unknown>;
}

// ─── Respostas API genéricas ──────────────────────────────────────────────────

/** Resposta de erro da API */
export interface ApiError {
  error: string;
}

/** Contagens de não lidos por tema */
export interface UnreadCounts {
  [topic_id: string]: number;
}
