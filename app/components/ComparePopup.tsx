'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { toPng } from 'html-to-image';
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

const RANGE_OPTIONS = [
  { value: 'ytd', label: 'YTD' },
  { value: '1m', label: '1 Month' },
  { value: '3m', label: '3 Months' },
  { value: '6m', label: '6 Months' },
  { value: '1y', label: '1 Year' },
  { value: '5y', label: '5 Years' },
  { value: 'all', label: 'All Time' },
] as const;
type RangeValue = (typeof RANGE_OPTIONS)[number]['value'];

const COMP_TICKERS = [
  { ticker: 'NQ', name: 'Nasdaq 100 E-Mini' },
  { ticker: 'ES', name: 'S&P 500 E-Mini' },
  { ticker: 'YM', name: 'Dow E-Mini' },
  { ticker: 'RTY', name: 'Russell 2000 E-Mini' },
  { ticker: 'DXY', name: 'US Dollar Index' },
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

const COMP_MIN_W = 400;
const COMP_MIN_H = 400;
const COMP_DEFAULT_W = 672;
const COMP_DEFAULT_H = 600;
const COMP_MAX_W = 1200;
const COMP_MAX_H = 900;

function getDefaultPosition() {
  if (typeof window === 'undefined') return { x: 80, y: 60 };
  return {
    x: Math.max(16, (window.innerWidth - COMP_DEFAULT_W) / 2),
    y: Math.max(16, (window.innerHeight - COMP_DEFAULT_H) / 2),
  };
}

export default function ComparePopup() {
  const { isCompareOpen, closeCompare } = useCompare();
  const [position, setPosition] = useState(getDefaultPosition);
  const [size, setSize] = useState({ width: COMP_DEFAULT_W, height: COMP_DEFAULT_H });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, left: 0, top: 0 });
  const resizeStart = useRef({ x: 0, y: 0, width: COMP_DEFAULT_W, height: COMP_DEFAULT_H });
  const [symbols, setSymbols] = useState<string[]>([]);
  const [range, setRange] = useState<RangeValue>('ytd');
  const [hiddenSymbols, setHiddenSymbols] = useState<Set<string>>(new Set());
  const [inputValue, setInputValue] = useState('');
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const toggleSymbolVisibility = (sym: string) => {
    setHiddenSymbols((prev) => {
      const next = new Set(prev);
      if (next.has(sym)) next.delete(sym);
      else next.add(sym);
      return next;
    });
  };

  const fetchChart = useCallback(async (syms: string[], rangeParam: RangeValue) => {
    if (syms.length === 0) {
      setChartData([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/compare-ytd?symbols=${syms.join(',')}&range=${rangeParam}`, { cache: 'no-store' });
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
    fetchChart(symbols, range);
  }, [isCompareOpen, symbols.join(','), range]);

  const handleDownload = useCallback(async () => {
    const el = chartContainerRef.current;
    if (!el) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(el, { pixelRatio: 2, backgroundColor: '#18181b' });
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = dataUrl;
      });
      // Try to load logo (PNG or JPG from public)
      const logoPaths = ['/primate-logo.png', '/primate-logo.jpg', '/logo.png', '/logo.jpg'];
      let logoImg: HTMLImageElement | null = null;
      for (const src of logoPaths) {
        try {
          logoImg = await new Promise<HTMLImageElement | null>((resolveLogo) => {
            const logo = new Image();
            logo.crossOrigin = 'anonymous';
            logo.onload = () => resolveLogo(logo);
            logo.onerror = () => resolveLogo(null);
            logo.src = src;
          });
          if (logoImg != null) break;
        } catch {
          logoImg = null;
        }
      }
      const logoHeight = 42;
      const logoPadding = 12;
      const hasLogo = logoImg != null && logoImg.width > 0 && logoImg.height > 0;
      const pad = hasLogo ? logoHeight + logoPadding * 2 + 40 : 40;
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height + pad;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#18181b';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0);
      ctx.fillStyle = '#71717a';
      ctx.textAlign = 'center';
      if (hasLogo && logoImg) {
        const scale = logoHeight / logoImg.height;
        const logoWidth = Math.min(logoImg.width * scale, 180);
        const logoX = (c.width - logoWidth) / 2;
        const logoY = img.height + logoPadding;
        ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
        ctx.font = '13px system-ui, sans-serif';
        ctx.fillText('Primate Trading', c.width / 2, img.height + pad - 22);
        ctx.font = '11px system-ui, sans-serif';
        ctx.fillText('primatetrading.com', c.width / 2, img.height + pad - 8);
      } else {
        ctx.font = '14px system-ui, sans-serif';
        ctx.fillText('Primate Trading', c.width / 2, img.height + 22);
        ctx.font = '11px system-ui, sans-serif';
        ctx.fillText('primatetrading.com', c.width / 2, img.height + 38);
      }
      const finalUrl = c.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = finalUrl;
      a.download = `primate-compare-${symbols.join('-')}-${range}-${new Date().toISOString().slice(0, 10)}.png`;
      a.click();
    } catch {
      setError('Download failed');
    } finally {
      setDownloading(false);
    }
  }, [symbols, range]);

  useEffect(() => {
    if (!isCompareOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCompare();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isCompareOpen, closeCompare]);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      setPosition({
        x: dragStart.current.left + e.clientX - dragStart.current.x,
        y: Math.max(0, dragStart.current.top + e.clientY - dragStart.current.y),
      });
    };
    const onUp = () => setIsDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDragging]);

  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - resizeStart.current.x;
      const dy = e.clientY - resizeStart.current.y;
      const maxW = typeof window !== 'undefined' ? Math.min(COMP_MAX_W, window.innerWidth - position.x - 20) : COMP_MAX_W;
      const maxH = typeof window !== 'undefined' ? Math.min(COMP_MAX_H, window.innerHeight - position.y - 20) : COMP_MAX_H;
      setSize({
        width: Math.max(COMP_MIN_W, Math.min(maxW, resizeStart.current.width + dx)),
        height: Math.max(COMP_MIN_H, Math.min(maxH, resizeStart.current.height + dy)),
      });
    };
    const onUp = () => setIsResizing(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isResizing, position.x, position.y]);

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
    <div
      ref={panelRef}
      className="fixed z-[60] flex flex-col rounded-xl overflow-hidden border border-zinc-700/80 bg-zinc-900/98 shadow-2xl backdrop-blur-sm"
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        cursor: isDragging ? 'grabbing' : isResizing ? 'nwse-resize' : 'default',
      }}
    >
        <div
          onMouseDown={(e) => {
            if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('select')) return;
            setIsDragging(true);
            dragStart.current = { x: e.clientX, y: e.clientY, left: position.x, top: position.y };
          }}
          className="flex items-center justify-between px-4 py-3 bg-zinc-800/90 border-b border-zinc-700/80 shrink-0 flex-wrap gap-2 cursor-grab active:cursor-grabbing select-none"
        >
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/20 border border-emerald-500/50">
              COMP
            </span>
            <span className="text-sm font-semibold text-zinc-200">Compare Multiple Indices Historically (% Change)</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={range}
              onChange={(e) => setRange(e.target.value as RangeValue)}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-700 border border-zinc-600 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              {RANGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleDownload}
              disabled={!hasData || downloading}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:pointer-events-none text-white text-sm font-medium transition-colors"
            >
              {downloading ? (
                '…'
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </>
              )}
            </button>
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
          <p className="text-xs text-zinc-500 mt-1.5">Add symbols to compare relative strength. Use the dropdown to change period (YTD, 1M, 1Y, 5Y, etc.).</p>
        </div>

        <div className="flex-1 min-h-0 p-4 overflow-auto">
          {error && (
            <p className="text-sm text-red-400 mb-2">{error}</p>
          )}
          {loading && symbols.length > 0 && (
            <div className="flex items-center justify-center h-64 text-zinc-500">Loading…</div>
          )}
          {!loading && symbols.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
              <p className="text-sm">Add a symbol above to see historical % performance.</p>
              <p className="text-xs mt-1">Example: type NQ then add ES to compare.</p>
            </div>
          )}
          {!loading && hasData && (
            <div ref={chartContainerRef} className="bg-zinc-900 rounded-lg p-3">
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
            </div>
          )}
        </div>
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsResizing(true);
            resizeStart.current = { x: e.clientX, y: e.clientY, width: size.width, height: size.height };
          }}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize flex items-end justify-end opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Resize"
        >
          <svg className="w-3 h-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </div>
    </div>
  );
}
