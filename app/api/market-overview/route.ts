import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type OverviewItem = {
  symbol: string;
  name: string;
  category: string;
  price: number;
  changePercent: number;
};

const INSTRUMENTS: Array<{ symbol: string; yahoo: string; name: string; category: string }> = [
  { symbol: 'ES', yahoo: 'ESM26.CME', name: 'E-mini S&P 500', category: 'US Index Futures' },
  { symbol: 'NQ', yahoo: 'NQM26.CME', name: 'E-mini NASDAQ-100', category: 'US Index Futures' },
  { symbol: 'YM', yahoo: 'YMM26.CBT', name: 'E-mini Dow Jones', category: 'US Index Futures' },
  { symbol: 'RTY', yahoo: 'RTYM26.CME', name: 'E-mini Russell 2000', category: 'US Index Futures' },
  { symbol: 'DXY', yahoo: 'DX-Y.NYB', name: 'US Dollar Index', category: 'Macro' },
  { symbol: 'GC', yahoo: 'GC=F', name: 'Gold', category: 'Metals' },
  { symbol: 'SI', yahoo: 'SI=F', name: 'Silver', category: 'Metals' },
  { symbol: 'VTI', yahoo: 'VTI', name: 'US Total Market', category: 'Total Market' },
  { symbol: 'VXUS', yahoo: 'VXUS', name: 'International Market', category: 'International' },
  { symbol: 'EEM', yahoo: 'EEM', name: 'Emerging Markets', category: 'International' },
];

/** CME equity index + metals futures: use live 5m vs prior close when Globex session is open (e.g. Sun 6pm ET). */
const CME_LIVE_SESSION_SYMBOLS = new Set(['ES', 'NQ', 'YM', 'RTY', 'GC', 'SI']);

const RANGE_FOR_TIMEFRAME: Record<string, string> = {
  '1D': '5d',
  '1W': '1mo',
  '1M': '3mo',
  '1Y': '2y',
  YTD: 'ytd',
};

const LOOKBACK_DAYS: Record<string, number> = {
  '1D': 1,
  '1W': 5,
  '1M': 21,
  '1Y': 252,
  YTD: 400, // unused (YTD uses first datapoint as baseline)
};

const YAHOO_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'Mozilla/5.0 (compatible; PrimateResearch/1.0)',
} as const;

/** One daily bar after Yahoo alignment (timestamp + close share the same index). */
type ChartPoint = { t: number; close: number };

type ChartFetch = {
  points: ChartPoint[];
  /** Last trade from chart meta (often fresher than last daily close for active futures). */
  regularMarketPrice?: number;
};

function nyDateKey(tsSec: number): string {
  return new Date(tsSec * 1000).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

/** Yahoo sometimes emits two rows for the same NY session; keep the latest bar for that date. */
function dedupeDailyByNyDate(points: ChartPoint[]): ChartPoint[] {
  const byDay = new Map<string, ChartPoint>();
  for (const p of points) {
    const key = nyDateKey(p.t);
    const prev = byDay.get(key);
    if (!prev || p.t >= prev.t) byDay.set(key, p);
  }
  return [...byDay.values()].sort((a, b) => a.t - b.t);
}

/**
 * Build daily points with timestamps aligned to closes (do NOT drop nulls into a separate array —
 * that breaks trading-day offsets vs Yahoo).
 */
function parseChartResult0(result: Record<string, unknown> | undefined): ChartFetch {
  if (!result) return { points: [] };
  const ts = result.timestamp as number[] | undefined;
  const closeRaw = (result.indicators as { quote?: Array<{ close?: unknown }> } | undefined)?.quote?.[0]
    ?.close as unknown[] | undefined;
  const meta = result.meta as { regularMarketPrice?: number } | undefined;

  const raw: ChartPoint[] = [];
  if (Array.isArray(ts) && Array.isArray(closeRaw)) {
    for (let i = 0; i < ts.length; i++) {
      const c = closeRaw[i];
      if (typeof c === 'number' && Number.isFinite(c) && c > 0) {
        raw.push({ t: ts[i], close: c });
      }
    }
  }

  const points = dedupeDailyByNyDate(raw);
  const rmp = meta?.regularMarketPrice;
  return {
    points,
    regularMarketPrice:
      typeof rmp === 'number' && Number.isFinite(rmp) && rmp > 0 ? rmp : undefined,
  };
}

async function fetchDailyChartData(yahoo: string, range: string): Promise<ChartFetch> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahoo)}?interval=1d&range=${range}`;
  const res = await fetch(url, { cache: 'no-store', headers: YAHOO_HEADERS });
  if (!res.ok) return { points: [] };
  const body = (await res.json()) as { chart?: { result?: Array<Record<string, unknown>> } };
  return parseChartResult0(body?.chart?.result?.[0]);
}

/**
 * When Yahoo repeats the last daily close (e.g. weekend), last === second-to-last and % becomes 0.
 * Walk back to the previous distinct close so we show the last completed session's change.
 */
function getLastTwoDistinctCloses(closes: number[]): { current: number; ref: number } | null {
  const valid = closes.filter((n) => typeof n === 'number' && n > 0);
  if (valid.length < 2) return null;
  let i = valid.length - 1;
  const current = valid[i];
  let j = i - 1;
  while (j >= 0 && valid[j] === current) j--;
  if (j < 0) return null;
  return { current, ref: valid[j] };
}

/** CME Globex (ES/NQ/YM/RTY-style): Sun 6:00 PM ET – Fri ~5:00 PM ET. Saturday closed; Fri after 5pm ET closed. */
function isCmeGlobexLikelyOpen(): boolean {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now);
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  let hour = 0;
  let minute = 0;
  let weekday = 0;
  for (const p of parts) {
    if (p.type === 'hour') hour = parseInt(p.value, 10);
    if (p.type === 'minute') minute = parseInt(p.value, 10);
    if (p.type === 'weekday') weekday = weekdayMap[p.value] ?? 0;
  }
  const minutesFromMidnight = hour * 60 + minute;
  if (weekday === 6) return false; // Saturday
  if (weekday === 0) return minutesFromMidnight >= 18 * 60; // Sunday from 6 PM ET
  if (weekday === 5) return minutesFromMidnight < 17 * 60; // Friday until 5 PM ET
  return true; // Mon–Thu (maintenance window ~5–6 PM ignored)
}

/** Live last price vs chart previous close — updates when futures session runs (e.g. Sunday evening). */
async function fetchLiveDailyChangeFrom5m(yahoo: string): Promise<{ price: number; changePercent: number } | null> {
  for (const range of ['2d', '5d'] as const) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahoo)}?interval=5m&range=${range}`;
      const res = await fetch(url, { cache: 'no-store', headers: YAHOO_HEADERS });
      if (!res.ok) continue;
      const data = (await res.json()) as {
        chart?: { result?: Array<{ meta?: Record<string, number>; indicators?: { quote?: Array<{ close?: unknown }> } }> };
      };
      const result = data?.chart?.result?.[0];
      const meta = result?.meta;
      const quote = result?.indicators?.quote?.[0];
      const closeArr = quote?.close
        ? Array.isArray(quote.close)
          ? quote.close.filter((n: number) => n != null && typeof n === 'number' && n > 0)
          : []
        : [];
      const lastPrice =
        typeof meta?.regularMarketPrice === 'number' && meta.regularMarketPrice > 0
          ? meta.regularMarketPrice
          : closeArr.length > 0
            ? closeArr[closeArr.length - 1]
            : 0;
      const prevClose =
        typeof meta?.chartPreviousClose === 'number' && meta.chartPreviousClose > 0
          ? meta.chartPreviousClose
          : typeof meta?.previousClose === 'number' && meta.previousClose > 0
            ? meta.previousClose
            : 0;
      if (lastPrice <= 0 || prevClose <= 0) continue;
      const changePercent = ((lastPrice - prevClose) / prevClose) * 100;
      return { price: lastPrice, changePercent };
    } catch {
      continue;
    }
  }
  return null;
}

async function fetchDailyCloses(yahoo: string, range: string): Promise<number[]> {
  const { points } = await fetchDailyChartData(yahoo, range);
  return points.map((p) => p.close);
}

async function fetchItem1D(item: { symbol: string; yahoo: string; name: string; category: string }): Promise<OverviewItem | null> {
  if (CME_LIVE_SESSION_SYMBOLS.has(item.symbol) && isCmeGlobexLikelyOpen()) {
    const live = await fetchLiveDailyChangeFrom5m(item.yahoo);
    if (live) {
      return {
        symbol: item.symbol,
        name: item.name,
        category: item.category,
        price: live.price,
        changePercent: live.changePercent,
      };
    }
  }

  for (const range of ['5d', '1mo', '3mo'] as const) {
    const closes = await fetchDailyCloses(item.yahoo, range);
    const pair = getLastTwoDistinctCloses(closes);
    if (!pair) continue;
    return {
      symbol: item.symbol,
      name: item.name,
      category: item.category,
      price: pair.current,
      changePercent: ((pair.current - pair.ref) / pair.ref) * 100,
    };
  }
  return null;
}

async function fetchItem(item: { symbol: string; yahoo: string; name: string; category: string }, timeframe: string): Promise<OverviewItem | null> {
  if (timeframe === '1D') {
    return fetchItem1D(item);
  }

  const range = RANGE_FOR_TIMEFRAME[timeframe] || RANGE_FOR_TIMEFRAME['1D'];
  const lookback = LOOKBACK_DAYS[timeframe] || LOOKBACK_DAYS['1D'];
  const { points, regularMarketPrice } = await fetchDailyChartData(item.yahoo, range);
  if (points.length < 2) return null;

  const lastBar = points[points.length - 1];
  /** Futures: prefer meta last price when present so weekly % matches live quotes vs stale daily close. */
  const useLive =
    CME_LIVE_SESSION_SYMBOLS.has(item.symbol) &&
    typeof regularMarketPrice === 'number' &&
    Number.isFinite(regularMarketPrice) &&
    regularMarketPrice > 0;
  const current = useLive ? regularMarketPrice! : lastBar.close;

  const ref =
    timeframe === 'YTD'
      ? points[0].close
      : (() => {
          const refIdx = Math.max(0, points.length - 1 - lookback);
          return points[refIdx].close;
        })();

  if (!(current > 0) || !(ref > 0)) return null;

  return {
    symbol: item.symbol,
    name: item.name,
    category: item.category,
    price: current,
    changePercent: ((current - ref) / ref) * 100,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const timeframe = (searchParams.get('timeframe') || '1D').toUpperCase();
  try {
    const rows = await Promise.all(INSTRUMENTS.map((it) => fetchItem(it, timeframe)));
    const items = rows.filter((r): r is OverviewItem => r !== null);
    return NextResponse.json({ timeframe, items }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch {
    return NextResponse.json({ timeframe, items: [] as OverviewItem[] }, { status: 200 });
  }
}
