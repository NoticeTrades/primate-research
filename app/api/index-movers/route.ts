import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type StockMover = {
  ticker: string;
  price: number;
  changePercent: number;
  change: number;
  volume: number;
};

// Free provider: Stooq (no API key). We approximate "index movers" by using a small
// universe of liquid, index-representative tickers and computing daily % moves.
const MOVERS_CACHE_MS = 30_000;
const moversCache = new Map<string, { until: number; gainers: StockMover[]; losers: StockMover[]; source: string }>();

const STQ_UNIVERSE: Record<string, string[]> = {
  NQ: [
    'aapl.us',
    'msft.us',
    'nvda.us',
    'amzn.us',
    'meta.us',
    'goog.us',
    'tsla.us',
    'avgo.us',
    'cost.us',
    'amd.us',
    'adbe.us',
    'qcom.us',
    'intc.us',
    'csco.us',
    'orcl.us',
    'mu.us',
  ],
  ES: [
    'aapl.us',
    'msft.us',
    'nvda.us',
    'amzn.us',
    'meta.us',
    'goog.us',
    'jpm.us',
    'xom.us',
    'lly.us',
    'pg.us',
    'v.us',
    'unh.us',
    'ma.us',
    'ko.us',
    'hd.us',
    'll.y.us',
  ],
  YM: [
    'aapl.us',
    'msft.us',
    'jpm.us',
    'unh.us',
    'v.us',
    'hd.us',
    'gs.us',
    'mcd.us',
    'cat.us',
    'ibm.us',
    'mmm.us',
    'dis.us',
    'wmt.us',
    'nke.us',
    'ko.us',
    'pg.us',
  ],
  RTY: [
    'smci.us',
    'fslr.us',
    'celh.us',
    'afrm.us',
    'sofi.us',
    'crox.us',
    'pltr.us',
    'rkbl.us',
    'upst.us',
    'rivn.us',
    'app.us',
    'iot.us',
    'duol.us',
    'onon.us',
    'sound.us',
  ],
  // Metals / FX / others aren't supported by this approximate approach yet.
  DXY: [],
  GC: [],
  SI: [],
  CL: [],
  FTSE: [],
  GER40: [],
  DAX: [],
};

function parseNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return 0;
  const cleaned = value.replace(/%/g, '').trim();
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function fmtStooqDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function parseCsvLine(line: string): string[] {
  return line.split(',');
}

async function fetchStooqDaily(stooqSymbol: string): Promise<StockMover | null> {
  const d2 = new Date();
  const d1 = new Date(Date.now() - 1000 * 60 * 60 * 24 * 35);
  const url = `https://stooq.com/q/l/?s=${encodeURIComponent(stooqSymbol)}&i=d&d1=${fmtStooqDate(d1)}&d2=${fmtStooqDate(d2)}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  const csv = await res.text();
  const lines = csv
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  // Header: Date,Open,High,Low,Close,Volume
  if (lines.length < 3) return null;
  const dataLines = lines.slice(1);
  const last = dataLines[dataLines.length - 1];
  const prev = dataLines[dataLines.length - 2];
  const lastCols = parseCsvLine(last);
  const prevCols = parseCsvLine(prev);
  if (lastCols.length < 6 || prevCols.length < 6) return null;

  const close = parseFloat(lastCols[4]);
  const prevClose = parseFloat(prevCols[4]);
  const volume = parseFloat(lastCols[5] || '0');
  if (!(close > 0) || !(prevClose > 0)) return null;

  const change = close - prevClose;
  const changePercent = (change / prevClose) * 100;
  const ticker = stooqSymbol.replace(/\.[a-z]+$/i, '').toUpperCase();

  return {
    ticker,
    price: close,
    changePercent,
    change,
    volume: Number.isFinite(volume) ? volume : 0,
  };
}

async function fetchStooqMovers(index: string, limit: number): Promise<{ gainers: StockMover[]; losers: StockMover[] } | null> {
  const universe = STQ_UNIVERSE[index] || [];
  if (universe.length === 0) return null;

  const movers: StockMover[] = [];
  const chunkSize = 6;
  for (let i = 0; i < universe.length; i += chunkSize) {
    const slice = universe.slice(i, i + chunkSize);
    const results = await Promise.all(slice.map((s) => fetchStooqDaily(s)));
    for (const r of results) if (r) movers.push(r);
  }

  if (movers.length === 0) return null;
  const sorted = [...movers].sort((a, b) => b.changePercent - a.changePercent);
  return {
    gainers: sorted.slice(0, limit),
    losers: [...sorted].reverse().slice(0, limit),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const index = (searchParams.get('index') || 'index').toUpperCase();
  const limit = Math.min(5, Math.max(1, parseInt(searchParams.get('limit') || '5', 10) || 5));

  try {
    const cacheKey = `${index}:${limit}`;
    const now = Date.now();
    const cached = moversCache.get(cacheKey);
    if (cached && cached.until > now) {
      return NextResponse.json(
        { index, source: cached.source, gainers: cached.gainers, losers: cached.losers },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    const stooqMovers = await fetchStooqMovers(index, limit);
    if (stooqMovers) {
      moversCache.set(cacheKey, {
        until: now + MOVERS_CACHE_MS,
        gainers: stooqMovers.gainers,
        losers: stooqMovers.losers,
        source: 'stooq-universe',
      });
      return NextResponse.json(
        { index, source: 'stooq-universe', gainers: stooqMovers.gainers, losers: stooqMovers.losers },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    return NextResponse.json(
      { index, source: 'unavailable', gainers: [], losers: [] },
      { status: 200, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch {
    return NextResponse.json({ error: 'Failed to fetch movers' }, { status: 500 });
  }
}

