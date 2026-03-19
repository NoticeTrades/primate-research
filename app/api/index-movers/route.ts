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

function parseNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return 0;
  const cleaned = value.replace(/%/g, '').trim();
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const index = searchParams.get('index') || 'index';
  const limit = Math.min(5, Math.max(1, parseInt(searchParams.get('limit') || '5', 10) || 5));

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Alpha Vantage API key not configured' },
      { status: 503 }
    );
  }

  try {
    const res = await fetch(
      `https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=${encodeURIComponent(apiKey)}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return NextResponse.json({ error: 'Failed to fetch movers' }, { status: 500 });

    const data = (await res.json()) as Record<string, unknown>;

    if (typeof data?.['Note'] === 'string' || typeof data?.['Information'] === 'string') {
      return NextResponse.json(
        {
          error: 'Alpha Vantage rate limit reached',
          hint: typeof data?.['Note'] === 'string' ? data?.['Note'] : data?.['Information'],
        },
        { status: 429 }
      );
    }

    const rawGainers = Array.isArray(data.top_gainers) ? data.top_gainers : [];
    const rawLosers = Array.isArray(data.top_losers) ? data.top_losers : [];

    const mapRow = (r: unknown): StockMover | null => {
      if (!r || typeof r !== 'object') return null;
      const obj = r as Record<string, unknown>;
      const ticker = String(obj.ticker || '').trim();
      if (!ticker) return null;
      return {
        ticker,
        price: parseNumber(obj.price),
        changePercent: parseNumber(obj.change_percentage),
        change: parseNumber(obj.change_amount),
        volume: parseNumber(obj.volume),
      };
    };

    const gainers = rawGainers.map(mapRow).filter((x): x is StockMover => x != null).slice(0, limit);
    const losers = rawLosers.map(mapRow).filter((x): x is StockMover => x != null).slice(0, limit);

    return NextResponse.json({ index, gainers, losers }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch movers' }, { status: 500 });
  }
}

