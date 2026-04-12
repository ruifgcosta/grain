/**
 * Job cleanup — corre diariamente às 03:00 via Cloudflare Cron Trigger.
 *
 * Operações de limpeza:
 * 1. Apagar embeddings de artigos expirados
 * 2. Apagar resumos IA de artigos expirados
 * 3. Apagar artigos expirados (TTL de 7 dias para normais, 90 para follows)
 * 4. Apagar follow_matches de temas inactivos ou artigos expirados
 * 5. Apagar sugestões de fontes com mais de 90 dias
 * 6. Apagar entradas antigas do fetch_log (manter 30 dias)
 * 7. Invalidar cache KV global
 */

import type { Env } from '../types/index';

export async function runCleanup(env: Env): Promise<void> {
  const startedAt = Date.now();
  const now = Math.floor(Date.now() / 1000);
  console.log('[grain/cleanup] A iniciar limpeza —', new Date().toISOString());

  let totalDeleted = 0;

  // ── 1. Embeddings de artigos expirados ────────────────────────────────────
  const { meta: embMeta } = await env.DB
    .prepare(`
      DELETE FROM article_embeddings
      WHERE article_id IN (SELECT id FROM articles WHERE expires_at < ?)
    `)
    .bind(now)
    .run();
  totalDeleted += embMeta.changes;
  console.log(`[grain/cleanup] Embeddings removidos: ${embMeta.changes}`);

  // ── 2. Resumos IA de artigos expirados ────────────────────────────────────
  const { meta: sumMeta } = await env.DB
    .prepare(`
      DELETE FROM ai_summaries
      WHERE article_id IN (SELECT id FROM articles WHERE expires_at < ?)
    `)
    .bind(now)
    .run();
  totalDeleted += sumMeta.changes;
  console.log(`[grain/cleanup] Resumos IA removidos: ${sumMeta.changes}`);

  // ── 3. Follow_matches de artigos expirados ou temas inactivos ─────────────
  const { meta: matchMeta } = await env.DB
    .prepare(`
      DELETE FROM follow_matches
      WHERE article_id IN (SELECT id FROM articles WHERE expires_at < ?)
         OR topic_id IN (SELECT id FROM follow_topics WHERE is_active = 0)
    `)
    .bind(now)
    .run();
  totalDeleted += matchMeta.changes;
  console.log(`[grain/cleanup] Follow matches removidos: ${matchMeta.changes}`);

  // ── 4. Artigos expirados ──────────────────────────────────────────────────
  const { meta: artMeta } = await env.DB
    .prepare('DELETE FROM articles WHERE expires_at < ?')
    .bind(now)
    .run();
  totalDeleted += artMeta.changes;
  console.log(`[grain/cleanup] Artigos removidos: ${artMeta.changes}`);

  // ── 5. Sugestões antigas (90 dias) ────────────────────────────────────────
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60;
  const { meta: sugMeta } = await env.DB
    .prepare("DELETE FROM source_suggestions WHERE created_at < ? AND status != 'pending'")
    .bind(ninetyDaysAgo)
    .run();
  totalDeleted += sugMeta.changes;
  console.log(`[grain/cleanup] Sugestões removidas: ${sugMeta.changes}`);

  // ── 6. Fetch_log antigo (30 dias) ─────────────────────────────────────────
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60;
  const { meta: logMeta } = await env.DB
    .prepare('DELETE FROM fetch_log WHERE fetched_at < ?')
    .bind(thirtyDaysAgo)
    .run();
  totalDeleted += logMeta.changes;
  console.log(`[grain/cleanup] Fetch log removido: ${logMeta.changes}`);

  // ── 7. Invalidar cache KV global ─────────────────────────────────────────
  await env.CACHE.delete('feed:global');

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`[grain/cleanup] Concluído em ${elapsed}s — ${totalDeleted} registos removidos`);
}
