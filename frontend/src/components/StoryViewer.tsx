/**
 * StoryViewer — leitor de histórias fullscreen estilo Instagram.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth, useClerk } from '@clerk/react';
import { X, Sparkles, Plus, ExternalLink, Loader2 } from 'lucide-react';
import type { Article } from '@/types';
import { useSummary } from '@/hooks/useSummary';
import { useFollowTopic } from '@/hooks/useFollows';
import { markSourceSeen } from '@/components/StoryRail';

// ─── Types ───────────────────────────────────────────────────────────────────

interface StoryViewerProps {
  sourceId: string;
  articles: Article[];
  initialIndex?: number;
  onClose: () => void;
  onNext?: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(ts: number): string {
  const d = Math.floor(Date.now() / 1000) - ts;
  if (d < 60) return 'agora';
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return `${Math.floor(d / 86400)}d`;
}

// ─── Progress bar for a single story ─────────────────────────────────────────

const STORY_DURATION_MS = 6000;

function ProgressBar({
  state,
  duration,
}: {
  state: 'past' | 'active' | 'future';
  duration: number;
}) {
  return (
    <div
      style={{
        flex: 1,
        height: 2.5,
        borderRadius: 2,
        background: 'rgba(255,255,255,0.25)',
        overflow: 'hidden',
      }}
    >
      <motion.div
        style={{ height: '100%', background: '#fff', borderRadius: 2 }}
        initial={{ width: state === 'past' ? '100%' : '0%' }}
        animate={{ width: state === 'past' ? '100%' : state === 'active' ? '100%' : '0%' }}
        transition={
          state === 'active'
            ? { duration: duration / 1000, ease: 'linear' }
            : { duration: 0 }
        }
      />
    </div>
  );
}

// ─── ArticleActions (per-article action row) ──────────────────────────────────

function ArticleActions({ article }: { article: Article }) {
  const { isSignedIn } = useAuth();
  const { openSignIn } = useClerk();
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [followDone, setFollowDone] = useState(false);

  const { state: summaryState, fetchSummary } = useSummary(article.id);
  const followMutation = useFollowTopic();

  const title = article.translated_title ?? article.original_title;
  const desc  = article.translated_desc  ?? article.original_desc;

  function handleSummary(e: React.MouseEvent) {
    e.stopPropagation();
    if (!summaryOpen && summaryState.status === 'idle') {
      fetchSummary();
    }
    setSummaryOpen(prev => !prev);
  }

  function handleFollow(e: React.MouseEvent) {
    e.stopPropagation();
    if (!isSignedIn) { openSignIn(); return; }
    if (followDone || followMutation.isPending) return;
    const text = `${title} ${desc ?? ''}`.slice(0, 300);
    followMutation.mutate({ text }, {
      onSuccess: () => setFollowDone(true),
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* AI Summary expandable panel */}
      <AnimatePresence>
        {summaryOpen && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            className="p-3 rounded-xl border text-sm leading-relaxed"
            style={{ background: '#0e1a09', borderColor: '#2a4a18', color: '#f0ece4' }}
            onClick={e => e.stopPropagation()}
          >
            {summaryState.status === 'loading' && (
              <div className="flex items-center gap-2" style={{ color: '#888' }}>
                <Loader2 size={14} className="animate-spin" />
                <span>A gerar resumo…</span>
              </div>
            )}
            {summaryState.status === 'error' && (
              <div className="flex items-center justify-between gap-2">
                <p style={{ color: '#888', fontSize: 12 }}>{summaryState.message}</p>
                <button
                  onClick={e => { e.stopPropagation(); fetchSummary(); }}
                  style={{ color: '#c8a96e', fontSize: 12, flexShrink: 0 }}
                >
                  Tentar de novo
                </button>
              </div>
            )}
            {summaryState.status === 'success' && (
              <p>{summaryState.summary}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {/* Resumo IA */}
        <button
          onClick={handleSummary}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 10px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 500,
            border: summaryOpen ? '1px solid #2a4a18' : '1px solid transparent',
            background: summaryOpen ? '#0e1a09' : 'rgba(255,255,255,0.08)',
            color: summaryOpen ? '#7ab832' : '#ccc',
            cursor: 'pointer',
            transition: 'background 0.15s, color 0.15s',
          }}
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
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 10px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 500,
            border: followDone ? '1px solid rgba(200,169,110,0.3)' : '1px solid transparent',
            background: followDone ? 'rgba(200,169,110,0.12)' : 'rgba(255,255,255,0.08)',
            color: followDone ? '#c8a96e' : '#ccc',
            cursor: followDone ? 'default' : 'pointer',
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          {followMutation.isPending
            ? <Loader2 size={12} className="animate-spin" />
            : <Plus size={12} />
          }
          {followMutation.isError ? 'Erro — tenta de novo' : followDone ? 'A seguir' : 'Seguir'}
        </button>

        {/* Abrir artigo */}
        <a
          href={article.original_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 10px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 500,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.06)',
            color: '#ccc',
            textDecoration: 'none',
            transition: 'background 0.15s',
          }}
        >
          <ExternalLink size={12} />
          Abrir artigo
        </a>
      </div>
    </div>
  );
}

// ─── SingleStory ─────────────────────────────────────────────────────────────

function SingleStory({ article }: { article: Article }) {
  const [imgError, setImgError] = useState(false);
  const color = article.source_color ?? '#888';
  const title = article.translated_title ?? article.original_title;
  const showImage = !!article.image_url && !imgError;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Image or placeholder */}
      <div
        style={{
          width: '100%',
          height: '55vh',
          minHeight: 200,
          position: 'relative',
          flexShrink: 0,
          background: showImage ? '#000' : `${color}22`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {showImage ? (
          <img
            src={article.image_url!}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={() => setImgError(true)}
          />
        ) : (
          <span
            style={{
              fontSize: 64,
              fontWeight: 800,
              color,
              opacity: 0.2,
              fontFamily: 'Syne, sans-serif',
            }}
          >
            {article.source_name[0]?.toUpperCase() ?? '?'}
          </span>
        )}

        {/* Bottom gradient */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 120,
            background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Bottom content panel */}
      <div
        style={{
          padding: '16px 16px 24px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          background: '#000',
          flex: 1,
        }}
      >
        {/* Title */}
        <h2
          style={{
            fontSize: '1.1rem',
            fontWeight: 700,
            color: '#f0ece4',
            lineHeight: 1.35,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            margin: 0,
          }}
        >
          {title}
        </h2>

        {/* Actions */}
        <ArticleActions article={article} />
      </div>
    </div>
  );
}

// ─── StoryViewer ─────────────────────────────────────────────────────────────

export default function StoryViewer({
  sourceId,
  articles,
  initialIndex = 0,
  onClose,
  onNext,
}: StoryViewerProps) {
  const [index, setIndex] = useState(() => Math.min(initialIndex, Math.max(0, articles.length - 1)));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const article = articles[index];
  const color = article?.source_color ?? '#888';

  // Mark all articles as seen when the viewer opens
  useEffect(() => {
    if (articles.length > 0) {
      markSourceSeen(sourceId, articles.map(a => a.id));
    }
  }, [sourceId, articles]);

  // Auto-advance timer
  function clearTimer() {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function scheduleAdvance() {
    clearTimer();
    timerRef.current = setTimeout(() => {
      goNext();
    }, STORY_DURATION_MS);
  }

  const goNext = useCallback(() => {
    setIndex(prev => {
      if (prev < articles.length - 1) {
        return prev + 1;
      } else {
        // Last article — close or call onNext
        clearTimer();
        if (onNext) {
          onNext();
        } else {
          onClose();
        }
        return prev;
      }
    });
  }, [articles.length, onClose, onNext]);

  const goPrev = useCallback(() => {
    setIndex(prev => {
      if (prev > 0) return prev - 1;
      return prev;
    });
  }, []);

  // Restart timer whenever index changes
  useEffect(() => {
    scheduleAdvance();
    return clearTimer;
  }, [index]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { clearTimer(); onClose(); }
      else if (e.key === 'ArrowRight') { clearTimer(); goNext(); }
      else if (e.key === 'ArrowLeft') { clearTimer(); goPrev(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, goNext, goPrev]);

  // Tap zones: left 40% = prev, right 40% = next, middle 20% = ignore
  function handleTap(e: React.MouseEvent<HTMLDivElement>) {
    // Ignore taps on interactive children
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('[data-no-tap]')
    ) return;

    const x = e.clientX;
    const w = window.innerWidth;
    if (x < w * 0.4) {
      clearTimer();
      goPrev();
    } else if (x > w * 0.6) {
      clearTimer();
      goNext();
    }
  }

  if (!article) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="story-viewer"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          background: '#000',
          display: 'flex',
          flexDirection: 'column',
          userSelect: 'none',
        }}
        onClick={handleTap}
      >
        {/* ── Top bar ── */}
        <div
          style={{
            padding: '12px 12px 8px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            flexShrink: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)',
            position: 'relative',
            zIndex: 10,
          }}
          data-no-tap
        >
          {/* Progress bars */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {articles.map((_, i) => (
              <ProgressBar
                key={i}
                duration={STORY_DURATION_MS}
                state={i < index ? 'past' : i === index ? 'active' : 'future'}
              />
            ))}
          </div>

          {/* Source name + time + close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Color dot + source name */}
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: color,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#f0ece4',
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {article.source_name}
            </span>

            {/* Time ago */}
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', flexShrink: 0 }}>
              {timeAgo(article.published_at)}
            </span>

            {/* Close button */}
            <button
              onClick={e => { e.stopPropagation(); clearTimer(); onClose(); }}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                color: '#fff',
              }}
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Article content ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={article.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
          >
            <SingleStory article={article} />
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
