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
        const rawChange = q.regularMarketChange;
        const rawChangePercent = q.regularMarketChangePercent;
        const change = typeof rawChange === 'number' && !Number.isNaN(rawChange)
          ? rawChange
          : (typeof regularMarketPrice === 'number' && typeof previousClose === 'number' ? regularMarketPrice - previousClose : 0);
        const changePercent = typeof rawChangePercent === 'number' && !Number.isNaN(rawChangePercent)
          ? rawChangePercent
          : (previousClose && typeof change === 'number' ? (change / previousClose) * 100 : 0);
        let ytdPercent: number | null = null;
        try {
          const ytdUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=1y`;
          const ytdRes = await fetch(ytdUrl, {
            headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
            cache: 'no-store',
          });
          if (ytdRes.ok) {
            const ytdData = await ytdRes.json();
            const closes = ytdData?.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
            if (Array.isArray(closes)) {
              const valid = closes.filter((n: number) => n != null && typeof n === 'number');
              const first = valid[0];
              const last = valid[valid.length - 1];
              if (typeof first === 'number' && typeof last === 'number' && first > 0) {
                ytdPercent = ((last - first) / first) * 100;
              }
            }
          }
        } catch {
          // ignore
        }
        return NextResponse.json({
          symbol: q.symbol === yahooSymbol ? symbol : q.symbol,
          price: regularMarketPrice,
          change,
          changePercent,
          previousClose,
          ytdPercent: ytdPercent ?? undefined,
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
        const prev = typeof previousClose === 'number' ? previousClose : price;
        const change = price - prev;
        const changePercent = prev ? (change / prev) * 100 : 0;
        let ytdPercent: number | null = null;
        try {
          const ytdUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=1y`;
          const ytdRes = await fetch(ytdUrl, {
            headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
            cache: 'no-store',
          });
          if (ytdRes.ok) {
            const ytdData = await ytdRes.json();
            const closes = ytdData?.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
            if (Array.isArray(closes)) {
              const valid = closes.filter((n: number) => n != null && typeof n === 'number');
              const first = valid[0];
              const last = valid[valid.length - 1];
              if (typeof first === 'number' && typeof last === 'number' && first > 0) {
                ytdPercent = ((last - first) / first) * 100;
              }
            }
          }
        } catch {
          // ignore
        }
        return NextResponse.json({
          symbol,
          price,
          change,
          changePercent,
          previousClose: prev,
          ytdPercent: ytdPercent ?? undefined,
        });
      }
    }

    return NextResponse.json({ error: 'Symbol not found' }, { status: 404 });
  } catch (e) {
    console.error('Market data error:', e);
    return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 });
  }
}
