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
  } catch {
    // quota exceeded — silently ignore
  }
}

export function markSourceSeen(sourceId: string, articleIds: string[]): void {
  const store = readSeenStore();
  const existing = store[sourceId] ?? [];
  const merged = Array.from(new Set([...existing, ...articleIds]));
  store[sourceId] = merged;
  writeSeenStore(store);
}

export function getSeenArticleIds(sourceId: string): string[] {
  return readSeenStore()[sourceId] ?? [];
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
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const NOW_S = Math.floor(Date.now() / 1000);
const WINDOW_24H = 24 * 60 * 60;

function faviconFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  } catch {
    return '';
  }
}

// ─── SourceAvatar ────────────────────────────────────────────────────────────

function SourceAvatar({
  group,
  onClick,
}: {
  group: SourceGroup;
  onClick: () => void;
}) {
  const { sourceName, sourceColor, sourceLogo, websiteUrl, allSeen } = group;
  const bg = sourceColor ? `${sourceColor}26` : '#1e1e1e'; // 15% opacity
  const borderStyle = allSeen
    ? '2.5px solid #2a2a2a'
    : '2.5px solid #b8923a';

  const favicon = !sourceLogo && websiteUrl ? faviconFromUrl(websiteUrl) : '';

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
          width: 64,
          height: 64,
          borderRadius: 16,
          background: bg,
          border: borderStyle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          boxSizing: 'border-box',
          transition: 'border-color 0.2s',
        }}
      >
        {sourceLogo ? (
          <img
            src={sourceLogo}
            alt={sourceName}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : favicon ? (
          <img
            src={favicon}
            alt={sourceName}
            style={{ width: 36, height: 36, objectFit: 'contain' }}
          />
        ) : (
          <span
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: sourceColor ?? '#888',
              fontFamily: 'Syne, sans-serif',
              lineHeight: 1,
            }}
          >
            {sourceName[0]?.toUpperCase() ?? '?'}
          </span>
        )}
      </div>

      {/* Source name */}
      <span
        className="text-muted leading-none text-center"
        style={{ fontSize: 10, maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      >
        {sourceName.slice(0, 8)}
      </span>
    </button>
  );
}

// ─── StoryRail ───────────────────────────────────────────────────────────────

export default function StoryRail({ articles, onOpenStory }: StoryRailProps) {
  const groups = useMemo<SourceGroup[]>(() => {
    // Filter to 24h articles
    const recent = articles.filter(a => NOW_S - a.published_at <= WINDOW_24H);

    // Group by source_id
    const map = new Map<string, SourceGroup>();
    for (const a of recent) {
      if (!map.has(a.source_id)) {
        map.set(a.source_id, {
          sourceId: a.source_id,
          sourceName: a.source_name,
          sourceColor: a.source_color,
          sourceLogo: a.source_logo,
          websiteUrl: a.original_url,
          articleIds: [],
          allSeen: false,
        });
      }
      map.get(a.source_id)!.articleIds.push(a.id);
    }

    // Compute allSeen
    const seenStore = readSeenStore();
    return Array.from(map.values()).map(g => {
      const seenIds = new Set(seenStore[g.sourceId] ?? []);
      const allSeen = g.articleIds.length > 0 && g.articleIds.every(id => seenIds.has(id));
      return { ...g, allSeen };
    });
  }, [articles]);

  if (groups.length === 0) return null;

  return (
    <div
      className="overflow-x-auto"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {/* Hide webkit scrollbar via inline style — no global CSS needed */}
      <style>{`.story-rail-inner::-webkit-scrollbar { display: none; }`}</style>
      <div
        className="story-rail-inner flex gap-3 px-4 py-2"
        style={{ width: 'max-content' }}
      >
        {groups.map(g => (
          <SourceAvatar
            key={g.sourceId}
            group={g}
            onClick={() => onOpenStory(g.sourceId)}
          />
        ))}
      </div>
    </div>
  );
}
