'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import DashboardSidebar from '../../components/DashboardSidebar';
import ChartFeedCard, { type ChartFeedItem } from '../../components/ChartFeedCard';

const INDEX_PICKS: { symbol: string; label: string }[] = [
  { symbol: 'NQ', label: 'E-mini NASDAQ-100' },
  { symbol: 'ES', label: 'E-mini S&P 500' },
  { symbol: 'YM', label: 'E-mini Dow Jones' },
  { symbol: 'RTY', label: 'E-mini Russell 2000' },
  { symbol: 'DXY', label: 'US Dollar Index' },
  { symbol: 'CL', label: 'WTI Crude Oil' },
  { symbol: 'FTSE', label: 'FTSE 100 Index' },
  { symbol: 'GER40', label: 'Germany 40 Index' },
  { symbol: 'DAX', label: 'DAX Index' },
];

const DEFAULT_SYMBOL = 'NQ';

type SortMode = 'latest' | 'popular';

function ChartNotesFeedInner() {
  const searchParams = useSearchParams();
  const urlSymbol = searchParams.get('symbol')?.toUpperCase() || '';

  const [symbol, setSymbol] = useState(() => {
    if (urlSymbol && INDEX_PICKS.some((p) => p.symbol === urlSymbol)) return urlSymbol;
    return DEFAULT_SYMBOL;
  });
  const [sort, setSort] = useState<SortMode>('latest');
  const [charts, setCharts] = useState<ChartFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (urlSymbol && INDEX_PICKS.some((p) => p.symbol === urlSymbol)) {
      setSymbol(urlSymbol);
    }
  }, [urlSymbol]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const q = new URLSearchParams({ symbol, sort });
    fetch(`/api/index-charts/feed?${q.toString()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((body) => {
        if (cancelled) return;
        if (body.error) {
          setError(body.error);
          setCharts([]);
        } else {
          setCharts(body.charts || []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Failed to load feed');
          setCharts([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, sort]);

  const pick = useMemo(() => INDEX_PICKS.find((p) => p.symbol === symbol), [symbol]);

  return (
    <div className="max-w-2xl mx-auto w-full">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-50 sm:text-3xl">Daily Chart Feed</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Like, save, and discuss daily chart posts — sorted by{' '}
          <span className="text-zinc-300">latest</span> or{' '}
          <span className="text-zinc-300">popular</span> (likes + comments + saves).
        </p>
      </header>

      <section className="mb-5 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 shadow-xl">
        <p className="text-xs text-zinc-500 mb-2">Index</p>
        <div className="flex flex-wrap gap-2">
          {INDEX_PICKS.map((p) => (
            <button
              key={p.symbol}
              type="button"
              onClick={() => setSymbol(p.symbol)}
              className={`rounded-xl border px-3 py-2 text-left text-sm font-medium transition ${
                symbol === p.symbol
                  ? 'border-blue-500/50 bg-blue-500/15 text-blue-100'
                  : 'border-zinc-700 bg-zinc-950/50 text-zinc-200 hover:border-blue-500/35'
              }`}
            >
              <span className="font-mono font-bold">{p.symbol}</span>
            </button>
          ))}
        </div>
        {pick && <p className="mt-2 text-xs text-zinc-500">{pick.label}</p>}
      </section>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mr-1">Feed</span>
        {(['latest', 'popular'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSort(s)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              sort === s
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
            }`}
          >
            {s === 'latest' ? 'Latest' : 'Popular'}
          </button>
        ))}
        <Link
          href={`/indices/${symbol}`}
          className="ml-auto text-xs text-blue-400 hover:text-blue-300 font-medium"
        >
          Full {symbol} data →
        </Link>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 rounded-2xl bg-zinc-800/50 animate-pulse border border-zinc-800" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : charts.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center">
          <p className="text-zinc-400 text-sm">No charts for {symbol} yet.</p>
          <p className="text-zinc-500 text-xs mt-2">When the desk posts a chart, it will show up here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {charts.map((c) => (
            <ChartFeedCard key={c.id} chart={c} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardChartNotesPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        <main className="lg:col-span-9">
          <Suspense
            fallback={
              <div className="space-y-4 max-w-2xl mx-auto">
                {[1, 2].map((i) => (
                  <div key={i} className="h-48 rounded-2xl bg-zinc-800/50 animate-pulse border border-zinc-800" />
                ))}
              </div>
            }
          >
            <ChartNotesFeedInner />
          </Suspense>
        </main>

        <aside className="lg:col-span-3">
          <DashboardSidebar />
        </aside>
      </div>
    </div>
  );
}
