import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
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

    console.log('[Crypto Data API] Starting fetch for BTC and ETH');

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
          changePercent = ((price - dayOpen) / dayOpen) * 100;
          console.log(`[Crypto Data API] BTC: price=${price}, dayOpen=${dayOpen}, intradayChange=${changePercent.toFixed(2)}%`);
        } else {
          console.warn(`[Crypto Data API] BTC: Could not get day's open (price=${price}, dayOpen=${dayOpen})`);
        }
        
        result.bitcoin = {
          usd: price,
          usd_24h_change: changePercent, // Using intraday change, not 24h
        };
        console.log(`[Crypto Data API] Returning BTC: price=${price}, changePercent=${changePercent.toFixed(2)}%`);
      } else {
        console.warn('[Crypto Data API] BTC quote data missing or invalid');
      }
    } else {
      console.error(`[Crypto Data API] BTC API response not OK: ${btcRes.status}`);
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
          changePercent = ((price - dayOpen) / dayOpen) * 100;
          console.log(`[Crypto Data API] ETH: price=${price}, dayOpen=${dayOpen}, intradayChange=${changePercent.toFixed(2)}%`);
        } else {
          console.warn(`[Crypto Data API] ETH: Could not get day's open (price=${price}, dayOpen=${dayOpen})`);
        }
        
        result.ethereum = {
          usd: price,
          usd_24h_change: changePercent, // Using intraday change, not 24h
        };
        console.log(`[Crypto Data API] Returning ETH: price=${price}, changePercent=${changePercent.toFixed(2)}%`);
      } else {
        console.warn('[Crypto Data API] ETH quote data missing or invalid');
      }
    } else {
      console.error(`[Crypto Data API] ETH API response not OK: ${ethRes.status}`);
    }
    
    console.log('[Crypto Data API] Final result:', JSON.stringify(result));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching crypto data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch crypto data' },
      { status: 500 }
    );
  }
}
