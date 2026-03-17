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

/** June 2026 futures (explicit contract after roll). ES/NQ/RTY/CL = CME; YM = CBOT. Update next quarter (e.g. U26 for Sep). */
const YAHOO_JUNE_2026: Record<string, string> = {
  ES: 'ESM26.CME',
  NQ: 'NQM26.CME',
  YM: 'YMM26.CBT',   // E-mini Dow trades on CBOT, not CME
  RTY: 'RTYM26.CME',
  CL: 'CLM26.CME',
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
  const full = await fetchPriceAndChangeFrom5dChart(yahooSymbol);
  return full ? { change: full.change, changePercent: full.changePercent, previousClose: full.previousClose } : null;
}

const YAHOO_CHART_HEADERS = {
  'Accept': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
} as const;

/** Alpha Vantage GLOBAL_QUOTE - better reliability than Yahoo when available. Free tier: 5 req/min so we cache 90s per symbol. */
const alphaVantageCache = new Map<string, { data: { price: number; change: number; changePercent: number; previousClose: number }; until: number }>();
const ALPHA_VANTAGE_CACHE_MS = 90_000;

async function fetchAlphaVantageQuote(symbol: string, yahooSymbol: string): Promise<{ price: number; change: number; changePercent: number; previousClose: number } | null> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) return null;
  const now = Date.now();
  const cached = alphaVantageCache.get(symbol);
  if (cached && cached.until > now) return cached.data;
  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(yahooSymbol)}&apikey=${apiKey}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    const q = data?.['Global Quote'];
    if (!q) return null;
    const price = parseFloat(q['05. price']);
    const previousClose = parseFloat(q['08. previous close']);
    const change = parseFloat(q['09. change']);
    const changePercentStr = q['10. change percent'];
    let changePercent = typeof changePercentStr === 'string' ? parseFloat(changePercentStr.replace('%', '')) : 0;
    if (Number.isNaN(changePercent) && previousClose > 0 && !Number.isNaN(change)) changePercent = (change / previousClose) * 100;
    if (!Number.isFinite(price) || price <= 0) return null;
    const result = {
      price,
      change: Number.isFinite(change) ? change : price - previousClose,
      changePercent: Number.isFinite(changePercent) ? changePercent : (previousClose > 0 ? ((price - previousClose) / previousClose) * 100 : 0),
      previousClose: Number.isFinite(previousClose) ? previousClose : price,
    };
    alphaVantageCache.set(symbol, { data: result, until: now + ALPHA_VANTAGE_CACHE_MS });
    return result;
  } catch {
    return null;
  }
}

/** Get last close (price) and last-session change from Yahoo daily chart. Tries 5d first, then 1mo if needed. Used when Twelve Data fails or market is closed so nav bar shows last close and % change. */
async function fetchPriceAndChangeFrom5dChart(yahooSymbol: string): Promise<{ price: number; change: number; changePercent: number; previousClose: number } | null> {
  for (const range of ['5d', '1mo'] as const) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=${range}`;
      const res = await fetch(url, { headers: YAHOO_CHART_HEADERS, cache: 'no-store' });
      if (!res.ok) continue;
      const data = await res.json();
      const result = data?.chart?.result?.[0];
      const meta = result?.meta;
      const quote = result?.indicators?.quote?.[0];
      const closeArr = quote?.close ? (Array.isArray(quote.close) ? quote.close.filter((n: number) => n != null && typeof n === 'number' && n > 0) : []) : [];
      let lastClose: number;
      let prevClose: number;
      if (closeArr.length >= 2) {
        lastClose = closeArr[closeArr.length - 1];
        prevClose = closeArr[closeArr.length - 2];
        // If last two closes are equal (e.g. weekend duplicate), use earlier close so we get non-zero change
        if (lastClose === prevClose && closeArr.length >= 3) prevClose = closeArr[closeArr.length - 3];
        if (prevClose <= 0 || prevClose === lastClose) continue;
      } else if (closeArr.length === 1 && meta?.regularMarketPrice) {
        lastClose = closeArr[0];
        prevClose = meta.previousClose ?? meta.chartPreviousClose ?? lastClose;
        if (prevClose <= 0 || prevClose === lastClose) continue;
      } else if (meta?.regularMarketPrice && (meta?.previousClose ?? meta?.chartPreviousClose)) {
        lastClose = meta.regularMarketPrice;
        prevClose = meta.previousClose ?? meta.chartPreviousClose;
        if (prevClose <= 0) continue;
      } else {
        continue;
      }
      if (typeof lastClose !== 'number' || typeof prevClose !== 'number' || prevClose <= 0) continue;
      const change = lastClose - prevClose;
      const changePercent = (change / prevClose) * 100;
      return { price: lastClose, change, changePercent, previousClose: prevClose };
    } catch {
      continue;
    }
  }
  return null;
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

/** Twelve Data: June 2026 first for correct contract; then front-month. YM = Dow (CBOT). */
const TWELVE_DATA_JUNE_FIRST: Record<string, string[]> = {
  ES: ['ESM26', 'ES1!', 'ES=F', 'ES'],
  NQ: ['NQM26', 'NQ1!', 'NQ=F', 'NQ'],
  YM: ['YMM26', 'YM1!', 'YM=F', 'YM'],
  RTY: ['RTYM26', 'RTY1!', 'RTY=F', 'RTY'],
  CL: ['CLM26', 'CL1!', 'CL=F', 'CL'],
};

/** Twelve Data: get real-time price and session open for index/commodity futures (ES, NQ, YM, RTY, CL). Returns null when out of data (429/402) or any error so caller can re-route to Yahoo. */
async function fetchTwelveDataFutures(symbol: string): Promise<{ price: number; change: number; changePercent: number; previousClose: number } | null> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) return null;
  const variants = TWELVE_DATA_JUNE_FIRST[symbol] || [symbol];
  for (const twelveSymbol of variants) {
    try {
      const [priceRes, quoteRes] = await Promise.all([
        fetch(`https://api.twelvedata.com/price?symbol=${twelveSymbol}&apikey=${apiKey}`, { cache: 'no-store' }),
        fetch(`https://api.twelvedata.com/quote?symbol=${twelveSymbol}&apikey=${apiKey}`, { cache: 'no-store' }),
      ]);
      // Out of data / rate limit / payment required: fail fast and re-route to Yahoo
      if (priceRes.status === 429 || priceRes.status === 402 || quoteRes.status === 429 || quoteRes.status === 402) return null;
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
  // Use June 2026 contract for futures so we get correct data after roll; fallback to front-month symbol
  const indexFuturesList = ['ES', 'NQ', 'YM', 'RTY', 'CL'];
  const yahooSymbol = (indexFuturesList.includes(symbol) && YAHOO_JUNE_2026[symbol])
    ? YAHOO_JUNE_2026[symbol]
    : (YAHOO_SYMBOLS[symbol] || symbol);

  try {
    // Index/commodity futures (and N225): try Twelve Data first (June 2026 contract); else Yahoo. Use June contract for Yahoo when available.
    const indexFutures = ['ES', 'NQ', 'YM', 'RTY', 'CL', 'N225'];
    if (indexFutures.includes(symbol)) {
      const twelve = await fetchTwelveDataFutures(symbol);
      if (twelve) {
        const yahooSymbolForYtd = YAHOO_JUNE_2026[symbol] || YAHOO_SYMBOLS[symbol] || symbol;
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
      // Twelve Data failed: try Alpha Vantage next (more reliable than Yahoo; free tier 5/min so we cache 90s)
      const av = await fetchAlphaVantageQuote(symbol, yahooSymbol);
      if (av && av.price > 0) {
        let change = av.change;
        let changePercent = av.changePercent;
        let previousClose = av.previousClose;
        if (change === 0 && changePercent === 0) {
          const lastSession = await fetchLastSessionChangeFromChart(yahooSymbol);
          if (lastSession) {
            change = lastSession.change;
            changePercent = lastSession.changePercent;
            previousClose = lastSession.previousClose;
          }
        }
        const ytdPercent = await fetchYtdFromYahoo(YAHOO_SYMBOLS[symbol] || symbol);
        return NextResponse.json({
          symbol,
          price: av.price,
          change,
          changePercent,
          previousClose,
          ytdPercent: ytdPercent ?? undefined,
        }, { headers: NO_CACHE_HEADERS });
      }
      // Fallback: Yahoo 5d chart so nav bar shows last close and last-session % change
      let chart5d = await fetchPriceAndChangeFrom5dChart(yahooSymbol);
      // YM (E-mini Dow) is on CBOT; if June contract (YMM26.CBT) returns no data, try front-month YM=F
      if (symbol === 'YM' && (!chart5d || chart5d.price <= 0)) {
        const chartYMF = await fetchPriceAndChangeFrom5dChart(YAHOO_SYMBOLS['YM']);
        if (chartYMF && chartYMF.price > 0) chart5d = chartYMF;
      }
      let useChart5d = chart5d != null && chart5d.price > 0;
      // For YM use front-month YM=F for session/change so we get data even when June contract (CBOT) is thin
      const yahooSymbolForSession = symbol === 'YM' ? YAHOO_SYMBOLS['YM'] : yahooSymbol;
      if (useChart5d && chart5d) {
        let change = chart5d.change;
        let changePercent = chart5d.changePercent;
        let previousClose = chart5d.previousClose;
        // Never return 0% when we have a valid price - fill from last session if chart gave 0
        if (change === 0 && changePercent === 0) {
          const lastSession = await fetchLastSessionChangeFromChart(yahooSymbolForSession);
          if (lastSession) {
            change = lastSession.change;
            changePercent = lastSession.changePercent;
            previousClose = lastSession.previousClose;
          } else {
            // Chart gave price but no change and lastSession failed; try quote path below instead of returning 0%
            useChart5d = false;
          }
        }
        if (useChart5d) {
          const yahooSymbolForYtd = YAHOO_SYMBOLS[symbol] || symbol;
          const ytdPercent = await fetchYtdFromYahoo(yahooSymbolForYtd);
          return NextResponse.json({
            symbol,
            price: chart5d.price,
            change,
            changePercent,
            previousClose,
            ytdPercent: ytdPercent ?? undefined,
          }, { headers: NO_CACHE_HEADERS });
        }
      }
      // When market is open: try Yahoo 5m intraday for slightly fresher price than quote API
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
        // fall through
      }
      // Twelve Data failed and 5d/intraday didn't return: explicitly fetch Yahoo quote so nav bar gets data
      try {
        const quoteUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(yahooSymbol)}`;
        const quoteRes = await fetch(quoteUrl, { headers: { ...YAHOO_CHART_HEADERS }, cache: 'no-store' });
        if (quoteRes.ok) {
          const data = await quoteRes.json();
          const q = data?.quoteResponse?.result?.[0];
          if (q) {
            const regularMarketPrice = q.regularMarketPrice ?? q.price ?? 0;
            let previousClose = q.regularMarketPreviousClose ?? q.previousClose ?? 0;
            if (previousClose === 0 || previousClose === regularMarketPrice) previousClose = q.previousClose ?? q.regularMarketPreviousClose ?? regularMarketPrice;
            if (regularMarketPrice > 0) {
              let change = previousClose > 0 ? regularMarketPrice - previousClose : 0;
              let changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;
              if (change === 0 && changePercent === 0) {
                const lastSession = await fetchLastSessionChangeFromChart(yahooSymbol);
                if (lastSession) {
                  change = lastSession.change;
                  changePercent = lastSession.changePercent;
                  previousClose = lastSession.previousClose;
                }
              }
              const ytdPercent = await fetchYtdFromYahoo(yahooSymbol);
              return NextResponse.json({
                symbol,
                price: regularMarketPrice,
                change,
                changePercent,
                previousClose,
                ytdPercent: ytdPercent ?? undefined,
              }, { headers: NO_CACHE_HEADERS });
            }
          }
        }
      } catch {
        // fall through to generic Yahoo quote below
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

    // For DXY, GC, SI and any symbol not in index futures: try Alpha Vantage before Yahoo (better data when available)
    if (symbol !== 'BTC' && symbol !== 'ETH' && YAHOO_SYMBOLS[symbol]) {
      const av = await fetchAlphaVantageQuote(symbol, yahooSymbol);
      if (av && av.price > 0) {
        let change = av.change;
        let changePercent = av.changePercent;
        let previousClose = av.previousClose;
        if (change === 0 && changePercent === 0) {
          const lastSession = await fetchLastSessionChangeFromChart(yahooSymbol);
          if (lastSession) {
            change = lastSession.change;
            changePercent = lastSession.changePercent;
            previousClose = lastSession.previousClose;
          }
        }
        let ytdPercent: number | null = null;
        try {
          ytdPercent = await fetchYtdFromYahoo(yahooSymbol);
        } catch {
          // ignore
        }
        return NextResponse.json({
          symbol,
          price: av.price,
          change,
          changePercent,
          previousClose,
          ytdPercent: ytdPercent ?? undefined,
        }, { headers: NO_CACHE_HEADERS });
      }
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

