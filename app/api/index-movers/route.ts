import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type StockMover = {
  ticker: string;
  price: number;
  changePercent: number;
  change: number;
  volume: number;
};

// Free provider: Stooq (no API key). We approximate "index movers" by using a small
// universe of liquid, index-representative tickers and computing daily % moves.
const MOVERS_CACHE_MS = 30_000;
const moversCache = new Map<string, { until: number; gainers: StockMover[]; losers: StockMover[]; source: string }>();

const STQ_UNIVERSE: Record<string, string[]> = {
  NQ: [
    'aapl.us',
    'msft.us',
    'nvda.us',
    'amzn.us',
    'meta.us',
    'goog.us',
    'tsla.us',
    'avgo.us',
    'cost.us',
    'amd.us',
    'adbe.us',
    'qcom.us',
    'intc.us',
    'csco.us',
    'orcl.us',
    'mu.us',
  ],
  ES: [
    'aapl.us',
    'msft.us',
    'nvda.us',
    'amzn.us',
    'meta.us',
    'goog.us',
    'jpm.us',
    'xom.us',
    'lly.us',
    'pg.us',
    'v.us',
    'unh.us',
    'ma.us',
    'ko.us',
    'hd.us',
  ],
  YM: [
    'aapl.us',
    'msft.us',
    'jpm.us',
    'unh.us',
    'v.us',
    'hd.us',
    'gs.us',
    'mcd.us',
    'cat.us',
    'ibm.us',
    'mmm.us',
    'dis.us',
    'wmt.us',
    'nke.us',
    'ko.us',
    'pg.us',
  ],
  RTY: [
    'smci.us',
    'fslr.us',
    'celh.us',
    'afrm.us',
    'sofi.us',
    'crox.us',
    'pltr.us',
    'rkbl.us',
    'upst.us',
    'rivn.us',
    'app.us',
    'iot.us',
    'duol.us',
    'onon.us',
    'sound.us',
  ],
  // Metals / FX / others aren't supported by this approximate approach yet.
  DXY: [],
  GC: [],
  SI: [],
  CL: [],
  FTSE: [],
  GER40: [],
  DAX: [],
};

// Fallback/no-key provider: Yahoo quote endpoint.
// We approximate "index movers" by selecting liquid index-representative tickers.
const YH_UNIVERSE: Record<string, string[]> = {
  NQ: [
    'MSFT',
    'AAPL',
    'NVDA',
    'AMZN',
    'META',
    'GOOGL',
    'GOOG',
    'TSLA',
    'AVGO',
    'ADBE',
    'AMD',
    'CSCO',
    'QCOM',
    'INTC',
    'NFLX',
    'ORCL',
    'MU',
    'PLTR',
  ],
  ES: [
    'MSFT',
    'AAPL',
    'NVDA',
    'AMZN',
    'META',
    'GOOGL',
    'JPM',
    'XOM',
    'LLY',
    'V',
    'UNH',
    'PG',
    'MA',
    'HD',
    'KO',
    'LLY',
    'NKE',
    'CRM',
    'CAT',
  ],
  YM: [
    'IBM',
    'HD',
    'CAT',
    'JNJ',
    'JPM',
    'KO',
    'MCD',
    'DIS',
    'V',
    'WMT',
    'PG',
    'MRK',
    'NKE',
    'INTC',
    'BA',
    'AXP',
    'GS',
    'MMM',
  ],
  RTY: [
    'PLTR',
    'SOFI',
    'UPST',
    'AFRM',
    'RIVN',
    'CROX',
    'CELH',
    'DKNG',
    'SEDG',
    'DOCN',
    'FSLR',
    'SOUN',
    'DUOL',
    'ONON',
    'APP',
    'IOT',
    'GTLB',
  ],
  DAX: ['SAP.DE', 'SIE.DE', 'ALV.DE', 'BAS.DE', 'BMW.DE', 'IFX.DE', 'BAYN.DE', 'DBK.DE', 'ADS.DE'],
  GER40: ['SAP.DE', 'SIE.DE', 'ALV.DE', 'BAS.DE', 'BMW.DE', 'IFX.DE', 'BAYN.DE', 'DBK.DE', 'ADS.DE'],
  FTSE: ['AZN.L', 'HSBA.L', 'SHEL.L', 'BP.L', 'GSK.L', 'ULVR.L', 'RIO.L', 'LSEG.L', 'BARC.L'],
  DXY: [],
  GC: [],
  SI: [],
  CL: [],
};

function parseNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return 0;
  const cleaned = value.replace(/%/g, '').trim();
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function fmtStooqDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function parseCsvLine(line: string): string[] {
  return line.split(',');
}

function splitGainersLosers(
  movers: StockMover[],
  limit: number
): { gainers: StockMover[]; losers: StockMover[] } | null {
  if (movers.length === 0) return null;

  // "Top gainers" means highest changePercent values, even if they are all negative.
  const gainers = [...movers].sort((a, b) => b.changePercent - a.changePercent).slice(0, limit);

  // "Top losers" means lowest changePercent values.
  const losers = [...movers].sort((a, b) => a.changePercent - b.changePercent).slice(0, limit);

  return { gainers, losers };
}

async function fetchFmpUniverseMovers(universe: string[], limit: number): Promise<{ gainers: StockMover[]; losers: StockMover[] } | null> {
  const apiKey = process.env.FMP_API_KEY || process.env.FINANCIAL_MODELING_PREP_API_KEY || 'demo';
  const symbols = universe
    .map((s) => s.replace(/\.[a-z]+$/i, '').toUpperCase())
    .filter(Boolean)
    .slice(0, 60);
  if (symbols.length === 0) return null;

  const url = `https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(symbols.join(','))}?apikey=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  const data = (await res.json()) as Array<Record<string, unknown>> | Record<string, unknown>;
  const rows = Array.isArray(data) ? data : Array.isArray((data as any)?.quoteResponse?.result) ? (data as any).quoteResponse.result : [];
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const movers: StockMover[] = rows
    .map((r) => {
      const ticker = String((r as any).symbol || (r as any).name || '').trim().toUpperCase();
      if (!ticker) return null;
      const price = parseNumber((r as any).price);
      const changePercent = parseNumber((r as any).changesPercentage ?? (r as any).changePercentage);
      const change = parseNumber((r as any).change);
      const volume = parseNumber((r as any).volume);
      if (!Number.isFinite(changePercent)) return null;
      return { ticker, price, changePercent, change, volume };
    })
    .filter((x): x is StockMover => x !== null);

  if (movers.length === 0) return null;
  return splitGainersLosers(movers, limit);
}

async function fetchStooqDaily(stooqSymbol: string): Promise<StockMover | null> {
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

  // Header: Date,Open,High,Low,Close,Volume (column order may vary)
  if (lines.length < 3) return null;
  const headerCols = parseCsvLine(lines[0]).map((c) => c.trim());
  const closeIdx = headerCols.findIndex((c) => c.toLowerCase() === 'close');
  const volumeIdx = headerCols.findIndex((c) => c.toLowerCase() === 'volume');
  if (closeIdx < 0) return null;

  const validRows: Array<{ close: number; volume: number }> = [];
  for (const line of lines.slice(1)) {
    const cols = parseCsvLine(line);
    if (cols.length <= closeIdx) continue;
    const close = parseFloat(cols[closeIdx] ?? '');
    if (!Number.isFinite(close) || !(close > 0)) continue;
    const volume = volumeIdx >= 0 ? parseFloat(cols[volumeIdx] ?? '0') : 0;
    validRows.push({ close, volume: Number.isFinite(volume) ? volume : 0 });
  }

  if (validRows.length < 2) return null;
  const prevClose = validRows[validRows.length - 2].close;
  const close = validRows[validRows.length - 1].close;
  const volume = validRows[validRows.length - 1].volume;
  if (!(close > 0) || !(prevClose > 0)) return null;

  const change = close - prevClose;
  const changePercent = (change / prevClose) * 100;
  const ticker = stooqSymbol.replace(/\.[a-z]+$/i, '').toUpperCase();

  return {
    ticker,
    price: close,
    changePercent,
    change,
    volume: Number.isFinite(volume) ? volume : 0,
  };
}

async function fetchStooqMovers(index: string, limit: number): Promise<{ gainers: StockMover[]; losers: StockMover[] } | null> {
  const universe = STQ_UNIVERSE[index] || [];
  if (universe.length === 0) return null;

  const movers: StockMover[] = [];
  const chunkSize = 6;
  for (let i = 0; i < universe.length; i += chunkSize) {
    const slice = universe.slice(i, i + chunkSize);
    const results = await Promise.all(slice.map((s) => fetchStooqDaily(s)));
    for (const r of results) if (r) movers.push(r);
  }

  if (movers.length === 0) return null;
  return splitGainersLosers(movers, limit);
}

async function fetchYahooUniverseMovers(index: string, limit: number): Promise<{ gainers: StockMover[]; losers: StockMover[] } | null> {
  const universe = YH_UNIVERSE[index] || [];
  if (universe.length === 0) return null;

  // Keep request length reasonable.
  const symbols = universe.slice(0, 60);
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(','))}`;
  const res = await fetch(url, {
    cache: 'no-store',
    headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; PrimateResearch/1.0)' },
  });
  if (!res.ok) return null;

  const data = await res.json();
  const rows = data?.quoteResponse?.result;
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const toNum = (v: unknown): number | null => {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string') {
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };

  const movers: StockMover[] = rows
    .map((r: any) => {
      const ticker = String(r?.symbol || '').trim().toUpperCase();
      if (!ticker) return null;

      const price = toNum(r?.regularMarketPrice ?? r?.price);
      if (price == null || price <= 0) return null;

      const changePercent = toNum(r?.regularMarketChangePercent ?? r?.changePercent);
      const volume = toNum(r?.regularMarketVolume ?? r?.volume) ?? 0;

      const prevCloseMaybe = toNum(r?.regularMarketPreviousClose ?? r?.previousClose);
      const changeMaybe = toNum(r?.regularMarketChange ?? r?.change);

      let computedChange: number | null = changeMaybe;
      // Derive change from prevClose if percent is missing and change is missing.
      if (computedChange == null) {
        if (prevCloseMaybe != null && prevCloseMaybe > 0) computedChange = price - prevCloseMaybe;
        else return null;
      }

      let finalChangePercent: number | null = changePercent;
      if (finalChangePercent == null) {
        const derivedPrev = prevCloseMaybe != null && prevCloseMaybe > 0 ? prevCloseMaybe : price - computedChange;
        if (derivedPrev > 0) finalChangePercent = (computedChange / derivedPrev) * 100;
      }

      if (finalChangePercent == null || !Number.isFinite(finalChangePercent)) return null;

      return {
        ticker,
        price,
        changePercent: finalChangePercent,
        change: computedChange,
        volume: Number.isFinite(volume) ? volume : 0,
      };
    })
    .filter((x: StockMover | null): x is StockMover => x !== null);

  if (movers.length === 0) return null;
  return splitGainersLosers(movers, limit);
}

async function fetchYahooChartDailyMover(ticker: string): Promise<StockMover | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    ticker
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

  const prevClose = closes[closes.length - 2];
  const close = closes[closes.length - 1];
  if (!(prevClose > 0) || !(close > 0)) return null;

  const change = close - prevClose;
  const changePercent = (change / prevClose) * 100;

  if (!Number.isFinite(changePercent)) return null;

  return {
    ticker: ticker.toUpperCase(),
    price: close,
    changePercent,
    change,
    volume: 0,
  };
}

async function fetchYahooChartUniverseMovers(
  index: string,
  limit: number
): Promise<{ gainers: StockMover[]; losers: StockMover[] } | null> {
  const universe = YH_UNIVERSE[index] || [];
  if (universe.length === 0) return null;

  // Limit request length.
  const symbols = universe.slice(0, 40);

  const results = await Promise.all(symbols.map((t) => fetchYahooChartDailyMover(t)));
  const movers = results.filter((x): x is StockMover => x !== null);
  if (movers.length === 0) return null;

  return splitGainersLosers(movers, limit);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const index = (searchParams.get('index') || 'index').toUpperCase();
  const limit = Math.min(5, Math.max(1, parseInt(searchParams.get('limit') || '5', 10) || 5));

  try {
    const cacheKey = `${index}:${limit}`;
    const now = Date.now();
    const cached = moversCache.get(cacheKey);
    if (cached && cached.until > now) {
      return NextResponse.json(
        { index, source: cached.source, gainers: cached.gainers, losers: cached.losers },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    const debug: { providers: string[] } = { providers: [] };

    // First attempt: no-key Yahoo quote-based universe movers.
    const yahooMovers = await fetchYahooUniverseMovers(index, limit);
    if (yahooMovers) {
      debug.providers.push('yahoo-universe');
      moversCache.set(cacheKey, {
        until: now + MOVERS_CACHE_MS,
        gainers: yahooMovers.gainers,
        losers: yahooMovers.losers,
        source: 'yahoo-universe',
      });
      return NextResponse.json(
        { index, source: 'yahoo-universe', gainers: yahooMovers.gainers, losers: yahooMovers.losers, debug },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    debug.providers.push('yahoo-universe-failed');
    const stooqMovers = await fetchStooqMovers(index, limit);
    if (stooqMovers) {
      debug.providers.push('stooq-universe');
      moversCache.set(cacheKey, {
        until: now + MOVERS_CACHE_MS,
        gainers: stooqMovers.gainers,
        losers: stooqMovers.losers,
        source: 'stooq-universe',
      });
      return NextResponse.json(
        { index, source: 'stooq-universe', gainers: stooqMovers.gainers, losers: stooqMovers.losers, debug },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    debug.providers.push('stooq-universe-failed');
    // Third attempt: Yahoo chart (historical close-to-close % move).
    const chartMovers = await fetchYahooChartUniverseMovers(index, limit);
    if (chartMovers) {
      debug.providers.push('yahoo-chart-universe');
      moversCache.set(cacheKey, {
        until: now + MOVERS_CACHE_MS,
        gainers: chartMovers.gainers,
        losers: chartMovers.losers,
        source: 'yahoo-chart-universe',
      });
      return NextResponse.json(
        { index, source: 'yahoo-chart-universe', gainers: chartMovers.gainers, losers: chartMovers.losers, debug },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    // Fallback: try FMP quote-based universe if Stooq returned empty.
    const fmpFallback = await fetchFmpUniverseMovers(STQ_UNIVERSE[index] || [], limit);
    if (fmpFallback) {
      debug.providers.push('fmp-universe-fallback');
      moversCache.set(cacheKey, {
        until: now + MOVERS_CACHE_MS,
        gainers: fmpFallback.gainers,
        losers: fmpFallback.losers,
        source: 'fmp-universe-fallback',
      });
      return NextResponse.json(
        { index, source: 'fmp-universe-fallback', gainers: fmpFallback.gainers, losers: fmpFallback.losers, debug },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    debug.providers.push('all-failed');
    return NextResponse.json(
      { index, source: 'unavailable', gainers: [], losers: [], debug },
      { status: 200, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch {
    return NextResponse.json({ error: 'Failed to fetch movers' }, { status: 500 });
  }
}

