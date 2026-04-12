-- ─── grain — Schema D1 ────────────────────────────────────────────────────────
-- Executar com: npm run db:schema (local) ou npm run db:schema:prod (produção)
-- ─────────────────────────────────────────────────────────────────────────────


-- ─── Utilizadores ─────────────────────────────────────────────────────────────
-- Espelha os utilizadores do Clerk. Criado na primeira autenticação.
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,           -- ID do Clerk (ex: user_2abc...)
  email         TEXT UNIQUE,
  created_at    INTEGER NOT NULL,           -- Unix timestamp
  last_seen_at  INTEGER,
  preferences   TEXT DEFAULT '{}'           -- JSON com preferências do utilizador
);


-- ─── Fontes RSS ───────────────────────────────────────────────────────────────
-- Curadas manualmente pelo admin. Não editáveis pelo utilizador final.
CREATE TABLE IF NOT EXISTS sources (
  id            TEXT PRIMARY KEY,           -- ex: "bbc", "publico"
  name          TEXT NOT NULL,
  rss_url       TEXT NOT NULL UNIQUE,
  website_url   TEXT NOT NULL,
  logo_url      TEXT,
  color         TEXT,                       -- Cor hex da fonte (para dot no card)
  language      TEXT DEFAULT 'en',          -- Código ISO 639-1
  is_default    INTEGER DEFAULT 0,          -- 1 = aparece para visitantes
  is_active     INTEGER DEFAULT 1,          -- 0 = pausado (não faz fetch)
  created_at    INTEGER NOT NULL
);


-- ─── Fontes activas por utilizador ────────────────────────────────────────────
-- Cada utilizador pode activar/desactivar fontes (máx. 10 activas em simultâneo)
CREATE TABLE IF NOT EXISTS user_sources (
  user_id       TEXT NOT NULL,
  source_id     TEXT NOT NULL,
  is_enabled    INTEGER DEFAULT 1,
  added_at      INTEGER NOT NULL,
  PRIMARY KEY (user_id, source_id),
  FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
  FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
);


-- ─── Artigos ──────────────────────────────────────────────────────────────────
-- Artigos processados, traduzidos e com TTL de expiração.
CREATE TABLE IF NOT EXISTS articles (
  id                TEXT PRIMARY KEY,       -- Hash SHA-256 da URL original
  source_id         TEXT NOT NULL,
  original_url      TEXT NOT NULL UNIQUE,
  original_title    TEXT NOT NULL,
  original_desc     TEXT,
  translated_title  TEXT,                   -- Tradução PT-PT via Gemini
  translated_desc   TEXT,
  image_url         TEXT,
  language          TEXT,
  tag               TEXT,                   -- Tag/categoria da fonte
  published_at      INTEGER NOT NULL,       -- Unix timestamp do artigo
  fetched_at        INTEGER NOT NULL,       -- Unix timestamp do fetch
  expires_at        INTEGER NOT NULL,       -- published_at + ARTICLE_TTL_DAYS
  FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
);


-- ─── Embeddings dos artigos ───────────────────────────────────────────────────
-- Vectores Gemini para correspondência semântica com temas seguidos.
CREATE TABLE IF NOT EXISTS article_embeddings (
  article_id    TEXT PRIMARY KEY,
  embedding     TEXT NOT NULL,              -- JSON: number[] (768 dimensões)
  created_at    INTEGER NOT NULL,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);


-- ─── Resumos IA ───────────────────────────────────────────────────────────────
-- Gerados on-demand pelo utilizador; partilhados entre todos; não expiram.
CREATE TABLE IF NOT EXISTS ai_summaries (
  article_id      TEXT PRIMARY KEY,
  summary         TEXT NOT NULL,
  created_at      INTEGER NOT NULL,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);


-- ─── Temas seguidos ───────────────────────────────────────────────────────────
-- Cada tema tem um embedding gerado pelo Gemini para matching semântico.
CREATE TABLE IF NOT EXISTS follow_topics (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL,
  name            TEXT NOT NULL,           -- Ex: "inteligência artificial"
  emoji           TEXT,
  embedding       TEXT NOT NULL,           -- JSON: number[] (768 dimensões)
  created_at      INTEGER NOT NULL,
  last_match_at   INTEGER,
  is_active       INTEGER DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


-- ─── Correspondências tema ↔ artigo ───────────────────────────────────────────
-- Geradas pelo job matchFollows; threshold de similaridade cosseno >= 0.82
CREATE TABLE IF NOT EXISTS follow_matches (
  id              TEXT PRIMARY KEY,
  topic_id        TEXT NOT NULL,
  article_id      TEXT NOT NULL,
  similarity      REAL NOT NULL,           -- Valor entre 0 e 1
  is_read         INTEGER DEFAULT 0,       -- 0 = não lido
  matched_at      INTEGER NOT NULL,
  UNIQUE (topic_id, article_id),           -- Sem duplicados por tema/artigo
  FOREIGN KEY (topic_id)   REFERENCES follow_topics(id) ON DELETE CASCADE,
  FOREIGN KEY (article_id) REFERENCES articles(id)      ON DELETE CASCADE
);


-- ─── Sugestões de fontes ──────────────────────────────────────────────────────
-- Enviadas por utilizadores; revisadas pelo admin.
CREATE TABLE IF NOT EXISTS source_suggestions (
  id              TEXT PRIMARY KEY,
  user_id         TEXT,                    -- NULL = visitante anónimo
  name            TEXT NOT NULL,
  url             TEXT NOT NULL,
  rss_url         TEXT,
  status          TEXT DEFAULT 'pending',  -- 'pending' | 'accepted' | 'rejected'
  notes           TEXT,
  created_at      INTEGER NOT NULL
);


-- ─── Registo de fetches ───────────────────────────────────────────────────────
-- Auditoria de cada execução do job fetchFeeds por fonte.
CREATE TABLE IF NOT EXISTS fetch_log (
  id              TEXT PRIMARY KEY,
  source_id       TEXT NOT NULL,
  fetched_at      INTEGER NOT NULL,
  articles_new    INTEGER DEFAULT 0,       -- Artigos novos inseridos
  articles_dup    INTEGER DEFAULT 0,       -- Artigos ignorados por duplicação
  status          TEXT DEFAULT 'ok',       -- 'ok' | 'error'
  error_msg       TEXT,
  FOREIGN KEY (source_id) REFERENCES sources(id)
);


-- ─── Índices ──────────────────────────────────────────────────────────────────
-- Optimizar as queries mais frequentes do feed e do sistema de follow.

-- Feed: artigos por fonte, ordenados por data decrescente
CREATE INDEX IF NOT EXISTS idx_articles_source
  ON articles(source_id, published_at DESC);

-- Cleanup: encontrar artigos expirados rapidamente
CREATE INDEX IF NOT EXISTS idx_articles_expires
  ON articles(expires_at);

-- Feed global: todos os artigos por data
CREATE INDEX IF NOT EXISTS idx_articles_published
  ON articles(published_at DESC);

-- Follow: temas de um utilizador
CREATE INDEX IF NOT EXISTS idx_follow_topics_user
  ON follow_topics(user_id);

-- Follow: artigos correspondentes a um tema, por data
CREATE INDEX IF NOT EXISTS idx_follow_matches_topic
  ON follow_matches(topic_id, matched_at DESC);

-- Follow: contagem de não lidos por tema
CREATE INDEX IF NOT EXISTS idx_follow_matches_read
  ON follow_matches(topic_id, is_read);

-- Fontes activas de um utilizador
CREATE INDEX IF NOT EXISTS idx_user_sources_user
  ON user_sources(user_id);

-- Auditoria de fetches por fonte
CREATE INDEX IF NOT EXISTS idx_fetch_log_source
  ON fetch_log(source_id, fetched_at DESC);
