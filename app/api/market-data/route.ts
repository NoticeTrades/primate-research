import { NextResponse } from 'next/server';

const YAHOO_SYMBOLS: Record<string, string> = {
  ES: 'ES=F',
  NQ: 'NQ=F',
  YM: 'YM=F',
  RTY: 'RTY=F',
  GC: 'GC=F',
  SI: 'SI=F',
  N225: '^N225',
  BTC: 'BTC-USD',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get('symbol') || '').toUpperCase();
  const yahooSymbol = YAHOO_SYMBOLS[symbol] || symbol;

  try {
    const quoteUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(yahooSymbol)}`;
    const quoteRes = await fetch(quoteUrl, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      cache: 'no-store',
    });
    if (quoteRes.ok) {
      const data = await quoteRes.json();
      const q = data?.quoteResponse?.result?.[0];
      if (q) {
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
      }
    }

    const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=5d`;
    const chartRes = await fetch(chartUrl, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      cache: 'no-store',
    });
    if (chartRes.ok) {
      const chartData = await chartRes.json();
      const meta = chartData?.chart?.result?.[0]?.meta;
      const quote = chartData?.chart?.result?.[0]?.indicators?.quote?.[0];
      const price = meta?.regularMarketPrice ?? meta?.previousClose ?? (quote?.close?.filter((n: number) => n != null).pop());
      const previousClose = meta?.previousClose ?? price;
      if (price != null && typeof price === 'number') {
        const change = price - previousClose;
        const changePercent = previousClose ? (change / previousClose) * 100 : 0;
        return NextResponse.json({
          symbol,
          price,
          change,
          changePercent,
          previousClose,
        });
      }
    }

    return NextResponse.json({ error: 'Symbol not found' }, { status: 404 });
  } catch (e) {
    console.error('Market data error:', e);
    return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 });
  }
}
