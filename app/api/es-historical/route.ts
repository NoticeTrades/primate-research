import { NextResponse } from 'next/server';

/**
 * GET /api/es-historical
 * Returns YTD (Year-to-Date) historical data for ES futures
 */
export async function GET() {
  try {
    const currentYear = new Date().getFullYear();
    const startDate = new Date(currentYear, 0, 1); // January 1st of current year
    const endDate = new Date();
    
    // Calculate days since start of year
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const range = daysDiff <= 5 ? '5d' : daysDiff <= 30 ? '1mo' : daysDiff <= 90 ? '3mo' : daysDiff <= 180 ? '6mo' : '1y';
    
    // Fetch ES futures historical data from Yahoo Finance
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/ES=F?interval=1d&range=${range}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ES data: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.chart?.result?.[0]) {
      const result = data.chart.result[0];
      const timestamps = result.timestamp || [];
      const closes = result.indicators?.quote?.[0]?.close || [];
      
      // Get the first trading day of the year (first non-null close)
      let firstPrice: number | null = null;
      let firstDate: string | null = null;
      
      const historicalData: Array<{ date: string; price: number; return: number }> = [];
      
      for (let i = 0; i < timestamps.length; i++) {
        const timestamp = timestamps[i] * 1000; // Convert to milliseconds
        const date = new Date(timestamp);
        const dateStr = date.toISOString().split('T')[0];
        
        // Only include dates from current year onwards
        if (date.getFullYear() < currentYear) continue;
        
        const close = closes[i];
        if (close === null || close === undefined) continue;
        
        // Set first price as baseline (YTD start)
        if (firstPrice === null) {
          firstPrice = close;
          firstDate = dateStr;
        }
        
        // Calculate YTD return percentage
        const ytdReturn = firstPrice ? ((close - firstPrice) / firstPrice) * 100 : 0;
        
        historicalData.push({
          date: dateStr,
          price: close,
          return: ytdReturn,
        });
      }
      
      return NextResponse.json({
        data: historicalData,
        firstPrice,
        firstDate,
      });
    }

    return NextResponse.json({ error: 'No data found' }, { status: 404 });
  } catch (error) {
    console.error('Error fetching ES historical data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ES historical data' },
      { status: 500 }
    );
  }
}
