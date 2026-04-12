/**
 * Página /feed — feed principal de artigos.
 * Infinite scroll com cursor (published_at).
 */

import { useEffect, useRef } from 'react';
import Layout from '@/components/Layout';
import ArticleCard from '@/components/ArticleCard';
import { useFeed } from '@/hooks/useFeed';
import { Loader2 } from 'lucide-react';

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-3 p-4 rounded-card border border-border bg-bg2 animate-[grain-pulse_1.5s_ease-in-out_infinite]">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-border2" />
        <div className="h-3 w-20 rounded bg-border2" />
      </div>
      <div className="h-5 w-full rounded bg-border2" />
      <div className="h-5 w-3/4 rounded bg-border2" />
      <div className="h-3 w-full rounded bg-border2" />
      <div className="h-3 w-5/6 rounded bg-border2" />
    </div>
  );
}

export default function Feed() {
  const { articles, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error } = useFeed();
  const loaderRef = useRef<HTMLDivElement>(null);

  // Intersection observer para infinite scroll
  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* ── Cabeçalho ── */}
        <div className="mb-6">
          <h1 className="font-display font-extrabold text-2xl text-text">Feed</h1>
          <p className="text-sm text-muted mt-1">Notícias curadas, sem algoritmos.</p>
        </div>

        {/* ── Erro ── */}
        {error && (
          <div className="p-4 rounded-card border border-border bg-bg2 text-sm text-muted text-center">
            Não foi possível carregar o feed. Tenta de novo.
          </div>
        )}

        {/* ── Skeletons ── */}
        {isLoading && (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* ── Artigos ── */}
        {!isLoading && (
          <div className="flex flex-col gap-3">
            {articles.map(article => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}

        {/* ── Sentinela infinite scroll ── */}
        <div ref={loaderRef} className="py-8 flex justify-center">
          {isFetchingNextPage && <Loader2 size={20} className="text-muted animate-spin" />}
          {!hasNextPage && articles.length > 0 && (
            <p className="text-xs text-muted">Chegaste ao fim do feed.</p>
          )}
        </div>
      </div>
    </Layout>
  );
}
