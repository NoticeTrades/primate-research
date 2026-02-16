'use client';

import { useState, useEffect, useRef } from 'react';
import { useTicker } from '../contexts/TickerContext';

const TERMINAL_WIDTH = 200;
const TERMINAL_HEIGHT = 120;
const MIN_WIDTH = 160;
const MIN_HEIGHT = 100;
const MAX_WIDTH = 500;
const MAX_HEIGHT = 400;
const POLL_MS = 3000;

function getDefaultPosition(symbol: string, index: number) {
  if (typeof window === 'undefined') return { x: 100 + index * 30, y: 100 + index * 30 };
  const cols = Math.floor((window.innerWidth - 80) / (TERMINAL_WIDTH + 16));
  const row = Math.floor(index / cols);
  const col = index % cols;
  const x = 24 + col * (TERMINAL_WIDTH + 16);
  const y = 100 + row * (TERMINAL_HEIGHT + 16);
  return { x, y };
}

interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

export default function PriceTerminal({ symbol, index }: { symbol: string; index: number }) {
  const { closeTicker } = useTicker();
  const [position, setPosition] = useState(() => getDefaultPosition(symbol, index));
  const [size, setSize] = useState({ width: TERMINAL_WIDTH, height: TERMINAL_HEIGHT });
  const [data, setData] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, left: 0, top: 0 });
  const resizeStart = useRef({ x: 0, y: 0, width: TERMINAL_WIDTH, height: TERMINAL_HEIGHT });

  const fetchPrice = async () => {
    try {
      const res = await fetch(`/api/market-data?symbol=${encodeURIComponent(symbol)}`);
      if (res.ok) {
        const j = await res.json();
        if (j.error) {
          setData(null);
          return;
        }
        setData({
          symbol: j.symbol || symbol,
          price: Number(j.price) ?? 0,
          change: Number(j.change) ?? 0,
          changePercent: Number(j.changePercent) ?? 0,
        });
      } else {
        setData(null);
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrice();
    const t = setInterval(fetchPrice, POLL_MS);
    return () => clearInterval(t);
  }, [symbol]);

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
      const maxW = typeof window !== 'undefined' ? Math.min(MAX_WIDTH, window.innerWidth - position.x - 20) : MAX_WIDTH;
      const maxH = typeof window !== 'undefined' ? Math.min(MAX_HEIGHT, window.innerHeight - position.y - 20) : MAX_HEIGHT;
      setSize({
        width: Math.max(MIN_WIDTH, Math.min(maxW, resizeStart.current.width + dx)),
        height: Math.max(MIN_HEIGHT, Math.min(maxH, resizeStart.current.height + dy)),
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

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStart.current = { x: e.clientX, y: e.clientY, width: size.width, height: size.height };
  };

  const isPositive = data ? data.change >= 0 : false;

  return (
    <div
      className="fixed z-50 flex flex-col rounded-lg overflow-hidden border border-zinc-700/80 bg-zinc-900/95 shadow-xl backdrop-blur-sm"
      style={{
        width: size.width,
        height: size.height,
        left: position.x,
        top: position.y,
        cursor: isDragging ? 'grabbing' : isResizing ? 'nwse-resize' : 'default',
      }}
    >
      <div
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('[data-resize-handle]')) return;
          setIsDragging(true);
          dragStart.current = { x: e.clientX, y: e.clientY, left: position.x, top: position.y };
        }}
        className="flex items-center justify-between px-2.5 py-1.5 bg-zinc-800/90 border-b border-zinc-700/80 cursor-grab active:cursor-grabbing select-none"
      >
        <span className="text-xs font-semibold text-white truncate">{symbol}</span>
        <button
          type="button"
          onClick={() => closeTicker(symbol)}
          className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
          aria-label="Close"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-3 min-h-0">
        {loading ? (
          <div className="text-zinc-500 text-xs">Loading…</div>
        ) : data ? (
          <>
            <div className="text-lg font-semibold text-white tabular-nums">
              ${typeof data.price === 'number' ? data.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : data.price}
            </div>
            <div className={`text-xs font-medium tabular-nums mt-0.5 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
              {isPositive ? '+' : ''}{data.changePercent.toFixed(2)}% {isPositive ? '+' : ''}{data.change.toFixed(2)}
            </div>
          </>
        ) : (
          <div className="text-zinc-500 text-xs">No data</div>
        )}
      </div>
      <div
        data-resize-handle
        onMouseDown={handleResizeMouseDown}
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
