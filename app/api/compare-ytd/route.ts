import { NextResponse } from 'next/server';

const YAHOO_SYMBOLS: Record<string, string> = {
  ES: 'ES=F',
  NQ: 'NQ=F',
  YM: 'YM=F',
  RTY: 'RTY=F',
  GC: 'GC=F',
  SI: 'SI=F',
  CL: 'CL=F',
  N225: '^N225',
  BTC: 'BTC-USD',
  ETH: 'ETH-USD',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** Fetch YTD daily data for one symbol from Yahoo; returns { date, return }[] (YTD % from first close of year). */
async function fetchYtdSeries(symbol: string): Promise<{ date: string; return: number }[] | null> {
  const yahooSymbol = YAHOO_SYMBOLS[symbol.toUpperCase()] || symbol;
  const currentYear = new Date().getFullYear();
  const daysDiff = Math.ceil((Date.now() - new Date(currentYear, 0, 1).getTime()) / (1000 * 60 * 60 * 24));
  const range = daysDiff <= 5 ? '5d' : daysDiff <= 30 ? '1mo' : daysDiff <= 90 ? '3mo' : daysDiff <= 180 ? '6mo' : '1y';

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=${range}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;
    const timestamps = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];
    if (!Array.isArray(timestamps) || !Array.isArray(closes) || timestamps.length !== closes.length) return null;

    let firstPrice: number | null = null;
    const out: { date: string; return: number }[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const date = new Date(timestamps[i] * 1000);
      if (date.getFullYear() < currentYear) continue;
      const close = closes[i];
      if (close == null || typeof close !== 'number') continue;
      if (firstPrice == null) firstPrice = close;
      const ytdReturn = firstPrice ? ((close - firstPrice) / firstPrice) * 100 : 0;
      out.push({ date: date.toISOString().split('T')[0], return: ytdReturn });
    }
    return out.length ? out : null;
  } catch {
    return null;
  }
}

/**
 * GET /api/compare-ytd?symbols=NQ,ES,CL
 * Returns YTD % change series for multiple symbols, aligned by date.
 * Response: { dates: string[], series: { symbol: string, returns: number[] }[] }
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get('symbols') || '';
  const symbols = symbolsParam.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
  const allowed = new Set(Object.keys(YAHOO_SYMBOLS));
  const valid = symbols.filter((s) => allowed.has(s) && s.length <= 10);
  if (valid.length === 0) {
    return NextResponse.json({ error: 'Provide at least one valid symbol (e.g. symbols=NQ,ES)' }, { status: 400 });
  }
  if (valid.length > 8) {
    return NextResponse.json({ error: 'Maximum 8 symbols' }, { status: 400 });
  }

  try {
    const rawSeries = await Promise.all(valid.map(async (sym) => ({ symbol: sym, data: await fetchYtdSeries(sym) })));
    const seriesWithData = rawSeries.filter((s): s is { symbol: string; data: { date: string; return: number }[] } => s.data != null && s.data.length > 0);
    if (seriesWithData.length === 0) {
      return NextResponse.json({ error: 'No YTD data for the requested symbols' }, { status: 404 });
    }

    // Build sorted set of all dates
    const dateSet = new Set<string>();
    for (const { data } of seriesWithData) {
      for (const d of data) dateSet.add(d.date);
    }
    const dates = Array.from(dateSet).sort();

    // For each series, build returns array aligned to dates (forward-fill missing)
    const byDate = new Map<string, number>();
    const series = seriesWithData.map(({ symbol, data }) => {
      byDate.clear();
      for (const p of data) byDate.set(p.date, p.return);
      let last = 0;
      const returns = dates.map((d) => {
        const v = byDate.get(d);
        if (v !== undefined) last = v;
        return last;
      });
      return { symbol, returns };
    });

    return NextResponse.json({ dates, series });
  } catch (e) {
    console.error('[compare-ytd]', e);
    return NextResponse.json({ error: 'Failed to fetch compare data' }, { status: 500 });
  }
}
