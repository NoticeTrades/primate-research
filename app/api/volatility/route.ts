import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VOLATILITY_SYMBOLS: Record<string, { name: string; description: string }> = {
  '^VIX': { name: 'VIX', description: 'CBOE Volatility Index — 30-day implied vol on S&P 500' },
  '^VIX3M': { name: 'VIX 3M', description: '3-month implied volatility (term structure)' },
  '^VVIX': { name: 'VVIX', description: 'Volatility of VIX — fear of fear / vol-of-vol' },
  '^VXN': { name: 'VXN', description: 'NASDAQ-100 volatility index' },
};

type VolatilityRow = {
  symbol: string;
  name: string;
  description: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  previousClose: number | null;
};

async function fetchYahooQuote(symbol: string): Promise<{ price: number; change: number; changePercent: number; previousClose: number } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    const q = data?.quoteResponse?.result?.[0];
    if (!q) return null;
    const price = q.regularMarketPrice ?? q.price ?? 0;
    const previousClose = q.regularMarketPreviousClose ?? q.previousClose ?? price;
    const change = typeof q.regularMarketChange === 'number' ? q.regularMarketChange : (price - previousClose);
    const changePercent = typeof q.regularMarketChangePercent === 'number' ? q.regularMarketChangePercent : (previousClose ? (change / previousClose) * 100 : 0);
    if (price <= 0) return null;
    return { price, change, changePercent, previousClose };
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const symbols = Object.keys(VOLATILITY_SYMBOLS);
    const results = await Promise.all(
      symbols.map(async (symbol) => {
        const meta = VOLATILITY_SYMBOLS[symbol];
        const quote = await fetchYahooQuote(symbol);
        const row: VolatilityRow = {
          symbol,
          name: meta.name,
          description: meta.description,
          price: quote?.price ?? null,
          change: quote?.change ?? null,
          changePercent: quote?.changePercent ?? null,
          previousClose: quote?.previousClose ?? null,
        };
        return row;
      })
    );
    return NextResponse.json({ data: results, updatedAt: new Date().toISOString() });
  } catch (e) {
    console.error('[Volatility API]', e);
    return NextResponse.json({ error: 'Failed to fetch volatility data' }, { status: 500 });
  }
}
