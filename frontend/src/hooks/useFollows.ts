import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/react';
import {
  getFollowTopics,
  followTopic,
  unfollowTopic,
  getTopicArticles,
  markArticleRead,
} from '@/lib/api';

export function useFollowTopics() {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: ['follows'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Autenticação necessária');
      return getFollowTopics(token);
    },
    enabled: isSignedIn ?? false,
    staleTime: 2 * 60 * 1000,
  });
}

export function useFollowTopic() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ text, emoji }: { text: string; emoji?: string | null }) => {
      const token = await getToken();
      if (!token) throw new Error('Autenticação necessária');
      return followTopic(text, emoji ?? null, token);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['follows'] });
    },
  });
}

export function useUnfollowTopic() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (topicId: string) => {
      const token = await getToken();
      if (!token) throw new Error('Autenticação necessária');
      return unfollowTopic(topicId, token);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['follows'] });
    },
  });
}

export function useTopicArticles(topicId: string) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: ['follows', topicId, 'articles'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Autenticação necessária');
      return getTopicArticles(topicId, token);
    },
    enabled: isSignedIn === true && !!topicId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useMarkArticleRead() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ topicId, articleId }: { topicId: string; articleId: string }) => {
      const token = await getToken();
      if (!token) throw new Error('Autenticação necessária');
      return markArticleRead(topicId, articleId, token);
    },
    onSuccess: (_data, { topicId }) => {
      qc.invalidateQueries({ queryKey: ['follows', topicId, 'articles'] });
      qc.invalidateQueries({ queryKey: ['follows'] });
    },
  });
}
