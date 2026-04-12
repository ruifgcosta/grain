/**
 * Serviço RSS — fetch e parse de feeds RSS 2.0 e Atom.
 *
 * Suporta os dois formatos mais comuns:
 * - RSS 2.0: BBC, Reuters, Público, Observador, RTP, Ars Technica
 * - Atom:    The Guardian, The Verge, Scientific American
 *
 * Usa fast-xml-parser (zero-dep, sem DOM) — compatível com Workers.
 */

import { XMLParser } from 'fast-xml-parser';

// ─── Tipos ────────────────────────────────────────────────────────────────────

/** Artigo normalizado após parse — antes de tradução/embedding */
export interface RawArticle {
  /** ID estável derivado da URL (FNV-1a hash de 16 hex chars) */
  id: string;
  source_id: string;
  original_url: string;
  original_title: string;
  original_desc: string | null;
  image_url: string | null;
  /** Timestamp Unix da publicação (segundos) */
  published_at: number;
  tag: string | null;
}

// ─── Utilitários ─────────────────────────────────────────────────────────────

/**
 * Gera um ID estável para um artigo a partir da sua URL.
 * Usa FNV-1a 32-bit em dois rounds para 16 hex chars.
 * Síncrono, sem dependências externas.
 */
function generateArticleId(url: string): string {
  const fnv32 = (str: string, seed: number): number => {
    let h = seed >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (Math.imul(h, 16777619)) >>> 0;
    }
    return h;
  };
  const h1 = fnv32(url, 2166136261);
  const h2 = fnv32(url, 2166136261 ^ 0xdeadbeef);
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}

/**
 * Converte qualquer valor para string de forma segura.
 * Trata os casos do fast-xml-parser:
 * - string directa
 * - number/boolean
 * - objecto CDATA: { '#cdata': 'texto' }
 * - objecto texto: { '#text': 'texto' }
 */
function toStr(val: unknown): string {
  if (val == null) return '';
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    // CDATA tem precedência sobre text
    if (obj['#cdata'] != null) return toStr(obj['#cdata']);
    if (obj['#text'] != null) return toStr(obj['#text']);
  }
  return '';
}

/**
 * Converte uma string de data para Unix timestamp em segundos.
 * Suporta RFC 2822 (RSS) e ISO 8601 (Atom).
 */
function parseDate(dateStr: unknown): number {
  const str = toStr(dateStr);
  if (!str) return Math.floor(Date.now() / 1000);
  const ts = Math.floor(new Date(str).getTime() / 1000);
  return isNaN(ts) ? Math.floor(Date.now() / 1000) : ts;
}

/**
 * Remove tags HTML e normaliza espaços.
 * Truncado a 500 chars para poupar espaço na base de dados.
 */
function cleanDesc(raw: unknown): string | null {
  const str = toStr(raw);
  if (!str) return null;
  return str.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500) || null;
}

/**
 * Extrai URL de imagem a partir dos campos media do item.
 * Tenta media:content, media:thumbnail e enclosure.
 */
function extractImage(item: Record<string, unknown>): string | null {
  // media:content pode ser objecto {url, type} ou array
  const mediaContent = item['media:content'];
  if (mediaContent) {
    const mc = Array.isArray(mediaContent) ? mediaContent[0] : mediaContent;
    const url = (mc as Record<string, unknown>)?.['@_url'];
    if (url) return toStr(url);
  }

  // media:thumbnail
  const mediaThumbnail = item['media:thumbnail'];
  if (mediaThumbnail) {
    const mt = Array.isArray(mediaThumbnail) ? mediaThumbnail[0] : mediaThumbnail;
    const url = (mt as Record<string, unknown>)?.['@_url'];
    if (url) return toStr(url);
  }

  // enclosure (RSS clássico)
  const enclosure = item['enclosure'] as Record<string, unknown> | undefined;
  if (enclosure) {
    const type = toStr(enclosure['@_type']);
    if (type.startsWith('image/')) return toStr(enclosure['@_url']);
  }

  return null;
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

/**
 * Faz fetch ao URL de um feed RSS/Atom com timeout de 10 segundos.
 * Devolve o XML como string ou lança erro se o fetch falhar.
 *
 * @param url - URL do feed RSS/Atom
 */
export async function fetchRSSFeed(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'grain-reader/1.0 (RSS aggregator)',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ao fazer fetch de ${url}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Parser RSS 2.0 ───────────────────────────────────────────────────────────

/**
 * Extrai artigos de um objecto RSS 2.0 já parseado pelo fast-xml-parser.
 */
function parseRSS(parsed: Record<string, unknown>, sourceId: string): RawArticle[] {
  const channel = (parsed['rss'] as Record<string, unknown>)?.['channel'] as Record<string, unknown>;
  if (!channel) return [];

  // items pode ser array ou objecto único
  const rawItems = channel['item'];
  if (!rawItems) return [];

  const items: Record<string, unknown>[] = Array.isArray(rawItems)
    ? rawItems
    : [rawItems];

  return items.flatMap((item): RawArticle[] => {
    const url = toStr(item['link']) || toStr(item['guid']);
    if (!url.startsWith('http')) return [];

    const title = toStr(item['title']);
    if (!title) return [];

    const rawDesc = toStr(item['description']) || toStr(item['content:encoded']);
    const dateStr = toStr(item['pubDate']) || toStr(item['dc:date']);
    const category = item['category'];
    const tag = category
      ? toStr(Array.isArray(category) ? category[0] : category)
      : null;

    return [{
      id: generateArticleId(url),
      source_id: sourceId,
      original_url: url,
      original_title: title,
      original_desc: cleanDesc(rawDesc),
      image_url: extractImage(item),
      published_at: parseDate(dateStr),
      tag: tag || null,
    }];
  });
}

// ─── Parser Atom ──────────────────────────────────────────────────────────────

/**
 * Extrai artigos de um objecto Atom já parseado pelo fast-xml-parser.
 */
function parseAtom(parsed: Record<string, unknown>, sourceId: string): RawArticle[] {
  const feed = parsed['feed'] as Record<string, unknown>;
  if (!feed) return [];

  const rawEntries = feed['entry'];
  if (!rawEntries) return [];

  const entries: Record<string, unknown>[] = Array.isArray(rawEntries)
    ? rawEntries
    : [rawEntries];

  return entries.flatMap((entry): RawArticle[] => {
    // link pode ser array de objectos ou objecto único
    const links = entry['link'];
    const linkList: Record<string, unknown>[] = Array.isArray(links)
      ? links
      : links ? [links as Record<string, unknown>] : [];

    // Preferir rel="alternate", fallback para qualquer link com href
    const linkObj =
      linkList.find(l => toStr(l['@_rel']) === 'alternate') ??
      linkList.find(l => toStr(l['@_rel']) !== 'self') ??
      linkList[0];

    const url = toStr(linkObj?.['@_href']);
    if (!url.startsWith('http')) return [];

    const title = toStr(entry['title']);
    if (!title) return [];

    const rawDesc = toStr(entry['summary']) || toStr(entry['content']);
    const dateStr = toStr(entry['published']) || toStr(entry['updated']);

    const category = entry['category'] as Record<string, unknown> | undefined;
    const tag = category ? toStr(category['@_term']) : null;

    return [{
      id: generateArticleId(url),
      source_id: sourceId,
      original_url: url,
      original_title: title,
      original_desc: cleanDesc(rawDesc),
      image_url: extractImage(entry),
      published_at: parseDate(dateStr),
      tag: tag || null,
    }];
  });
}

// ─── Função principal ─────────────────────────────────────────────────────────

// Configuração partilhada do parser — inicializada uma vez
const xmlParser = new XMLParser({
  ignoreAttributes: false,          // Precisamos dos atributos (url, href, rel, etc.)
  attributeNamePrefix: '@_',        // Atributos acessíveis como @_url, @_rel, etc.
  textNodeName: '#text',
  cdataPropName: '#cdata',          // Preservar conteúdo CDATA (descrições HTML)
  allowBooleanAttributes: true,
  parseAttributeValue: false,       // Manter atributos como strings
  trimValues: true,
  parseTagValue: false,             // Não converter números/datas — tratar tudo como string
  // Processar entidades HTML padrão mas não custom (evita XML bomb / limite)
  htmlEntities: true,
  processEntities: false,
});

/**
 * Faz parse de XML de um feed RSS ou Atom e devolve artigos normalizados.
 * Detecta automaticamente o formato (RSS 2.0 vs Atom) pelo elemento raiz.
 *
 * @param xml - Conteúdo XML do feed como string
 * @param sourceId - ID da fonte (ex: "bbc", "guardian")
 * @returns Array de artigos normalizados, do mais recente para o mais antigo
 */
export function parseArticles(xml: string, sourceId: string): RawArticle[] {
  let parsed: Record<string, unknown>;

  try {
    // Remover DOCTYPE e declarações de entidade antes do parse.
    // Alguns feeds (ex: Guardian) definem entidades custom no DOCTYPE
    // que disparam o limite de expansão do fast-xml-parser.
    const safeXml = xml.replace(/<!DOCTYPE[^>]*(?:>|(?:\[[\s\S]*?\]>))/gi, '');
    parsed = xmlParser.parse(safeXml) as Record<string, unknown>;
  } catch (err) {
    throw new Error(`XML inválido na fonte ${sourceId}: ${err instanceof Error ? err.message : String(err)}`);
  }

  let articles: RawArticle[];

  if ('feed' in parsed) {
    // Formato Atom — Guardian, Verge, Scientific American
    articles = parseAtom(parsed, sourceId);
  } else if ('rss' in parsed || 'rdf:RDF' in parsed) {
    // Formato RSS 2.0 ou RSS 1.0/RDF
    articles = parseRSS(parsed, sourceId);
  } else {
    const rootKey = Object.keys(parsed)[0] ?? 'desconhecido';
    throw new Error(`Formato desconhecido na fonte ${sourceId}: elemento raiz <${rootKey}>`);
  }

  // Ordenar do mais recente para o mais antigo
  return articles.sort((a, b) => b.published_at - a.published_at);
}
