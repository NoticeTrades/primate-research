'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import DashboardSidebar from '../components/DashboardSidebar';
import DashboardIndexCard from '../components/DashboardIndexCard';
import DashboardNewsFeed from '../components/DashboardNewsFeed';
import { DashboardMenuTrigger } from '../components/DashboardNavDrawer';

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

type TimeframeKey = '1D' | '1W' | '1M' | '3M' | 'YTD';

type SectorPerf = {
  sector: string;
  changePercent: number; // 1D (fallback)
  perf?: Record<TimeframeKey, number>;
};

const SECTOR_TIMEFRAMES: TimeframeKey[] = ['1D', '1W', '1M', '3M', 'YTD'];

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

type DashboardModuleId = 'overview' | 'news' | 'sector' | 'index';
/** Draggable blocks in the main column only (overview lives in the right sidebar). */
type MainModuleId = 'sector' | 'index';

const MAIN_MODULES: MainModuleId[] = ['sector', 'index'];

const MODULE_VISIBILITY_OPTIONS: { id: DashboardModuleId; label: string }[] = [
  { id: 'overview', label: 'Market overview (sidebar)' },
  { id: 'news', label: 'Market news feed (sidebar)' },
  { id: 'sector', label: 'Sector performance' },
  { id: 'index', label: 'Index card' },
];

const DASHBOARD_LAYOUT_STORAGE_KEY = 'primateDashboardLayout_v1';

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
  const [sectorLoading, setSectorLoading] = useState(false);
  const [sectorSortTf, setSectorSortTf] = useState<TimeframeKey>('1D');
  const [overviewTf, setOverviewTf] = useState<'1D' | '1W' | '1M' | '1Y' | 'YTD'>('1D');
  const [overviewItems, setOverviewItems] = useState<OverviewItem[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(false);

  const [layoutPanelOpen, setLayoutPanelOpen] = useState(false);
  const [layoutLocked, setLayoutLocked] = useState(true);
  const [moduleOrder, setModuleOrder] = useState<MainModuleId[]>(MAIN_MODULES);
  const [visibleModules, setVisibleModules] = useState<Record<DashboardModuleId, boolean>>({
    overview: true,
    news: true,
    sector: true,
    index: true,
  });

  const draggingModuleIdRef = useRef<MainModuleId | null>(null);

  // Load saved layout (local-only).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        layoutLocked?: boolean;
        moduleOrder?: string[];
        visibleModules?: Partial<Record<DashboardModuleId, boolean>>;
      };

      if (typeof parsed.layoutLocked === 'boolean') setLayoutLocked(parsed.layoutLocked);

      if (Array.isArray(parsed.moduleOrder)) {
        const cleaned = parsed.moduleOrder.filter((id): id is MainModuleId =>
          id === 'sector' || id === 'index'
        );
        if (cleaned.length > 0) {
          const finalOrder = [
            ...cleaned,
            ...MAIN_MODULES.filter((id) => !cleaned.includes(id)),
          ].slice(0, MAIN_MODULES.length);
          setModuleOrder(finalOrder);
        }
      }

      if (parsed.visibleModules) {
        setVisibleModules((prev) => ({
          ...prev,
          ...parsed.visibleModules,
        }));
      }
    } catch {
      // ignore
    }
  }, []);

  // Persist layout changes.
  useEffect(() => {
    try {
      localStorage.setItem(
        DASHBOARD_LAYOUT_STORAGE_KEY,
        JSON.stringify({
          layoutLocked,
          moduleOrder,
          visibleModules,
        })
      );
    } catch {
      // ignore
    }
  }, [layoutLocked, moduleOrder, visibleModules]);

  const moveModule = (fromId: MainModuleId, toId: MainModuleId) => {
    if (fromId === toId) return;
    setModuleOrder((prev) => {
      const fromIdx = prev.indexOf(fromId);
      const toIdx = prev.indexOf(toId);
      if (fromIdx < 0 || toIdx < 0) return prev;
      const next = [...prev];
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, fromId);
      return next;
    });
  };

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
        setSectorLoading(true);
        const res = await fetch(
          `/api/sector-performance?ts=${Date.now()}&sort=${encodeURIComponent(sectorSortTf)}`,
          { cache: 'no-store' }
        );
        if (!res.ok) return;
        const body = (await res.json()) as { sectors?: SectorPerf[] };
        if (cancelled) return;
        setSectorPerf(Array.isArray(body.sectors) ? body.sectors.slice(0, 11) : []);
      } catch {
        if (!cancelled) setSectorPerf([]);
      } finally {
        if (!cancelled) setSectorLoading(false);
      }
    };

    fetchSectorPerf();
    const interval = setInterval(fetchSectorPerf, 180000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [sectorSortTf]);

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
    <div className="max-w-8xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <main className="lg:col-span-9">
            <header className="mb-5">
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="shrink-0 pt-1">
                  <DashboardMenuTrigger />
                </div>
                <div className="min-w-0 flex-1">
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
                </div>
              </div>
            </header>

            <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 shadow-xl sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1">
                  <label className="block">
                    <span className="text-xs text-zinc-500">Search index</span>
                    <input
                      type="search"
                      value={indexSearch}
                      onChange={(e) => setIndexSearch(e.target.value)}
                      placeholder={`Type a symbol or index name… (e.g. NQ, DXY, FTSE)`}
                      className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-800/40 px-3 py-2 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                  </label>

                  <div className="mt-3">
                    <p className="mb-2 text-xs text-zinc-500">Select index</p>
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
                            className="group relative overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950/50 px-3.5 py-2 text-left text-sm font-medium text-zinc-200 shadow-sm transition hover:border-blue-500/40 hover:bg-zinc-900/80 hover:shadow-md hover:shadow-blue-950/20 focus:outline-none focus:ring-2 focus:ring-blue-500/35 active:scale-[0.98] sm:hover:scale-[1.02]"
                          >
                            <span className="relative z-10 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
                              <span className="font-mono text-base font-bold tracking-tight text-zinc-50">
                                {p.symbol}
                              </span>
                              <span className="text-xs font-normal text-zinc-400 sm:text-sm">{p.label}</span>
                            </span>
                            <span
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-400/0 transition group-hover:text-blue-300/90 sm:right-2.5"
                              aria-hidden
                            >
                              →
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="lg:w-[320px]">
                  <div className="mb-2 text-xs text-zinc-500">Current index</div>
                  <div className="inline-flex items-center rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 shadow-sm ring-1 ring-blue-500/15">
                    <span className="font-mono text-lg font-bold tracking-tight text-blue-100">{selectedSymbol}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={resetSelection}
                      className="rounded-xl bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
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

            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="text-sm font-semibold text-zinc-300">Dashboard layout</div>
                <div className="text-xs text-zinc-500 mt-1">
                  {layoutLocked ? 'Locked. Unlock to drag modules.' : 'Drag modules to reorder.'}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={layoutLocked}
                    onChange={(e) => setLayoutLocked(e.target.checked)}
                    className="accent-blue-500"
                  />
                  Lock layout
                </label>

                <button
                  type="button"
                  onClick={() => setLayoutPanelOpen((v) => !v)}
                  className="px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-950/20 hover:bg-zinc-950/40 text-xs font-semibold text-zinc-200 transition-colors"
                >
                  {layoutPanelOpen ? 'Close' : 'Modules'}
                </button>
              </div>
            </div>

            {layoutPanelOpen && (
              <div className="mb-6 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
                <div className="text-xs text-zinc-500 mb-3">Choose what to show</div>
                <div className="flex flex-wrap gap-3">
                  {MODULE_VISIBILITY_OPTIONS.map(({ id, label }) => (
                    <label
                      key={id}
                      className="inline-flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={visibleModules[id]}
                        onChange={(e) =>
                          setVisibleModules((prev) => ({
                            ...prev,
                            [id]: e.target.checked,
                          }))
                        }
                        className="accent-blue-500"
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <div className="text-[11px] text-zinc-600 mt-3">
                  Tip: unlock layout to drag <span className="text-zinc-500">Sector</span> and{' '}
                  <span className="text-zinc-500">Index</span> in the main column. Sidebar modules are fixed on the right.
                </div>
              </div>
            )}

            {moduleOrder.map((id) => {
              if (!visibleModules[id]) return null;

              const dragProps = layoutLocked
                ? {}
                : {
                    draggable: true,
                    onDragStart: (e: React.DragEvent) => {
                      draggingModuleIdRef.current = id;
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', id);
                    },
                    onDragOver: (e: React.DragEvent) => {
                      if (layoutLocked) return;
                      e.preventDefault();
                    },
                    onDrop: (e: React.DragEvent) => {
                      if (layoutLocked) return;
                      e.preventDefault();
                      const fromIdRaw =
                        draggingModuleIdRef.current || (e.dataTransfer.getData('text/plain') as MainModuleId);
                      if (!fromIdRaw || fromIdRaw === id) return;
                      if (fromIdRaw !== 'sector' && fromIdRaw !== 'index') return;
                      moveModule(fromIdRaw, id);
                      draggingModuleIdRef.current = null;
                    },
                  };

              const wrapperClass = id === 'index' ? 'mb-6' : '';
              return (
                <div key={id} className={wrapperClass} {...dragProps}>
                  {id === 'sector' && (
                    <section className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 sm:p-6 mb-6 shadow-xl">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                        <div>
                          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
                            Sector performance
                          </h2>
                          <p className="text-xs text-zinc-500 mt-1">
                            US sectors · sorted by {sectorSortTf}
                          </p>
                        </div>
                      </div>

                      {sectorLoading ? (
                        <div className="overflow-x-auto">
                          <div className="min-w-[680px]">
                            <div className="h-12 bg-zinc-800/50 rounded-lg mb-2 animate-pulse" />
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
                              <div key={i} className="h-10 bg-zinc-800/40 rounded-lg mb-2 animate-pulse" />
                            ))}
                          </div>
                        </div>
                      ) : sectorPerf.length === 0 ? (
                        <p className="text-sm text-zinc-500">No sector performance data available right now.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-[680px] w-full text-left text-sm">
                            <thead>
                              <tr className="border-b border-zinc-800">
                                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Sector</th>
                                {SECTOR_TIMEFRAMES.map((tf) => (
                                  <th
                                    key={tf}
                                    scope="col"
                                    className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider text-right cursor-pointer select-none ${
                                      sectorSortTf === tf ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                                    onClick={() => setSectorSortTf(tf)}
                                    aria-label={`Sort sectors by ${tf}`}
                                  >
                                    {tf}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {sectorPerf.map((s) => (
                                <tr key={s.sector} className="border-t border-zinc-800/60 hover:bg-zinc-900/40">
                                  <td className="px-3 py-2 font-medium text-zinc-200">{s.sector}</td>
                                  {SECTOR_TIMEFRAMES.map((tf) => {
                                    const v = s.perf?.[tf];
                                    const vOk = typeof v === 'number' && Number.isFinite(v);
                                    const isActive = tf === sectorSortTf;
                                    const classes = [
                                      'px-3 py-2 whitespace-nowrap text-right tabular-nums',
                                      !vOk ? 'text-zinc-500' : v! >= 0 ? 'text-emerald-300' : 'text-red-300',
                                      isActive ? 'bg-blue-600/10 font-semibold' : '',
                                    ].filter(Boolean).join(' ');
                                    return (
                                      <td key={`${s.sector}:${tf}`} className={classes}>
                                        {!vOk
                                          ? '—'
                                          : `${v! >= 0 ? '+' : ''}${v!.toFixed(2)}%`}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </section>
                  )}

                  {id === 'index' && (
                    <DashboardIndexCard
                      key={selectedSymbol}
                      symbol={selectedSymbol}
                      data={indexDataBySymbol[selectedSymbol] ?? null}
                      charts={chartsBySymbol[selectedSymbol] ?? []}
                      trades={selectedTrades as Trade[]}
                    />
                  )}
                </div>
              );
            })}
          </main>

          <aside className="lg:col-span-3 flex flex-col gap-5">
            {visibleModules.overview && (
              <section className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 shadow-xl">
                <div className="mb-3">
                  <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Market overview</h2>
                  <p className="text-xs text-zinc-500 mt-1 leading-snug">
                    ES, NQ, YM, RTY, DXY, metals, total market, international &amp; emerging markets
                  </p>
                </div>
                <div className="flex flex-wrap gap-1 rounded-xl border border-zinc-700 bg-zinc-950/30 p-1 mb-3">
                  {(['1D', '1W', '1M', '1Y', 'YTD'] as const).map((tf) => (
                    <button
                      key={tf}
                      type="button"
                      onClick={() => setOverviewTf(tf)}
                      className={`flex-1 min-w-[2.75rem] px-2 py-1.5 text-[11px] font-semibold rounded-lg transition-colors sm:text-xs ${
                        overviewTf === tf ? 'bg-blue-600 text-white' : 'text-zinc-300 hover:bg-zinc-800/70'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>

                {overviewLoading && overviewItems.length === 0 ? (
                  <div className="flex flex-col gap-2">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="h-12 rounded-lg bg-zinc-800/50 animate-pulse" />
                    ))}
                  </div>
                ) : overviewItems.length === 0 ? (
                  <p className="text-sm text-zinc-500">No market overview data available right now.</p>
                ) : (
                  <ul className="flex max-h-[min(70vh,520px)] flex-col gap-1.5 overflow-y-auto pr-0.5">
                    {overviewItems.map((row) => (
                      <li
                        key={row.symbol}
                        className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-zinc-200">{row.symbol}</p>
                            <p className="text-[10px] text-zinc-500 leading-tight sm:text-[11px]">
                              {row.name}
                              <span className="text-zinc-600"> · </span>
                              {row.category}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm text-zinc-300 tabular-nums">
                              {row.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                            </p>
                            <p
                              className={`text-xs font-semibold tabular-nums ${
                                row.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'
                              }`}
                            >
                              {row.changePercent >= 0 ? '+' : ''}
                              {row.changePercent.toFixed(2)}%
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {visibleModules.news && <DashboardNewsFeed />}

            <DashboardSidebar />
          </aside>
        </div>
  );
}

