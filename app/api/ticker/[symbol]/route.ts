import { NextResponse } from 'next/server';
import { getDb } from '../../../../../lib/db';

export const dynamic = 'force-dynamic';

// GET /api/ticker/[symbol] — fetch crypto data from CoinGecko
export async function GET(
  request: Request,
  { params }: { params: { symbol: string } }
) {
  try {
    const symbol = params.symbol.toUpperCase();

    // Common crypto symbol mappings (CoinGecko uses IDs, not symbols)
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
        next: { revalidate: 60 }, // Cache for 60 seconds
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

