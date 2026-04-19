/**
 * StoryRail — fila horizontal estilo Instagram de fontes com artigos recentes.
 */

import { useMemo } from 'react';
import type { Article } from '@/types';

// ─── localStorage helpers ────────────────────────────────────────────────────

function todayKey(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `grain_seen_${yyyy}-${mm}-${dd}`;
}

function readSeenStore(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(todayKey());
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string[]>;
  } catch {
    return {};
  }
}

function writeSeenStore(store: Record<string, string[]>): void {
  try {
    localStorage.setItem(todayKey(), JSON.stringify(store));
  } catch { /* quota exceeded */ }
}

/** Marca um artigo individual como visto. Chamado pelo StoryViewer ao navegar. */
export function markArticleSeen(sourceId: string, articleId: string): void {
  const store = readSeenStore();
  const existing = store[sourceId] ?? [];
  if (!existing.includes(articleId)) {
    store[sourceId] = [...existing, articleId];
    writeSeenStore(store);
  }
}

/** Retorna o índice do primeiro artigo não visto (para retomar onde ficou). */
export function getFirstUnseenIndex(sourceId: string, articles: Article[]): number {
  const seen = new Set(readSeenStore()[sourceId] ?? []);
  const idx = articles.findIndex(a => !seen.has(a.id));
  return idx === -1 ? 0 : idx; // se todos vistos, começa do início
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface SourceGroup {
  sourceId: string;
  sourceName: string;
  sourceColor: string | null;
  sourceLogo: string | null;
  websiteUrl: string;
  articleIds: string[];
  allSeen: boolean;
}

interface StoryRailProps {
  articles: Article[];
  onOpenStory: (sourceId: string) => void;
  /** Incrementar para forçar re-cálculo de allSeen após fechar o viewer */
  seenVersion?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const WINDOW_24H = 24 * 60 * 60;

function faviconFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
  } catch {
    return '';
  }
}

// ─── SourceAvatar ────────────────────────────────────────────────────────────

function SourceAvatar({ group, onClick }: { group: SourceGroup; onClick: () => void }) {
  const { sourceName, sourceColor, sourceLogo, websiteUrl, allSeen } = group;
  const favicon = !sourceLogo && websiteUrl ? faviconFromUrl(websiteUrl) : '';
  const imgSrc  = sourceLogo || favicon;

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 flex-shrink-0"
      style={{ outline: 'none' }}
      aria-label={`Abrir histórias de ${sourceName}`}
    >
      {/* Square avatar */}
      <div
        style={{
          width: 68,
          height: 68,
          borderRadius: 18,
          border: allSeen ? '2.5px solid #2a2a2a' : '2.5px solid #b8923a',
          overflow: 'hidden',
          boxSizing: 'border-box',
          background: sourceColor ? `${sourceColor}22` : '#1e1e1e',
          transition: 'border-color 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={sourceName}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={(e) => {
              // fallback to letter on error
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <span style={{ fontSize: 26, fontWeight: 800, color: sourceColor ?? '#888', lineHeight: 1 }}>
            {sourceName[0]?.toUpperCase() ?? '?'}
          </span>
        )}
      </div>

      {/* Source name */}
      <span
        style={{
          fontSize: 10,
          color: '#888',
          maxWidth: 68,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          textAlign: 'center',
        }}
      >
        {sourceName.length > 9 ? sourceName.slice(0, 9) + '…' : sourceName}
      </span>
    </button>
  );
}

// ─── StoryRail ───────────────────────────────────────────────────────────────

export default function StoryRail({ articles, onOpenStory, seenVersion = 0 }: StoryRailProps) {
  const nowS = Math.floor(Date.now() / 1000);

  const groups = useMemo<SourceGroup[]>(() => {
    const recent = articles.filter(a => nowS - a.published_at <= WINDOW_24H);
    const map = new Map<string, SourceGroup>();

    for (const a of recent) {
      if (!map.has(a.source_id)) {
        map.set(a.source_id, {
          sourceId:    a.source_id,
          sourceName:  a.source_name,
          sourceColor: a.source_color,
          sourceLogo:  a.source_logo,
          websiteUrl:  a.original_url,
          articleIds:  [],
          allSeen:     false,
        });
      }
      map.get(a.source_id)!.articleIds.push(a.id);
    }

    const seenStore = readSeenStore();
    return Array.from(map.values()).map(g => {
      const seenIds = new Set(seenStore[g.sourceId] ?? []);
      const allSeen = g.articleIds.length > 0 && g.articleIds.every(id => seenIds.has(id));
      return { ...g, allSeen };
    });
  // seenVersion forces recalculation when viewer closes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articles, seenVersion, nowS]);

  if (groups.length === 0) return null;

  return (
    <div className="overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      <style>{`.grain-story-rail::-webkit-scrollbar { display: none; }`}</style>
      <div className="grain-story-rail flex gap-3 px-4 py-1" style={{ width: 'max-content' }}>
        {groups.map(g => (
          <SourceAvatar key={g.sourceId} group={g} onClick={() => onOpenStory(g.sourceId)} />
        ))}
      </div>
    </div>
  );
}
