'use client';

import { useState, useEffect, useRef } from 'react';
import { useMostActive } from '../contexts/MostActiveContext';

type TabId = 'active' | 'gainers' | 'losers' | 'value';

type Row = {
  ticker: string;
  name: string;
  price: number;
  changePercent: number;
  change: number;
  volume: number;
  volumeDollar: number;
  marketCap: number;
  sector: string;
};

const TABS: { id: TabId; label: string }[] = [
  { id: 'active', label: 'Active' },
  { id: 'gainers', label: 'Gainers' },
  { id: 'losers', label: 'Losers' },
  { id: 'value', label: 'Value' },
];

const LIMIT_OPTIONS = [10, 20, 25, 50, 100];

const MOST_MIN_W = 400;
const MOST_MIN_H = 320;
const MOST_DEFAULT_W = 900;
const MOST_DEFAULT_H = 520;
const MOST_MAX_W = 1400;
const MOST_MAX_H = 900;

function getDefaultPosition() {
  if (typeof window === 'undefined') return { x: 80, y: 60 };
  return {
    x: Math.max(16, (window.innerWidth - MOST_DEFAULT_W) / 2),
    y: Math.max(16, (window.innerHeight - MOST_DEFAULT_H) / 2),
  };
}

function formatVol(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return n.toFixed(0);
}

export default function MostActivePopup() {
  const { isMostActiveOpen, closeMostActive } = useMostActive();
  const [position, setPosition] = useState(getDefaultPosition);
  const [size, setSize] = useState({ width: MOST_DEFAULT_W, height: MOST_DEFAULT_H });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, left: 0, top: 0 });
  const resizeStart = useRef({ x: 0, y: 0, width: MOST_DEFAULT_W, height: MOST_DEFAULT_H });
  const [tab, setTab] = useState<TabId>('active');
  const [limit, setLimit] = useState(20);
  const [sector, setSector] = useState('all');
  const [data, setData] = useState<Row[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMostActiveOpen) return;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ type: tab, limit: String(limit), sector });
    fetch(`/api/most-active?${params}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((json) => {
        if (json.error) {
          setError(json.error);
          setErrorHint(json.hint ?? null);
          setData([]);
          return;
        }
        setError(null);
        setErrorHint(null);
        setData(Array.isArray(json.data) ? json.data : []);
        setSectors(Array.isArray(json.sectors) ? json.sectors : []);
      })
      .catch(() => {
        setError('Failed to load');
        setErrorHint(null);
        setData([]);
      })
      .finally(() => setLoading(false));
  }, [isMostActiveOpen, tab, limit, sector]);

  useEffect(() => {
    if (!isMostActiveOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMostActive();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMostActiveOpen, closeMostActive]);

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
      const maxW = typeof window !== 'undefined' ? Math.min(MOST_MAX_W, window.innerWidth - position.x - 20) : MOST_MAX_W;
      const maxH = typeof window !== 'undefined' ? Math.min(MOST_MAX_H, window.innerHeight - position.y - 20) : MOST_MAX_H;
      setSize({
        width: Math.max(MOST_MIN_W, Math.min(maxW, resizeStart.current.width + dx)),
        height: Math.max(MOST_MIN_H, Math.min(maxH, resizeStart.current.height + dy)),
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

  if (!isMostActiveOpen) return null;

  const sectorOptions = sectors.length > 0 ? sectors : ['All'];

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
            <span className="inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-bold text-amber-400 bg-amber-500/20 border border-amber-500/50">
              MOST
            </span>
            <span className="text-sm font-semibold text-zinc-200">US stocks: most active, top gainers, losers & by dollar volume</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={String(limit)}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-700 border border-zinc-600 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            >
              {LIMIT_OPTIONS.map((n) => (
                <option key={n} value={String(n)}>
                  Top {n}
                </option>
              ))}
            </select>
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-700 border border-zinc-600 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50 min-w-[140px]"
            >
              {sectorOptions.map((s) => (
                <option key={s} value={s === 'All' ? 'all' : s}>
                  {s === 'All' ? 'All sectors' : s}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={closeMostActive}
              className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex border-b border-zinc-700/50 shrink-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'text-amber-400 border-b-2 border-amber-500 bg-zinc-800/50'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-auto p-4">
          {error && (
            <div className="mb-2">
              <p className="text-sm text-red-400">{error}</p>
              {errorHint && <p className="text-xs text-zinc-400 mt-1 max-w-md">{errorHint}</p>}
            </div>
          )}
          {loading && <div className="flex items-center justify-center py-12 text-zinc-500">Loading…</div>}
          {!loading && data.length === 0 && !error && (
            <div className="flex items-center justify-center py-12 text-zinc-500">No data for this selection.</div>
          )}
          {!loading && data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-zinc-600 text-zinc-400 text-left">
                    <th className="py-2 pr-4 font-medium">Ticker</th>
                    <th className="py-2 pr-4 font-medium">Name</th>
                    <th className="py-2 pr-4 font-medium text-right">Last Price</th>
                    <th className="py-2 pr-4 font-medium text-right">Chg %</th>
                    <th className="py-2 pr-4 font-medium text-right">Chg</th>
                    <th className="py-2 pr-4 font-medium text-right">Vol</th>
                    <th className="py-2 pr-4 font-medium text-right">Vol $</th>
                    <th className="py-2 font-medium text-right">Market Cap</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => (
                    <tr key={row.ticker} className="border-b border-zinc-700/50 hover:bg-zinc-800/30">
                      <td className="py-2 pr-4 font-medium text-zinc-200">{row.ticker}</td>
                      <td className="py-2 pr-4 text-zinc-300 max-w-[180px] truncate" title={row.name}>
                        {row.name}
                      </td>
                      <td className="py-2 pr-4 text-right text-zinc-200">{row.price.toFixed(2)}</td>
                      <td className={`py-2 pr-4 text-right font-medium ${row.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {row.changePercent >= 0 ? '+' : ''}{row.changePercent.toFixed(2)}%
                      </td>
                      <td className={`py-2 pr-4 text-right ${row.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {row.change >= 0 ? '+' : ''}{row.change.toFixed(2)}
                      </td>
                      <td className="py-2 pr-4 text-right text-zinc-400">{formatVol(row.volume)}</td>
                      <td className="py-2 pr-4 text-right text-zinc-400">{formatVol(row.volumeDollar)}</td>
                      <td className="py-2 text-right text-zinc-400">{row.marketCap > 0 ? formatVol(row.marketCap) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
