/**
 * Hook useStories — artigos das últimas 24h para o StoryRail.
 * Usa um endpoint dedicado que devolve até 200 artigos, sem paginação.
 * Refetch a cada 5 minutos (alinhado com o TTL do cache no backend).
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/react';
import { getStoriesArticles } from '@/lib/api';
import type { Article } from '@/types';

export function useStories() {
  const { getToken, isSignedIn, isLoaded } = useAuth();

  const query = useQuery({
    queryKey: ['stories', isSignedIn],
    enabled: isLoaded,
    queryFn: async () => {
      const token = isSignedIn ? await getToken() : null;
      return getStoriesArticles(token);
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    select: (data) => data.articles as Article[],
  });

  return {
    articles: query.data ?? [],
    isLoading: query.isLoading,
  };
}
