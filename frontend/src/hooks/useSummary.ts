import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/react';
import { getAISummary } from '@/lib/api';

export function useSummary() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (articleId: string) => {
      // Verificar cache local primeiro
      const cached = qc.getQueryData<{ summary: string }>(['summary', articleId]);
      if (cached) return cached;

      const token = await getToken();
      const result = await getAISummary(articleId, token);
      return result;
    },
    onSuccess: (data, articleId) => {
      qc.setQueryData(['summary', articleId], data);
    },
  });
}
