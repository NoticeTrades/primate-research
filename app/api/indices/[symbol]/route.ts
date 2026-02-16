import { NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 60; // Cache for 60 seconds to reduce API calls (800/day limit)

const YAHOO_SYMBOLS: Record<string, string> = {
  ES: 'ES=F',
  NQ: 'NQ=F',
  YM: 'YM=F',
  RTY: 'RTY=F',
};

const ALPHA_VANTAGE_SYMBOLS: Record<string, string> = {
  ES: 'ES',
  NQ: 'NQ',
  YM: 'YM',
  RTY: 'RTY',
};

const INDEX_NAMES: Record<string, string> = {
  ES: 'E-mini S&P 500',
  NQ: 'E-mini NASDAQ-100',
  YM: 'E-mini Dow Jones',
  RTY: 'E-mini Russell 2000',
};

// Fetch data from Alpha Vantage (more reliable for futures)
async function fetchAlphaVantageData(symbol: string) {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) return null;

  try {
    const avSymbol = ALPHA_VANTAGE_SYMBOLS[symbol];
    // Alpha Vantage uses different endpoints, try intraday first
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${avSymbol}&interval=1min&apikey=${apiKey}&datatype=json`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    
    const data = await res.json();
    // Alpha Vantage format is different, would need parsing
    // For now, let's use a simpler approach with a different provider
    return null;
  } catch {
    return null;
  }
}

// Fetch data from Twelve Data (excellent for real-time futures)
async function fetchTwelveData(symbol: string) {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) {
    console.log(`[Twelve Data] No API key configured for ${symbol}`);
    return null;
  }

  try {
    // Twelve Data CME futures symbols - try multiple formats
    const twelveSymbols: Record<string, string[]> = {
      ES: ['ES1!', 'ES=F', 'ES'],
      NQ: ['NQ1!', 'NQ=F', 'NQ'],
      YM: ['YM1!', 'YM=F', 'YM'],
      RTY: ['RTY1!', 'RTY=F', 'RTY'],
    };
    
    const symbolVariants = twelveSymbols[symbol] || [symbol];
    console.log(`[Twelve Data] Attempting to fetch ${symbol} with variants:`, symbolVariants);
    
    // Try each symbol variant until one works
    for (const twelveSymbol of symbolVariants) {
      try {
        const url = `https://api.twelvedata.com/price?symbol=${twelveSymbol}&apikey=${apiKey}`;
        console.log(`[Twelve Data] Fetching price for ${twelveSymbol}...`);
        const res = await fetch(url, { cache: 'no-store' });
        
        if (!res.ok) {
          console.log(`[Twelve Data] Price API returned ${res.status} for ${twelveSymbol}`);
          continue;
        }
        
        const data = await res.json();
        console.log(`[Twelve Data] Price response for ${twelveSymbol}:`, JSON.stringify(data).substring(0, 200));
        
        // Check for errors in response
        if (data.code || data.status === 'error') {
          console.log(`[Twelve Data] Error in price response for ${twelveSymbol}:`, data.message || data.code);
          continue;
        }
        
        if (data.status === 'ok' && data.price) {
          // Get more detailed data
          const quoteUrl = `https://api.twelvedata.com/quote?symbol=${twelveSymbol}&apikey=${apiKey}`;
          console.log(`[Twelve Data] Fetching quote for ${twelveSymbol}...`);
          const quoteRes = await fetch(quoteUrl, { cache: 'no-store' });
          
          if (quoteRes.ok) {
            const quote = await quoteRes.json();
            console.log(`[Twelve Data] Quote response for ${twelveSymbol}:`, JSON.stringify(quote).substring(0, 200));
            
            if (quote.code || quote.status === 'error') {
              console.log(`[Twelve Data] Error in quote response for ${twelveSymbol}:`, quote.message || quote.code);
              continue;
            }
            
            if (quote.status === 'ok') {
              const price = parseFloat(data.price);
              const open = parseFloat(quote.open || '0');
              const high = parseFloat(quote.high || '0');
              const low = parseFloat(quote.low || '0');
              const prevClose = parseFloat(quote.previous_close || '0');
              const volume = parseFloat(quote.volume || '0');
              
              const change = price - prevClose;
              const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
              const intradayChange = open > 0 ? price - open : 0;
              const intradayChangePercent = open > 0 ? (intradayChange / open) * 100 : 0;
              
              console.log(`[Twelve Data] Successfully fetched data for ${symbol} (${twelveSymbol}): price=${price}, change=${intradayChangePercent.toFixed(2)}%`);
              
              return {
                price,
                change: intradayChange,
                changePercent: intradayChangePercent,
                previousClose: prevClose,
                holc: { high, open, low, close: price },
                volume,
              };
            }
          }
        }
      } catch (err) {
        console.error(`[Twelve Data] Error fetching ${twelveSymbol}:`, err);
        continue;
      }
    }
    
    console.log(`[Twelve Data] All symbol variants failed for ${symbol}`);
    return null;
  } catch (err) {
    console.error(`[Twelve Data] Fatal error for ${symbol}:`, err);
    return null;
  }
}

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

    // Try Twelve Data first (most reliable for futures), then fallback to Yahoo
    let price = 0;
    let change = 0;
    let changePercent = 0;
    let previousClose = 0;
    let high = 0;
    let low = 0;
    let open = 0;
    let volume = 0;
    let ytdPercent: number | null = null;

    const twelveData = await fetchTwelveData(symbol);
    if (twelveData) {
      console.log(`[Index API] Using Twelve Data for ${symbol}`);
      price = twelveData.price;
      change = twelveData.change;
      changePercent = twelveData.changePercent;
      previousClose = twelveData.previousClose;
      high = twelveData.holc.high;
      low = twelveData.holc.low;
      open = twelveData.holc.open;
      volume = twelveData.volume;
    } else {
      console.log(`[Index API] Twelve Data failed for ${symbol}, falling back to Yahoo Finance`);
    }

    // Fallback to Yahoo Finance if Twelve Data didn't work
    if (price === 0) {
      // Fetch current price and basic stats from Yahoo Finance
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
        let prevClose = q.regularMarketPreviousClose ?? q.previousClose ?? regularMarketPrice;
        const dayOpen = q.regularMarketOpen ?? q.open ?? 0;
        const rawChange = q.regularMarketChange;
        const rawChangePercent = q.regularMarketChangePercent;
        
        // For intraday change, calculate from day's open, not previous close
        // This gives more accurate real-time intraday percentage
        let changeVal = 0;
        let changePct = 0;
        
        if (dayOpen > 0 && regularMarketPrice > 0) {
          // Calculate change from day's open (intraday change)
          changeVal = regularMarketPrice - dayOpen;
          changePct = (changeVal / dayOpen) * 100;
        } else if (typeof rawChange === 'number' && !Number.isNaN(rawChange)) {
          // Fallback to Yahoo's change value if open is not available
          changeVal = rawChange;
          changePct = typeof rawChangePercent === 'number' && !Number.isNaN(rawChangePercent)
            ? rawChangePercent
            : (prevClose && typeof changeVal === 'number' ? (changeVal / prevClose) * 100 : 0);
        } else if (typeof regularMarketPrice === 'number' && typeof prevClose === 'number') {
          // Last resort: calculate from previous close
          changeVal = regularMarketPrice - prevClose;
          changePct = prevClose ? (changeVal / prevClose) * 100 : 0;
        }
        
        // Try to get better data from chart API if needed
        if ((changeVal === 0 || dayOpen === 0) && typeof regularMarketPrice === 'number') {
          try {
            const chart5Url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1m&range=1d`;
            const chart5Res = await fetch(chart5Url, {
              headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
              cache: 'no-store',
            });
            if (chart5Res.ok) {
              const chart5 = await chart5Res.json();
              const meta = chart5?.chart?.result?.[0]?.meta;
              const quote = chart5?.chart?.result?.[0]?.indicators?.quote?.[0];
              if (meta && quote) {
                const opens = quote.open ? (Array.isArray(quote.open) ? quote.open.filter((n: number) => n != null && typeof n === 'number') : []) : [];
                const currentPrice = meta.regularMarketPrice ?? regularMarketPrice;
                const dayOpenFromChart = meta.regularMarketOpen ?? opens[0] ?? dayOpen;
                
                if (dayOpenFromChart > 0 && currentPrice > 0) {
                  changeVal = currentPrice - dayOpenFromChart;
                  changePct = (changeVal / dayOpenFromChart) * 100;
                  regularMarketPrice = currentPrice;
                }
              }
            }
          } catch {
            // keep existing values
          }
        }
        
        price = regularMarketPrice;
        previousClose = prevClose;
        change = changeVal;
        changePercent = changePct;
        high = q.regularMarketDayHigh ?? q.dayHigh ?? q.regularMarketPrice ?? 0;
        low = q.regularMarketDayLow ?? q.dayLow ?? q.regularMarketPrice ?? 0;
        open = q.regularMarketOpen ?? q.open ?? q.regularMarketPrice ?? 0;
        volume = q.regularMarketVolume ?? q.volume ?? 0;
        
        // Validate HOLC data - ensure we have valid numbers
        if (high === 0 && price > 0) high = price;
        if (low === 0 && price > 0) low = price;
        if (open === 0 && price > 0) open = price;
      }
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
            high = meta?.regularMarketDayHigh ?? meta?.dayHigh ?? priceFromChart ?? 0;
            low = meta?.regularMarketDayLow ?? meta?.dayLow ?? priceFromChart ?? 0;
            open = meta?.regularMarketOpen ?? meta?.open ?? priceFromChart ?? 0;
            volume = meta?.regularMarketVolume ?? meta?.volume ?? 0;
            
            // Validate HOLC data - ensure we have valid numbers
            if (high === 0 && priceFromChart > 0) high = priceFromChart;
            if (low === 0 && priceFromChart > 0) low = priceFromChart;
            if (open === 0 && priceFromChart > 0) open = priceFromChart;
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

