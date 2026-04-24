/**
 * Tipos globais do backend grain.
 * Define o contrato de ambiente injectado pelo Cloudflare Workers
 * e tipos partilhados entre rotas e serviços.
 */

// ─── Ambiente do Worker (bindings do wrangler.toml) ───────────────────────────

/**
 * Variáveis de ambiente e bindings disponíveis no Worker.
 * Todos os valores são strings — validar antes de usar números.
 */
export interface Env {
  // Base de dados D1
  DB: D1Database;

  // Cache KV
  CACHE: KVNamespace;

  // Fila de processamento
  FETCH_QUEUE: Queue;

  // Variáveis de configuração
  GEMINI_API_KEY: string;
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;
  MAX_SOURCES_PER_USER: string;       // "10"
  MAX_FOLLOWS_PER_USER: string;       // "20"
  ARTICLE_TTL_DAYS: string;           // "7"
  FOLLOW_ARTICLE_TTL_DAYS: string;    // "90"
  SIMILARITY_THRESHOLD: string;       // "0.82"
  DEDUP_THRESHOLD: string;            // "0.90"
  SUMMARY_MAX_WORDS: string;          // "250"
  ADMIN_USER_ID: string;
  JINA_API_KEY: string; // optional secret — empty string if not configured
}

// ─── Modelos da base de dados ──────────────────────────────────────────────────

/** Utilizador registado via Clerk */
export interface User {
  id: string;
  email: string | null;
  created_at: number;
  last_seen_at: number | null;
  preferences: string; // JSON serializado
}

/** Fonte RSS curada */
export interface Source {
  id: string;
  name: string;
  rss_url: string;
  website_url: string;
  logo_url: string | null;
  color: string | null;
  language: string;
  is_default: number; // 0 | 1 (SQLite não tem boolean)
  is_active: number;  // 0 | 1
  created_at: number;
}

/** Artigo processado e traduzido */
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
  published_at: number;
  fetched_at: number;
  expires_at: number;
}

/** Embedding vectorial de um artigo */
export interface ArticleEmbedding {
  article_id: string;
  embedding: string; // JSON serializado: number[]
  created_at: number;
}

/** Resumo IA de um artigo (gerado on-demand) */
export interface AISummary {
  article_id: string;
  summary: string;
  created_at: number;
}

/** Tema seguido por um utilizador */
export interface FollowTopic {
  id: string;
  user_id: string;
  name: string;
  emoji: string | null;
  embedding: string; // JSON serializado: number[]
  created_at: number;
  last_match_at: number | null;
  is_active: number; // 0 | 1
}

/** Correspondência entre tema seguido e artigo */
export interface FollowMatch {
  id: string;
  topic_id: string;
  article_id: string;
  similarity: number;
  is_read: number; // 0 | 1
  matched_at: number;
}

/** Sugestão de fonte enviada por utilizador */
export interface SourceSuggestion {
  id: string;
  user_id: string | null;
  name: string;
  url: string;
  rss_url: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  notes: string | null;
  created_at: number;
}

/** Registo de cada fetch de feed */
export interface FetchLog {
  id: string;
  source_id: string;
  fetched_at: number;
  articles_new: number;
  articles_dup: number;
  status: 'ok' | 'error';
  error_msg: string | null;
}

// ─── DTOs da API (respostas ao frontend) ─────────────────────────────────────

/** Artigo enriquecido com dados da fonte para o feed */
export interface ArticleWithSource extends Article {
  source_name: string;
  source_color: string | null;
  source_logo: string | null;
  has_summary: number;
  summary: string; // always present — only articles with summaries are shown
}

/** Resposta paginada do feed */
export interface FeedResponse {
  articles: ArticleWithSource[];
  page: number;
  has_more: boolean;
}

/** Tema com contagem de não lidos */
export interface TopicWithUnread extends FollowTopic {
  unread_count: number;
}
