import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/ticker/[symbol] — fetch crypto data (Yahoo Finance for BTC/ETH intraday, CoinGecko for others)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol: symbolParam } = await params;
    const symbol = symbolParam.toUpperCase();

    // For BTC and ETH, use Yahoo Finance for accurate intraday change from day's open
    if (symbol === 'BTC' || symbol === 'ETH') {
      const yahooSymbol = symbol === 'BTC' ? 'BTC-USD' : 'ETH-USD';
      try {
        const quoteUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(yahooSymbol)}`;
        const quoteRes = await fetch(quoteUrl, {
          headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
          cache: 'no-store',
        });

        if (quoteRes.ok) {
          const quoteData = await quoteRes.json();
          const q = quoteData?.quoteResponse?.result?.[0];
          if (q) {
            const price = q.regularMarketPrice ?? q.price ?? 0;
            const dayOpen = q.regularMarketOpen ?? q.open ?? 0;
            const high = q.regularMarketDayHigh ?? q.dayHigh ?? price;
            const low = q.regularMarketDayLow ?? q.dayLow ?? price;
            const volume = q.regularMarketVolume ?? q.volume ?? 0;
            
            // Calculate intraday change from day's open (not 24h)
            let intradayChangePercent = 0;
            if (dayOpen > 0 && price > 0) {
              intradayChangePercent = ((price - dayOpen) / dayOpen) * 100;
            } else if (q.regularMarketChangePercent) {
              intradayChangePercent = q.regularMarketChangePercent;
            }

            // Get additional data from CoinGecko for market cap, supply, etc.
            const coinId = symbol === 'BTC' ? 'bitcoin' : 'ethereum';
            const cgRes = await fetch(
              `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=true&developer_data=false&sparkline=false`,
              { cache: 'no-store' }
            );
            
            let cgData = null;
            if (cgRes.ok) {
              cgData = await cgRes.json();
            }

            return NextResponse.json({
              symbol: symbol,
              name: q.longName || q.shortName || (symbol === 'BTC' ? 'Bitcoin' : 'Ethereum'),
              description: cgData?.description?.en || '',
              currentPrice: price,
              priceChange24h: intradayChangePercent, // Actually intraday change from day's open
              high24h: high,
              low24h: low,
              volume24h: volume,
              marketCap: cgData?.market_data?.market_cap?.usd || 0,
              fullyDilutedValuation: cgData?.market_data?.fully_diluted_valuation?.usd || 0,
              circulatingSupply: cgData?.market_data?.circulating_supply || 0,
              totalSupply: cgData?.market_data?.total_supply || 0,
              maxSupply: cgData?.market_data?.max_supply || null,
              ath: cgData?.market_data?.ath?.usd || 0,
              athChangePercentage: cgData?.market_data?.ath_change_percentage?.usd || 0,
              atl: cgData?.market_data?.atl?.usd || 0,
              atlChangePercentage: cgData?.market_data?.atl_change_percentage?.usd || 0,
              image: cgData?.image?.large || '',
              links: {
                homepage: cgData?.links?.homepage?.[0] || '',
                blockchain: cgData?.links?.blockchain_site || [],
              },
              categories: cgData?.categories || [],
              updateInterval: 10, // Update every 10 seconds
              lastUpdated: new Date().toISOString(),
            });
          }
        }
      } catch (err) {
        console.error('Yahoo Finance fetch error for', symbol, err);
        // Fall through to CoinGecko fallback
      }
    }

    // For other cryptos or fallback, use CoinGecko
    const symbolToId: Record<string, string> = {
      BTC: 'bitcoin',
      ETH: 'ethereum',
      SOL: 'solana',
      ADA: 'cardano',
      DOT: 'polkadot',
      MATIC: 'matic-network',
      AVAX: 'avalanche-2',
      LINK: 'chainlink',
      UNI: 'uniswap',
      ATOM: 'cosmos',
      XRP: 'ripple',
      DOGE: 'dogecoin',
      SHIB: 'shiba-inu',
      LTC: 'litecoin',
      BCH: 'bitcoin-cash',
      XLM: 'stellar',
      ALGO: 'algorand',
      NEAR: 'near',
      FTM: 'fantom',
      SAND: 'the-sandbox',
      MANA: 'decentraland',
      APE: 'apecoin',
      ARB: 'arbitrum',
      OP: 'optimism',
      SUI: 'sui',
      APT: 'aptos',
    };

    const coinId = symbolToId[symbol];
    if (!coinId) {
      return NextResponse.json(
        { error: 'Crypto not supported. Supported: BTC, ETH, SOL, ADA, DOT, MATIC, AVAX, LINK, UNI, ATOM, XRP, DOGE, SHIB, LTC, BCH, XLM, ALGO, NEAR, FTM, SAND, MANA, APE, ARB, OP, SUI, APT' },
        { status: 404 }
      );
    }

    // Fetch from CoinGecko API
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=true&developer_data=false&sparkline=false`,
      {
        headers: {
          'Accept': 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'Crypto not found' }, { status: 404 });
      }
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();

    // Extract relevant data
    const tickerData = {
      symbol: symbol,
      name: data.name,
      description: data.description?.en || '',
      currentPrice: data.market_data?.current_price?.usd || 0,
      priceChange24h: data.market_data?.price_change_percentage_24h || 0,
      high24h: data.market_data?.high_24h?.usd || 0,
      low24h: data.market_data?.low_24h?.usd || 0,
      volume24h: data.market_data?.total_volume?.usd || 0,
      marketCap: data.market_data?.market_cap?.usd || 0,
      fullyDilutedValuation: data.market_data?.fully_diluted_valuation?.usd || 0,
      circulatingSupply: data.market_data?.circulating_supply || 0,
      totalSupply: data.market_data?.total_supply || 0,
      maxSupply: data.market_data?.max_supply || null,
      ath: data.market_data?.ath?.usd || 0,
      athChangePercentage: data.market_data?.ath_change_percentage?.usd || 0,
      atl: data.market_data?.atl?.usd || 0,
      atlChangePercentage: data.market_data?.atl_change_percentage?.usd || 0,
      image: data.image?.large || '',
      links: {
        homepage: data.links?.homepage?.[0] || '',
        blockchain: data.links?.blockchain_site || [],
      },
      categories: data.categories || [],
      updateInterval: 30, // Data updates every 30 seconds
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(tickerData);
  } catch (error) {
    console.error('Ticker fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch crypto data' },
      { status: 500 }
    );
  }
}

