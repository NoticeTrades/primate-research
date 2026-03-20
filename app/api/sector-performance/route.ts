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

  // Header: Date,Open,High,Low,Close,Volume (sometimes other columns can appear)
  if (lines.length < 3) return null;
  const headerCols = parseCsvLine(lines[0]).map((c) => c.trim());
  const closeIdx = headerCols.findIndex((c) => c.toLowerCase() === 'close');
  if (closeIdx < 0) return null;

  const validRows: number[] = [];
  for (const line of lines.slice(1)) {
    const cols = parseCsvLine(line);
    if (cols.length <= closeIdx) continue;
    const close = parseFloat(cols[closeIdx] ?? '');
    if (Number.isFinite(close) && close > 0) validRows.push(close);
  }

  if (validRows.length < 2) return null;
  const prevClose = validRows[validRows.length - 2];
  const close = validRows[validRows.length - 1];
  const change = close - prevClose;
  const changePercent = (change / prevClose) * 100;
  if (!Number.isFinite(changePercent)) return null;

  return { price: close, prevClose, changePercent };
}

function stooqCandidatesFor(etfSymbol: string): string[] {
  const lower = etfSymbol.toLowerCase();
  const upper = etfSymbol.toUpperCase();
  // Try common stooq formats.
  return Array.from(new Set([`${lower}.us`, `${upper}.US`, lower, upper]));
}

async function fetchStooqDailyAny(etfSymbol: string): Promise<{ price: number; prevClose: number; changePercent: number } | null> {
  for (const candidate of stooqCandidatesFor(etfSymbol)) {
    try {
      const daily = await fetchStooqDaily(candidate);
      if (daily) return daily;
    } catch {
      // continue to next candidate
    }
  }
  return null;
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

    // Yahoo quote can sometimes omit fields for these ETFs; fill any missing
    // sectors by recomputing % move from Stooq daily CSV.
    const yahooMap = new Map<string, number>(computed.map((x) => [x.sector, x.changePercent]));
    const missingSectors = sectorEtfs.filter((s) => !yahooMap.has(s.sector));

    let stooqCount = 0;
    const stooqRows = await Promise.all(
      missingSectors.map(async (s) => {
        const daily = await fetchStooqDailyAny(s.symbol);
        if (!daily) return null;
        stooqCount += 1;
        return { sector: s.sector, changePercent: daily.changePercent } as SectorPerf;
      })
    );

    const stooqPerf = stooqRows.filter((x): x is SectorPerf => x !== null);
    const finalRows = [
      ...computed,
      ...stooqPerf.filter((x) => !yahooMap.has(x.sector)),
    ].sort((a, b) => b.changePercent - a.changePercent);

    if (missingSectors.length > 0) {
      debug.stooq = { attempted: missingSectors.length, successCount: stooqCount };
    }
    debug.usedProvider =
      computed.length > 0 && stooqCount > 0 ? 'yahoo+stooq' : computed.length > 0 ? 'yahoo' : stooqCount > 0 ? 'stooq' : 'none';

    // Avoid "getting stuck" caching an empty result.
    if (finalRows.length > 0) {
      cache = { until: now + CACHE_MS, rows: finalRows };
    }

    return NextResponse.json(
      { sectors: finalRows, debug },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch {
    return NextResponse.json({ sectors: [] as SectorPerf[] }, { status: 200 });
  }
}

