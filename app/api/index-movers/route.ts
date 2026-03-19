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

const FMP_CONSTITUENT_ENDPOINT: Record<string, string> = {
  NQ: 'nasdaq_constituent',
  ES: 'sp500_constituent',
  YM: 'dowjones_constituent',
};

const MOVERS_CACHE_MS = 30_000;
const moversCache = new Map<string, { until: number; gainers: StockMover[]; losers: StockMover[]; source: string }>();

function parseNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return 0;
  const cleaned = value.replace(/%/g, '').trim();
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

async function fetchYahooConstituentMovers(index: string, limit: number): Promise<{ gainers: StockMover[]; losers: StockMover[] } | null> {
  const apiKey = process.env.FMP_API_KEY || process.env.FINANCIAL_MODELING_PREP_API_KEY || 'demo';
  const endpoint = FMP_CONSTITUENT_ENDPOINT[index];
  if (!endpoint) return null;

  const constituentsRes = await fetch(
    `https://financialmodelingprep.com/api/v3/${endpoint}?apikey=${encodeURIComponent(apiKey)}`,
    { cache: 'no-store' }
  );
  if (!constituentsRes.ok) return null;
  const constituents = (await constituentsRes.json()) as Array<Record<string, unknown>>;
  if (!Array.isArray(constituents) || constituents.length === 0) return null;

  // Limit payload so URL and rate usage stay reasonable.
  const symbols = constituents
    .map((r) => String(r.symbol || '').trim())
    .filter(Boolean)
    .slice(0, 120);
  if (symbols.length === 0) return null;

  const quotesRes = await fetch(
    `https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(symbols.join(','))}?apikey=${encodeURIComponent(apiKey)}`,
    { cache: 'no-store' }
  );
  if (!quotesRes.ok) return null;
  const quotes = (await quotesRes.json()) as Array<Record<string, unknown>>;
  if (!Array.isArray(quotes) || quotes.length === 0) return null;

  const movers: StockMover[] = quotes
    .map((r) => {
      const ticker = String(r.symbol || '').trim();
      if (!ticker) return null;
      const price = parseNumber(r.price);
      const changePercent = parseNumber(r.changesPercentage);
      const change = parseNumber(r.change);
      const volume = parseNumber(r.volume);
      if (!Number.isFinite(changePercent)) return null;
      return { ticker, price, changePercent, change, volume };
    })
    .filter((x): x is StockMover => x !== null);
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

    const fmpMovers = await fetchYahooConstituentMovers(index, limit);
    if (fmpMovers) {
      moversCache.set(cacheKey, { until: now + MOVERS_CACHE_MS, gainers: fmpMovers.gainers, losers: fmpMovers.losers, source: 'fmp-constituents' });
      return NextResponse.json(
        { index, source: 'fmp-constituents', gainers: fmpMovers.gainers, losers: fmpMovers.losers },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { index, source: 'unavailable', gainers: [], losers: [], error: 'No free constituent data mapping for this symbol yet.' },
        { status: 200, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

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

    return NextResponse.json(
      { index, source: 'alpha-marketwide', gainers, losers },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch {
    return NextResponse.json({ error: 'Failed to fetch movers' }, { status: 500 });
  }
}

