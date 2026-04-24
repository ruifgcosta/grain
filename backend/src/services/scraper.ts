/**
 * Serviço de extracção de texto de artigos.
 * Usa o Jina.ai Reader para obter o texto limpo de qualquer URL público.
 * Sem API key funciona para baixo volume (testing).
 * Com JINA_API_KEY: limite mais alto (configurar via wrangler secret).
 */

const JINA_BASE = 'https://r.jina.ai/';
const MAX_CHARS = 4000;
const TIMEOUT_MS = 18000;

export async function fetchArticleText(url: string, apiKey?: string): Promise<string> {
  try {
    const jinaUrl = `${JINA_BASE}${encodeURIComponent(url)}`;
    const headers: Record<string, string> = {
      'Accept': 'text/plain',
      'X-Return-Format': 'text',
      'X-Timeout': '15',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(jinaUrl, { headers, signal: ctrl.signal });
      if (!response.ok) throw new Error(`Jina ${response.status}`);
      const text = await response.text();
      const trimmed = text.trim();
      if (trimmed.length < 100) throw new Error('Texto insuficiente');
      return trimmed.slice(0, MAX_CHARS);
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    console.warn(`[grain/scraper] fetchArticleText falhou para ${url}:`, (err as Error).message);
    return ''; // caller usa RSS snippet como fallback
  }
}
