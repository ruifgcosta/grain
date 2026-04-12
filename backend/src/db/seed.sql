-- ─── grain — Seed data ────────────────────────────────────────────────────────
-- Inserir as 10 fontes RSS iniciais curadas.
-- is_default = 1: visível para visitantes sem conta
-- is_default = 0: disponível apenas para utilizadores autenticados
--
-- Executar com: npm run db:seed (local) ou npm run db:seed:prod (produção)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO sources
  (id, name, rss_url, website_url, logo_url, color, language, is_default, is_active, created_at)
VALUES

  -- ─── Fontes padrão (is_default = 1) ────────────────────────────────────────

  (
    'bbc',
    'BBC News',
    'http://feeds.bbci.co.uk/news/world/rss.xml',
    'https://www.bbc.com/news',
    NULL,
    '#b80000',        -- Vermelho BBC
    'en',
    1, 1,
    unixepoch()
  ),

  (
    'reuters',
    'Reuters',
    'https://feeds.reuters.com/reuters/topNews',
    'https://www.reuters.com',
    NULL,
    '#ff7b00',        -- Laranja Reuters
    'en',
    1, 1,
    unixepoch()
  ),

  (
    'publico',
    'Público',
    'https://feeds.feedburner.com/PublicoRSS',
    'https://www.publico.pt',
    NULL,
    '#1a1aff',        -- Azul Público
    'pt',
    1, 1,
    unixepoch()
  ),

  (
    'guardian',
    'The Guardian',
    'https://www.theguardian.com/world/rss',
    'https://www.theguardian.com',
    NULL,
    '#005689',        -- Azul Guardian
    'en',
    1, 1,
    unixepoch()
  ),

  (
    'observador',
    'Observador',
    'https://observador.pt/feed/',
    'https://observador.pt',
    NULL,
    '#e63329',        -- Vermelho Observador
    'pt',
    1, 1,
    unixepoch()
  ),

  (
    'rtp',
    'RTP Notícias',
    'https://www.rtp.pt/noticias/rss',
    'https://www.rtp.pt/noticias',
    NULL,
    '#009a44',        -- Verde RTP
    'pt',
    1, 1,
    unixepoch()
  ),

  -- ─── Fontes opcionais (is_default = 0) ─────────────────────────────────────

  (
    'ars',
    'Ars Technica',
    'http://feeds.arstechnica.com/arstechnica/index',
    'https://arstechnica.com',
    NULL,
    '#ff4e00',        -- Laranja Ars Technica
    'en',
    0, 1,
    unixepoch()
  ),

  (
    'verge',
    'The Verge',
    'https://www.theverge.com/rss/index.xml',
    'https://www.theverge.com',
    NULL,
    '#fa4522',        -- Vermelho/laranja The Verge
    'en',
    0, 1,
    unixepoch()
  ),

  (
    'ap',
    'Associated Press',
    'https://rsshub.app/apnews/topics/apf-topnews',
    'https://apnews.com',
    NULL,
    '#cc0000',        -- Vermelho AP
    'en',
    0, 1,
    unixepoch()
  ),

  (
    'sciam',
    'Scientific American',
    'http://rss.sciam.com/ScientificAmerican-Global',
    'https://www.scientificamerican.com',
    NULL,
    '#0068b4',        -- Azul Scientific American
    'en',
    0, 1,
    unixepoch()
  );
