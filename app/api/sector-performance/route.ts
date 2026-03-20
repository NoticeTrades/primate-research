import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type SectorPerf = {
  sector: string;
  changePercent: number;
};

const CACHE_MS = 60_000;
let cache: { until: number; rows: SectorPerf[] } | null = null;

export async function GET() {
  const now = Date.now();
  if (cache && cache.until > now) {
    return NextResponse.json({ sectors: cache.rows }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  }

  try {
    // No API keys: use sector ETFs as proxies, compute change vs previous close from Yahoo quote.
    // (Works much more reliably than the free FMP sectors endpoint.)
    const sectorEtfs: Array<{ sector: string; symbol: string }> = [
      { sector: 'Technology', symbol: 'XLK' },
      { sector: 'Healthcare', symbol: 'XLV' },
      { sector: 'Financials', symbol: 'XLF' },
      { sector: 'Consumer Discretionary', symbol: 'XLY' },
      { sector: 'Consumer Staples', symbol: 'XLP' },
      { sector: 'Industrials', symbol: 'XLI' },
      { sector: 'Materials', symbol: 'XLB' },
      { sector: 'Energy', symbol: 'XLE' },
      { sector: 'Utilities', symbol: 'XLU' },
      { sector: 'Communication Services', symbol: 'XLC' },
      { sector: 'Real Estate', symbol: 'XLRE' },
    ];

    const symbols = sectorEtfs.map((s) => s.symbol).join(',');
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`;
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; PrimateResearch/1.0)' },
    });
    if (!res.ok) return NextResponse.json({ sectors: [] as SectorPerf[] }, { status: 200 });

    const body = (await res.json()) as { quoteResponse?: { result?: Array<Record<string, unknown>> } };
    const rows = body?.quoteResponse?.result;
    if (!Array.isArray(rows)) return NextResponse.json({ sectors: [] as SectorPerf[] }, { status: 200 });

    const bySymbol = new Map<string, Record<string, unknown>>();
    for (const r of rows) {
      const sym = String((r as any)?.symbol || '').toUpperCase();
      if (!sym) continue;
      bySymbol.set(sym, r as Record<string, unknown>);
    }

    const toNum = (v: unknown): number | null => {
      const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN;
      return Number.isFinite(n) ? n : null;
    };

    const computed: SectorPerf[] = sectorEtfs
      .map((s) => {
        const q = bySymbol.get(s.symbol);
        const price = q ? toNum((q as any).regularMarketPrice) : null;
        const prevClose = q ? toNum((q as any).regularMarketPreviousClose) : null;
        if (!price || !prevClose || prevClose <= 0) return null;
        const changePercent = ((price - prevClose) / prevClose) * 100;
        if (!Number.isFinite(changePercent)) return null;
        return { sector: s.sector, changePercent };
      })
      .filter((x): x is SectorPerf => x !== null)
      .sort((a, b) => b.changePercent - a.changePercent);

    cache = { until: now + CACHE_MS, rows: computed };
    return NextResponse.json({ sectors: computed }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch {
    return NextResponse.json({ sectors: [] as SectorPerf[] }, { status: 200 });
  }
}

