'use client';

import { useState, useEffect, useRef } from 'react';
import { useVolume } from '../contexts/VolumeContext';

type VolumeRow = {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  change: number;
  volume: number;
  volumeAvg20?: number;
  volumeVsAvg?: number;
  dayRangePoints?: number;
  dayRangePercent?: number;
};

const MIN_W = 640;
const MIN_H = 360;
const DEFAULT_W = 960;
const DEFAULT_H = 520;
const MAX_W = 1600;
const MAX_H = 1000;

function getDefaultPosition() {
  if (typeof window === 'undefined') return { x: 80, y: 80 };
  return {
    x: Math.max(16, (window.innerWidth - DEFAULT_W) / 2),
    y: Math.max(16, (window.innerHeight - DEFAULT_H) / 2),
  };
}

function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return n.toFixed(0);
}

const NAME_OVERRIDES: Record<string, string> = {
  ES: 'E-mini S&P 500',
  NQ: 'E-mini NASDAQ-100',
  YM: 'E-mini Dow Jones',
  RTY: 'E-mini Russell 2000',
  CL: 'WTI Crude Oil',
  DXY: 'US Dollar Index',
  FTSE: 'FTSE 100 Index',
  GER40: 'DAX / Germany 40',
  DAX: 'DAX Index',
};

export default function VolumePopup() {
  const { isVolumeOpen, closeVolume } = useVolume();
  const [position, setPosition] = useState(getDefaultPosition);
  const [size, setSize] = useState({ width: DEFAULT_W, height: DEFAULT_H });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, left: 0, top: 0 });
  const resizeStart = useRef({ x: 0, y: 0, width: DEFAULT_W, height: DEFAULT_H });
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<VolumeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVolumeOpen) return;
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [isVolumeOpen]);

  const handleSearch = async (symbolRaw?: string) => {
    const raw = (symbolRaw ?? query).trim();
    if (!raw) return;
    const sym = raw.toUpperCase();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/indices/${encodeURIComponent(sym)}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to fetch index volume');
      }
      const body = json as {
        price: number;
        changePercent: number;
        change: number;
        volume: number;
        volumeAvg20?: number;
        volumeVsAvg?: number;
        dayRangePoints?: number;
        dayRangePercent?: number;
      };
      const row: VolumeRow = {
        symbol: sym,
        name: NAME_OVERRIDES[sym] || sym,
        price: Number(body.price) || 0,
        changePercent: Number(body.changePercent) || 0,
        change: Number(body.change) || 0,
        volume: Number(body.volume) || 0,
        volumeAvg20: typeof body.volumeAvg20 === 'number' ? body.volumeAvg20 : undefined,
        volumeVsAvg: typeof body.volumeVsAvg === 'number' ? body.volumeVsAvg : undefined,
        dayRangePoints: typeof body.dayRangePoints === 'number' ? body.dayRangePoints : undefined,
        dayRangePercent: typeof body.dayRangePercent === 'number' ? body.dayRangePercent : undefined,
      };
      setRows((prev) => {
        const without = prev.filter((r) => r.symbol !== sym);
        return [row, ...without].slice(0, 20);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch index volume');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isVolumeOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeVolume();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isVolumeOpen, closeVolume]);

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
      const maxW = typeof window !== 'undefined' ? Math.min(MAX_W, window.innerWidth - position.x - 20) : MAX_W;
      const maxH = typeof window !== 'undefined' ? Math.min(MAX_H, window.innerHeight - position.y - 20) : MAX_H;
      setSize({
        width: Math.max(MIN_W, Math.min(maxW, resizeStart.current.width + dx)),
        height: Math.max(MIN_H, Math.min(maxH, resizeStart.current.height + dy)),
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

  if (!isVolumeOpen) return null;

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
          if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
          setIsDragging(true);
          dragStart.current = { x: e.clientX, y: e.clientY, left: position.x, top: position.y };
        }}
        className="flex items-center justify-between gap-3 px-4 py-3 bg-zinc-800/90 border-b border-zinc-700/80 cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-bold text-sky-400 bg-sky-500/20 border border-sky-500/50">
            VOLU
          </span>
          <span className="text-sm font-semibold text-zinc-50 truncate">
            Index Volume Lookup
          </span>
        </div>
        <button
          type="button"
          onClick={closeVolume}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="shrink-0 border-b border-zinc-800 px-4 py-2.5 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
              }
            }}
            placeholder="Type an index or futures symbol and hit Enter — e.g. ES, NQ, YM, DXY, FTSE, GER40"
            className="flex-1 min-w-[220px] px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={() => handleSearch()}
            disabled={loading || !query.trim()}
            className="px-3 py-1.5 rounded-lg bg-sky-600 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Loading…' : 'Lookup'}
          </button>
        </div>
        <p className="text-[11px] text-zinc-500">
          Supports CME futures (ES, NQ, YM, RTY, CL, DXY) and cash indices like FTSE 100 (FTSE) and Germany 40 (GER40 / DAX).
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-auto px-4 py-3">
        {error && (
          <div className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}
        {rows.length === 0 && !error && !loading && (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-zinc-500">Search for an index or futures symbol to see current volume.</p>
          </div>
        )}
        {rows.length > 0 && (
          <div className="rounded-lg border border-zinc-700/70 overflow-hidden">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-zinc-800/80 border-b border-zinc-700/70">
                  <th className="py-2.5 px-3 text-left font-medium text-zinc-400">Symbol</th>
                  <th className="py-2.5 px-3 text-left font-medium text-zinc-400">Name</th>
                  <th className="py-2.5 px-3 text-right font-medium text-zinc-400">Last</th>
                  <th className="py-2.5 px-3 text-right font-medium text-zinc-400">Chg %</th>
                  <th className="py-2.5 px-3 text-right font-medium text-zinc-400">Chg</th>
                  <th className="py-2.5 px-3 text-right font-medium text-zinc-400">Range</th>
                  <th className="py-2.5 px-3 text-right font-medium text-zinc-400">Range %</th>
                  <th className="py-2.5 px-3 text-right font-medium text-zinc-400">Volume</th>
                  <th className="py-2.5 px-3 text-right font-medium text-zinc-400">Vs 20d Vol</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const up = row.changePercent >= 0;
                  const chgClass = up ? 'text-emerald-400' : 'text-red-400';
                  const rangePts = row.dayRangePoints ?? 0;
                  const rangePct = row.dayRangePercent ?? 0;
                  const volVs = row.volumeVsAvg ?? 0;
                  return (
                    <tr key={row.symbol} className="border-b border-zinc-800/70 last:border-b-0 bg-zinc-900/60 hover:bg-zinc-800/80">
                      <td className="py-2.5 px-3 font-semibold text-zinc-100 tabular-nums whitespace-nowrap">{row.symbol}</td>
                      <td className="py-2.5 px-3 text-zinc-200 max-w-xs truncate" title={row.name}>{row.name}</td>
                      <td className="py-2.5 px-3 text-right text-zinc-100 tabular-nums">
                        {row.price ? row.price.toFixed(2) : '—'}
                      </td>
                      <td className={`py-2.5 px-3 text-right tabular-nums ${chgClass}`}>
                        {row.changePercent ? `${row.changePercent >= 0 ? '+' : ''}${row.changePercent.toFixed(2)}%` : '—'}
                      </td>
                      <td className={`py-2.5 px-3 text-right tabular-nums ${chgClass}`}>
                        {row.change ? `${row.change >= 0 ? '+' : ''}${row.change.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-zinc-100 tabular-nums">
                        {rangePts ? rangePts.toFixed(1) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-zinc-100 tabular-nums">
                        {rangePct ? `${rangePct.toFixed(2)}%` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-zinc-100 tabular-nums">
                        {row.volume ? formatNumber(row.volume) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-zinc-100 tabular-nums">
                        {volVs ? `${volVs.toFixed(0)}%` : '—'}
                      </td>
                    </tr>
                  );
                })}
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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      </div>
    </div>
  );
}

