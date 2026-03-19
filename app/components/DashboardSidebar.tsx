'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { researchArticles, generateSlug, type ResearchArticle } from '../../data/research';
import { videos, type VideoCategory, type VideoEntry, type VideoType } from '../../data/videos';

type SidebarFilter = 'all' | 'research' | 'videos';

type SidebarItem = {
  type: 'research' | 'videos';
  title: string;
  description: string;
  dateLabel?: string;
  href: string;
  tag?: string;
  sortTs: number;
};

function parseResearchDate(dateStr?: string): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  const t = d.getTime();
  return Number.isFinite(t) ? t : 0;
}

function parseVideoDate(dateStr?: string): number {
  if (!dateStr) return 0;
  // Support ISO-like dates and "Dec 2024" style.
  const iso = new Date(dateStr);
  if (Number.isFinite(iso.getTime())) return iso.getTime();

  // Expected format: "Dec 2024" etc.
  const parts = dateStr.trim().split(/\s+/);
  if (parts.length !== 2) return 0;
  const [mon, yearStr] = parts;
  const year = Number.parseInt(yearStr, 10);
  if (!Number.isFinite(year)) return 0;

  const months: Record<string, number> = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11,
  };
  const idx = months[mon];
  if (idx == null) return 0;
  return new Date(year, idx, 1).getTime();
}

function getItemDescription(article: ResearchArticle): string {
  return article.description || 'View report';
}

function coerceVideoType(value: unknown): VideoType | undefined {
  if (value === 'youtube' || value === 'exclusive' || value === 'external') return value;
  return undefined;
}

function coerceVideoCategory(value: unknown): VideoCategory | undefined {
  const v = typeof value === 'string' ? value.trim() : '';
  if (!v) return undefined;
  const allowed = new Set<VideoCategory>([
    'market-analysis',
    'trading-strategies',
    'educational',
    'live-trading',
    'market-structure',
    'risk-management',
    'all',
  ]);
  return allowed.has(v as VideoCategory) ? (v as VideoCategory) : undefined;
}

export default function DashboardSidebar() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SidebarFilter>('all');
  const [dbVideos, setDbVideos] = useState<VideoEntry[]>([]);

  useEffect(() => {
    const loadDbVideos = async () => {
      try {
        const res = await fetch('/api/videos', { cache: 'no-store' });
        if (!res.ok) return;
        const json = (await res.json()) as { videos?: unknown[] };
        const rawVideos = Array.isArray(json?.videos) ? json.videos : [];
        const mapped = rawVideos
          .map((v): VideoEntry | null => {
            const obj = v as {
              title?: unknown;
              description?: unknown;
              videoUrl?: unknown;
              videoType?: unknown;
              category?: unknown;
              thumbnailUrl?: unknown;
              date?: unknown;
              duration?: unknown;
              isExclusive?: unknown;
            };

            const title = typeof obj.title === 'string' ? obj.title : '';
            const description = typeof obj.description === 'string' ? obj.description : '';
            const videoUrl = typeof obj.videoUrl === 'string' ? obj.videoUrl : '';
            const videoType = coerceVideoType(obj.videoType) ?? 'exclusive';
            const category = coerceVideoCategory(obj.category);
            const thumbnailUrl = typeof obj.thumbnailUrl === 'string' ? obj.thumbnailUrl : undefined;
            const date = typeof obj.date === 'string' ? obj.date : undefined;
            const duration = typeof obj.duration === 'string' ? obj.duration : undefined;
            const isExclusive = typeof obj.isExclusive === 'boolean' ? obj.isExclusive : undefined;

            if (!title || !videoUrl) return null;

            return {
              title,
              description,
              videoUrl,
              videoType,
              category,
              thumbnailUrl,
              date,
              duration,
              isExclusive,
            } satisfies VideoEntry;
          })
          .filter((x): x is VideoEntry => x !== null);

        setDbVideos(mapped);
      } catch {
        // ignore
      }
    };

    loadDbVideos();
  }, []);

  const items = useMemo<SidebarItem[]>(() => {
    const researchItems: SidebarItem[] = researchArticles.map((a) => {
      const slug = a.slug || generateSlug(a.title);
      return {
        type: 'research',
        title: a.title,
        description: getItemDescription(a),
        dateLabel: a.date,
        tag: a.category,
        href: `/research/${slug}`,
        sortTs: parseResearchDate(a.date),
      };
    });

    const allVideos: VideoEntry[] = (() => {
      // Prefer DB uploads when there are duplicates.
      const combined = [...dbVideos, ...(videos as VideoEntry[])];
      const seen = new Set<string>();
      const unique: VideoEntry[] = [];
      for (const v of combined) {
        const url = (v.videoUrl || '').toLowerCase().trim();
        if (!url) continue;
        if (seen.has(url)) continue;
        seen.add(url);
        unique.push(v);
      }
      return unique;
    })();

    const videoItems: SidebarItem[] = allVideos.map((v) => {
      const dateLabel = v.date ?? '';
      return {
        type: 'videos',
        title: v.title,
        description: v.description || 'Watch video',
        dateLabel,
        tag: v.category,
        href: '/videos',
        sortTs: parseVideoDate(v.date),
      };
    });

    return [...researchItems, ...videoItems].sort((x, y) => y.sortTs - x.sortTs);
  }, [dbVideos]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (filter !== 'all' && it.type !== filter) return false;
      if (!q) return true;
      return (
        it.title.toLowerCase().includes(q) ||
        it.description.toLowerCase().includes(q) ||
        (it.tag?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [items, query, filter]);

  return (
    <aside className="lg:sticky lg:top-[96px] self-start">
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-200">Research</h2>
            <p className="text-xs text-zinc-500 mt-1">Articles / reports and videos</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <button
            type="button"
            onClick={() => setFilter('all')}
            aria-pressed={filter === 'all'}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
              filter === 'all'
                ? 'bg-blue-500/15 border-blue-500/40 text-blue-200'
                : 'bg-zinc-800/40 border-zinc-700 text-zinc-300 hover:bg-zinc-800/60'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilter('research')}
            aria-pressed={filter === 'research'}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
              filter === 'research'
                ? 'bg-blue-500/15 border-blue-500/40 text-blue-200'
                : 'bg-zinc-800/40 border-zinc-700 text-zinc-300 hover:bg-zinc-800/60'
            }`}
          >
            Research
          </button>
          <button
            type="button"
            onClick={() => setFilter('videos')}
            aria-pressed={filter === 'videos'}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
              filter === 'videos'
                ? 'bg-blue-500/15 border-blue-500/40 text-blue-200'
                : 'bg-zinc-800/40 border-zinc-700 text-zinc-300 hover:bg-zinc-800/60'
            }`}
          >
            Videos
          </button>
        </div>

        <label className="block">
          <span className="text-xs text-zinc-500">Search</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search reports or videos…"
            className="mt-1 w-full px-3 py-2 rounded-lg bg-zinc-800/40 border border-zinc-700 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </label>

        <div className="mt-4 border-t border-zinc-800 pt-3">
          {filtered.length === 0 ? (
            <p className="text-sm text-zinc-500">No results.</p>
          ) : (
            <ul className="space-y-2 max-h-[56vh] overflow-auto pr-1">
              {filtered.slice(0, 30).map((it) => (
                <li key={`${it.type}-${it.href}-${it.title}`}>
                  <Link
                    href={it.href}
                    className="block rounded-xl border border-zinc-800 bg-zinc-950/30 hover:border-zinc-700 transition-colors p-3"
                    aria-label={`Open ${it.type === 'research' ? 'research report' : 'video'}: ${it.title}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              it.type === 'research'
                                ? 'bg-blue-500/15 border-blue-500/40 text-blue-200'
                                : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                            }`}
                          >
                            {it.type === 'research' ? 'REPORT' : 'VIDEO'}
                          </span>
                          <span className="text-[11px] text-zinc-500 truncate">
                            {it.dateLabel || ''}
                          </span>
                        </div>
                        <div className="mt-2 text-sm font-semibold text-zinc-50 line-clamp-2">
                          {it.title}
                        </div>
                        <div className="mt-1 text-xs text-zinc-500 line-clamp-2">
                          {it.description}
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </aside>
  );
}

