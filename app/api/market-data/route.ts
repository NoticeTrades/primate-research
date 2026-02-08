import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol parameter is required' }, { status: 400 });
  }

  try {
    // Map our symbols to Yahoo Finance symbols
    const symbolMap: Record<string, string> = {
      'NQ': 'NQ=F',
      'ES': 'ES=F',
      'YM': 'YM=F',
      'RTY': 'RTY=F',
      'GC': 'GC=F',
      'SI': 'SI=F',
      'N225': '%5EN225',
    };

    const yahooSymbol = symbolMap[symbol] || symbol;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.chart?.result?.[0]) {
      const result = data.chart.result[0];
      const meta = result.meta;
      
      // Use regularMarketPrice or chartPreviousClose for current price
      const regularPrice = meta.regularMarketPrice ?? meta.chartPreviousClose ?? meta.previousClose;
      const prevClose = meta.previousClose ?? meta.chartPreviousClose ?? regularPrice;
      
      // Try to use Yahoo's calculated change percent first, then calculate our own
      let change = meta.regularMarketChange ?? (regularPrice - prevClose);
      let changePercent = meta.regularMarketChangePercent ?? ((change / prevClose) * 100);
      
      // If changePercent is not available, calculate it
      if (!changePercent && prevClose && prevClose !== 0) {
        changePercent = (change / prevClose) * 100;
      }

      return NextResponse.json({
        symbol,
        price: regularPrice,
        change,
        changePercent,
      });
    }

    return NextResponse.json({ error: 'No data found' }, { status: 404 });
  } catch (error) {
    console.error(`Error fetching data for ${symbol}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}
