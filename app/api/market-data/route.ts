import { NextResponse } from 'next/server';

const YAHOO_SYMBOLS: Record<string, string> = {
  ES: 'ES=F',
  NQ: 'NQ=F',
  YM: 'YM=F',
  RTY: 'RTY=F',
  GC: 'GC=F',
  SI: 'SI=F',
  CL: 'CL=F',
  N225: 'NKD=F', // Nikkei USD Futures (CME)
  DXY: 'DX-Y.NYB',
  BTC: 'BTC-USD',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0; // No caching - always fetch fresh data

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache',
} as const;

/** Fetch today's session open from Yahoo chart when quote API doesn't provide it. */
async function fetchSessionOpenFromChart(yahooSymbol: string): Promise<number> {
  try {
    const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=5m&range=1d`;
    const chartRes = await fetch(chartUrl, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      cache: 'no-store',
    });
    if (!chartRes.ok) return 0;
    const chartData = await chartRes.json();
    const meta = chartData?.chart?.result?.[0]?.meta;
    const quote = chartData?.chart?.result?.[0]?.indicators?.quote?.[0];
    if (meta?.regularMarketOpen && meta.regularMarketOpen > 0) return meta.regularMarketOpen;
    if (quote?.open && Array.isArray(quote.open)) {
      const opens = quote.open.filter((n: number) => n != null && typeof n === 'number' && n > 0);
      if (opens.length > 0) return opens[0];
    }
  } catch {
    // ignore
  }
  return 0;
}

/** Legacy: Nikkei 225 index (^N225) traded in Tokyo (JST). N225 now uses NKD=F futures; this is kept for any future JST symbol. */
async function fetchN225SessionOpen(yahooSymbol: string): Promise<number> {
  try {
    const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=5m&range=2d`;
    const chartRes = await fetch(chartUrl, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      cache: 'no-store',
    });
    if (!chartRes.ok) return 0;
    const chartData = await chartRes.json();
    const result = chartData?.chart?.result?.[0];
    const timestamps = result?.timestamp as number[] | undefined;
    const quote = result?.indicators?.quote?.[0];
    const opens = quote?.open as (number | null)[] | undefined;
    if (!Array.isArray(timestamps) || !Array.isArray(opens) || timestamps.length !== opens.length) return 0;

    const todayJst = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' });
    let firstOpenToday: number | null = null;
    const firstOpenByDate: Record<string, number> = {};
    for (let i = 0; i < timestamps.length; i++) {
      const ts = timestamps[i];
      const openVal = opens[i];
      if (openVal == null || typeof openVal !== 'number' || openVal <= 0) continue;
      const dateJst = new Date(ts * 1000).toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' });
      if (dateJst === todayJst) {
        if (firstOpenToday == null) firstOpenToday = openVal;
      }
      if (!firstOpenByDate[dateJst]) firstOpenByDate[dateJst] = openVal;
    }
    if (firstOpenToday != null) return firstOpenToday;
    const dates = Object.keys(firstOpenByDate).sort().reverse();
    if (dates.length > 0) return firstOpenByDate[dates[0]];
    return 0;
  } catch {
    return 0;
  }
}

/** When market is closed (e.g. weekend), quote APIs often return change 0. Get last session change from 5d daily chart (last close vs previous close). */
async function fetchLastSessionChangeFromChart(yahooSymbol: string): Promise<{ change: number; changePercent: number; previousClose: number } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=5d`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    const quote = result?.indicators?.quote?.[0];
    const closeArr = quote?.close ? (Array.isArray(quote.close) ? quote.close.filter((n: number) => n != null && typeof n === 'number' && n > 0) : []) : [];
    if (closeArr.length < 2) return null;
    const lastClose = closeArr[closeArr.length - 1];
    const prevClose = closeArr[closeArr.length - 2];
    if (typeof lastClose !== 'number' || typeof prevClose !== 'number' || prevClose <= 0) return null;
    const change = lastClose - prevClose;
    const changePercent = (change / prevClose) * 100;
    return { change, changePercent, previousClose: prevClose };
  } catch {
    return null;
  }
}

/** Fetch YTD % from Yahoo chart (1y daily). Used for futures when Twelve Data doesn't provide YTD. */
async function fetchYtdFromYahoo(yahooSymbol: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=1y`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    const timestamps = result?.timestamp as number[] | undefined;
    const closes = result?.indicators?.quote?.[0]?.close as number[] | undefined;
    if (!Array.isArray(closes) || !Array.isArray(timestamps) || timestamps.length !== closes.length || closes.length === 0) return null;
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
      return ((lastClose - ytdStart) / ytdStart) * 100;
    }
    return null;
  } catch {
    return null;
  }
}

/** Twelve Data: get real-time price and session open for index/commodity futures (ES, NQ, YM, RTY, CL). */
async function fetchTwelveDataFutures(symbol: string): Promise<{ price: number; change: number; changePercent: number; previousClose: number } | null> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) return null;
  const twelveSymbols: Record<string, string[]> = {
    ES: ['ES1!', 'ES=F', 'ES'],
    NQ: ['NQ1!', 'NQ=F', 'NQ'],
    YM: ['YM1!', 'YM=F', 'YM'],
    RTY: ['RTY1!', 'RTY=F', 'RTY'],
    CL: ['CL1!', 'CL=F', 'CL'],
  };
  const variants = twelveSymbols[symbol] || [];
  for (const twelveSymbol of variants) {
    try {
      const [priceRes, quoteRes] = await Promise.all([
        fetch(`https://api.twelvedata.com/price?symbol=${twelveSymbol}&apikey=${apiKey}`, { cache: 'no-store' }),
        fetch(`https://api.twelvedata.com/quote?symbol=${twelveSymbol}&apikey=${apiKey}`, { cache: 'no-store' }),
      ]);
      if (!priceRes.ok || !quoteRes.ok) continue;
      const priceData = await priceRes.json();
      const quoteData = await quoteRes.json();
      if (priceData.code || quoteData.code || priceData.status === 'error' || quoteData.status === 'error') continue;
      const price = parseFloat(priceData.price);
      const previousClose = parseFloat(quoteData.previous_close || '0');
      if (!price || isNaN(price)) continue;
      // Daily change = vs previous close (how much it "closed" up/down), not vs session open
      const change = previousClose > 0 ? price - previousClose : 0;
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;
      return { price, change, changePercent, previousClose };
    } catch {
      continue;
    }
  }
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get('symbol') || '').toUpperCase();
  const yahooSymbol = YAHOO_SYMBOLS[symbol] || symbol;

  try {
    // Index/commodity futures: try Twelve Data first (real-time; Yahoo is 10–15 min delayed)
    const indexFutures = ['ES', 'NQ', 'YM', 'RTY', 'CL'];
    if (indexFutures.includes(symbol)) {
      const twelve = await fetchTwelveDataFutures(symbol);
      if (twelve) {
        const yahooSymbolForYtd = YAHOO_SYMBOLS[symbol] || symbol;
        let change = twelve.change;
        let changePercent = twelve.changePercent;
        let previousClose = twelve.previousClose;
        // When markets are closed (e.g. weekend), Twelve Data often returns price = previous_close so change is 0. Use last session change from chart.
        if (twelve.price > 0 && change === 0 && changePercent === 0) {
          const lastSession = await fetchLastSessionChangeFromChart(yahooSymbolForYtd);
          if (lastSession) {
            change = lastSession.change;
            changePercent = lastSession.changePercent;
            previousClose = lastSession.previousClose;
          }
        }
        const ytdPercent = await fetchYtdFromYahoo(yahooSymbolForYtd);
        return NextResponse.json({
          symbol,
          price: twelve.price,
          change,
          changePercent,
          previousClose,
          ytdPercent: ytdPercent ?? undefined,
        }, { headers: NO_CACHE_HEADERS });
      }
      // Twelve Data failed: try Yahoo 5m intraday for slightly fresher price than quote API
      try {
        const intradayUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=5m&range=1d`;
        const intradayRes = await fetch(intradayUrl, {
          headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
          cache: 'no-store',
        });
        if (intradayRes.ok) {
          const intraday = await intradayRes.json();
          const meta = intraday?.chart?.result?.[0]?.meta;
          const quote = intraday?.chart?.result?.[0]?.indicators?.quote?.[0];
          const closes = quote?.close ? (Array.isArray(quote.close) ? quote.close.filter((n: number) => n != null && typeof n === 'number') : []) : [];
          const lastClose = closes.length > 0 ? closes[closes.length - 1] : 0;
          if (lastClose > 0) {
            let prevClose = meta?.previousClose ?? (closes.length >= 2 ? closes[closes.length - 2] : lastClose);
            let change = prevClose > 0 ? lastClose - prevClose : 0;
            let changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
            // When markets are closed (e.g. weekend), intraday may give change 0. Use last session from 5d chart.
            if (change === 0 && changePercent === 0) {
              const lastSession = await fetchLastSessionChangeFromChart(yahooSymbol);
              if (lastSession) {
                change = lastSession.change;
                changePercent = lastSession.changePercent;
                prevClose = lastSession.previousClose;
              }
            }
            const ytdPercent = await fetchYtdFromYahoo(yahooSymbol);
            return NextResponse.json({
              symbol,
              price: lastClose,
              change,
              changePercent,
              previousClose: prevClose,
              ytdPercent: ytdPercent ?? undefined,
            }, { headers: NO_CACHE_HEADERS });
          }
        }
      } catch {
        // fall through to generic Yahoo quote
      }
    }
    // Use CoinMarketCap for BTC/ETH if API key is available
    if ((symbol === 'BTC' || symbol === 'ETH') && process.env.COINMARKETCAP_API_KEY) {
      try {
        const apiKey = process.env.COINMARKETCAP_API_KEY;
        const cmcUrl = `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?symbol=${symbol}&convert=USD`;
        const cmcRes = await fetch(cmcUrl, {
          headers: {
            'X-CMC_PRO_API_KEY': apiKey,
            'Accept': 'application/json',
          },
          cache: 'no-store',
        });

        if (cmcRes.ok) {
          const cmcData = await cmcRes.json();
          const coinData = cmcData.data?.[symbol]?.[0];
          
          if (coinData) {
            const price = coinData.quote?.USD?.price || 0;
            
            // Get day's open from Yahoo Finance for accurate intraday change calculation
            let dayOpen = 0;
            try {
              const yahooChartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}-USD?interval=1m&range=1d`;
              const yahooChartRes = await fetch(yahooChartUrl, {
                headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
                cache: 'no-store',
              });
              if (yahooChartRes.ok) {
                const chartData = await yahooChartRes.json();
                const meta = chartData?.chart?.result?.[0]?.meta;
                const quote = chartData?.chart?.result?.[0]?.indicators?.quote?.[0];
                if (meta?.regularMarketOpen) {
                  dayOpen = meta.regularMarketOpen;
                } else if (quote?.open && Array.isArray(quote.open)) {
                  const opens = quote.open.filter((n: number) => n != null && typeof n === 'number' && n > 0);
                  if (opens.length > 0) {
                    dayOpen = opens[0];
                  }
                }
              }
            } catch (err) {
              console.error(`[Market Data API] Error fetching ${symbol} day open from Yahoo:`, err);
            }
            
            // Calculate intraday change from day's open if available
            let change = 0;
            let changePercent = 0;
            if (dayOpen > 0 && price > 0) {
              change = price - dayOpen;
              changePercent = (change / dayOpen) * 100;
              console.log(`[Market Data API] CoinMarketCap ${symbol}: price=${price}, dayOpen=${dayOpen}, intradayChange=${changePercent.toFixed(2)}%`);
            } else if (price > 0) {
              // Fallback to CoinMarketCap's 24h change if day's open not available
              changePercent = coinData.quote?.USD?.percent_change_24h || 0;
              change = (changePercent / 100) * price;
              console.warn(`[Market Data API] CoinMarketCap ${symbol}: Using 24h change fallback: ${changePercent.toFixed(2)}%`);
            }
            
            if (price > 0) {
              return NextResponse.json({
                symbol,
                price,
                change,
                changePercent,
                previousClose: coinData.quote?.USD?.price || price, // CoinMarketCap doesn't provide previous close directly
                ytdPercent: undefined, // CoinMarketCap doesn't provide YTD easily
              }, { headers: NO_CACHE_HEADERS });
            }
          }
        } else {
          console.error(`[Market Data API] CoinMarketCap API error for ${symbol}: ${cmcRes.status}`);
        }
      } catch (cmcError) {
        console.error(`[Market Data API] CoinMarketCap API error for ${symbol}:`, cmcError);
      }
      // Fall through to Yahoo Finance if CoinMarketCap fails
    }

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
        // For futures, prioritize regularMarketPreviousClose, fallback to previousClose
        let previousClose = q.regularMarketPreviousClose ?? q.previousClose ?? 0;
        // If previous close is still 0 or same as price, try to get it from chart data
        if (previousClose === 0 || previousClose === regularMarketPrice) {
          previousClose = q.previousClose ?? q.regularMarketPreviousClose ?? regularMarketPrice;
        }
        const dayOpen = q.regularMarketOpen ?? q.open ?? 0;
        const rawChange = q.regularMarketChange;
        const rawChangePercent = q.regularMarketChangePercent;
        
        // Check if market is closed (regularMarketState will be 'CLOSED' or 'PRE' or 'POST')
        const marketState = q.regularMarketState ?? q.marketState ?? '';
        const isMarketClosed = marketState === 'CLOSED' || marketState === 'PRE' || marketState === 'POST';
        const marketTime = q.regularMarketTime ?? q.marketTime;
        
        console.log(`[Market Data API] ${symbol} raw data: price=${regularMarketPrice}, prevClose=${previousClose}, dayOpen=${dayOpen}, rawChange=${rawChange}, rawChangePercent=${rawChangePercent}, marketState=${marketState}, marketTime=${marketTime}`);
        
        // For futures (ES, NQ, YM, RTY, GC, SI, CL, N225): daily change = vs previous close ("closed up/down X%")
        // For crypto (BTC/ETH): change from day's open
        const isFutures = ['ES', 'NQ', 'YM', 'RTY', 'GC', 'SI', 'CL', 'N225'].includes(symbol);
        const isCrypto = symbol === 'BTC' || symbol === 'ETH';
        
        let change = 0;
        let changePercent = 0;
        
        if (isFutures) {
          // Use previous close for daily change (standard "closed up/down X%" meaning)
          if (previousClose > 0 && regularMarketPrice > 0) {
            change = regularMarketPrice - previousClose;
            changePercent = (change / previousClose) * 100;
            console.log(`[Market Data API] ${symbol} (futures): price=${regularMarketPrice}, previousClose=${previousClose}, change=${change.toFixed(2)}, changePercent=${changePercent.toFixed(2)}%`);
          } else {
            change = 0;
            changePercent = 0;
          }
          // When markets are closed (e.g. weekend), Yahoo often returns price = previousClose so change is 0. Use last session from 5d chart.
          if (regularMarketPrice > 0 && (change === 0 && changePercent === 0 || isMarketClosed)) {
            const lastSession = await fetchLastSessionChangeFromChart(yahooSymbol);
            if (lastSession) {
              change = lastSession.change;
              changePercent = lastSession.changePercent;
              previousClose = lastSession.previousClose;
              console.log(`[Market Data API] ${symbol} (futures, market closed): using last session change=${change.toFixed(2)}, changePercent=${changePercent.toFixed(2)}%`);
            }
          }
        } else if (isCrypto) {
          // For crypto, calculate from day's open for accurate intraday change
          let actualDayOpen = dayOpen;
          if (actualDayOpen === 0 && regularMarketPrice > 0) {
            try {
              const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1m&range=1d`;
              const chartRes = await fetch(chartUrl, {
                headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
                cache: 'no-store',
              });
              if (chartRes.ok) {
                const chartData = await chartRes.json();
                const meta = chartData?.chart?.result?.[0]?.meta;
                const quote = chartData?.chart?.result?.[0]?.indicators?.quote?.[0];
                if (meta?.regularMarketOpen) {
                  actualDayOpen = meta.regularMarketOpen;
                } else if (quote?.open && Array.isArray(quote.open)) {
                  const opens = quote.open.filter((n: number) => n != null && typeof n === 'number' && n > 0);
                  if (opens.length > 0) {
                    actualDayOpen = opens[0];
                  }
                }
              }
            } catch (err) {
              console.error(`Error fetching chart data for ${symbol} day open:`, err);
            }
          }
          
          if (actualDayOpen > 0 && regularMarketPrice > 0) {
            change = regularMarketPrice - actualDayOpen;
            changePercent = (change / actualDayOpen) * 100;
            console.log(`[Market Data API] ${symbol} (crypto): price=${regularMarketPrice}, dayOpen=${actualDayOpen}, intradayChange=${changePercent.toFixed(2)}%`);
          } else {
            console.error(`[Market Data API] ${symbol}: CRITICAL - Could not get day's open (price=${regularMarketPrice}, dayOpen=${actualDayOpen}), cannot calculate accurate intraday change`);
            return NextResponse.json({ 
              error: `Unable to fetch accurate intraday data for ${symbol}. Day's opening price not available.` 
            }, { status: 500 });
          }
        } else {
          // For other symbols (e.g. DXY), use Yahoo's change or calculate from previous close
          if (typeof rawChange === 'number' && !Number.isNaN(rawChange)) {
            change = rawChange;
            changePercent = typeof rawChangePercent === 'number' && !Number.isNaN(rawChangePercent)
              ? rawChangePercent
              : (previousClose > 0 ? (change / previousClose) * 100 : 0);
          } else if (regularMarketPrice > 0 && previousClose > 0) {
            change = regularMarketPrice - previousClose;
            changePercent = (change / previousClose) * 100;
          }
          // When market is closed (e.g. weekend), change can be 0. Use last session from 5d chart (e.g. DXY).
          if (!isCrypto && regularMarketPrice > 0 && change === 0 && changePercent === 0) {
            const lastSession = await fetchLastSessionChangeFromChart(yahooSymbol);
            if (lastSession) {
              change = lastSession.change;
              changePercent = lastSession.changePercent;
              previousClose = lastSession.previousClose;
            }
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
        // Only return if we successfully got data from quote API
        // Don't fall through to chart API if we have quote data (even if change is 0)
        if (regularMarketPrice > 0) {
          return NextResponse.json({
            symbol: q.symbol === yahooSymbol ? symbol : q.symbol,
            price: regularMarketPrice,
            change,
            changePercent,
            previousClose,
            ytdPercent: ytdPercent ?? undefined,
          }, { headers: NO_CACHE_HEADERS });
        }
      }
    }

    // Only use chart API as fallback if quote API completely failed
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
      const openArr = quote?.open ? (Array.isArray(quote.open) ? quote.open.filter((n: number) => n != null && typeof n === 'number') : []) : [];
      const price = meta?.regularMarketPrice ?? meta?.previousClose ?? closeArr[closeArr.length - 1];
      let previousClose = meta?.previousClose ?? closeArr[closeArr.length - 2] ?? price;
      const dayOpen = meta?.regularMarketOpen ?? meta?.open ?? openArr[0] ?? 0;
      if (closeArr.length >= 2 && (previousClose == null || previousClose === price)) {
        previousClose = closeArr[closeArr.length - 2];
      }
      if (price != null && typeof price === 'number') {
        const prev = typeof previousClose === 'number' ? previousClose : price;
        const isFutures = ['ES', 'NQ', 'YM', 'RTY', 'GC', 'SI', 'CL', 'N225'].includes(symbol);
        const isCrypto = symbol === 'BTC' || symbol === 'ETH';
        
        let change = 0;
        let changePercent = 0;
        
        if (isFutures) {
          // For futures (chart fallback): daily change = vs previous close
          if (prev > 0 && prev !== price) {
            change = price - prev;
            changePercent = (change / prev) * 100;
            console.log(`[Market Data API] ${symbol} (futures, chart fallback): price=${price}, previousClose=${prev}, change=${changePercent.toFixed(2)}%`);
          }
        } else if (isCrypto && dayOpen > 0) {
          // For crypto, calculate from day's open
          change = price - dayOpen;
          changePercent = (change / dayOpen) * 100;
          console.log(`[Market Data API] ${symbol} (crypto, chart fallback): price=${price}, dayOpen=${dayOpen}, change=${changePercent.toFixed(2)}%`);
        } else if (prev > 0 && prev !== price) {
          // For other symbols, calculate from previous close
          change = price - prev;
          changePercent = (change / prev) * 100;
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
        }, { headers: NO_CACHE_HEADERS });
      }
    }

    return NextResponse.json({ error: 'Symbol not found' }, { status: 404, headers: NO_CACHE_HEADERS });
  } catch (e) {
    console.error('Market data error:', e);
    return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

