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
    'washpost',
    'Washington Post',
    'https://feeds.washingtonpost.com/rss/world',
    'https://www.washingtonpost.com',
    NULL,
    '#231f20',        -- Preto WaPo
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
    'wired',
    'Wired',
    'https://www.wired.com/feed/rss',
    'https://www.wired.com',
    NULL,
    '#000000',        -- Preto Wired
    'en',
    0, 1,
    unixepoch()
  ),

  (
    'aljazeera',
    'Al Jazeera',
    'https://www.aljazeera.com/xml/rss/all.xml',
    'https://www.aljazeera.com',
    NULL,
    '#c8a96e',        -- Dourado Al Jazeera
    'en',
    0, 1,
    unixepoch()
  ),

  (
    'npr',
    'NPR News',
    'https://feeds.npr.org/1001/rss.xml',
    'https://www.npr.org',
    NULL,
    '#4a90d9',        -- Azul NPR
    'en',
    0, 1,
    unixepoch()
  ),

  (
    'dw',
    'DW News',
    'https://rss.dw.com/rdf/rss-en-all',
    'https://www.dw.com/en',
    NULL,
    '#c41e3a',        -- Vermelho DW
    'en',
    0, 1,
    unixepoch()
  );
