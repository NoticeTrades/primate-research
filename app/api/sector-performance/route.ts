import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type TimeframeKey = '1D' | '1W' | '1M' | '3M' | 'YTD';

type SectorPerf = {
  sector: string;
  // 1D percent move (kept for backwards compatibility / sorting fallback).
  changePercent: number;
  // Full timeframe moves for the table (computed from Yahoo chart).
  perf?: Record<TimeframeKey, number>;
};

const CACHE_MS = 300_000; // ~5 minutes
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

async function fetchYahooChartDailyChangePercent(etfSymbol: string): Promise<number | null> {
  // Use Yahoo "chart" endpoint because it tends to contain the historical closes
  // even when the quote endpoint omits/change-nulls the fields we need.
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    etfSymbol
  )}?range=5d&interval=1d&includePrePost=false&events=div|split`;

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;

  const body = (await res.json()) as any;
  const closeArr: unknown[] =
    body?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ??
    body?.chart?.result?.[0]?.indicators?.adjclose?.[0]?.adjclose ??
    [];

  if (!Array.isArray(closeArr)) return null;

  const closes = closeArr
    .map((v: any) => (typeof v === 'number' && Number.isFinite(v) ? v : null))
    .filter((v: number | null): v is number => v !== null);

  if (closes.length < 2) return null;

  const prev = closes[closes.length - 2];
  const close = closes[closes.length - 1];
  if (!(prev > 0) || !(close > 0)) return null;

  const changePercent = ((close - prev) / prev) * 100;
  return Number.isFinite(changePercent) ? changePercent : null;
}

async function fetchYahooChartTimeframeChangePercents(
  etfSymbol: string
): Promise<Record<TimeframeKey, number> | null> {
  // Pull 1Y daily closes and derive % moves for each requested timeframe.
  // This avoids relying on Yahoo quote fields (which are blocked/empty in prod).
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    etfSymbol
  )}?range=1y&interval=1d&includePrePost=false&events=div|split`;

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;

  const body = (await res.json()) as any;
  const result = body?.chart?.result?.[0];
  const timestamps: unknown[] = result?.timestamp ?? [];
  const closeArr: unknown[] =
    result?.indicators?.quote?.[0]?.close ??
    result?.indicators?.adjclose?.[0]?.adjclose ??
    [];

  if (!Array.isArray(timestamps) || !Array.isArray(closeArr)) return null;
  if (timestamps.length !== closeArr.length || timestamps.length < 3) return null;

  const points: Array<{ tsMs: number; close: number }> = [];
  for (let i = 0; i < timestamps.length; i += 1) {
    const t = timestamps[i];
    const c = closeArr[i];
    if (typeof t !== 'number' || !Number.isFinite(t)) continue;
    if (typeof c !== 'number' || !Number.isFinite(c) || c <= 0) continue;
    points.push({ tsMs: t * 1000, close: c });
  }

  if (points.length < 2) return null;

  // Yahoo often pads weekends/holidays with the prior session's close as extra daily bars.
  // Comparing last vs second-to-last then yields 0% on Sat/Sun. Use last vs most recent
  // earlier day with a different close so 1D reflects the last real session move.
  const computeOneDayPercent = (pts: Array<{ tsMs: number; close: number }>): number | null => {
    if (pts.length < 2) return null;
    const last = pts[pts.length - 1];
    if (!(last.close > 0)) return null;
    for (let i = pts.length - 2; i >= 0; i -= 1) {
      const prev = pts[i];
      if (!(prev.close > 0)) continue;
      const relDiff = Math.abs(last.close - prev.close) / prev.close;
      if (relDiff > 1e-9) {
        return ((last.close - prev.close) / prev.close) * 100;
      }
    }
    return 0;
  };

  const nowMs = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const lastClose = points[points.length - 1].close;
  if (!(lastClose > 0)) return null;

  const findBaselineClose = (targetMs: number): number => {
    for (let i = points.length - 1; i >= 0; i -= 1) {
      if (points[i].tsMs <= targetMs) return points[i].close;
    }
    return points[0].close;
  };

  const oneWBase = findBaselineClose(nowMs - 7 * dayMs);
  const oneMBase = findBaselineClose(nowMs - 30 * dayMs);
  const threeMBase = findBaselineClose(nowMs - 90 * dayMs);

  const ytdStartMs = Date.UTC(new Date().getUTCFullYear(), 0, 1);
  const ytdBase = findBaselineClose(ytdStartMs);

  const calc = (base: number): number => {
    if (!(base > 0)) return 0;
    return ((lastClose - base) / base) * 100;
  };

  const oneD = computeOneDayPercent(points);

  return {
    '1D': oneD ?? 0,
    '1W': calc(oneWBase),
    '1M': calc(oneMBase),
    '3M': calc(threeMBase),
    YTD: calc(ytdBase),
  };
}

export async function GET(request: Request) {
  const now = Date.now();
  const { searchParams } = new URL(request.url);
  const sortTfRaw = (searchParams.get('sort') || '1D').toUpperCase();
  const allowedSort: TimeframeKey[] = ['1D', '1W', '1M', '3M', 'YTD'];
  const sortTf: TimeframeKey = allowedSort.includes(sortTfRaw as TimeframeKey) ? (sortTfRaw as TimeframeKey) : '1D';
  if (cache && cache.until > now && cache.rows.length > 0) {
    const sectors = [...cache.rows].sort((a, b) => {
      const av = a.perf?.[sortTf] ?? a.changePercent;
      const bv = b.perf?.[sortTf] ?? b.changePercent;
      return bv - av;
    });
    return NextResponse.json(
      { sectors, debug: { cached: true, sortTf, usedProvider: 'cache' } },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  }

  try {
    const debug: {
      yahoo: { fetchedSymbols?: number; computedCount?: number; error?: string; status?: number; ok?: boolean };
      stooq?: { attempted?: number; successCount?: number; errors?: string[] };
      chart?: { attempted?: number; successCount?: number };
      usedProvider: 'yahoo' | 'stooq' | 'yahoo+stooq' | 'yahoo-chart' | 'none';
    } = {
      yahoo: { ok: false },
      usedProvider: 'none',
    };

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
    // If Yahoo is blocked (401/403/etc), we still want to show sector performance via Stooq.
    let computed: SectorPerf[] = [];
    let yahooMap = new Map<string, number>();

    if (res.ok) {
      const body = (await res.json()) as { quoteResponse?: { result?: Array<Record<string, unknown>> } };
      const rows = body?.quoteResponse?.result;
      if (Array.isArray(rows)) {
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

        computed = sectorEtfs
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

        yahooMap = new Map<string, number>(computed.map((x) => [x.sector, x.changePercent]));
        debug.yahoo = {
          ok: true,
          fetchedSymbols: sectorEtfs.length,
          computedCount: computed.length,
        };
      } else {
        debug.yahoo = { ok: false, error: 'yahoo quote missing quoteResponse.result' };
      }
    } else {
      debug.yahoo = { ok: false, status: res.status, error: 'yahoo quote fetch failed' };
    }

    // Yahoo quote can sometimes omit fields for these ETFs; fill any missing
    // sectors by recomputing % move from Stooq daily CSV.
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
    let finalRows: SectorPerf[] = [
      ...computed,
      ...stooqPerf.filter((x) => !yahooMap.has(x.sector)),
    ].sort((a, b) => b.changePercent - a.changePercent);

    // If both Yahoo quote fields and Stooq CSV parsing failed, try Yahoo chart closes.
    if (finalRows.length === 0) {
      const attempted = sectorEtfs.length;
      const chartRows = await Promise.all(
        sectorEtfs.map(async (s) => {
          const perf = await fetchYahooChartTimeframeChangePercents(s.symbol);
          if (!perf) return null;
          return { sector: s.sector, changePercent: perf['1D'], perf } as SectorPerf;
        })
      );
      const chartPerf = chartRows.filter((x): x is SectorPerf => x !== null);
      debug.chart = { attempted, successCount: chartPerf.length };
      finalRows = chartPerf.sort((a, b) => {
        const av = a.perf?.[sortTf] ?? a.changePercent;
        const bv = b.perf?.[sortTf] ?? b.changePercent;
        return bv - av;
      });
      debug.usedProvider = finalRows.length > 0 ? 'yahoo-chart' : 'none';
    } else {
      debug.usedProvider =
        computed.length > 0 && stooqCount > 0
          ? 'yahoo+stooq'
          : computed.length > 0
            ? 'yahoo'
            : stooqCount > 0
              ? 'stooq'
              : 'none';
    }

    if (missingSectors.length > 0) {
      debug.stooq = { attempted: missingSectors.length, successCount: stooqCount };
    }

    // Avoid "getting stuck" caching an empty result.
    if (finalRows.length > 0) {
      cache = { until: now + CACHE_MS, rows: finalRows };
    }

    return NextResponse.json(
      { sectors: finalRows, debug },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { sectors: [] as SectorPerf[], debug: { usedProvider: 'none', error: msg } },
      { status: 200 }
    );
  }
}

