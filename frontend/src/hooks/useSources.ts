import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/react';
import { getSources, toggleSource, suggestSource } from '@/lib/api';

export function useSources() {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: ['sources', isSignedIn],
    queryFn: async () => {
      const token = isSignedIn ? await getToken() : null;
      return getSources(token);
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useToggleSource() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ sourceId, active }: { sourceId: string; active: boolean }) => {
      const token = await getToken();
      if (!token) throw new Error('Autenticação necessária');
      return toggleSource(sourceId, active, token);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sources'] });
      qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

export function useSuggestSource() {
  const { getToken, isSignedIn } = useAuth();

  return useMutation({
    mutationFn: async (data: { name: string; url: string; rss_url?: string }) => {
      const token = isSignedIn ? await getToken() : null;
      return suggestSource(data, token);
    },
  });
}
