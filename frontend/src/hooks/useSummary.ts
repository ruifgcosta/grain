import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/react';
import { getAISummary } from '@/lib/api';

type SummaryState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; summary: string; cached: boolean }
  | { status: 'error'; message: string };

/**
 * Hook de resumo IA por artigo — sem useMutation para evitar
 * estado partilhado entre múltiplos cards.
 */
export function useSummary(articleId: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const [state, setState] = useState<SummaryState>(() => {
    // Verificar cache local do React Query
    const cached = qc.getQueryData<{ summary: string; cached: boolean }>(['summary', articleId]);
    if (cached) return { status: 'success', ...cached };
    return { status: 'idle' };
  });

  async function fetchSummary() {
    if (state.status === 'loading') return;
    setState({ status: 'loading' });
    try {
      const token = await getToken();
      const result = await getAISummary(articleId, token);
      qc.setQueryData(['summary', articleId], result);
      setState({ status: 'success', summary: result.summary, cached: result.cached });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao gerar resumo';
      setState({ status: 'error', message });
    }
  }

  return { state, fetchSummary };
}
