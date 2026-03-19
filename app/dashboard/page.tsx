'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Navigation from '../components/Navigation';
import CursorGlow from '../components/CursorGlow';
import CursorHover from '../components/CursorHover';
import DiscordSign from '../components/DiscordSign';
import ScrollFade from '../components/ScrollFade';
import MarketTicker from '../components/MarketTicker';
import DashboardSidebar from '../components/DashboardSidebar';
import DashboardIndexCard from '../components/DashboardIndexCard';

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

type IndexChart = {
  id: number;
  chart_url: string;
  title: string | null;
  chart_date: string;
  sort_order: number;
  created_at: string;
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
  marketStructure: {
    daily: string;
    weekly: string;
    monthly: string | null;
    updatedAt: string;
  } | null;
};

type SectorPerf = {
  sector: string;
  changePercent: number;
};

type OverviewItem = {
  symbol: string;
  name: string;
  category: string;
  price: number;
  changePercent: number;
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

const DEFAULT_SELECTED = 'NQ';

export default function DashboardPage() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>(DEFAULT_SELECTED);
  const [indexSearch, setIndexSearch] = useState('');

  const [indexDataBySymbol, setIndexDataBySymbol] = useState<Record<string, IndexData | null>>({});
  const [chartsBySymbol, setChartsBySymbol] = useState<Record<string, IndexChart[]>>({});
  const [indicesLastUpdated, setIndicesLastUpdated] = useState<Date | null>(null);

  // Prevent out-of-order async responses from overwriting newer dashboard state.
  const indicesRequestIdRef = useRef(0);

  const [openTrades, setOpenTrades] = useState<Trade[]>([]);
  const [tradesLastUpdated, setTradesLastUpdated] = useState<Date | null>(null);
  const [sectorPerf, setSectorPerf] = useState<SectorPerf[]>([]);
  const [overviewTf, setOverviewTf] = useState<'1D' | '1W' | '1M' | '1Y'>('1D');
  const [overviewItems, setOverviewItems] = useState<OverviewItem[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(false);

  const selectedSet = useMemo(() => new Set([selectedSymbol]), [selectedSymbol]);
  const selectedTrades = useMemo(
    () => openTrades.filter((t) => (t.symbol || '').toUpperCase() === selectedSymbol),
    [openTrades, selectedSymbol]
  );

  const resetSelection = () => {
    setSelectedSymbol(DEFAULT_SELECTED);
    setIndexSearch('');
  };

  const availableSuggestions = useMemo(() => {
    const q = indexSearch.trim().toLowerCase();
    const base = INDEX_PICKS.filter((p) => !selectedSet.has(p.symbol));
    if (!q) return base.slice(0, 8);
    return base
      .filter((p) => p.symbol.toLowerCase().includes(q) || p.label.toLowerCase().includes(q))
      .slice(0, 8);
  }, [indexSearch, selectedSet]);

  // Poll index data for selected symbol.
  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      indicesRequestIdRef.current += 1;
      const requestId = indicesRequestIdRef.current;

      const ts = Date.now();
      const sym = selectedSymbol;
      const nextData: Record<string, IndexData | null> = {};
      try {
        const res = await fetch(`/api/indices/${sym}?t=${ts}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
        });
        if (!res.ok) {
          nextData[sym] = null;
        } else {
          const body = (await res.json()) as IndexData & { error?: string };
          nextData[sym] = body?.error ? null : body;
        }
      } catch {
        nextData[sym] = null;
      }

      if (cancelled) return;
      if (requestId !== indicesRequestIdRef.current) return;
      setIndexDataBySymbol((prev) => ({ ...prev, ...nextData }));
      setIndicesLastUpdated(new Date());
    };

    fetchAll();
    const interval = setInterval(fetchAll, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selectedSymbol]);

  // Load charts once for selected symbol.
  useEffect(() => {
    let cancelled = false;

    const loadMissingCharts = async () => {
      const sym = selectedSymbol;
      if (chartsBySymbol[sym]) return;
      try {
        const res = await fetch(`/api/indices/${sym}/charts`, { cache: 'no-store' });
        if (!res.ok) {
          if (!cancelled) setChartsBySymbol((prev) => ({ ...prev, [sym]: [] }));
          return;
        }
        const body = await res.json();
        if (!cancelled) {
          setChartsBySymbol((prev) => ({
            ...prev,
            [sym]: body.charts || [],
          }));
        }
      } catch {
        if (!cancelled) setChartsBySymbol((prev) => ({ ...prev, [sym]: [] }));
      }
    };

    loadMissingCharts();
    return () => {
      cancelled = true;
    };
  }, [selectedSymbol, chartsBySymbol]);

  // Poll sector performance panel.
  useEffect(() => {
    let cancelled = false;
    const fetchSectorPerf = async () => {
      try {
        const res = await fetch('/api/sector-performance', { cache: 'no-store' });
        if (!res.ok) return;
        const body = (await res.json()) as { sectors?: SectorPerf[] };
        if (cancelled) return;
        setSectorPerf(Array.isArray(body.sectors) ? body.sectors.slice(0, 11) : []);
      } catch {
        if (!cancelled) setSectorPerf([]);
      }
    };

    fetchSectorPerf();
    const interval = setInterval(fetchSectorPerf, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Market overview panel with timeframe filters.
  useEffect(() => {
    let cancelled = false;
    const fetchOverview = async () => {
      setOverviewLoading(true);
      try {
        const res = await fetch(`/api/market-overview?timeframe=${overviewTf}`, { cache: 'no-store' });
        if (!res.ok) return;
        const body = (await res.json()) as { items?: OverviewItem[] };
        if (cancelled) return;
        setOverviewItems(Array.isArray(body.items) ? body.items : []);
      } catch {
        if (!cancelled) setOverviewItems([]);
      } finally {
        if (!cancelled) setOverviewLoading(false);
      }
    };

    fetchOverview();
    const interval = setInterval(fetchOverview, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [overviewTf]);

  // Poll live trades.
  useEffect(() => {
    let cancelled = false;

    const fetchTrades = async (openOnly = true) => {
      try {
        const url = openOnly ? '/api/trades?open_only=true' : '/api/trades';
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) return;
        const body = await res.json();
        if (cancelled) return;
        setOpenTrades(body.trades || []);
        setTradesLastUpdated(new Date());
      } catch {
        // ignore
      }
    };

    fetchTrades(true);
    const interval = setInterval(() => fetchTrades(true), 20000);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchTrades(true);
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-blue-950/50 to-zinc-950 relative">
      <CursorGlow />
      <CursorHover />
      <DiscordSign />
      <ScrollFade />
      <Navigation />

      <div className="fixed top-[72px] left-0 right-0 z-40">
        <MarketTicker />
      </div>

      <div className="pt-44 pb-24 px-4 sm:px-6 relative z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <main className="lg:col-span-9">
            <header className="mb-5">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-200 text-xs font-semibold mb-3">
                    <span className="w-2 h-2 rounded-full bg-blue-300 animate-pulse" />
                    Dashboard
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold text-zinc-50 tracking-tight">
                    Primate Dashboard
                  </h1>
                  <p className="text-zinc-400 text-sm mt-2">
                    Search one index and load it full-width. You’ll see live daily bar stats, market structure, published charts, relevant movers, relevant news, and live trades.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {indicesLastUpdated && (
                    <span className="text-xs text-zinc-500">
                      Indices updated {indicesLastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
                    </span>
                  )}
                  {tradesLastUpdated && (
                    <span className="text-xs text-zinc-500 hidden sm:inline">
                      Trades updated {tradesLastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            </header>

            <section className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 sm:p-6 mb-6 shadow-xl">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex-1">
                  <label className="block">
                    <span className="text-xs text-zinc-500">Search index</span>
                    <input
                      type="search"
                      value={indexSearch}
                      onChange={(e) => setIndexSearch(e.target.value)}
                      placeholder={`Type a symbol or index name… (e.g. NQ, DXY, FTSE)`}
                      className="mt-2 w-full px-3 py-2 rounded-lg bg-zinc-800/40 border border-zinc-700 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                  </label>

                  <div className="mt-3">
                    <p className="text-xs text-zinc-500 mb-2">
                      Select index
                    </p>
                    {availableSuggestions.length === 0 ? (
                      <p className="text-sm text-zinc-500">No matches.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {availableSuggestions.map((p) => (
                          <button
                            key={p.symbol}
                            type="button"
                            onClick={() => {
                              setSelectedSymbol(p.symbol);
                              setIndexSearch('');
                            }}
                            className="px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-950/20 hover:bg-zinc-950/40 text-sm text-zinc-200 hover:border-zinc-600 transition-colors"
                          >
                            <span className="font-mono font-semibold">{p.symbol}</span>
                            <span className="text-zinc-500 ml-2">{p.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="lg:w-[320px]">
                  <div className="text-xs text-zinc-500 mb-2">Current index</div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-950/20">
                    <span className="font-mono font-semibold text-zinc-200">{selectedSymbol}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={resetSelection}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
                    >
                      Reset
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500 mt-3">
                    Data refreshes automatically every ~10 seconds for the selected index.
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 sm:p-6 mb-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Market overview</h2>
                  <p className="text-xs text-zinc-500 mt-1">ES, NQ, YM, RTY, DXY, Metals, Total Market, International and Emerging Markets</p>
                </div>
                <div className="inline-flex rounded-xl border border-zinc-700 bg-zinc-950/30 p-1">
                  {(['1D', '1W', '1M', '1Y'] as const).map((tf) => (
                    <button
                      key={tf}
                      type="button"
                      onClick={() => setOverviewTf(tf)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        overviewTf === tf
                          ? 'bg-blue-600 text-white'
                          : 'text-zinc-300 hover:bg-zinc-800/70'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>

              {overviewLoading && overviewItems.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-14 rounded-lg bg-zinc-800/50 animate-pulse" />
                  ))}
                </div>
              ) : overviewItems.length === 0 ? (
                <p className="text-sm text-zinc-500">No market overview data available right now.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                  {overviewItems.map((row) => (
                    <div key={row.symbol} className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-zinc-200 truncate">{row.symbol}</p>
                          <p className="text-[11px] text-zinc-500 truncate">{row.name} · {row.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-zinc-300 tabular-nums">{row.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
                          <p className={`text-xs font-semibold tabular-nums ${row.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {row.changePercent >= 0 ? '+' : ''}
                            {row.changePercent.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 sm:p-6 mb-6 shadow-xl">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Sector performance</h2>
                <span className="text-xs text-zinc-500">US sectors</span>
              </div>
              {sectorPerf.length === 0 ? (
                <p className="text-sm text-zinc-500">No sector performance data available right now.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                  {sectorPerf.map((s) => (
                    <div key={s.sector} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2">
                      <span className="text-sm text-zinc-200">{s.sector}</span>
                      <span className={`text-sm font-semibold tabular-nums ${s.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {s.changePercent >= 0 ? '+' : ''}
                        {s.changePercent.toFixed(2)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <DashboardIndexCard
              key={selectedSymbol}
              symbol={selectedSymbol}
              data={indexDataBySymbol[selectedSymbol] ?? null}
              charts={chartsBySymbol[selectedSymbol] ?? []}
              trades={selectedTrades as Trade[]}
            />
          </main>

          <aside className="lg:col-span-3">
            <DashboardSidebar />
          </aside>
        </div>
      </div>
    </div>
  );
}

