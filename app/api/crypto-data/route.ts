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

    // Process Bitcoin
    if (btcRes.ok) {
      const btcData = await btcRes.json();
      const btc = btcData?.quoteResponse?.result?.[0];
      if (btc) {
        const price = btc.regularMarketPrice ?? btc.price ?? 0;
        const dayOpen = btc.regularMarketOpen ?? btc.open ?? 0;
        
        // Calculate intraday change from day's open (not 24h change)
        let changePercent = 0;
        if (dayOpen > 0 && price > 0) {
          changePercent = ((price - dayOpen) / dayOpen) * 100;
        } else if (btc.regularMarketChangePercent) {
          // Fallback to Yahoo's change if open not available
          changePercent = btc.regularMarketChangePercent;
        }
        
        result.bitcoin = {
          usd: price,
          usd_24h_change: changePercent, // Using intraday change, not 24h
        };
      }
    }

    // Process Ethereum
    if (ethRes.ok) {
      const ethData = await ethRes.json();
      const eth = ethData?.quoteResponse?.result?.[0];
      if (eth) {
        const price = eth.regularMarketPrice ?? eth.price ?? 0;
        const dayOpen = eth.regularMarketOpen ?? eth.open ?? 0;
        
        // Calculate intraday change from day's open (not 24h change)
        let changePercent = 0;
        if (dayOpen > 0 && price > 0) {
          changePercent = ((price - dayOpen) / dayOpen) * 100;
        } else if (eth.regularMarketChangePercent) {
          // Fallback to Yahoo's change if open not available
          changePercent = eth.regularMarketChangePercent;
        }
        
        result.ethereum = {
          usd: price,
          usd_24h_change: changePercent, // Using intraday change, not 24h
        };
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching crypto data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch crypto data' },
      { status: 500 }
    );
  }
}
