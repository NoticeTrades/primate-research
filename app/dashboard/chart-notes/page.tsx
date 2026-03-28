'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import DashboardSidebar from '../../components/DashboardSidebar';

type IndexChart = {
  id: number;
  chart_url: string;
  title: string | null;
  chart_date: string;
  sort_order: number;
  notes: string | null;
  created_at: string;
};

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

function formatChartDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return d;
  }
}

export default function DashboardChartNotesPage() {
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL);
  const [charts, setCharts] = useState<IndexChart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetch(`/api/indices/${encodeURIComponent(symbol)}/charts`, { cache: 'no-store' })
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
          setError('Failed to load charts');
          setCharts([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  const pick = useMemo(() => INDEX_PICKS.find((p) => p.symbol === symbol), [symbol]);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        <main className="lg:col-span-9">
          <header className="mb-6">
            <h1 className="text-2xl font-bold text-zinc-50 sm:text-3xl">Daily Chart Notes / Analysis</h1>
            <p className="mt-2 text-sm text-zinc-400 max-w-3xl">
              Chart screenshots uploaded by the team, with optional written analysis. Pick an index below. For full
              market data and structure, open the{' '}
              <Link href={`/indices/${symbol}`} className="text-blue-400 hover:text-blue-300 underline">
                {symbol} index page
              </Link>{' '}
              or use the main{' '}
              <Link href="/dashboard" className="text-blue-400 hover:text-blue-300 underline">
                Dashboard
              </Link>
              .
            </p>
          </header>

          <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 shadow-xl sm:p-6">
            <p className="text-xs text-zinc-500 mb-3">Select index</p>
            <div className="flex flex-wrap gap-2">
              {INDEX_PICKS.map((p) => (
                <button
                  key={p.symbol}
                  type="button"
                  onClick={() => setSymbol(p.symbol)}
                  className={`rounded-xl border px-3.5 py-2 text-left text-sm font-medium transition ${
                    symbol === p.symbol
                      ? 'border-blue-500/50 bg-blue-500/15 text-blue-100'
                      : 'border-zinc-700 bg-zinc-950/50 text-zinc-200 hover:border-blue-500/35'
                  }`}
                >
                  <span className="font-mono font-bold">{p.symbol}</span>
                  <span className="ml-2 text-xs font-normal text-zinc-400">{p.label}</span>
                </button>
              ))}
            </div>
            {pick && (
              <p className="mt-3 text-xs text-zinc-500">
                Showing charts for <span className="font-mono text-zinc-300">{pick.symbol}</span> — {pick.label}
              </p>
            )}
          </section>

          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-48 rounded-2xl bg-zinc-800/50 animate-pulse border border-zinc-800" />
              ))}
            </div>
          ) : error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : charts.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center">
              <p className="text-zinc-400 text-sm">No charts published for {symbol} yet.</p>
              <p className="text-zinc-500 text-xs mt-2">Check back after the team posts a daily chart.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {charts.map((chart) => (
                <article
                  key={chart.id}
                  className="rounded-2xl border border-zinc-800 overflow-hidden bg-zinc-900/70 shadow-lg shadow-black/20"
                >
                  <div className="px-4 py-3 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-semibold text-zinc-100">
                      {chart.title || `Chart — ${formatChartDate(chart.chart_date)}`}
                    </h2>
                    <span className="text-xs text-zinc-500">{formatChartDate(chart.chart_date)}</span>
                  </div>
                  <div className="relative w-full min-h-[200px] bg-zinc-950">
                    <Image
                      src={chart.chart_url}
                      alt={chart.title || 'Trading chart'}
                      width={1200}
                      height={700}
                      className="w-full h-auto object-contain"
                      unoptimized
                    />
                  </div>
                  {chart.notes?.trim() ? (
                    <div className="px-4 py-4 border-t border-zinc-800 bg-zinc-950/50">
                      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                        Analysis / notes
                      </h3>
                      <div className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{chart.notes}</div>
                    </div>
                  ) : (
                    <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-950/30">
                      <p className="text-xs text-zinc-500 italic">No written notes for this chart yet.</p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </main>

        <aside className="lg:col-span-3">
          <DashboardSidebar />
        </aside>
      </div>
    </div>
  );
}
