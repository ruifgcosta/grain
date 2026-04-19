import { useState, useRef, useEffect, useMemo } from 'react';
import Layout from '@/components/Layout';
import ArticleCard from '@/components/ArticleCard';
import StoryRail, { getFirstUnseenIndex } from '@/components/StoryRail';
import StoryViewer from '@/components/StoryViewer';
import { useFeed } from '@/hooks/useFeed';
import { useSources } from '@/hooks/useSources';
import { Loader2, Search, X } from 'lucide-react';
import type { Article } from '@/types';

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-bg2 overflow-hidden animate-pulse">
      <div className="w-full bg-border2" style={{ aspectRatio: '16/9' }} />
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-border2" />
          <div className="h-3 w-24 rounded-full bg-border2" />
        </div>
        <div className="h-4 w-full rounded bg-border2" />
        <div className="h-4 w-3/4 rounded bg-border2" />
        <div className="h-3 w-full rounded bg-border2" />
      </div>
    </div>
  );
}

const NOW_SECONDS = () => Math.floor(Date.now() / 1000);
const TWENTY_FOUR_HOURS = 86400;

export default function Feed() {
  const { articles, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error } = useFeed();
  useSources(); // pre-warm cache
  const loaderRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeStorySourceId, setActiveStorySourceId] = useState<string | null>(null);
  const [seenVersion, setSeenVersion] = useState(0); // incrementa quando viewer fecha → StoryRail recalcula allSeen

  const recentArticles = useMemo<Article[]>(() => {
    const cutoff = NOW_SECONDS() - TWENTY_FOUR_HOURS;
    return articles.filter(a => a.published_at > cutoff);
  }, [articles]);

  const filteredArticles = useMemo<Article[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter(a => {
      const title = (a.translated_title ?? a.original_title).toLowerCase();
      const desc = (a.translated_desc ?? a.original_desc ?? '').toLowerCase();
      const source = a.source_name.toLowerCase();
      return title.includes(q) || desc.includes(q) || source.includes(q);
    });
  }, [articles, searchQuery]);

  const isSearching = searchQuery.trim().length > 0;

  const storyArticles = useMemo<Article[]>(() => {
    if (!activeStorySourceId) return [];
    // Ordenar do mais antigo para o mais recente (ordem cronológica nas stories)
    return recentArticles
      .filter(a => a.source_id === activeStorySourceId)
      .sort((a, b) => a.published_at - b.published_at);
  }, [activeStorySourceId, recentArticles]);

  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage && !isSearching) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, isSearching]);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col gap-6">

        {/* Search bar */}
        <div className="relative flex items-center">
          <Search size={16} className="absolute left-3 text-muted pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Pesquisar notícias..."
            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-border bg-bg2 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-border2"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 text-muted hover:text-text transition-colors"
              aria-label="Limpar pesquisa"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Stories rail — hidden during search */}
        {!isSearching && recentArticles.length > 0 && (
          <StoryRail
            articles={recentArticles}
            onOpenStory={(sourceId) => setActiveStorySourceId(sourceId)}
            seenVersion={seenVersion}
          />
        )}

        {/* Error state */}
        {error && (
          <div className="p-4 rounded-2xl border border-border bg-bg2 text-sm text-muted text-center">
            Não foi possível carregar o feed. Tenta de novo.
          </div>
        )}

        {/* Skeleton grid */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Article grid */}
        {!isLoading && (
          <>
            {filteredArticles.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredArticles.map(article => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            ) : isSearching ? (
              <p className="text-sm text-muted text-center py-12">
                Nenhuma notícia encontrada para «{searchQuery}»
              </p>
            ) : (
              <p className="text-sm text-muted text-center py-12">
                Activa algumas fontes para ver notícias aqui.
              </p>
            )}
          </>
        )}

        {/* Infinite scroll sentinel */}
        {!isSearching && (
          <div ref={loaderRef} className="py-8 flex justify-center">
            {isFetchingNextPage && <Loader2 size={20} className="text-muted animate-spin" />}
            {!hasNextPage && articles.length > 0 && !isFetchingNextPage && (
              <p className="text-xs text-muted">Chegaste ao fim do feed.</p>
            )}
          </div>
        )}
      </div>

      {/* Story viewer overlay */}
      {activeStorySourceId && storyArticles.length > 0 && (
        <StoryViewer
          sourceId={activeStorySourceId}
          articles={storyArticles}
          initialIndex={getFirstUnseenIndex(activeStorySourceId, storyArticles)}
          onClose={() => {
            setActiveStorySourceId(null);
            setSeenVersion(v => v + 1); // força StoryRail a recalcular allSeen
          }}
        />
      )}
    </Layout>
  );
}
