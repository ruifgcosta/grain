/**
 * ArticleCard — cartão de artigo no feed.
 */

import { useState } from 'react';
import { useAuth, useClerk } from '@clerk/react';
import { Sparkles, Plus, ExternalLink, Loader2 } from 'lucide-react';
import type { Article } from '@/types';
import { useSummary } from '@/hooks/useSummary';
import { useFollowTopic } from '@/hooks/useFollows';

interface ArticleCardProps {
  article: Article;
  topicId?: string;
  isRead?: boolean;
}

function timeAgo(timestamp: number): string {
  const diff = Math.floor(Date.now() / 1000) - timestamp;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function ArticleCard({ article, isRead }: ArticleCardProps) {
  const { isSignedIn } = useAuth();
  const { openSignIn } = useClerk();
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [followDone, setFollowDone] = useState(false);

  const summaryMutation = useSummary();
  const followMutation = useFollowTopic();

  const title = article.translated_title ?? article.original_title;
  const desc  = article.translated_desc  ?? article.original_desc;
  const color = article.source_color ?? '#555';

  function handleSummary() {
    if (!summaryOpen) summaryMutation.mutate(article.id);
    setSummaryOpen(prev => !prev);
  }

  function handleFollow() {
    if (!isSignedIn) { openSignIn(); return; }
    if (followDone) return;
    const text = `${title} ${desc ?? ''}`.slice(0, 300);
    followMutation.mutate({ text }, {
      onSuccess: () => setFollowDone(true),
    });
  }

  return (
    <article
      className={`group relative flex flex-col gap-3 rounded-card border transition-colors overflow-hidden
        ${isRead
          ? 'border-border bg-bg2/50 opacity-60'
          : 'border-border bg-bg2 hover:border-border2'
        }`}
    >
      {/* ── Imagem de capa ── */}
      {article.image_url && (
        <a
          href={article.original_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full overflow-hidden"
        >
          <img
            src={article.image_url}
            alt=""
            className="w-full h-40 object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            loading="lazy"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </a>
      )}

      {/* ── Corpo do card ── */}
      <div className="flex flex-col gap-3 p-4 pt-3">
        {/* Cabeçalho: fonte + tempo */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs text-muted truncate font-medium">
              {article.source_name}
            </span>
            {article.tag && (
              <span className="hidden sm:inline text-xs text-muted border border-border px-1.5 py-0.5 rounded-full truncate">
                {article.tag}
              </span>
            )}
          </div>
          <span className="text-xs text-muted flex-shrink-0">
            {timeAgo(article.published_at)}
          </span>
        </div>

        {/* Título */}
        <a
          href={article.original_url}
          target="_blank"
          rel="noopener noreferrer"
          className="group/link"
        >
          <h2 className="text-base font-semibold text-text leading-snug group-hover/link:text-gold transition-colors line-clamp-3">
            {title}
          </h2>
        </a>

        {/* Descrição */}
        {desc && (
          <p className="text-sm text-muted leading-relaxed line-clamp-2">
            {desc}
          </p>
        )}

        {/* Resumo IA expandido */}
        {summaryOpen && (
          <div className="p-3 rounded-xl bg-green-bg border border-green-bdr text-sm text-text leading-relaxed">
            {summaryMutation.isPending && (
              <div className="flex items-center gap-2 text-muted">
                <Loader2 size={14} className="animate-spin" />
                <span>A gerar resumo…</span>
              </div>
            )}
            {summaryMutation.isError && (
              <p className="text-muted">Não foi possível gerar o resumo. Tenta de novo.</p>
            )}
            {summaryMutation.data && (
              <p>{summaryMutation.data.summary}</p>
            )}
          </div>
        )}

        {/* Acções */}
        <div className="flex items-center gap-2 pt-0.5">
          {/* Resumo IA */}
          <button
            onClick={handleSummary}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors
              ${summaryOpen
                ? 'text-green bg-green-bg border border-green-bdr'
                : 'text-muted hover:text-green hover:bg-green-bg border border-transparent hover:border-green-bdr'
              }`}
          >
            <Sparkles size={12} />
            Resumo IA
          </button>

          {/* Follow */}
          <button
            onClick={handleFollow}
            disabled={followMutation.isPending || followDone}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors
              ${followDone
                ? 'text-gold bg-gold-dim border border-gold/30'
                : 'text-muted hover:text-gold hover:bg-gold-dim border border-transparent'
              }`}
          >
            {followMutation.isPending
              ? <Loader2 size={12} className="animate-spin" />
              : <Plus size={12} />
            }
            {followDone ? 'A seguir' : 'Seguir'}
          </button>

          {/* Abrir artigo — destaque maior */}
          <a
            href={article.original_url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted hover:text-text hover:bg-bg3 border border-transparent hover:border-border transition-colors"
          >
            <ExternalLink size={12} />
            Abrir
          </a>
        </div>
      </div>
    </article>
  );
}
