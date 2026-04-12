/**
 * Job matchFollows — corre a cada hora via Cloudflare Cron Trigger.
 *
 * Fluxo por execução:
 * 1. Buscar todos os temas activos com embedding (follow_topics)
 * 2. Buscar artigos recentes com embedding (últimas 25 horas, para não falhar
 *    em caso de falha na hora anterior)
 * 3. Para cada tema × artigo: calcular similaridade cosseno
 * 4. Inserir matches acima do threshold em follow_matches (INSERT OR IGNORE)
 * 5. Actualizar last_match_at nos temas com novos matches
 *
 * Não usa Gemini — toda a computação é local (cosine similarity em JS).
 * Complexidade: O(temas × artigos) — escalável até ~100 temas × 1000 artigos.
 */

import { cosineSimilarity } from '../services/dedup';
import type { Env } from '../types/index';

// Threshold de similaridade para considerar um match
const SIMILARITY_THRESHOLD = 0.82;

// Janela de artigos a considerar (25 horas em segundos)
const ARTICLE_WINDOW_SECONDS = 25 * 60 * 60;

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface TopicRow {
  id: string;
  user_id: string;
  name: string;
  embedding: string; // JSON serializado
}

interface ArticleEmbeddingRow {
  article_id: string;
  embedding: string; // JSON serializado
}

// ─── Job principal ────────────────────────────────────────────────────────────

/**
 * Executa o job de matching semântico entre temas seguidos e artigos.
 * Chamado pelo handler `scheduled` no index.ts a cada hora.
 */
export async function runMatchFollows(env: Env): Promise<void> {
  const startedAt = Date.now();
  console.log('[grain/matchFollows] A iniciar matching —', new Date().toISOString());

  // ── 1. Buscar temas activos ───────────────────────────────────────────────
  const { results: topics } = await env.DB
    .prepare('SELECT id, user_id, name, embedding FROM follow_topics WHERE is_active = 1')
    .all<TopicRow>();

  if (topics.length === 0) {
    console.log('[grain/matchFollows] Nenhum tema activo');
    return;
  }

  // ── 2. Buscar artigos recentes com embedding ──────────────────────────────
  const since = Math.floor(Date.now() / 1000) - ARTICLE_WINDOW_SECONDS;

  const { results: articleEmbeddings } = await env.DB
    .prepare(`
      SELECT ae.article_id, ae.embedding
      FROM article_embeddings ae
      JOIN articles a ON a.id = ae.article_id
      WHERE a.fetched_at > ?
        AND a.expires_at > unixepoch()
    `)
    .bind(since)
    .all<ArticleEmbeddingRow>();

  if (articleEmbeddings.length === 0) {
    console.log('[grain/matchFollows] Nenhum artigo recente com embedding');
    return;
  }

  console.log(`[grain/matchFollows] ${topics.length} temas × ${articleEmbeddings.length} artigos`);

  // Pre-parsear embeddings dos artigos uma vez (evitar JSON.parse repetido)
  const parsedArticleEmbeddings = articleEmbeddings.map(ae => ({
    article_id: ae.article_id,
    embedding: JSON.parse(ae.embedding) as number[],
  }));

  // ── 3. Calcular matches ───────────────────────────────────────────────────
  const threshold = parseFloat(env.SIMILARITY_THRESHOLD) || SIMILARITY_THRESHOLD;
  const now = Math.floor(Date.now() / 1000);

  const matchStmts: ReturnType<D1Database['prepare']>[] = [];
  const topicIdsWithMatches = new Set<string>();
  let totalMatches = 0;

  for (const topic of topics) {
    let topicEmbedding: number[];
    try {
      topicEmbedding = JSON.parse(topic.embedding) as number[];
    } catch {
      console.warn(`[grain/matchFollows] Embedding inválido para tema ${topic.id}`);
      continue;
    }

    for (const article of parsedArticleEmbeddings) {
      let similarity: number;
      try {
        similarity = cosineSimilarity(topicEmbedding, article.embedding);
      } catch {
        // Dimensões incompatíveis — skip silencioso
        continue;
      }

      if (similarity >= threshold) {
        const matchId = crypto.randomUUID();
        matchStmts.push(
          env.DB
            .prepare(`
              INSERT OR IGNORE INTO follow_matches
                (id, topic_id, article_id, similarity, is_read, matched_at)
              VALUES (?, ?, ?, ?, 0, ?)
            `)
            .bind(matchId, topic.id, article.article_id, similarity, now)
        );
        topicIdsWithMatches.add(topic.id);
        totalMatches++;
      }
    }
  }

  // ── 4. Inserir matches em batch ───────────────────────────────────────────
  if (matchStmts.length > 0) {
    // Chunk de 100 para respeitar o limite do D1 batch
    for (let i = 0; i < matchStmts.length; i += 100) {
      await env.DB.batch(matchStmts.slice(i, i + 100));
    }

    // ── 5. Actualizar last_match_at nos temas com novos matches ───────────
    const updateStmts = [...topicIdsWithMatches].map(topicId =>
      env.DB
        .prepare('UPDATE follow_topics SET last_match_at = ? WHERE id = ?')
        .bind(now, topicId)
    );

    if (updateStmts.length > 0) {
      await env.DB.batch(updateStmts);
    }
  }

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(
    `[grain/matchFollows] Concluído em ${elapsed}s — ` +
    `${totalMatches} matches em ${topicIdsWithMatches.size} temas`
  );
}
