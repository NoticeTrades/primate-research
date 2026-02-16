import { NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const YAHOO_SYMBOLS: Record<string, string> = {
  ES: 'ES=F',
  NQ: 'NQ=F',
  YM: 'YM=F',
  RTY: 'RTY=F',
};

const INDEX_NAMES: Record<string, string> = {
  ES: 'E-mini S&P 500',
  NQ: 'E-mini NASDAQ-100',
  YM: 'E-mini Dow Jones',
  RTY: 'E-mini Russell 2000',
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol: symbolParam } = await params;
    const symbol = symbolParam.toUpperCase();
    
    if (!YAHOO_SYMBOLS[symbol]) {
      return NextResponse.json({ error: 'Invalid index symbol' }, { status: 400 });
    }

    const yahooSymbol = YAHOO_SYMBOLS[symbol];
    const sql = getDb();

    // Fetch market structure from database
    const structureData = await sql`
      SELECT daily_structure, weekly_structure, monthly_structure, updated_at
      FROM index_market_structure
      WHERE symbol = ${symbol}
    `;

    // Fetch current price and basic stats from Yahoo Finance
    const quoteUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(yahooSymbol)}`;
    const quoteRes = await fetch(quoteUrl, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      cache: 'no-store',
    });

    let price = 0;
    let change = 0;
    let changePercent = 0;
    let previousClose = 0;
    let ytdPercent: number | null = null;
    let high = 0;
    let low = 0;
    let open = 0;
    let volume = 0;

    if (quoteRes.ok) {
      const data = await quoteRes.json();
      const q = data?.quoteResponse?.result?.[0];
      if (q) {
        let regularMarketPrice = q.regularMarketPrice ?? q.price ?? 0;
        let prevClose = q.regularMarketPreviousClose ?? q.previousClose ?? regularMarketPrice;
        const rawChange = q.regularMarketChange;
        const rawChangePercent = q.regularMarketChangePercent;
        let changeVal = typeof rawChange === 'number' && !Number.isNaN(rawChange)
          ? rawChange
          : (typeof regularMarketPrice === 'number' && typeof prevClose === 'number' ? regularMarketPrice - prevClose : 0);
        let changePct = typeof rawChangePercent === 'number' && !Number.isNaN(rawChangePercent)
          ? rawChangePercent
          : (prevClose && typeof changeVal === 'number' ? (changeVal / prevClose) * 100 : 0);
        
        if (changeVal === 0 && typeof regularMarketPrice === 'number') {
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
                  prevClose = prevFromChart;
                  changeVal = regularMarketPrice - prevClose;
                  changePct = prevClose ? (changeVal / prevClose) * 100 : 0;
                }
              }
            }
          } catch {
            // keep 0
          }
        }
        
        price = regularMarketPrice;
        previousClose = prevClose;
        change = changeVal;
        changePercent = changePct;
        high = q.regularMarketDayHigh ?? q.dayHigh ?? 0;
        low = q.regularMarketDayLow ?? q.dayLow ?? 0;
        open = q.regularMarketOpen ?? q.open ?? 0;
        volume = q.regularMarketVolume ?? q.volume ?? 0;
      }
    }

    // Fallback to chart API if quote API didn't work
    if (price === 0) {
      try {
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
          const priceFromChart = meta?.regularMarketPrice ?? meta?.previousClose ?? closeArr[closeArr.length - 1];
          let prevCloseFromChart = meta?.previousClose ?? closeArr[closeArr.length - 2] ?? priceFromChart;
          if (closeArr.length >= 2 && (prevCloseFromChart == null || prevCloseFromChart === priceFromChart)) {
            prevCloseFromChart = closeArr[closeArr.length - 2];
          }
          if (priceFromChart != null && typeof priceFromChart === 'number') {
            const prev = typeof prevCloseFromChart === 'number' ? prevCloseFromChart : priceFromChart;
            const changeVal = priceFromChart - prev;
            const changePct = prev ? (changeVal / prev) * 100 : 0;
            price = priceFromChart;
            previousClose = prev;
            change = changeVal;
            changePercent = changePct;
            high = meta?.regularMarketDayHigh ?? meta?.dayHigh ?? 0;
            low = meta?.regularMarketDayLow ?? meta?.dayLow ?? 0;
            open = meta?.regularMarketOpen ?? meta?.open ?? 0;
            volume = meta?.regularMarketVolume ?? meta?.volume ?? 0;
          }
        }
      } catch {
        // keep defaults
      }
    }

    // Fetch YTD data
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

    // Fetch historical data for seasonality (last 5 years)
    let seasonalityData: { month: number; avgReturn: number; positiveMonths: number; totalMonths: number }[] = [];
    try {
      const histUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1mo&range=5y`;
      const histRes = await fetch(histUrl, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
        cache: 'no-store',
      });
      if (histRes.ok) {
        const histData = await histRes.json();
        const result = histData?.chart?.result?.[0];
        const timestamps = result?.timestamp as number[] | undefined;
        const closes = result?.indicators?.quote?.[0]?.close as number[] | undefined;
        
        if (Array.isArray(closes) && Array.isArray(timestamps) && timestamps.length === closes.length) {
          // Group by month and calculate average returns
          const monthlyData: Record<number, number[]> = {};
          for (let i = 1; i < closes.length; i++) {
            if (typeof closes[i] === 'number' && typeof closes[i - 1] === 'number' && closes[i - 1] > 0) {
              const date = new Date(timestamps[i] * 1000);
              const month = date.getMonth(); // 0-11
              const returnPct = ((closes[i] - closes[i - 1]) / closes[i - 1]) * 100;
              if (!monthlyData[month]) monthlyData[month] = [];
              monthlyData[month].push(returnPct);
            }
          }
          
          // Calculate averages
          seasonalityData = Object.entries(monthlyData).map(([month, returns]) => ({
            month: parseInt(month),
            avgReturn: returns.reduce((a, b) => a + b, 0) / returns.length,
            positiveMonths: returns.filter(r => r > 0).length,
            totalMonths: returns.length,
          })).sort((a, b) => a.month - b.month);
        }
      }
    } catch {
      // ignore
    }

    return NextResponse.json({
      symbol,
      name: INDEX_NAMES[symbol] || symbol,
      price,
      change,
      changePercent,
      previousClose,
      ytdPercent: ytdPercent ?? undefined,
      holc: {
        high,
        open,
        low,
        close: price,
      },
      volume,
      marketStructure: structureData[0] ? {
        daily: structureData[0].daily_structure,
        weekly: structureData[0].weekly_structure,
        monthly: structureData[0].monthly_structure,
        updatedAt: structureData[0].updated_at,
      } : null,
      seasonality: seasonalityData,
    });
  } catch (error) {
    console.error('Index data error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ 
      error: 'Failed to fetch index data',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

