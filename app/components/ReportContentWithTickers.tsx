'use client';

import { useState, useEffect, Fragment, ReactNode } from 'react';
import Link from 'next/link';
import { isIndexTicker, getTickerHref, getTickerDisplayName } from '@/lib/chatTickers';

/** Match words that could be tickers (2–6 letters, or $TICKER). */
const TICKER_WORD_REGEX = /\$[A-Za-z]{1,6}\b|\b[A-Za-z]{2,6}\b/g;

type Segment = { type: 'text'; value: string } | { type: 'ticker'; value: string };

function parseSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  let lastEnd = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(TICKER_WORD_REGEX.source, 'g');
  while ((m = re.exec(text)) !== null) {
    const raw = m[0];
    const ticker = raw.replace(/^\$/, '').toUpperCase();
    if (isIndexTicker(ticker)) {
      if (m.index > lastEnd) {
        segments.push({ type: 'text', value: text.slice(lastEnd, m.index) });
      }
      segments.push({ type: 'ticker', value: ticker });
      lastEnd = m.index + raw.length;
    }
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
        }
      })
      .catch(() => {});
  }, [sym]);

  const name = getTickerDisplayName(sym);
  const href = getTickerHref(sym);

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-sm font-medium no-underline bg-zinc-800 border border-zinc-600 text-zinc-200 hover:bg-zinc-700 hover:border-zinc-500 hover:text-white transition-colors"
    >
      {name !== sym ? (
        <>
          <span>{name}</span>
          <span className="text-zinc-500">({sym})</span>
        </>
      ) : (
        <span>{sym}</span>
      )}
      {data != null ? (
        <span className="tabular-nums text-blue-400">{formatPrice(data.price)}</span>
      ) : (
        <span className="text-zinc-500">…</span>
      )}
    </Link>
  );
}

/** Renders paragraph text with ticker symbols as clickable pills (name, ticker, price). */
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
