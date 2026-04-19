/**
 * StoryViewer — leitor de histórias fullscreen estilo Instagram.
 * Sem auto-avanço — o utilizador decide quando passar para a próxima.
 */

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth, useClerk } from '@clerk/react';
import { X, Sparkles, Plus, ExternalLink, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Article } from '@/types';
import { useSummary } from '@/hooks/useSummary';
import { useFollowTopic } from '@/hooks/useFollows';
import { markArticleSeen } from '@/components/StoryRail';
import { decodeEntities } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface StoryViewerProps {
  sourceId: string;
  articles: Article[];
  initialIndex?: number;
  onClose: () => void;
}

interface NavProps {
  goPrev: () => void;
  goNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(ts: number): string {
  const d = Math.floor(Date.now() / 1000) - ts;
  if (d < 60) return 'agora';
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return `${Math.floor(d / 86400)}d`;
}

// ─── Progress bars ────────────────────────────────────────────────────────────

function ProgressBars({ total, current }: { total: number; current: number }) {
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: 2.5,
            borderRadius: 2,
            background: i <= current ? '#fff' : 'rgba(255,255,255,0.25)',
            transition: 'background 0.15s',
          }}
        />
      ))}
    </div>
  );
}

// ─── ArticleActions ───────────────────────────────────────────────────────────

function ArticleActions({ article }: { article: Article }) {
  const { isSignedIn } = useAuth();
  const { openSignIn } = useClerk();
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [followDone, setFollowDone] = useState(false);

  const { state: summaryState, fetchSummary } = useSummary(article.id);
  const followMutation = useFollowTopic();

  const title = decodeEntities(article.translated_title ?? article.original_title);
  const desc  = decodeEntities(article.translated_desc  ?? article.original_desc);

  function handleSummary(e: React.MouseEvent) {
    e.stopPropagation();
    if (!summaryOpen && summaryState.status === 'idle') fetchSummary();
    setSummaryOpen(prev => !prev);
  }

  function handleFollow(e: React.MouseEvent) {
    e.stopPropagation();
    if (!isSignedIn) { openSignIn(); return; }
    if (followDone || followMutation.isPending) return;
    const text = `${title} ${desc ?? ''}`.slice(0, 300);
    followMutation.mutate({ text }, { onSuccess: () => setFollowDone(true) });
  }

  const btnBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '7px 12px', borderRadius: 10,
    fontSize: 12, fontWeight: 500, cursor: 'pointer',
    transition: 'background 0.15s, color 0.15s',
  };

  return (
    <div className="flex flex-col gap-3" data-no-tap>
      <AnimatePresence>
        {summaryOpen && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.15 }}
            style={{ padding: '10px 12px', borderRadius: 12, border: '1px solid #2a4a18', background: '#0e1a09', color: '#f0ece4', fontSize: 13, lineHeight: 1.55 }}
            onClick={e => e.stopPropagation()}
          >
            {summaryState.status === 'loading' && (
              <div className="flex items-center gap-2" style={{ color: '#888' }}>
                <Loader2 size={14} className="animate-spin" /><span>A gerar resumo…</span>
              </div>
            )}
            {summaryState.status === 'error' && (
              <div className="flex items-center justify-between gap-2">
                <p style={{ color: '#888', fontSize: 12 }}>{summaryState.message}</p>
                <button onClick={e => { e.stopPropagation(); fetchSummary(); }} style={{ color: '#c8a96e', fontSize: 12, flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer' }}>
                  Tentar de novo
                </button>
              </div>
            )}
            {summaryState.status === 'success' && <p>{summaryState.summary}</p>}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2">
        <button onClick={handleSummary} style={{
          ...btnBase,
          border: summaryOpen ? '1px solid #2a4a18' : '1px solid transparent',
          background: summaryOpen ? '#0e1a09' : 'rgba(255,255,255,0.1)',
          color: summaryOpen ? '#7ab832' : '#ddd',
        }}>
          {summaryState.status === 'loading' ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          Resumo IA
        </button>

        <button onClick={handleFollow} disabled={followMutation.isPending || followDone} style={{
          ...btnBase,
          border: followDone ? '1px solid rgba(200,169,110,0.4)' : '1px solid transparent',
          background: followDone ? 'rgba(200,169,110,0.12)' : 'rgba(255,255,255,0.1)',
          color: followDone ? '#c8a96e' : '#ddd',
          cursor: followDone ? 'default' : 'pointer',
        }}>
          {followMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          {followMutation.isError ? 'Erro — tenta de novo' : followDone ? 'A seguir' : 'Seguir'}
        </button>

        <a
          href={article.original_url} target="_blank" rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          style={{ ...btnBase, marginLeft: 'auto', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.07)', color: '#ddd', textDecoration: 'none' }}
        >
          <ExternalLink size={13} />
          Abrir artigo
        </a>
      </div>
    </div>
  );
}

// ─── SingleStory ─────────────────────────────────────────────────────────────

function SingleStory({ article, nav }: { article: Article; nav: NavProps }) {
  const [imgError, setImgError] = useState(false);
  const color = article.source_color ?? '#888';
  const title = decodeEntities(article.translated_title ?? article.original_title);
  const desc  = decodeEntities(article.translated_desc  ?? article.original_desc);
  const showImage = !!article.image_url && !imgError;

  const arrowStyle: React.CSSProperties = {
    width: 36, height: 36, borderRadius: '50%',
    background: 'rgba(0,0,0,0.45)',
    border: '1px solid rgba(255,255,255,0.15)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: '#fff',
    backdropFilter: 'blur(4px)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

      {/* ── Image — nav arrows positioned inside image area ── */}
      <div style={{
        width: '100%', position: 'relative', flexShrink: 0,
        background: showImage ? '#0a0a0a' : `${color}22`,
        overflow: 'hidden', maxHeight: '56vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 160,
      }}>
        {showImage ? (
          <img
            src={article.image_url!} alt=""
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', maxHeight: '56vh' }}
            onError={() => setImgError(true)}
          />
        ) : (
          <div style={{ width: '100%', minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 56, fontWeight: 800, color, opacity: 0.2 }}>
              {article.source_name[0]?.toUpperCase() ?? '?'}
            </span>
          </div>
        )}

        {/* Left arrow — inside image, centered vertically */}
        {nav.hasPrev && (
          <button
            onClick={e => { e.stopPropagation(); nav.goPrev(); }}
            style={{ ...arrowStyle, position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
            data-no-tap
            aria-label="Anterior"
          >
            <ChevronLeft size={18} />
          </button>
        )}

        {/* Right arrow — inside image, centered vertically */}
        {nav.hasNext && (
          <button
            onClick={e => { e.stopPropagation(); nav.goNext(); }}
            style={{ ...arrowStyle, position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}
            data-no-tap
            aria-label="Próximo"
          >
            <ChevronRight size={18} />
          </button>
        )}
      </div>

      {/* ── Content ── */}
      <div style={{ padding: '16px 16px 20px 16px', display: 'flex', flexDirection: 'column', background: '#0a0a0a', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f0ece4', lineHeight: 1.4, margin: 0, marginBottom: 8 }}>
          {title}
        </h2>
        {desc && (
          <p style={{
            fontSize: '0.82rem', color: 'rgba(240,236,228,0.55)', lineHeight: 1.5, margin: 0,
            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {desc}
          </p>
        )}
        <div style={{ flex: 1 }} />
        <ArticleActions article={article} />
      </div>
    </div>
  );
}

// ─── StoryViewer ─────────────────────────────────────────────────────────────

export default function StoryViewer({ sourceId, articles, initialIndex = 0, onClose }: StoryViewerProps) {
  const [index, setIndex] = useState(() => Math.max(0, Math.min(initialIndex, articles.length - 1)));
  const article = articles[index];
  const color = article?.source_color ?? '#888';

  useEffect(() => {
    if (article) markArticleSeen(sourceId, article.id);
  }, [sourceId, article]);

  const goNext = useCallback(() => {
    setIndex(prev => {
      if (prev < articles.length - 1) return prev + 1;
      onClose();
      return prev;
    });
  }, [articles.length, onClose]);

  const goPrev = useCallback(() => {
    setIndex(prev => (prev > 0 ? prev - 1 : prev));
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, goNext, goPrev]);

  function handleTap(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('[data-no-tap]')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const w = rect.width;
    if (relX < w * 0.4) goPrev();
    else if (relX > w * 0.6) goNext();
  }

  if (!article) return null;

  const nav: NavProps = {
    goPrev,
    goNext,
    hasPrev: index > 0,
    hasNext: index < articles.length - 1,
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'stretch', justifyContent: 'center' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        style={{ width: '100%', maxWidth: 480, background: '#000', display: 'flex', flexDirection: 'column', overflow: 'hidden', userSelect: 'none', position: 'relative' }}
        onClick={handleTap}
      >
        {/* ── Top bar ── */}
        <div style={{ padding: '10px 12px 8px', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, zIndex: 10 }} data-no-tap>
          <ProgressBars total={articles.length} current={index} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#f0ece4', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {article.source_name}
            </span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>
              {timeAgo(article.published_at)}
            </span>
            <button
              onClick={e => { e.stopPropagation(); onClose(); }}
              style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, color: '#fff' }}
              aria-label="Fechar"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ── Article content ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={article.id}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
          >
            <SingleStory article={article} nav={nav} />
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
