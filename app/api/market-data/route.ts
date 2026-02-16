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
export const revalidate = 0; // No caching - always fetch fresh data

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get('symbol') || '').toUpperCase();
  const yahooSymbol = YAHOO_SYMBOLS[symbol] || symbol;

  try {
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
              });
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
        let previousClose = q.regularMarketPreviousClose ?? q.previousClose ?? regularMarketPrice;
        const dayOpen = q.regularMarketOpen ?? q.open ?? 0;
        const rawChange = q.regularMarketChange;
        const rawChangePercent = q.regularMarketChangePercent;
        
        // For futures (ES, NQ, YM, RTY, GC, SI, N225), use Yahoo's regularMarketChangePercent
        // For crypto (BTC/ETH), calculate from day's open for accurate intraday change
        const isFutures = ['ES', 'NQ', 'YM', 'RTY', 'GC', 'SI', 'N225'].includes(symbol);
        const isCrypto = symbol === 'BTC' || symbol === 'ETH';
        
        let change = 0;
        let changePercent = 0;
        
        if (isFutures) {
          // For futures, use Yahoo Finance's built-in change calculation (from previous close)
          // This is more accurate for futures trading sessions
          if (typeof rawChange === 'number' && !Number.isNaN(rawChange)) {
            change = rawChange;
            changePercent = typeof rawChangePercent === 'number' && !Number.isNaN(rawChangePercent)
              ? rawChangePercent
              : (previousClose > 0 ? (change / previousClose) * 100 : 0);
            console.log(`[Market Data API] ${symbol} (futures): Using Yahoo's change: price=${regularMarketPrice}, change=${changePercent.toFixed(2)}%`);
          } else if (regularMarketPrice > 0 && previousClose > 0 && previousClose !== regularMarketPrice) {
            // Fallback: calculate from previous close
            change = regularMarketPrice - previousClose;
            changePercent = (change / previousClose) * 100;
            console.log(`[Market Data API] ${symbol} (futures): Calculated from prevClose: price=${regularMarketPrice}, prevClose=${previousClose}, change=${changePercent.toFixed(2)}%`);
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
          // For other symbols, use Yahoo's change or calculate from previous close
          if (typeof rawChange === 'number' && !Number.isNaN(rawChange)) {
            change = rawChange;
            changePercent = typeof rawChangePercent === 'number' && !Number.isNaN(rawChangePercent)
              ? rawChangePercent
              : (previousClose > 0 ? (change / previousClose) * 100 : 0);
          } else if (regularMarketPrice > 0 && previousClose > 0) {
            change = regularMarketPrice - previousClose;
            changePercent = (change / previousClose) * 100;
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
      const openArr = quote?.open ? (Array.isArray(quote.open) ? quote.open.filter((n: number) => n != null && typeof n === 'number') : []) : [];
      const price = meta?.regularMarketPrice ?? meta?.previousClose ?? closeArr[closeArr.length - 1];
      let previousClose = meta?.previousClose ?? closeArr[closeArr.length - 2] ?? price;
      const dayOpen = meta?.regularMarketOpen ?? meta?.open ?? openArr[0] ?? 0;
      if (closeArr.length >= 2 && (previousClose == null || previousClose === price)) {
        previousClose = closeArr[closeArr.length - 2];
      }
      if (price != null && typeof price === 'number') {
        const prev = typeof previousClose === 'number' ? previousClose : price;
        // Calculate intraday change from day's open for accuracy
        let change = 0;
        let changePercent = 0;
        if (dayOpen > 0) {
          change = price - dayOpen;
          changePercent = (change / dayOpen) * 100;
        } else {
          // Fallback to previous close if open not available
          change = price - prev;
          changePercent = prev ? (change / prev) * 100 : 0;
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
        });
      }
    }

    return NextResponse.json({ error: 'Symbol not found' }, { status: 404 });
  } catch (e) {
    console.error('Market data error:', e);
    return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 });
  }
}

