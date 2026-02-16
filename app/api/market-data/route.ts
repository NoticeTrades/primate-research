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
export const revalidate = 5; // Cache for 5 seconds for faster updates

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
        let regularMarketPrice = q.regularMarketPrice ?? q.price ?? 0;
        let previousClose = q.regularMarketPreviousClose ?? q.previousClose ?? regularMarketPrice;
        const dayOpen = q.regularMarketOpen ?? q.open ?? 0;
        const rawChange = q.regularMarketChange;
        const rawChangePercent = q.regularMarketChangePercent;
        
        // For intraday change, calculate from day's open for more accurate real-time data
        let change = 0;
        let changePercent = 0;
        
        if (dayOpen > 0 && regularMarketPrice > 0) {
          // Calculate change from day's open (intraday change)
          change = regularMarketPrice - dayOpen;
          changePercent = (change / dayOpen) * 100;
        } else if (typeof rawChange === 'number' && !Number.isNaN(rawChange)) {
          // Fallback to Yahoo's change value if open is not available
          change = rawChange;
          changePercent = typeof rawChangePercent === 'number' && !Number.isNaN(rawChangePercent)
            ? rawChangePercent
            : (previousClose && typeof change === 'number' ? (change / previousClose) * 100 : 0);
        } else if (typeof regularMarketPrice === 'number' && typeof previousClose === 'number') {
          // Last resort: calculate from previous close
          change = regularMarketPrice - previousClose;
          changePercent = previousClose ? (change / previousClose) * 100 : 0;
        }
        if (change === 0 && typeof regularMarketPrice === 'number') {
          try {
            const chart5Url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=5d`;
            const chart5Res = await fetch(chart5Url, {
              headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
              cache: 'no-store',
            });
            if (chart5Res.ok) {
              const chart5 = await chart5Res.json();
              const closes = chart5?.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
              if (Array.isArray(closes) && closes.length >= 2) {
                const valid = closes.filter((n: number) => n != null && typeof n === 'number');
                const prevFromChart = valid[valid.length - 2];
                const lastFromChart = valid[valid.length - 1];
                if (typeof prevFromChart === 'number' && typeof lastFromChart === 'number') {
                  previousClose = prevFromChart;
                  change = regularMarketPrice - previousClose;
                  changePercent = previousClose ? (change / previousClose) * 100 : 0;
                }
              }
            }
          } catch {
            // keep 0
          }
        }
        let ytdPercent: number | null = null;
        try {
          const ytdUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=1y`;
          const ytdRes = await fetch(ytdUrl, {
            headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
            cache: 'no-store',
          });
          if (ytdRes.ok) {
            const ytdData = await ytdRes.json();
            const result = ytdData?.chart?.result?.[0];
            const timestamps = result?.timestamp as number[] | undefined;
            const closes = result?.indicators?.quote?.[0]?.close as number[] | undefined;
            if (Array.isArray(closes) && Array.isArray(timestamps) && timestamps.length === closes.length && closes.length > 0) {
              const yearStart = Math.floor(new Date(new Date().getFullYear(), 0, 1).getTime() / 1000);
              let ytdStart: number | null = null;
              const lastClose = closes[closes.length - 1];
              for (let i = 0; i < timestamps.length; i++) {
                if (timestamps[i] >= yearStart && typeof closes[i] === 'number') {
                  ytdStart = closes[i];
                  break;
                }
              }
              if (ytdStart == null && typeof closes[0] === 'number') ytdStart = closes[0];
              if (typeof ytdStart === 'number' && typeof lastClose === 'number' && ytdStart > 0) {
                ytdPercent = ((lastClose - ytdStart) / ytdStart) * 100;
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
      const closeArr = quote?.close ? (Array.isArray(quote.close) ? quote.close.filter((n: number) => n != null && typeof n === 'number') : []) : [];
      const price = meta?.regularMarketPrice ?? meta?.previousClose ?? closeArr[closeArr.length - 1];
      let previousClose = meta?.previousClose ?? closeArr[closeArr.length - 2] ?? price;
      if (closeArr.length >= 2 && (previousClose == null || previousClose === price)) {
        previousClose = closeArr[closeArr.length - 2];
      }
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
            const ytdResult = ytdData?.chart?.result?.[0];
            const ytdTimestamps = ytdResult?.timestamp as number[] | undefined;
            const ytdCloses = ytdResult?.indicators?.quote?.[0]?.close as number[] | undefined;
            if (Array.isArray(ytdCloses) && Array.isArray(ytdTimestamps) && ytdTimestamps.length === ytdCloses.length && ytdCloses.length > 0) {
              const yearStart = Math.floor(new Date(new Date().getFullYear(), 0, 1).getTime() / 1000);
              let ytdStart: number | null = null;
              const lastClose = ytdCloses[ytdCloses.length - 1];
              for (let i = 0; i < ytdTimestamps.length; i++) {
                if (ytdTimestamps[i] >= yearStart && typeof ytdCloses[i] === 'number') {
                  ytdStart = ytdCloses[i];
                  break;
                }
              }
              if (ytdStart == null && typeof ytdCloses[0] === 'number') ytdStart = ytdCloses[0];
              if (typeof ytdStart === 'number' && typeof lastClose === 'number' && ytdStart > 0) {
                ytdPercent = ((lastClose - ytdStart) / ytdStart) * 100;
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
