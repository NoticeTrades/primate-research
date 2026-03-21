'use client';

import { useEffect, useMemo, useState } from 'react';

type MarketNewsItem = {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
};

const REFRESH_MS = 60_000;

function formatPublished(dateValue: string): string {
  if (!dateValue) return '';
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function DashboardNewsFeed() {
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<MarketNewsItem[]>([]);
  const [loading, setLoading] = useState(false);

  const queryLabel = useMemo(() => {
    const q = query.trim();
    return q ? `Topic: ${q}` : 'Trending: top companies + geopolitics';
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    const fetchNews = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('limit', '12');
        if (query.trim()) params.set('q', query.trim());
        const res = await fetch(`/api/market-news?${params.toString()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const body = (await res.json()) as { items?: MarketNewsItem[] };
        if (cancelled) return;
        setItems(Array.isArray(body.items) ? body.items : []);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchNews();
    const timer = setInterval(fetchNews, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [query]);

  return (
    <section className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 shadow-xl">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Market news</h2>
        <p className="text-xs text-zinc-500 mt-1">Live feed for markets, megacaps, and geopolitical drivers</p>
      </div>

      <form
        className="mb-3"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(queryInput.trim());
        }}
      >
        <label className="block">
          <span className="text-xs text-zinc-500">Search topic</span>
          <div className="mt-1 flex gap-2">
            <input
              type="search"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="e.g. Nvidia earnings, tariffs, oil supply"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800/40 px-3 py-2 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Search
            </button>
          </div>
        </label>
      </form>

      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] text-zinc-500">{queryLabel}</p>
        <button
          type="button"
          onClick={() => {
            setQuery('');
            setQueryInput('');
          }}
          className="text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          Reset
        </button>
      </div>

      {loading && items.length === 0 ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 rounded-lg bg-zinc-800/50 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-zinc-500">No market news found for this topic.</p>
      ) : (
        <ul className="space-y-2 max-h-[420px] overflow-auto pr-1">
          {items.map((item, i) => (
            <li key={`${item.url}-${i}`}>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl border border-zinc-800 bg-zinc-950/30 p-3 transition-colors hover:border-zinc-700"
              >
                <p className="text-sm font-semibold text-zinc-100 line-clamp-2">{item.title}</p>
                <p className="mt-1 text-[11px] text-zinc-500">
                  {item.source}
                  {formatPublished(item.publishedAt) ? ` · ${formatPublished(item.publishedAt)}` : ''}
                </p>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

