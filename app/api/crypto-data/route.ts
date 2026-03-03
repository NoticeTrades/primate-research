import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const apiKey = process.env.COINMARKETCAP_API_KEY;
    
    // Use CoinMarketCap for real-time prices if API key is available
    if (apiKey) {
      try {
        console.log('[Crypto Data API] Using CoinMarketCap for real-time data');
        
        // CoinMarketCap API v2 - get latest quotes for BTC and ETH
        const cmcUrl = `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?symbol=BTC,ETH&convert=USD`;
        const cmcRes = await fetch(cmcUrl, {
          headers: {
            'X-CMC_PRO_API_KEY': apiKey,
            'Accept': 'application/json',
          },
          cache: 'no-store',
        });

        // Handle rate limiting
        if (cmcRes.status === 429) {
          console.warn('[Crypto Data API] CoinMarketCap rate limit (429) - falling back to Yahoo Finance');
          // Fall through to Yahoo Finance fallback
        } else if (cmcRes.ok) {
          const cmcData = await cmcRes.json();
          const result: { bitcoin?: { usd: number; usd_24h_change: number }; ethereum?: { usd: number; usd_24h_change: number } } = {};

          // Process Bitcoin
          if (cmcData.data?.BTC?.[0]) {
            const btc = cmcData.data.BTC[0];
            const price = btc.quote?.USD?.price || 0;
            
            // Get day's open from Yahoo Finance for accurate intraday change calculation
            let dayOpen = 0;
            try {
              const yahooChartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD?interval=1m&range=1d`;
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
              console.error('[Crypto Data API] Error fetching BTC day open from Yahoo:', err);
            }
            
            // Calculate intraday change from day's open if available, otherwise use CoinMarketCap's 24h change
            let changePercent = 0;
            if (dayOpen > 0 && price > 0) {
              changePercent = ((price - dayOpen) / dayOpen) * 100;
              console.log(`[Crypto Data API] CoinMarketCap BTC: price=${price}, dayOpen=${dayOpen}, intradayChange=${changePercent.toFixed(2)}%`);
            } else if (price > 0) {
              // Fallback to CoinMarketCap's 24h change if day's open not available
              changePercent = btc.quote?.USD?.percent_change_24h || 0;
              console.warn(`[Crypto Data API] CoinMarketCap BTC: Using 24h change fallback: ${changePercent.toFixed(2)}%`);
            }
            
            if (price > 0) {
              result.bitcoin = {
                usd: price,
                usd_24h_change: changePercent,
              };
            }
          }

          // Process Ethereum
          if (cmcData.data?.ETH?.[0]) {
            const eth = cmcData.data.ETH[0];
            const price = eth.quote?.USD?.price || 0;
            
            // Get day's open from Yahoo Finance for accurate intraday change calculation
            let dayOpen = 0;
            try {
              const yahooChartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/ETH-USD?interval=1m&range=1d`;
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
              console.error('[Crypto Data API] Error fetching ETH day open from Yahoo:', err);
            }
            
            // Calculate intraday change from day's open if available, otherwise use CoinMarketCap's 24h change
            let changePercent = 0;
            if (dayOpen > 0 && price > 0) {
              changePercent = ((price - dayOpen) / dayOpen) * 100;
              console.log(`[Crypto Data API] CoinMarketCap ETH: price=${price}, dayOpen=${dayOpen}, intradayChange=${changePercent.toFixed(2)}%`);
            } else if (price > 0) {
              // Fallback to CoinMarketCap's 24h change if day's open not available
              changePercent = eth.quote?.USD?.percent_change_24h || 0;
              console.warn(`[Crypto Data API] CoinMarketCap ETH: Using 24h change fallback: ${changePercent.toFixed(2)}%`);
            }
            
            if (price > 0) {
              result.ethereum = {
                usd: price,
                usd_24h_change: changePercent,
              };
            }
          }

          if (result.bitcoin || result.ethereum) {
            console.log('[Crypto Data API] CoinMarketCap result:', JSON.stringify(result));
            return NextResponse.json(result);
          }
        } else {
          const errorText = await cmcRes.text();
          console.error(`[Crypto Data API] CoinMarketCap API error: ${cmcRes.status} - ${errorText}`);
        }
      } catch (cmcError) {
        console.error('[Crypto Data API] CoinMarketCap API error:', cmcError);
      }
    } else {
      console.warn('[Crypto Data API] COINMARKETCAP_API_KEY not set, falling back to Yahoo Finance');
    }

    // Fallback to Yahoo Finance if CoinMarketCap fails or API key not set
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
