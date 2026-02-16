'use client';

import { useState, useEffect, useRef } from 'react';
import { useEquityIndex } from '../contexts/EquityIndexContext';

const POLL_MS = 3000;
const EI_SYMBOLS = [
  { ticker: 'ES', name: 'S&P 500 E-Mini' },
  { ticker: 'YM', name: 'Dow Futures Mini' },
  { ticker: 'NQ', name: 'Nasdaq 100 E-Mini' },
];

interface RowData {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  previousClose: number | null;
}

function getDefaultPosition() {
  if (typeof window === 'undefined') return { x: 120, y: 120 };
  return {
    x: Math.max(20, (window.innerWidth - 520) / 2),
    y: Math.max(20, (window.innerHeight - 280) / 2),
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
            if (j.error) return { symbol: ticker, name, price: null, change: null, changePercent: null, previousClose: null };
            return {
              symbol: ticker,
              name,
              price: typeof j.price === 'number' ? j.price : null,
              change: typeof j.change === 'number' ? j.change : null,
              changePercent: typeof j.changePercent === 'number' ? j.changePercent : null,
              previousClose: typeof j.previousClose === 'number' ? j.previousClose : null,
            };
          }
        } catch {
          // ignore
        }
        return { symbol: ticker, name, price: null, change: null, changePercent: null, previousClose: null };
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

  const delayText = `~${POLL_MS / 1000}s`;

  return (
    <div
      className="fixed z-50 flex flex-col w-[500px] rounded-lg overflow-hidden border border-zinc-700/80 bg-zinc-900/95 shadow-xl backdrop-blur-sm"
      style={{
        left: position.x,
        top: position.y,
        cursor: isDragging ? 'grabbing' : 'default',
      }}
    >
      <div
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          setIsDragging(true);
          dragStart.current = { x: e.clientX, y: e.clientY, left: position.x, top: position.y };
        }}
        className="flex items-center justify-between px-3 py-2 bg-zinc-800/90 border-b border-zinc-700/80 cursor-grab active:cursor-grabbing select-none"
      >
        <span className="text-sm font-semibold text-white">World Equity Index Futures</span>
        <button
          type="button"
          onClick={closeEquityIndex}
          className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="p-3 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-zinc-700/80">
              <th className="text-left py-2 px-2 text-zinc-400 font-medium">Ticker</th>
              <th className="text-left py-2 px-2 text-zinc-400 font-medium">Name</th>
              <th className="text-right py-2 px-2 text-zinc-400 font-medium">Last</th>
              <th className="text-right py-2 px-2 text-zinc-400 font-medium">Chg</th>
              <th className="text-right py-2 px-2 text-zinc-400 font-medium">Chg %</th>
              <th className="text-right py-2 px-2 text-zinc-400 font-medium">YTD %</th>
              <th className="text-right py-2 px-2 text-zinc-400 font-medium">Delay</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const isUp = (row.changePercent ?? 0) >= 0;
              const chgClass = isUp ? 'text-emerald-400' : 'text-red-400';
              return (
                <tr key={row.symbol} className="border-b border-zinc-800/80 last:border-b-0">
                  <td className="py-2 px-2 font-medium text-white">{row.symbol}1</td>
                  <td className="py-2 px-2 text-zinc-300">{row.name}</td>
                  <td className="py-2 px-2 text-right text-white tabular-nums">
                    {row.price != null
                      ? `$${row.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '--'}
                  </td>
                  <td className={`py-2 px-2 text-right tabular-nums ${chgClass}`}>
                    {row.change != null
                      ? `${row.change >= 0 ? '+' : ''}$${row.change.toFixed(2)}`
                      : '--'}
                  </td>
                  <td className={`py-2 px-2 text-right tabular-nums ${chgClass}`}>
                    {row.changePercent != null
                      ? `${row.changePercent >= 0 ? '+' : ''}${row.changePercent.toFixed(2)}%`
                      : '--'}
                  </td>
                  <td className="py-2 px-2 text-right text-zinc-500 tabular-nums">—</td>
                  <td className="py-2 px-2 text-right text-zinc-500 text-xs">{delayText}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="text-xs text-zinc-500 mt-2">Data updates every {POLL_MS / 1000}s. YTD % coming soon.</p>
      </div>
    </div>
  );
}
