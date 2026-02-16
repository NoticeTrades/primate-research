import { NextResponse } from 'next/server';

const YAHOO_SYMBOLS: Record<string, string> = {
  ES: 'ES=F',
  NQ: 'NQ=F',
  YM: 'YM=F',
  BTC: 'BTC-USD',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get('symbol') || '').toUpperCase();
  const yahooSymbol = YAHOO_SYMBOLS[symbol] || symbol;

  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(yahooSymbol)}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 10 },
    });
    if (!res.ok) throw new Error('Yahoo API error');
    const data = await res.json();
    const q = data?.quoteResponse?.result?.[0];
    if (!q) {
      return NextResponse.json({ error: 'Symbol not found' }, { status: 404 });
    }
    const regularMarketPrice = q.regularMarketPrice ?? q.price ?? 0;
    const previousClose = q.regularMarketPreviousClose ?? q.previousClose ?? regularMarketPrice;
    const change = q.regularMarketChange ?? (regularMarketPrice - previousClose);
    const changePercent = q.regularMarketChangePercent ?? (previousClose ? (change / previousClose) * 100 : 0);
    return NextResponse.json({
      symbol: q.symbol === yahooSymbol ? symbol : q.symbol,
      price: regularMarketPrice,
      change,
      changePercent,
      previousClose,
    });
  } catch (e) {
    console.error('Market data error:', e);
    return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 });
  }
}
