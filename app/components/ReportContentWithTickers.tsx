'use client';

import { useState, useEffect, Fragment, ReactNode } from 'react';
import Link from 'next/link';
import { isChatTicker, getTickerHref, getTickerDisplayName } from '@/lib/chatTickers';

/** Match words that could be tickers (2–6 letters, or $TICKER). */
const TICKER_WORD_REGEX = /\$[A-Za-z]{1,6}\b|\b[A-Za-z]{2,6}\b/g;

type Segment = { type: 'text'; value: string } | { type: 'ticker'; value: string };

const TECH_NAME_TO_TICKER: Array<{ name: string; symbol: string }> = [
  { name: 'microsoft', symbol: 'MSFT' },
  { name: 'nvidia', symbol: 'NVDA' },
  { name: 'alphabet', symbol: 'GOOGL' },
  { name: 'google', symbol: 'GOOGL' },
  { name: 'amazon', symbol: 'AMZN' },
  { name: 'netflix', symbol: 'NFLX' },
  { name: 'apple', symbol: 'AAPL' },
  { name: 'tesla', symbol: 'TSLA' },
  { name: 'meta', symbol: 'META' },
];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function overlaps(start: number, end: number, used: Array<{ start: number; end: number }>): boolean {
  return used.some((u) => start < u.end && end > u.start);
}

function parseSegments(text: string): Segment[] {
  const ranges: Array<{ start: number; end: number; symbol: string }> = [];
  const used: Array<{ start: number; end: number }> = [];

  // Match major tech company names (Apple, Nvidia, etc.) in plain text.
  for (const entry of TECH_NAME_TO_TICKER) {
    const re = new RegExp(`\\b${escapeRegex(entry.name)}\\b`, 'gi');
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const start = m.index;
      const end = m.index + m[0].length;
      if (overlaps(start, end, used)) continue;
      ranges.push({ start, end, symbol: entry.symbol });
      used.push({ start, end });
    }
  }

  // Match ticker symbols (NQ, ES, NVDA, etc.).
  const tickerRe = new RegExp(TICKER_WORD_REGEX.source, 'g');
  let tm: RegExpExecArray | null;
  while ((tm = tickerRe.exec(text)) !== null) {
    const raw = tm[0];
    const ticker = raw.replace(/^\$/, '').toUpperCase();
    if (!isChatTicker(ticker)) continue;
    const start = tm.index;
    const end = tm.index + raw.length;
    if (overlaps(start, end, used)) continue;
    ranges.push({ start, end, symbol: ticker });
    used.push({ start, end });
  }

  if (ranges.length === 0) return [{ type: 'text', value: text }];
  ranges.sort((a, b) => a.start - b.start);

  const segments: Segment[] = [];
  let lastEnd = 0;
  for (const r of ranges) {
    if (r.start > lastEnd) {
      segments.push({ type: 'text', value: text.slice(lastEnd, r.start) });
    }
    segments.push({ type: 'ticker', value: r.symbol });
    lastEnd = r.end;
  }
  if (lastEnd < text.length) {
    segments.push({ type: 'text', value: text.slice(lastEnd) });
  }
  return segments;
}

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return price.toFixed(2);
}

function formatPct(changePercent: number): string {
  return `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`;
}

function ReportTickerPill({ symbol }: { symbol: string }) {
  const sym = symbol.toUpperCase();
  const [data, setData] = useState<{ price: number; changePercent: number } | null>(null);

  useEffect(() => {
    fetch(`/api/market-data?symbol=${encodeURIComponent(sym)}&t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.price != null && !d.error) {
          setData({ price: Number(d.price), changePercent: Number(d.changePercent) || 0 });
        } else {
          setData(null);
        }
      })
      .catch(() => {
        setData(null);
      });
  }, [sym]);

  const name = getTickerDisplayName(sym);
  const href = getTickerHref(sym);

  const isUp = data != null && data.changePercent >= 0;
  const accent = data == null ? 'text-zinc-300' : isUp ? 'text-emerald-300' : 'text-red-300';
  const border = data == null ? 'border-zinc-600' : isUp ? 'border-emerald-700/70' : 'border-red-700/70';
  const bg = data == null ? 'bg-zinc-800/70' : isUp ? 'bg-emerald-950/40' : 'bg-red-950/40';
  const hover = data == null ? 'hover:bg-zinc-700/80' : isUp ? 'hover:bg-emerald-900/50' : 'hover:bg-red-900/50';
  const hoverTitle = data != null ? `${name} (${sym}) price: ${formatPrice(data.price)}` : `${name} (${sym})`;

  return (
    <Link
      href={href}
      title={hoverTitle}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-sm font-medium no-underline transition-colors ${bg} ${border} ${hover}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      {name !== sym ? (
        <>
          <span className="text-zinc-100">{name}</span>
          <span className="text-zinc-500">({sym})</span>
        </>
      ) : (
        <span className="text-zinc-100">{sym}</span>
      )}
      {data != null ? (
        <span className={`tabular-nums font-semibold ${accent}`}>{formatPct(data.changePercent)}</span>
      ) : (
        <span className="text-zinc-500">…</span>
      )}
    </Link>
  );
}

/** Renders paragraph text with ticker symbols as clickable pills (name/symbol + daily %). */
export function ReportContentWithTickers({ text }: { text: string }): ReactNode {
  const segments = parseSegments(text);
  if (segments.length === 0) return text;
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === 'text') return <Fragment key={i}>{seg.value}</Fragment>;
        return <ReportTickerPill key={i} symbol={seg.value} />;
      })}
    </>
  );
}
