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
        price = q.regularMarketPrice ?? q.price ?? 0;
        previousClose = q.regularMarketPreviousClose ?? q.previousClose ?? price;
        change = q.regularMarketChange ?? (price - previousClose);
        changePercent = q.regularMarketChangePercent ?? ((change / previousClose) * 100);
        high = q.regularMarketDayHigh ?? q.dayHigh ?? 0;
        low = q.regularMarketDayLow ?? q.dayLow ?? 0;
        open = q.regularMarketOpen ?? q.open ?? 0;
        volume = q.regularMarketVolume ?? q.volume ?? 0;
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
    return NextResponse.json({ error: 'Failed to fetch index data' }, { status: 500 });
  }
}

