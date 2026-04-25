/**
 * Hook useFeed — feed paginado com infinite scroll.
 * Usa useInfiniteQuery para carregar mais artigos por cursor.
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/react';
import { getFeed } from '@/lib/api';
import type { Article } from '@/types';

export function useFeed() {
  const { getToken, isSignedIn, isLoaded } = useAuth();

  const query = useInfiniteQuery({
    queryKey: ['feed', isSignedIn],
    enabled: isLoaded,
    queryFn: async ({ pageParam }) => {
      const token = isSignedIn ? await getToken() : null;
      return getFeed(pageParam as number | undefined, token);
    },
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage.has_more) return undefined;
      const last = lastPage.articles.at(-1);
      return last?.published_at;
    },
    staleTime: 5 * 60 * 1000,
  });

  const articles: Article[] = query.data?.pages.flatMap(p => p.articles) ?? [];

  return {
    articles,
    isLoading: query.isLoading || !isLoaded,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    error: query.error,
  };
}
