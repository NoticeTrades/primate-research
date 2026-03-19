import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type OverviewItem = {
  symbol: string;
  name: string;
  category: string;
  price: number;
  changePercent: number;
};

const INSTRUMENTS: Array<{ symbol: string; yahoo: string; name: string; category: string }> = [
  { symbol: 'ES', yahoo: 'ESM26.CME', name: 'E-mini S&P 500', category: 'US Index Futures' },
  { symbol: 'NQ', yahoo: 'NQM26.CME', name: 'E-mini NASDAQ-100', category: 'US Index Futures' },
  { symbol: 'YM', yahoo: 'YMM26.CBT', name: 'E-mini Dow Jones', category: 'US Index Futures' },
  { symbol: 'RTY', yahoo: 'RTYM26.CME', name: 'E-mini Russell 2000', category: 'US Index Futures' },
  { symbol: 'DXY', yahoo: 'DX-Y.NYB', name: 'US Dollar Index', category: 'Macro' },
  { symbol: 'GC', yahoo: 'GC=F', name: 'Gold', category: 'Metals' },
  { symbol: 'SI', yahoo: 'SI=F', name: 'Silver', category: 'Metals' },
  { symbol: 'VTI', yahoo: 'VTI', name: 'US Total Market', category: 'Total Market' },
  { symbol: 'VXUS', yahoo: 'VXUS', name: 'International Market', category: 'International' },
  { symbol: 'EEM', yahoo: 'EEM', name: 'Emerging Markets', category: 'International' },
];

const RANGE_FOR_TIMEFRAME: Record<string, string> = {
  '1D': '5d',
  '1W': '1mo',
  '1M': '3mo',
  '1Y': '2y',
};

const LOOKBACK_DAYS: Record<string, number> = {
  '1D': 1,
  '1W': 5,
  '1M': 21,
  '1Y': 252,
};

function asNumberArray(v: unknown): number[] {
  if (!Array.isArray(v)) return [];
  return v.filter((n): n is number => typeof n === 'number' && Number.isFinite(n));
}

async function fetchItem(item: { symbol: string; yahoo: string; name: string; category: string }, timeframe: string): Promise<OverviewItem | null> {
  const range = RANGE_FOR_TIMEFRAME[timeframe] || RANGE_FOR_TIMEFRAME['1D'];
  const lookback = LOOKBACK_DAYS[timeframe] || LOOKBACK_DAYS['1D'];
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(item.yahoo)}?interval=1d&range=${range}`;
  const res = await fetch(url, {
    cache: 'no-store',
    headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; PrimateResearch/1.0)' },
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { chart?: { result?: Array<{ indicators?: { quote?: Array<{ close?: unknown }> } }> } };
  const closes = asNumberArray(body?.chart?.result?.[0]?.indicators?.quote?.[0]?.close);
  if (closes.length < 2) return null;

  const current = closes[closes.length - 1];
  const refIndex = Math.max(0, closes.length - 1 - lookback);
  const ref = closes[refIndex];
  if (!(current > 0) || !(ref > 0)) return null;

  return {
    symbol: item.symbol,
    name: item.name,
    category: item.category,
    price: current,
    changePercent: ((current - ref) / ref) * 100,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const timeframe = (searchParams.get('timeframe') || '1D').toUpperCase();
  try {
    const rows = await Promise.all(INSTRUMENTS.map((it) => fetchItem(it, timeframe)));
    const items = rows.filter((r): r is OverviewItem => r !== null);
    return NextResponse.json({ timeframe, items }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch {
    return NextResponse.json({ timeframe, items: [] as OverviewItem[] }, { status: 200 });
  }
}

