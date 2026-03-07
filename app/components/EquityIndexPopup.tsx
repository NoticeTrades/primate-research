'use client';

import { useState, useEffect, useRef } from 'react';
import { useEquityIndex } from '../contexts/EquityIndexContext';

const POLL_MS = 3000;
const EI_SYMBOLS = [
  { ticker: 'ES', name: 'S&P 500 E-Mini' },
  { ticker: 'NQ', name: 'Nasdaq 100 E-Mini' },
  { ticker: 'YM', name: 'Dow E-Mini' },
  { ticker: 'RTY', name: 'Russell 2000 E-Mini' },
];

interface RowData {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  previousClose: number | null;
  ytdPercent: number | null;
}

function getDefaultPosition() {
  if (typeof window === 'undefined') return { x: 120, y: 120 };
  return {
    x: Math.max(16, (window.innerWidth - 480) / 2),
    y: Math.max(16, (window.innerHeight - 320) / 2),
  };
}

export default function EquityIndexPopup() {
  const { isEquityIndexOpen, closeEquityIndex } = useEquityIndex();
  const [position, setPosition] = useState(getDefaultPosition);
  const [data, setData] = useState<RowData[]>(EI_SYMBOLS.map(({ ticker, name }) => ({
    symbol: ticker,
    name,
    price: null,
    change: null,
    changePercent: null,
    previousClose: null,
    ytdPercent: null,
  })));
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, left: 0, top: 0 });

  const fetchData = async () => {
    const results = await Promise.all(
      EI_SYMBOLS.map(async ({ ticker, name }) => {
        try {
          const res = await fetch(`/api/market-data?symbol=${ticker}`);
          if (res.ok) {
            const j = await res.json();
            if (j.error) return { symbol: ticker, name, price: null, change: null, changePercent: null, previousClose: null, ytdPercent: null };
            const price = typeof j.price === 'number' ? j.price : null;
            const prev = typeof j.previousClose === 'number' ? j.previousClose : null;
            const change = typeof j.change === 'number' ? j.change : (price != null && prev != null ? price - prev : null);
            const changePercent = typeof j.changePercent === 'number' ? j.changePercent : (prev && change != null ? (change / prev) * 100 : null);
            const ytdPercent = typeof j.ytdPercent === 'number' && !Number.isNaN(j.ytdPercent) ? j.ytdPercent : null;
            return {
              symbol: ticker,
              name,
              price,
              change,
              changePercent,
              previousClose: prev,
              ytdPercent,
            };
          }
        } catch {
          // ignore
        }
        return { symbol: ticker, name, price: null, change: null, changePercent: null, previousClose: null, ytdPercent: null };
      })
    );
    setData(results);
  };

  useEffect(() => {
    if (!isEquityIndexOpen) return;
    fetchData();
    const t = setInterval(fetchData, POLL_MS);
    return () => clearInterval(t);
  }, [isEquityIndexOpen]);

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

  if (!isEquityIndexOpen) return null;

  return (
    <div
      className="fixed z-50 flex flex-col min-w-[440px] max-w-[500px] rounded-xl overflow-hidden border border-zinc-700/80 bg-zinc-900/98 shadow-2xl backdrop-blur-sm"
      style={{
        left: position.x,
        top: position.y,
        cursor: isDragging ? 'grabbing' : 'default',
      }}
    >
      {/* Header */}
      <div
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          setIsDragging(true);
          dragStart.current = { x: e.clientX, y: e.clientY, left: position.x, top: position.y };
        }}
        className="flex items-center justify-between px-4 py-3 bg-zinc-800/95 border-b border-zinc-700/80 cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-400 text-xs font-bold">
            EI
          </span>
          <span className="text-sm font-semibold text-white tracking-tight">US Equity Index Futures</span>
        </div>
        <button
          type="button"
          onClick={closeEquityIndex}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700/80 transition-colors"
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-zinc-700/60">
              <th className="text-left py-3 px-4 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                Contract
              </th>
              <th className="text-right py-3 px-4 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                Last
              </th>
              <th className="text-right py-3 px-4 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                Chg
              </th>
              <th className="text-right py-3 px-4 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                Chg %
              </th>
              <th className="text-right py-3 px-4 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                YTD %
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const isUp = (row.changePercent ?? 0) >= 0;
              const chgClass = isUp ? 'text-emerald-400' : 'text-red-400';
              const ytdUp = (row.ytdPercent ?? 0) >= 0;
              const ytdClass = ytdUp ? 'text-emerald-400' : 'text-red-400';
              return (
                <tr
                  key={row.symbol}
                  className="border-b border-zinc-800/60 last:border-b-0 hover:bg-zinc-800/40 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-white tabular-nums">{row.symbol}</span>
                      <span className="text-xs text-zinc-500">{row.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-sm font-medium text-white tabular-nums">
                      {row.price != null
                        ? row.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : '—'}
                    </span>
                  </td>
                  <td className={`py-3 px-4 text-right text-sm font-medium tabular-nums ${chgClass}`}>
                    {row.change != null
                      ? `${row.change >= 0 ? '+' : ''}${row.change.toFixed(2)}`
                      : '—'}
                  </td>
                  <td className={`py-3 px-4 text-right text-sm font-medium tabular-nums ${chgClass}`}>
                    {row.changePercent != null
                      ? `${row.changePercent >= 0 ? '+' : ''}${row.changePercent.toFixed(2)}%`
                      : '—'}
                  </td>
                  <td className={`py-3 px-4 text-right text-sm font-medium tabular-nums ${ytdClass}`}>
                    {row.ytdPercent != null ? `${row.ytdPercent >= 0 ? '+' : ''}${row.ytdPercent.toFixed(2)}%` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 bg-zinc-800/50 border-t border-zinc-700/60 flex items-center justify-between">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Points · Data ~{POLL_MS / 1000}s delay</span>
      </div>
    </div>
  );
}
