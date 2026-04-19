/**
 * ArticleCard — cartão de artigo no feed. Design inspirado em post do Instagram.
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

function faviconUrl(websiteUrl: string): string {
  try {
    const host = new URL(websiteUrl).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  } catch {
    return '';
  }
}

export default function ArticleCard({ article, isRead }: ArticleCardProps) {
  const { isSignedIn } = useAuth();
  const { openSignIn } = useClerk();
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [faviconError, setFaviconError] = useState(false);
  const [followDone, setFollowDone] = useState(false);

  const { state: summaryState, fetchSummary } = useSummary(article.id);
  const followMutation = useFollowTopic();

  const title = article.translated_title ?? article.original_title;
  const desc  = article.translated_desc  ?? article.original_desc;
  const color = article.source_color ?? '#888';
  const showImage = article.image_url && !imgError;
  const favicon = faviconUrl(article.original_url);

  function handleSummary() {
    if (!summaryOpen && summaryState.status === 'idle') {
      fetchSummary();
    }
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
      className={`flex flex-col rounded-2xl border border-border bg-bg2 overflow-hidden
        ${isRead ? 'opacity-60' : ''}`}
    >
      {/* ── Cabeçalho da fonte ── */}
      <div className="p-3 pb-2 flex items-center gap-2">
        {/* Favicon / dot */}
        <div
          className="w-7 h-7 rounded-full bg-bg3 flex items-center justify-center flex-shrink-0 overflow-hidden"
          style={{ outline: `2px solid ${color}33` }}
        >
          {favicon && !faviconError ? (
            <img
              src={favicon}
              alt={article.source_name}
              className="w-full h-full object-cover"
              onError={() => setFaviconError(true)}
            />
          ) : (
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: color }}
            />
          )}
        </div>

        {/* Nome da fonte */}
        <span className="text-sm font-medium text-text truncate">
          {article.source_name}
        </span>

        {/* Tag badge */}
        {article.tag && (
          <span className="text-[10px] border border-border px-1.5 rounded-full text-muted flex-shrink-0">
            {article.tag}
          </span>
        )}

        {/* Separador + tempo */}
        <span className="ml-auto text-xs text-muted flex-shrink-0">
          {timeAgo(article.published_at)}
        </span>
      </div>

      {/* ── Imagem / Placeholder ── */}
      <a
        href={article.original_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full"
        tabIndex={-1}
      >
        {showImage ? (
          <img
            src={article.image_url!}
            alt=""
            style={{ aspectRatio: '16/9', width: '100%', objectFit: 'cover', display: 'block' }}
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className="w-full flex items-center justify-center"
            style={{
              aspectRatio: '16/9',
              backgroundColor: color + '18',
            }}
          >
            {favicon && !faviconError ? (
              <img
                src={favicon}
                alt={article.source_name}
                className="w-8 h-8 opacity-30"
              />
            ) : (
              <span
                className="text-2xl font-bold opacity-20"
                style={{ color }}
              >
                {article.source_name[0]}
              </span>
            )}
          </div>
        )}
      </a>

      {/* ── Conteúdo ── */}
      <div className="p-3 pt-2 flex flex-col gap-2">
        {/* Título */}
        <a
          href={article.original_url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <h2 className="text-base font-semibold text-text leading-snug line-clamp-2 hover:text-gold transition-colors">
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
            {summaryState.status === 'loading' && (
              <div className="flex items-center gap-2 text-muted">
                <Loader2 size={14} className="animate-spin" />
                <span>A gerar resumo…</span>
              </div>
            )}
            {summaryState.status === 'error' && (
              <div className="flex items-center justify-between gap-2">
                <p className="text-muted text-xs">{summaryState.message}</p>
                <button
                  onClick={fetchSummary}
                  className="text-xs text-gold hover:text-gold2 flex-shrink-0"
                >
                  Tentar de novo
                </button>
              </div>
            )}
            {summaryState.status === 'success' && (
              <p>{summaryState.summary}</p>
            )}
          </div>
        )}

        {/* ── Acções ── */}
        <div className="flex items-center gap-1 pt-1">
          {/* Resumo IA */}
          <button
            onClick={handleSummary}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors
              ${summaryOpen
                ? 'text-green bg-green-bg border border-green-bdr'
                : summaryState.status === 'error'
                  ? 'text-red-400 border border-transparent'
                  : 'text-muted hover:text-green hover:bg-green-bg border border-transparent'
              }`}
          >
            {summaryState.status === 'loading'
              ? <Loader2 size={12} className="animate-spin" />
              : <Sparkles size={12} />
            }
            Resumo IA
          </button>

          {/* Seguir */}
          <button
            onClick={handleFollow}
            disabled={followMutation.isPending || followDone}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors
              ${followDone
                ? 'text-gold bg-gold-dim border border-gold/30'
                : followMutation.isError
                  ? 'text-red-400 border border-transparent'
                  : 'text-muted hover:text-gold hover:bg-gold-dim border border-transparent'
              }`}
          >
            {followMutation.isPending
              ? <Loader2 size={12} className="animate-spin" />
              : <Plus size={12} />
            }
            {followMutation.isError
              ? 'Erro — tenta de novo'
              : followDone ? 'A seguir' : 'Seguir'
            }
          </button>

          {/* Abrir artigo */}
          <a
            href={article.original_url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted hover:text-text hover:bg-bg3 border border-transparent hover:border-border transition-colors"
          >
            <ExternalLink size={12} />
            <span className="hidden sm:inline">Abrir</span>
          </a>
        </div>
      </div>
    </article>
  );
}
