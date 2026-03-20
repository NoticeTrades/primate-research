'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';

type Trade = {
  id: number;
  symbol: string;
  side: string;
  quantity: number;
  entryPrice: number;
  exitQuantity: number;
  exitPrice: number | null;
  chartUrl: string | null;
  notes: string | null;
  stopLoss: number | null;
  takeProfit: number | null;
  createdAt: string;
  updatedAt: string;
  status: 'open' | 'closed';
};

type MarketStructure = {
  daily: string;
  weekly: string;
  monthly: string | null;
  updatedAt: string;
};

type IndexData = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  ytdPercent?: number;
  holc: {
    high: number;
    open: number;
    low: number;
    close: number;
  };
  volume: number;
  marketStructure: MarketStructure | null;
};

type IndexChart = {
  id: number;
  chart_url: string;
  title: string | null;
  chart_date: string;
  sort_order: number;
  created_at: string;
};

type StockMover = {
  ticker: string;
  price: number;
  changePercent: number;
  change: number;
  volume: number;
};

type IndexNewsItem = {
  title: string;
  url: string;
  source: string;
};

type SocialPost = {
  id: string;
  text: string;
  createdAt: string;
  url: string;
  account: string;
};

function getStructureColor(structure: string | null | undefined): string {
  if (!structure) return 'text-zinc-400';
  const s = structure.toLowerCase();
  if (s.includes('bullish')) return 'text-green-400';
  if (s.includes('bearish')) return 'text-red-400';
  if (s.includes('mixed')) return 'text-yellow-400';
  if (s.includes('consolidat')) return 'text-blue-400';
  return 'text-zinc-400';
}

function getStructureBgColor(structure: string | null | undefined): string {
  if (!structure) return 'bg-zinc-800/50';
  const s = structure.toLowerCase();
  if (s.includes('bullish')) return 'bg-green-500/10 border-green-500/30';
  if (s.includes('bearish')) return 'bg-red-500/10 border-red-500/30';
  if (s.includes('mixed')) return 'bg-yellow-500/10 border-yellow-500/30';
  if (s.includes('consolidat')) return 'bg-blue-500/10 border-blue-500/30';
  return 'bg-zinc-800/50';
}

function formatTradeDateET(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const dayDate = d.toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const time = d.toLocaleTimeString('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${dayDate} at ${time} ET`;
}

export default function DashboardIndexCard({
  symbol,
  data,
  charts,
  trades,
}: {
  symbol: string;
  data: IndexData | null;
  charts: IndexChart[];
  trades: Trade[];
}) {
  const [chartsOpen, setChartsOpen] = useState(false);
  const [moversLoading, setMoversLoading] = useState(false);
  const [moversError, setMoversError] = useState<string | null>(null);
  const [movers, setMovers] = useState<{ gainers: StockMover[]; losers: StockMover[]; source?: string } | null>(null);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [newsItems, setNewsItems] = useState<IndexNewsItem[]>([]);
  const [socialLoading, setSocialLoading] = useState(false);
  const [socialError, setSocialError] = useState<string | null>(null);
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);
  const [socialSource, setSocialSource] = useState<string>('none');
  const [socialHasToken, setSocialHasToken] = useState(false);

  const hasCharts = charts.length > 0;
  const hasTrades = trades.length > 0;

  const tradesSummary = useMemo(() => {
    return trades
      .slice(0, 5)
      .map((t) => {
        const openQty = t.quantity - (t.exitQuantity ?? 0);
        return { ...t, openQty };
      });
  }, [trades]);

  useEffect(() => {
    let cancelled = false;
    const loadMovers = async () => {
      setMoversLoading(true);
      setMoversError(null);
      setMovers(null);
      try {
        const res = await fetch(`/api/index-movers?index=${encodeURIComponent(symbol)}&limit=5`, { cache: 'no-store' });
        if (!res.ok) {
          const json = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(json?.error || 'Failed to load movers');
        }
        const json = (await res.json()) as { gainers: StockMover[]; losers: StockMover[]; source?: string };
        if (cancelled) return;
        setMovers({
          gainers: Array.isArray(json.gainers) ? json.gainers.slice(0, 5) : [],
          losers: Array.isArray(json.losers) ? json.losers.slice(0, 5) : [],
          source: typeof json.source === 'string' ? json.source : undefined,
        });
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : 'Failed to load movers';
        setMoversError(msg);
      } finally {
        if (!cancelled) setMoversLoading(false);
      }
    };

    loadMovers();

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  useEffect(() => {
    let cancelled = false;
    const loadSocial = async () => {
      setSocialLoading(true);
      setSocialError(null);
      setSocialPosts([]);
      setSocialSource('none');
      try {
        const res = await fetch('/api/social-feed?account=spectatorindex&limit=3', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load social feed');
        const json = (await res.json()) as { source?: string; posts?: SocialPost[]; hasToken?: boolean };
        if (cancelled) return;
        setSocialSource(typeof json.source === 'string' ? json.source : 'none');
        setSocialHasToken(Boolean(json.hasToken));
        setSocialPosts(Array.isArray(json.posts) ? json.posts.slice(0, 3) : []);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : 'Failed to load social feed';
        setSocialError(msg);
      } finally {
        if (!cancelled) setSocialLoading(false);
      }
    };

    loadSocial();
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  useEffect(() => {
    let cancelled = false;
    const loadNews = async () => {
      setNewsLoading(true);
      setNewsError(null);
      setNewsItems([]);
      try {
        const res = await fetch(`/api/index-news?index=${encodeURIComponent(symbol)}&limit=4`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load index news');
        const json = (await res.json()) as { items?: IndexNewsItem[] };
        if (cancelled) return;
        setNewsItems(Array.isArray(json.items) ? json.items.slice(0, 4) : []);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : 'Failed to load index news';
        setNewsError(msg);
      } finally {
        if (!cancelled) setNewsLoading(false);
      }
    };

    loadNews();
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  return (
    <section
      aria-label={`Index ${symbol}`}
      className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-xl shadow-black/20"
    >
      {!data ? (
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-zinc-800/60 rounded w-2/3" />
          <div className="h-12 bg-zinc-800/60 rounded" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-20 bg-zinc-800/60 rounded" />
            <div className="h-20 bg-zinc-800/60 rounded" />
          </div>
        </div>
      ) : (
        <>
          <header className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-bold text-zinc-50 truncate">
                {data.name}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span
                  className="px-2.5 py-0.5 rounded-md bg-zinc-800/80 border border-zinc-600 text-zinc-300 font-mono text-sm"
                  title="Selected symbol"
                >
                  {symbol}
                </span>
                {hasTrades && (
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs font-semibold">
                    {trades.length} live trade{trades.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
            <div className="lg:col-span-1 bg-zinc-950/30 border border-zinc-800 rounded-2xl p-4">
              <p className="text-xs uppercase tracking-wider text-zinc-500 mb-1">Current price</p>
              <p className="text-3xl sm:text-4xl font-bold text-zinc-50 tabular-nums">
                {data.price > 0
                  ? data.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : '—'}
              </p>
            </div>

            <div className="lg:col-span-2 bg-zinc-950/30 border border-zinc-800 rounded-2xl p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-zinc-500 mb-0.5">Open</p>
                  <p className="text-lg font-semibold text-zinc-200 tabular-nums">
                    {data.holc.open > 0
                      ? data.holc.open.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-0.5">Prev close</p>
                  <p className="text-lg font-semibold text-zinc-200 tabular-nums">
                    {data.previousClose > 0
                      ? data.previousClose.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-0.5">Volume</p>
                  <p className="text-lg font-semibold text-zinc-200 tabular-nums">
                    {data.volume > 0 ? data.volume.toLocaleString('en-US') : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-0.5">YTD</p>
                  <p
                    className={`text-lg font-semibold tabular-nums ${
                      (data.ytdPercent ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {data.ytdPercent != null
                      ? `${data.ytdPercent >= 0 ? '+' : ''}${data.ytdPercent.toFixed(2)}%`
                      : '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-5 bg-zinc-950/30 border border-zinc-800 rounded-2xl p-4">
            <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Daily change</p>
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`text-xl font-semibold tabular-nums ${
                  data.change >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {data.price > 0 && data.previousClose > 0
                  ? `${data.change >= 0 ? '+' : ''}${data.change.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pts`
                  : '—'}
              </span>
              <span
                className={`text-sm font-medium px-2.5 py-1 rounded-full border ${
                  data.changePercent >= 0
                    ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
                    : 'text-red-300 border-red-500/30 bg-red-500/10'
                }`}
              >
                {data.price > 0 && data.previousClose > 0
                  ? `${data.changePercent >= 0 ? '+' : ''}${data.changePercent.toFixed(2)}%`
                  : '—'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            <div className="lg:col-span-2 bg-zinc-950/30 border border-zinc-800 rounded-2xl p-4">
              <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">OHLC + trading range</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-zinc-500 mb-0.5">High</p>
                  <p className="text-lg font-bold text-emerald-400 tabular-nums whitespace-nowrap">
                    {data.holc.high > 0 ? data.holc.high.toFixed(2) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-0.5">Low</p>
                  <p className="text-lg font-bold text-red-400 tabular-nums whitespace-nowrap">
                    {data.holc.low > 0 ? data.holc.low.toFixed(2) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-0.5">Range (pts)</p>
                  <p className="text-lg font-bold text-zinc-200 tabular-nums whitespace-nowrap">
                    {data.holc.high > 0 && data.holc.low > 0
                      ? `${Math.max(0, data.holc.high - data.holc.low).toFixed(2)}`
                      : '—'}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-zinc-500 mb-0.5">Open</p>
                  <p className="text-base font-semibold text-zinc-300 tabular-nums whitespace-nowrap">
                    {data.holc.open > 0 ? data.holc.open.toFixed(2) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-0.5">Close</p>
                  <p className="text-base font-semibold text-zinc-200 tabular-nums whitespace-nowrap">
                    {data.holc.close > 0 ? data.holc.close.toFixed(2) : '—'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-zinc-950/30 border border-zinc-800 rounded-2xl p-4">
              <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Market structure</h4>
              {data.marketStructure ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Daily</p>
                    <div className={`px-3 py-2 rounded-lg border ${getStructureBgColor(data.marketStructure.daily)}`}>
                      <p className={`font-semibold text-sm ${getStructureColor(data.marketStructure.daily)}`}>
                        {data.marketStructure.daily || '—'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Weekly (HTF)</p>
                    <div className={`px-3 py-2 rounded-lg border ${getStructureBgColor(data.marketStructure.weekly)}`}>
                      <p className={`font-semibold text-sm ${getStructureColor(data.marketStructure.weekly)}`}>
                        {data.marketStructure.weekly || '—'}
                      </p>
                    </div>
                  </div>
                  {data.marketStructure.monthly && (
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Monthly</p>
                      <div className={`px-3 py-2 rounded-lg border ${getStructureBgColor(data.marketStructure.monthly)}`}>
                        <p className={`font-semibold text-sm ${getStructureColor(data.marketStructure.monthly)}`}>
                          {data.marketStructure.monthly}
                        </p>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-zinc-600 mt-1">
                    Updated {new Date(data.marketStructure.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-zinc-500">No structure data yet.</p>
              )}
            </div>
          </div>

          <div className="mb-4">
            <div className="bg-zinc-950/30 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Live trades</h4>
              </div>
              {hasTrades ? (
                <div className="space-y-3">
                  {tradesSummary.map((t) => (
                    <div
                      key={t.id}
                      className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${
                                t.side === 'long'
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                                  : 'bg-red-500/10 border-red-500/30 text-red-200'
                              }`}
                            >
                              {t.side}
                            </span>
                            <span className="text-xs text-zinc-500 truncate">
                              {t.openQty} contract{t.openQty !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-zinc-200">
                            Entry: <span className="font-semibold tabular-nums">{t.entryPrice.toFixed(2)}</span>
                          </p>
                          {(t.stopLoss != null || t.takeProfit != null) && (
                            <p className="mt-1 text-xs text-zinc-500">
                              {t.stopLoss != null && `SL: ${t.stopLoss.toFixed(2)}`}
                              {t.stopLoss != null && t.takeProfit != null ? ' · ' : ''}
                              {t.takeProfit != null && `TP: ${t.takeProfit.toFixed(2)}`}
                            </p>
                          )}
                          {t.notes && (
                            <p className="mt-2 text-xs text-zinc-400 line-clamp-3 whitespace-pre-wrap">
                              {t.notes}
                            </p>
                          )}
                          {t.chartUrl && (
                            <a
                              href={t.chartUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-flex items-center gap-2 text-xs font-medium text-blue-300 hover:text-blue-200 underline underline-offset-2"
                            >
                              Chart / setup →
                            </a>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] text-zinc-600">Opened</p>
                          <p className="text-xs text-zinc-400">{formatTradeDateET(t.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {trades.length > 5 && (
                    <p className="text-xs text-zinc-500">Showing first 5 trades.</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">No live trades for {symbol} right now.</p>
              )}
            </div>
          </div>

          <div className="mb-4 bg-zinc-950/30 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Top movers</h4>
              <span className="text-xs text-zinc-500">
                {movers?.source === 'alpha-marketwide' ? 'Market-wide (Alpha Vantage)' : 'Top up/down'}
              </span>
              </div>

              {moversLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-8 bg-zinc-800/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : moversError ? (
                <p className="text-sm text-red-400">{moversError}</p>
              ) : movers ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl bg-zinc-900/40 border border-zinc-800 p-3">
                    <p className="text-xs font-semibold text-emerald-300 uppercase tracking-wider mb-2">Gainers</p>
                    <div className="space-y-2">
                      {movers.gainers.length === 0 ? (
                        <p className="text-sm text-zinc-500">No data.</p>
                      ) : (
                        movers.gainers.map((r) => (
                          <a
                            key={r.ticker}
                            href={`https://finance.yahoo.com/quote/${encodeURIComponent(r.ticker)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between gap-2 hover:text-emerald-200 transition-colors"
                          >
                            <span className="font-mono text-sm text-zinc-200">{r.ticker}</span>
                            <span className="text-sm font-semibold text-emerald-400 tabular-nums">
                              +{r.changePercent.toFixed(2)}%
                            </span>
                          </a>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl bg-zinc-900/40 border border-zinc-800 p-3">
                    <p className="text-xs font-semibold text-red-300 uppercase tracking-wider mb-2">Losers</p>
                    <div className="space-y-2">
                      {movers.losers.length === 0 ? (
                        <p className="text-sm text-zinc-500">No data.</p>
                      ) : (
                        movers.losers.map((r) => (
                          <a
                            key={r.ticker}
                            href={`https://finance.yahoo.com/quote/${encodeURIComponent(r.ticker)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between gap-2 hover:text-red-200 transition-colors"
                          >
                            <span className="font-mono text-sm text-zinc-200">{r.ticker}</span>
                            <span className="text-sm font-semibold text-red-400 tabular-nums">
                              {r.changePercent.toFixed(2)}%
                            </span>
                          </a>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-500">No data.</p>
              )}
          </div>

          <div className="mb-4 bg-zinc-950/30 border border-zinc-800 rounded-2xl p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Relevant news</h4>
              <span className="text-xs text-zinc-500">{symbol}</span>
            </div>
            {newsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 bg-zinc-800/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : newsError ? (
              <p className="text-sm text-red-400">{newsError}</p>
            ) : newsItems.length === 0 ? (
              <p className="text-sm text-zinc-500">No recent headlines.</p>
            ) : (
              <div className="space-y-2">
                {newsItems.map((n) => (
                  <a
                    key={`${n.url}-${n.title}`}
                    href={n.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 hover:border-zinc-700 transition-colors"
                  >
                    <p className="text-sm text-zinc-200 line-clamp-2">{n.title}</p>
                    <p className="text-xs text-zinc-500 mt-1">{n.source}</p>
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="mb-4 bg-zinc-950/30 border border-zinc-800 rounded-2xl p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Latest X posts</h4>
              <span className="text-xs text-zinc-500">Source: {socialSource}</span>
            </div>
            {socialLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-8 bg-zinc-800/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : socialError ? (
              <p className="text-sm text-red-400">{socialError}</p>
            ) : socialPosts.length === 0 ? (
              <p className="text-sm text-zinc-500">
                {socialHasToken ? 'No recent posts available.' : 'No X posts (set `X_BEARER_TOKEN` to enable the X API feed).'}
              </p>
            ) : (
              <div className="space-y-2">
                {socialPosts.map((p) => (
                  <a
                    key={p.id}
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 hover:border-zinc-700 transition-colors"
                  >
                    <p className="text-sm text-zinc-200 line-clamp-3">{p.text}</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      @{p.account}
                      {p.createdAt ? ` • ${new Date(p.createdAt).toLocaleString()}` : ''}
                    </p>
                  </a>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="bg-zinc-950/30 border border-zinc-800 rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setChartsOpen((v) => !v)}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-zinc-800/30 transition-colors"
                aria-expanded={chartsOpen}
              >
                <div className="flex items-center gap-3">
                  <span className="text-zinc-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-50">Trading day charts</h4>
                    <p className="text-xs text-zinc-500">
                      {hasCharts ? `${charts.length} chart${charts.length !== 1 ? 's' : ''} available` : 'No charts for this index yet'}
                    </p>
                  </div>
                </div>
                <span className="text-zinc-500 transition-transform" style={{ transform: chartsOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </button>

              {chartsOpen && (
                <div className="border-t border-zinc-800 bg-zinc-950/50">
                  {hasCharts ? (
                    <div className="p-4 space-y-4">
                      {charts.map((chart) => (
                        <div
                          key={chart.id}
                          className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900/50"
                        >
                          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-medium text-zinc-200">
                              {chart.title || `Chart — ${chart.chart_date}`}
                            </span>
                            <span className="text-xs text-zinc-500">{chart.chart_date}</span>
                          </div>
                          <div className="relative w-full min-h-[170px] bg-zinc-900">
                            <Image
                              src={chart.chart_url}
                              alt={chart.title || 'Trading chart'}
                              width={1200}
                              height={600}
                              className="w-full h-auto object-contain"
                              unoptimized
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-sm text-zinc-500">No charts published for {symbol} yet.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

