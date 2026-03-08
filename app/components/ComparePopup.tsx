'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useCompare } from '../contexts/CompareContext';

const COMP_TICKERS = [
  { ticker: 'NQ', name: 'Nasdaq 100 E-Mini' },
  { ticker: 'ES', name: 'S&P 500 E-Mini' },
  { ticker: 'YM', name: 'Dow E-Mini' },
  { ticker: 'RTY', name: 'Russell 2000 E-Mini' },
  { ticker: 'CL', name: 'WTI Crude Oil' },
  { ticker: 'GC', name: 'Gold' },
  { ticker: 'SI', name: 'Silver' },
  { ticker: 'BTC', name: 'Bitcoin' },
  { ticker: 'ETH', name: 'Ethereum' },
  { ticker: 'N225', name: 'Nikkei 225' },
];

const SERIES_COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#eab308', // amber
  '#ef4444', // red
  '#a855f7', // violet
  '#06b6d4', // cyan
  '#f97316', // orange
  '#ec4899', // pink
];

type ChartPoint = Record<string, string | number>;

export default function ComparePopup() {
  const { isCompareOpen, closeCompare } = useCompare();
  const [symbols, setSymbols] = useState<string[]>([]);
  const [hiddenSymbols, setHiddenSymbols] = useState<Set<string>>(new Set());
  const [inputValue, setInputValue] = useState('');
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const toggleSymbolVisibility = (sym: string) => {
    setHiddenSymbols((prev) => {
      const next = new Set(prev);
      if (next.has(sym)) next.delete(sym);
      else next.add(sym);
      return next;
    });
  };

  const fetchChart = useCallback(async (syms: string[]) => {
    if (syms.length === 0) {
      setChartData([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/compare-ytd?symbols=${syms.join(',')}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to load');
        setChartData([]);
        return;
      }
      const { dates, series } = json;
      if (!Array.isArray(dates) || !Array.isArray(series) || dates.length === 0) {
        setChartData([]);
        return;
      }
      const data: ChartPoint[] = dates.map((d: string, i: number) => {
        const point: ChartPoint = { date: d };
        for (const s of series) {
          point[s.symbol] = typeof s.returns[i] === 'number' ? Math.round(s.returns[i] * 100) / 100 : 0;
        }
        return point;
      });
      setChartData(data);
    } catch {
      setError('Failed to load comparison data');
      setChartData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isCompareOpen) return;
    fetchChart(symbols);
  }, [isCompareOpen, symbols.join(',')]);

  useEffect(() => {
    if (!isCompareOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCompare();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isCompareOpen, closeCompare]);

  useEffect(() => {
    if (!isCompareOpen) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) closeCompare();
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [isCompareOpen, closeCompare]);

  const filteredTickers = inputValue.trim()
    ? COMP_TICKERS.filter(
        (t) =>
          t.ticker.toUpperCase().startsWith(inputValue.trim().toUpperCase()) ||
          t.name.toLowerCase().includes(inputValue.trim().toLowerCase())
      )
    : COMP_TICKERS;

  const addSymbol = (ticker: string) => {
    const t = ticker.toUpperCase();
    if (!symbols.includes(t)) setSymbols((prev) => [...prev, t]);
    setInputValue('');
    inputRef.current?.focus();
  };

  const removeSymbol = (ticker: string) => {
    setSymbols((prev) => prev.filter((s) => s !== ticker));
  };

  if (!isCompareOpen) return null;

  const hasData = chartData.length > 0 && symbols.length > 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        ref={panelRef}
        className="flex flex-col w-full max-w-3xl max-h-[90vh] rounded-xl overflow-hidden border border-zinc-700/80 bg-zinc-900/98 shadow-2xl"
      >
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-800/90 border-b border-zinc-700/80 shrink-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/20 border border-emerald-500/50">
              COMP
            </span>
            <span className="text-sm font-semibold text-zinc-200">Compare YTD %</span>
          </div>
          <button
            type="button"
            onClick={closeCompare}
            className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-3 border-b border-zinc-700/50 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filteredTickers.length > 0) {
                    e.preventDefault();
                    addSymbol(filteredTickers[0].ticker);
                  }
                }}
                placeholder="Add symbol (NQ, ES, CL...)"
                className="w-48 px-2.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-600 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
              />
              {inputValue.trim() && (
                <div className="absolute top-full left-0 mt-1 w-56 max-h-40 overflow-auto rounded-lg bg-zinc-800 border border-zinc-600 shadow-xl z-10">
                  {filteredTickers.slice(0, 8).map((t) => (
                    <button
                      key={t.ticker}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        addSymbol(t.ticker);
                      }}
                      className="w-full text-left px-2 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700 flex justify-between gap-2"
                    >
                      <span className="font-medium">{t.ticker}</span>
                      <span className="text-zinc-500 truncate">{t.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {symbols.map((sym) => (
              <span
                key={sym}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-700/80 text-sm text-zinc-200"
              >
                {sym}
                <button
                  type="button"
                  onClick={() => removeSymbol(sym)}
                  className="p-0.5 rounded hover:bg-zinc-600 text-zinc-400 hover:text-zinc-200"
                  aria-label={`Remove ${sym}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
          <p className="text-xs text-zinc-500 mt-1.5">Add 2+ markets to compare relative strength (YTD % change).</p>
        </div>

        <div className="flex-1 min-h-[320px] p-4 overflow-auto">
          {error && (
            <p className="text-sm text-red-400 mb-2">{error}</p>
          )}
          {loading && symbols.length > 0 && (
            <div className="flex items-center justify-center h-64 text-zinc-500">Loading…</div>
          )}
          {!loading && symbols.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
              <p className="text-sm">Add a symbol above to see YTD % performance.</p>
              <p className="text-xs mt-1">Example: type NQ then add ES to compare.</p>
            </div>
          )}
          {!loading && hasData && (
            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#a1a1aa' }}
                  tickFormatter={(v) => {
                    const d = new Date(v);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#a1a1aa' }}
                  tickFormatter={(v) => `${v}%`}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#27272a', border: '1px solid #52525b', borderRadius: '8px' }}
                  labelStyle={{ color: '#a1a1aa' }}
                  formatter={(value: number | undefined, name: string | undefined) => [
                    value != null ? `${Number(value).toFixed(2)}%` : '—',
                    name ?? '',
                  ]}
                  labelFormatter={(label) => new Date(label).toLocaleDateString()}
                />
                <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                  {symbols.map((sym, idx) => {
                    const hidden = hiddenSymbols.has(sym);
                    return (
                      <button
                        key={sym}
                        type="button"
                        onClick={() => toggleSymbolVisibility(sym)}
                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-opacity ${
                          hidden
                            ? 'opacity-50 line-through text-zinc-500'
                            : 'opacity-100 text-zinc-200 hover:bg-zinc-700/80'
                        }`}
                        style={hidden ? undefined : { borderLeft: `3px solid ${SERIES_COLORS[idx % SERIES_COLORS.length]}` }}
                        title={hidden ? `Show ${sym}` : `Hide ${sym}`}
                      >
                        {sym}
                      </button>
                    );
                  })}
                </div>
                {symbols.map((sym, idx) =>
                  !hiddenSymbols.has(sym) ? (
                    <Line
                      key={sym}
                      type="monotone"
                      dataKey={sym}
                      name={sym}
                      stroke={SERIES_COLORS[idx % SERIES_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  ) : null
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
