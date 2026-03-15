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

const YAHOO_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

/** Fallback: get latest close from Yahoo chart when quote returns no price */
async function fetchFromChart(symbol: string): Promise<{ price: number; previousClose: number } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
    const res = await fetch(url, { headers: YAHOO_HEADERS, cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    const meta = result?.meta;
    const quote = result?.indicators?.quote?.[0];
    const closes = quote?.close as (number | null)[] | undefined;
    const price = meta?.regularMarketPrice ?? (Array.isArray(closes) ? closes.filter((n): n is number => n != null && n > 0).pop() : undefined);
    if (price == null || price <= 0) return null;
    const prevCloses = Array.isArray(closes) ? closes.filter((n): n is number => n != null && n > 0) : [];
    const previousClose = prevCloses.length >= 2 ? prevCloses[prevCloses.length - 2] : price;
    return { price, previousClose };
  } catch {
    return null;
  }
}

function parseQuote(q: Record<string, unknown>): { price: number; change: number; changePercent: number; previousClose: number } | null {
  const price = (q.regularMarketPrice ?? q.price) as number | undefined;
  if (price == null || typeof price !== 'number' || price <= 0) return null;
  const previousClose = (q.regularMarketPreviousClose ?? q.previousClose ?? price) as number;
  const change = typeof q.regularMarketChange === 'number' ? q.regularMarketChange : (price - previousClose);
  const changePercent = typeof q.regularMarketChangePercent === 'number' ? q.regularMarketChangePercent : (previousClose ? (change / previousClose) * 100 : 0);
  return { price, change, changePercent, previousClose };
}

export async function GET() {
  try {
    const symbols = Object.keys(VOLATILITY_SYMBOLS);
    const symbolsParam = symbols.join(',');

    const quoteUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbolsParam)}`;
    const quoteRes = await fetch(quoteUrl, { headers: YAHOO_HEADERS, cache: 'no-store' });

    const bySymbol: Record<string, { price: number; change: number; changePercent: number; previousClose: number }> = {};

    if (quoteRes.ok) {
      const data = await quoteRes.json();
      const results = data?.quoteResponse?.result;
      if (Array.isArray(results)) {
        for (const q of results) {
          const sym = q.symbol as string;
          const parsed = parseQuote(q);
          if (sym && parsed) bySymbol[sym] = parsed;
        }
      }
    }

    const results: VolatilityRow[] = await Promise.all(
      symbols.map(async (symbol) => {
        const meta = VOLATILITY_SYMBOLS[symbol];
        let quote = bySymbol[symbol] ?? null;
        if (!quote) {
          const chart = await fetchFromChart(symbol);
          if (chart) {
            const change = chart.price - chart.previousClose;
            const changePercent = chart.previousClose ? (change / chart.previousClose) * 100 : 0;
            quote = { price: chart.price, previousClose: chart.previousClose, change, changePercent };
          }
        }
        return {
          symbol,
          name: meta.name,
          description: meta.description,
          price: quote?.price ?? null,
          change: quote?.change ?? null,
          changePercent: quote?.changePercent ?? null,
          previousClose: quote?.previousClose ?? null,
        };
      })
    );

    return NextResponse.json({ data: results, updatedAt: new Date().toISOString() });
  } catch (e) {
    console.error('[Volatility API]', e);
    return NextResponse.json({ error: 'Failed to fetch volatility data' }, { status: 500 });
  }
}
