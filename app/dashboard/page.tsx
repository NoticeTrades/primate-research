'use client';

import { useEffect, useMemo, useState } from 'react';
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

const MAX_SELECTED = 6;
const INDEX_PICKS: { symbol: string; label: string }[] = [
  { symbol: 'NQ', label: 'E-mini NASDAQ-100' },
  { symbol: 'ES', label: 'E-mini S&P 500' },
  { symbol: 'YM', label: 'E-mini Dow Jones' },
  { symbol: 'RTY', label: 'E-mini Russell 2000' },
  { symbol: 'DXY', label: 'US Dollar Index' },
  { symbol: 'CL', label: 'WTI Crude Oil' },
  { symbol: 'FTSE', label: 'FTSE 100 Index' },
  { symbol: 'GER40', label: 'DAX / Germany 40' },
  { symbol: 'DAX', label: 'DAX Index' },
];

const DEFAULT_SELECTED = ['NQ', 'ES'];

export default function DashboardPage() {
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(DEFAULT_SELECTED);
  const [indexSearch, setIndexSearch] = useState('');

  const [indexDataBySymbol, setIndexDataBySymbol] = useState<Record<string, IndexData | null>>({});
  const [chartsBySymbol, setChartsBySymbol] = useState<Record<string, IndexChart[]>>({});
  const [indicesLastUpdated, setIndicesLastUpdated] = useState<Date | null>(null);

  const [openTrades, setOpenTrades] = useState<Trade[]>([]);
  const [tradesLastUpdated, setTradesLastUpdated] = useState<Date | null>(null);

  const selectedSet = useMemo(() => new Set(selectedSymbols), [selectedSymbols]);
  const tradesBySymbol = useMemo(() => {
    const map: Record<string, Trade[]> = {};
    for (const t of openTrades) {
      const s = (t.symbol || '').toUpperCase();
      if (!s) continue;
      if (!map[s]) map[s] = [];
      map[s].push(t);
    }
    return map;
  }, [openTrades]);

  const addSymbol = (sym: string) => {
    const upper = sym.toUpperCase();
    if (selectedSet.has(upper)) return;
    setSelectedSymbols((prev) => {
      if (prev.length >= MAX_SELECTED) return prev;
      return [...prev, upper];
    });
    setIndexSearch('');
  };

  const removeSymbol = (sym: string) => {
    const upper = sym.toUpperCase();
    setSelectedSymbols((prev) => prev.filter((s) => s !== upper));
  };

  const resetSelection = () => {
    setSelectedSymbols(DEFAULT_SELECTED);
    setIndexSearch('');
  };

  const availableSuggestions = useMemo(() => {
    const q = indexSearch.trim().toLowerCase();
    const base = INDEX_PICKS.filter((p) => !selectedSet.has(p.symbol));
    if (!q) return base.slice(0, 6);
    return base
      .filter((p) => p.symbol.toLowerCase().includes(q) || p.label.toLowerCase().includes(q))
      .slice(0, 8);
  }, [indexSearch, selectedSet]);

  // Poll index data for selected symbols.
  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      const ts = Date.now();
      const nextData: Record<string, IndexData | null> = {};

      await Promise.all(
        selectedSymbols.map(async (sym) => {
          try {
            const res = await fetch(`/api/indices/${sym}?t=${ts}`, {
              cache: 'no-store',
              headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
            });
            if (!res.ok) {
              nextData[sym] = null;
              return;
            }
            const body = (await res.json()) as IndexData & { error?: string };
            if (body?.error) {
              nextData[sym] = null;
              return;
            }
            nextData[sym] = body;
          } catch {
            nextData[sym] = null;
          }
        })
      );

      if (cancelled) return;
      setIndexDataBySymbol((prev) => ({ ...prev, ...nextData }));
      setIndicesLastUpdated(new Date());
    };

    fetchAll();
    const interval = setInterval(fetchAll, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selectedSymbols]);

  // Load charts once per symbol (or when added).
  useEffect(() => {
    let cancelled = false;

    const loadMissingCharts = async () => {
      const missing = selectedSymbols.filter((sym) => !chartsBySymbol[sym]);
      if (missing.length === 0) return;

      await Promise.all(
        missing.map(async (sym) => {
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
        })
      );
    };

    loadMissingCharts();
    return () => {
      cancelled = true;
    };
  }, [selectedSymbols, chartsBySymbol]);

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
                    Search and pin multiple indices. You’ll see live daily bar stats, market structure, published charts, and any live trades for the selected tickers.
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
                    <span className="text-xs text-zinc-500">Add indices</span>
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
                      Suggestions (up to {MAX_SELECTED} pinned)
                    </p>
                    {availableSuggestions.length === 0 ? (
                      <p className="text-sm text-zinc-500">No matches.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {availableSuggestions.map((p) => (
                          <button
                            key={p.symbol}
                            type="button"
                            onClick={() => addSymbol(p.symbol)}
                            disabled={selectedSymbols.length >= MAX_SELECTED}
                            className="px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-950/20 hover:bg-zinc-950/40 text-sm text-zinc-200 hover:border-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <div className="text-xs text-zinc-500 mb-2">Pinned indices</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedSymbols.map((sym) => (
                      <button
                        key={sym}
                        type="button"
                        onClick={() => removeSymbol(sym)}
                        aria-label={`Remove ${sym} from dashboard`}
                        className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-950/20 hover:bg-zinc-950/40 transition-colors"
                      >
                        <span className="font-mono font-semibold text-zinc-200">{sym}</span>
                        <span className="text-zinc-500 group-hover:text-zinc-300 text-xs">×</span>
                      </button>
                    ))}
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
                    Data refreshes automatically every ~10 seconds.
                  </p>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {selectedSymbols.map((sym) => (
                <DashboardIndexCard
                  key={sym}
                  symbol={sym}
                  data={indexDataBySymbol[sym] ?? null}
                  charts={chartsBySymbol[sym] ?? []}
                  trades={(tradesBySymbol[sym] ?? []) as Trade[]}
                />
              ))}
            </div>
          </main>

          <aside className="lg:col-span-3">
            <DashboardSidebar />
          </aside>
        </div>
      </div>
    </div>
  );
}

