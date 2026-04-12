/**
 * Serviço de deduplicação — similaridade cosseno entre embeddings.
 *
 * Usado em dois contextos:
 * 1. fetchFeeds (Passo 2.4): evitar inserir artigos duplicados de fontes
 *    diferentes que cobrem a mesma notícia (threshold: DEDUP_THRESHOLD = 0.90)
 *
 * 2. matchFollows (Passo 2.9): calcular a proximidade semântica entre
 *    um tema seguido e artigos novos (threshold: SIMILARITY_THRESHOLD = 0.82)
 *
 * A similaridade cosseno é a métrica correcta para embeddings de texto:
 * - Devolve 1.0 para vectores idênticos
 * - Devolve 0.0 para vectores ortogonais (sem relação semântica)
 * - Devolve -1.0 para vectores opostos (raro em embeddings de texto)
 * - Não é afectada pela magnitude do vector — só pela direcção
 */

// ─── Similaridade cosseno ─────────────────────────────────────────────────────

/**
 * Calcula a similaridade cosseno entre dois vectores de embedding.
 *
 * Fórmula: cos(θ) = (A · B) / (|A| × |B|)
 *
 * @param a - Primeiro vector (número de dimensões: 3072 para gemini-embedding-001)
 * @param b - Segundo vector (tem de ter as mesmas dimensões que `a`)
 * @returns Valor entre -1 e 1 (na prática, entre 0 e 1 para texto)
 * @throws Se os vectores tiverem dimensões diferentes ou magnitude zero
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(
      `cosineSimilarity: dimensões incompatíveis (${a.length} vs ${b.length})`
    );
  }

  let dotProduct = 0;
  let magnitudeA  = 0;
  let magnitudeB  = 0;

  // Produto interno e magnitudes num único loop — mais eficiente
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  // Evitar divisão por zero (vector nulo não devia chegar aqui)
  if (magnitudeA === 0 || magnitudeB === 0) {
    console.error('[grain/dedup] Vector com magnitude zero — embedding inválido?');
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

// ─── Detecção de duplicados ───────────────────────────────────────────────────

/**
 * Verifica se um novo embedding é semanticamente duplicado de qualquer
 * embedding numa lista existente.
 *
 * Usado no fetchFeeds para não inserir artigos que já existem na base de
 * dados com outra URL mas o mesmo conteúdo (ex: Reuters e BBC a cobrir
 * a mesma notícia de agências).
 *
 * @param newEmbedding  - Embedding do artigo candidato a inserir
 * @param existingEmbeddings - Embeddings dos artigos já na base de dados
 * @param threshold     - Limiar de similaridade (default: 0.90 = DEDUP_THRESHOLD)
 * @returns true se o artigo for considerado duplicado
 */
export function isDuplicate(
  newEmbedding: number[],
  existingEmbeddings: number[][],
  threshold: number = 0.90
): boolean {
  for (const existing of existingEmbeddings) {
    if (cosineSimilarity(newEmbedding, existing) >= threshold) {
      return true;
    }
  }
  return false;
}

// ─── Matching semântico ───────────────────────────────────────────────────────

/**
 * Encontra os artigos mais similares a um tema seguido, acima de um threshold.
 *
 * Usado no matchFollows para encontrar artigos que correspondem
 * semanticamente a um tema que o utilizador está a seguir.
 *
 * @param topicEmbedding  - Embedding do tema seguido
 * @param articles        - Array de {id, embedding} dos artigos candidatos
 * @param threshold       - Limiar de similaridade (default: 0.82 = SIMILARITY_THRESHOLD)
 * @returns Array de matches com id e similarity, ordenado por similarity desc
 */
export function findMatches(
  topicEmbedding: number[],
  articles: Array<{ id: string; embedding: number[] }>,
  threshold: number = 0.82
): Array<{ id: string; similarity: number }> {
  const matches: Array<{ id: string; similarity: number }> = [];

  for (const article of articles) {
    const similarity = cosineSimilarity(topicEmbedding, article.embedding);
    if (similarity >= threshold) {
      matches.push({ id: article.id, similarity });
    }
  }

  // Ordenar do mais similar para o menos similar
  return matches.sort((a, b) => b.similarity - a.similarity);
}
