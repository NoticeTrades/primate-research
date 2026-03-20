import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type SectorPerf = {
  sector: string;
  changePercent: number;
};

const CACHE_MS = 60_000;
let cache: { until: number; rows: SectorPerf[] } | null = null;

function fmtStooqDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function parseCsvLine(line: string): string[] {
  return line.split(',');
}

async function fetchStooqDaily(stooqSymbol: string): Promise<{ price: number; prevClose: number; changePercent: number } | null> {
  const d2 = new Date();
  const d1 = new Date(Date.now() - 1000 * 60 * 60 * 24 * 35);
  const url = `https://stooq.com/q/l/?s=${encodeURIComponent(stooqSymbol)}&i=d&d1=${fmtStooqDate(d1)}&d2=${fmtStooqDate(d2)}`;

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;

  const csv = await res.text();
  const lines = csv
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  // Header: Date,Open,High,Low,Close,Volume
  if (lines.length < 3) return null;
  const dataLines = lines.slice(1);

  const last = dataLines[dataLines.length - 1];
  const prev = dataLines[dataLines.length - 2];

  const lastCols = parseCsvLine(last);
  const prevCols = parseCsvLine(prev);
  if (lastCols.length < 6 || prevCols.length < 6) return null;

  const close = parseFloat(lastCols[4]);
  const prevClose = parseFloat(prevCols[4]);
  if (!(close > 0) || !(prevClose > 0)) return null;

  const change = close - prevClose;
  const changePercent = (change / prevClose) * 100;
  if (!Number.isFinite(changePercent)) return null;

  return { price: close, prevClose, changePercent };
}

export async function GET() {
  const now = Date.now();
  if (cache && cache.until > now && cache.rows.length > 0) {
    return NextResponse.json(
      { sectors: cache.rows, debug: { cached: true } },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
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
    if (!Array.isArray(rows)) return NextResponse.json({ sectors: [] as SectorPerf[], debug: { yahoo: 'no-rows' } }, { status: 200 });

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
        const changePercentDirect = q ? toNum((q as any).regularMarketChangePercent) : null;
        const change = q ? toNum((q as any).regularMarketChange ?? (q as any).change) : null;

        // Prefer Yahoo's percent when present.
        let changePercent: number | null = changePercentDirect;

        // If percent isn't present, derive previous close from change when possible.
        if (changePercent == null && price != null && change != null) {
          const derivedPrev = price - change;
          if (derivedPrev > 0) changePercent = (change / derivedPrev) * 100;
        }

        // Last fallback: if we do have prevClose, compute from price + prevClose.
        if (changePercent == null && price != null && prevClose != null && prevClose > 0) {
          changePercent = ((price - prevClose) / prevClose) * 100;
        }

        if (changePercent == null || !Number.isFinite(changePercent)) return null;
        return { sector: s.sector, changePercent };
      })
      .filter((x): x is SectorPerf => x !== null)
      .sort((a, b) => b.changePercent - a.changePercent);

    const debug: {
      yahoo: { fetchedSymbols: number; computedCount: number };
      stooq?: { attempted: number; successCount: number };
      usedProvider: 'yahoo' | 'stooq' | 'none';
      cached?: boolean;
    } = {
      yahoo: { fetchedSymbols: sectorEtfs.length, computedCount: computed.length },
      usedProvider: computed.length > 0 ? 'yahoo' : 'none',
    };

    // Yahoo quote can sometimes omit fields for these ETFs; if that happens,
    // fall back to Stooq daily CSV for each ETF and recompute % move.
    let finalRows = computed;
    if (finalRows.length === 0) {
      const stooqRows = await Promise.all(
        sectorEtfs.map(async (s) => {
          // Stooq uses lowercase tickers with .us suffix for US-listed ETFs.
          const stooqSymbol = `${s.symbol.toLowerCase()}.us`;
          const daily = await fetchStooqDaily(stooqSymbol);
          if (!daily) return null;
          return { sector: s.sector, changePercent: daily.changePercent } as SectorPerf;
        })
      );

      const stooqSuccess = stooqRows.filter((x): x is SectorPerf => x !== null);
      finalRows = stooqSuccess.sort((a, b) => b.changePercent - a.changePercent);
      debug.stooq = { attempted: sectorEtfs.length, successCount: stooqSuccess.length };
      debug.usedProvider = finalRows.length > 0 ? 'stooq' : 'none';
    }

    // Avoid "getting stuck" caching an empty result.
    if (finalRows.length > 0) {
      cache = { until: now + CACHE_MS, rows: finalRows };
    }

    return NextResponse.json({ sectors: finalRows, debug }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch {
    return NextResponse.json({ sectors: [] as SectorPerf[] }, { status: 200 });
  }
}

