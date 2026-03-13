import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Prefer CoinGecko (no key required) for BTC/ETH USD prices and 24h change
    try {
      console.log('[Crypto Data API] Using CoinGecko simple price API');
      const cgRes = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true',
        {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        }
      );

      if (cgRes.ok) {
        const cgData = await cgRes.json();
        const result: {
          bitcoin?: { usd: number; usd_24h_change: number };
          ethereum?: { usd: number; usd_24h_change: number };
        } = {};

        if (cgData.bitcoin?.usd) {
          result.bitcoin = {
            usd: Number(cgData.bitcoin.usd) || 0,
            usd_24h_change: Number(cgData.bitcoin.usd_24h_change) || 0,
          };
        }

        if (cgData.ethereum?.usd) {
          result.ethereum = {
            usd: Number(cgData.ethereum.usd) || 0,
            usd_24h_change: Number(cgData.ethereum.usd_24h_change) || 0,
          };
        }

        if (result.bitcoin || result.ethereum) {
          console.log('[Crypto Data API] CoinGecko result:', JSON.stringify(result));
          return NextResponse.json(result);
        }
        console.warn('[Crypto Data API] CoinGecko returned no usable data, falling back to Yahoo Finance');
      } else {
        console.warn(`[Crypto Data API] CoinGecko response not OK (${cgRes.status}), falling back to Yahoo Finance`);
      }
    } catch (cgError) {
      console.error('[Crypto Data API] CoinGecko error, falling back to Yahoo Finance:', cgError);
    }

    // Fallback to Yahoo Finance if CoinGecko fails
    return await fetchYahooFinanceData();
  } catch (error) {
    console.error('Error fetching crypto data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch crypto data' },
      { status: 500 }
    );
  }
}

// Fallback function to use Yahoo Finance
async function fetchYahooFinanceData() {
  try {
    // Use Yahoo Finance for accurate intraday data (calculates from day's open)
    const [btcRes, ethRes] = await Promise.all([
      fetch('https://query1.finance.yahoo.com/v7/finance/quote?symbols=BTC-USD', {
        headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
        cache: 'no-store',
      }),
      fetch('https://query1.finance.yahoo.com/v7/finance/quote?symbols=ETH-USD', {
        headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
        cache: 'no-store',
      }),
    ]);

    const result: { bitcoin?: { usd: number; usd_24h_change: number }; ethereum?: { usd: number; usd_24h_change: number } } = {};

    console.log('[Crypto Data API] Using Yahoo Finance fallback for BTC and ETH');

    // Process Bitcoin
    if (btcRes.ok) {
      const btcData = await btcRes.json();
      const btc = btcData?.quoteResponse?.result?.[0];
      if (btc) {
        const price = btc.regularMarketPrice ?? btc.price ?? 0;
        let dayOpen = btc.regularMarketOpen ?? btc.open ?? 0;
        
        // Try to get day's open from chart API if not available
        if (dayOpen === 0 && price > 0) {
          try {
            const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD?interval=1m&range=1d`;
            const chartRes = await fetch(chartUrl, {
              headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
              cache: 'no-store',
            });
            if (chartRes.ok) {
              const chartData = await chartRes.json();
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
            console.error('Error fetching BTC chart data for day open:', err);
          }
        }
        
        // Calculate intraday change from day's open (not 24h change)
        let changePercent = 0;
        if (dayOpen > 0 && price > 0) {
          // Calculate from day's open (most accurate)
          changePercent = ((price - dayOpen) / dayOpen) * 100;
          console.log(`[Crypto Data API] Yahoo BTC: price=${price}, dayOpen=${dayOpen}, intradayChange=${changePercent.toFixed(2)}%`);
        } else if (price > 0) {
          // Fallback: Use Yahoo's regularMarketChangePercent if available (might be from previous close, but better than nothing)
          // Or try to calculate from previous close if we have it
          const prevClose = btc.regularMarketPreviousClose ?? btc.previousClose ?? 0;
          if (prevClose > 0) {
            changePercent = ((price - prevClose) / prevClose) * 100;
            console.warn(`[Crypto Data API] Yahoo BTC: Using previous close fallback (price=${price}, prevClose=${prevClose}), changePercent=${changePercent.toFixed(2)}%`);
          } else if (btc.regularMarketChangePercent != null) {
            changePercent = btc.regularMarketChangePercent;
            console.warn(`[Crypto Data API] Yahoo BTC: Using Yahoo's changePercent fallback: ${changePercent.toFixed(2)}%`);
          } else {
            console.warn(`[Crypto Data API] Yahoo BTC: Could not calculate change (price=${price}, dayOpen=${dayOpen})`);
          }
        }
        
        // Always return data if we have a price (even if change calculation isn't perfect)
        if (price > 0) {
          result.bitcoin = {
            usd: price,
            usd_24h_change: changePercent,
          };
          console.log(`[Crypto Data API] Returning Yahoo BTC: price=${price}, changePercent=${changePercent.toFixed(2)}%`);
        } else {
          console.error(`[Crypto Data API] Yahoo BTC: No valid price data`);
        }
      } else {
        console.warn('[Crypto Data API] Yahoo BTC quote data missing or invalid');
      }
    } else {
      console.error(`[Crypto Data API] Yahoo BTC API response not OK: ${btcRes.status}`);
    }

    // Process Ethereum
    if (ethRes.ok) {
      const ethData = await ethRes.json();
      const eth = ethData?.quoteResponse?.result?.[0];
      if (eth) {
        const price = eth.regularMarketPrice ?? eth.price ?? 0;
        let dayOpen = eth.regularMarketOpen ?? eth.open ?? 0;
        
        // Try to get day's open from chart API if not available
        if (dayOpen === 0 && price > 0) {
          try {
            const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/ETH-USD?interval=1m&range=1d`;
            const chartRes = await fetch(chartUrl, {
              headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
              cache: 'no-store',
            });
            if (chartRes.ok) {
              const chartData = await chartRes.json();
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
            console.error('Error fetching ETH chart data for day open:', err);
          }
        }
        
        // Calculate intraday change from day's open (not 24h change)
        let changePercent = 0;
        if (dayOpen > 0 && price > 0) {
          // Calculate from day's open (most accurate)
          changePercent = ((price - dayOpen) / dayOpen) * 100;
          console.log(`[Crypto Data API] Yahoo ETH: price=${price}, dayOpen=${dayOpen}, intradayChange=${changePercent.toFixed(2)}%`);
        } else if (price > 0) {
          // Fallback: Use Yahoo's regularMarketChangePercent if available (might be from previous close, but better than nothing)
          // Or try to calculate from previous close if we have it
          const prevClose = eth.regularMarketPreviousClose ?? eth.previousClose ?? 0;
          if (prevClose > 0) {
            changePercent = ((price - prevClose) / prevClose) * 100;
            console.warn(`[Crypto Data API] Yahoo ETH: Using previous close fallback (price=${price}, prevClose=${prevClose}), changePercent=${changePercent.toFixed(2)}%`);
          } else if (eth.regularMarketChangePercent != null) {
            changePercent = eth.regularMarketChangePercent;
            console.warn(`[Crypto Data API] Yahoo ETH: Using Yahoo's changePercent fallback: ${changePercent.toFixed(2)}%`);
          } else {
            console.warn(`[Crypto Data API] Yahoo ETH: Could not calculate change (price=${price}, dayOpen=${dayOpen})`);
          }
        }
        
        // Always return data if we have a price (even if change calculation isn't perfect)
        if (price > 0) {
          result.ethereum = {
            usd: price,
            usd_24h_change: changePercent,
          };
          console.log(`[Crypto Data API] Returning Yahoo ETH: price=${price}, changePercent=${changePercent.toFixed(2)}%`);
        } else {
          console.error(`[Crypto Data API] Yahoo ETH: No valid price data`);
        }
      } else {
        console.warn('[Crypto Data API] Yahoo ETH quote data missing or invalid');
      }
    } else {
      console.error(`[Crypto Data API] Yahoo ETH API response not OK: ${ethRes.status}`);
    }
    
    console.log('[Crypto Data API] Yahoo Finance final result:', JSON.stringify(result));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching Yahoo Finance crypto data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch crypto data' },
      { status: 500 }
    );
  }
}
