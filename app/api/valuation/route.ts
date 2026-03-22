import { NextResponse } from 'next/server';
import { VALUATION_INDICES } from '../../../data/valuation-indices';
import {
  computePeriodChanges,
  getFmpKey,
  mergeLatestQuarterlyWithTtm,
  normalizeFmpListResponse,
  parseKeyMetricsQuarterly,
  parseTtmResponse,
  type MetricPoint,
  type PeriodSnapshot,
  type TtmSnapshot,
} from '../../../lib/valuation-fmp';

export const revalidate = 300;

type IndexBlock = {
  symbol: string;
  name: string;
  etfName: string;
  blurb: string;
  ttm: TtmSnapshot | null;
  /** Quarterly series (ascending by date) — for charts and period baselines */
  history: MetricPoint[];
  periods: PeriodSnapshot[];
  fmpError: string | null;
};

const FMP_STABLE = 'https://financialmodelingprep.com/stable';
const FMP_V3 = 'https://financialmodelingprep.com/api/v3';

function fmpErrorMessage(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const msg = (data as { 'Error Message'?: string; error?: string })['Error Message'] ?? (data as { error?: string }).error;
  return typeof msg === 'string' ? msg : null;
}

/**
 * FMP returns 200 JSON with an error body, or non-OK with a body.
 * New API keys often require `/stable/...` — legacy `/api/v3/...` can return empty arrays.
 */
async function fetchFmpJson(url: string): Promise<{ data: unknown; httpStatus: number; ok: boolean }> {
  const res = await fetch(url, {
    next: { revalidate: 300 },
    headers: { Accept: 'application/json' },
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { data, httpStatus: res.status, ok: res.ok };
}

/** Try stable quarterly key-metrics, then legacy v3 path. */
async function fetchKeyMetricsQuarterly(symbol: string, apiKey: string): Promise<{ list: unknown[]; error: string | null }> {
  const enc = encodeURIComponent(symbol);
  const key = encodeURIComponent(apiKey);
  const candidates = [
    `${FMP_STABLE}/key-metrics?symbol=${enc}&period=quarter&limit=120&apikey=${key}`,
    `${FMP_V3}/key-metrics/${enc}?period=quarter&limit=120&apikey=${key}`,
  ];

  let lastError: string | null = null;
  for (const url of candidates) {
    const { data, ok, httpStatus } = await fetchFmpJson(url);
    const err = fmpErrorMessage(data);
    if (err) {
      lastError = err;
      continue;
    }
    if (!ok && httpStatus !== 200) {
      lastError = `HTTP ${httpStatus}`;
      continue;
    }
    const list = normalizeFmpListResponse(data);
    if (list.length > 0) return { list, error: null };
  }
  return { list: [], error: lastError };
}

/** Try stable TTM, then v3 path. */
async function fetchKeyMetricsTtm(symbol: string, apiKey: string): Promise<{ raw: unknown; error: string | null }> {
  const enc = encodeURIComponent(symbol);
  const key = encodeURIComponent(apiKey);
  const candidates = [
    `${FMP_STABLE}/key-metrics-ttm?symbol=${enc}&apikey=${key}`,
    `${FMP_V3}/key-metrics-ttm/${enc}?apikey=${key}`,
  ];

  let lastError: string | null = null;
  for (const url of candidates) {
    const { data, ok, httpStatus } = await fetchFmpJson(url);
    const err = fmpErrorMessage(data);
    if (err) {
      lastError = err;
      continue;
    }
    if (!ok && httpStatus !== 200) {
      lastError = `HTTP ${httpStatus}`;
      continue;
    }
    // Stable may return a bare object; v3 often returns a one-element array.
    if (parseTtmResponse(data) != null) {
      return { raw: data, error: null };
    }
  }
  return { raw: null, error: lastError };
}

async function fetchRatiosTtmPeg(symbol: string, apiKey: string): Promise<number | null> {
  const enc = encodeURIComponent(symbol);
  const key = encodeURIComponent(apiKey);
  const urls = [
    `${FMP_STABLE}/ratios-ttm?symbol=${enc}&apikey=${key}`,
    `${FMP_V3}/ratios-ttm/${enc}?apikey=${key}`,
  ];
  for (const url of urls) {
    const { data, ok } = await fetchFmpJson(url);
    if (!ok || fmpErrorMessage(data)) continue;
    const list = normalizeFmpListResponse(data);
    const row = (list[0] ?? data) as Record<string, unknown> | undefined;
    if (!row || typeof row !== 'object') continue;
    const peg =
      typeof row.priceEarningsToGrowthRatio === 'number'
        ? row.priceEarningsToGrowthRatio
        : typeof row.pegRatio === 'number'
          ? row.pegRatio
          : null;
    if (typeof peg === 'number' && Number.isFinite(peg)) return peg;
  }
  return null;
}

export async function GET() {
  const updatedAt = new Date().toISOString();
  const apiKey = getFmpKey();

  if (!apiKey) {
    return NextResponse.json({
      ok: true,
      configured: false,
      updatedAt,
      dataSource: 'none' as const,
      message:
        'Add FMP_API_KEY (Financial Modeling Prep — free tier available) to load live ETF valuation metrics. See .env.example.',
      indices: [] as IndexBlock[],
    });
  }

  const indices: IndexBlock[] = [];

  for (const meta of VALUATION_INDICES) {
    const sym = meta.symbol;

    const [qResult, tResult] = await Promise.all([
      fetchKeyMetricsQuarterly(sym, apiKey),
      fetchKeyMetricsTtm(sym, apiKey),
    ]);

    let fmpError: string | null = qResult.error ?? tResult.error ?? null;

    const history = parseKeyMetricsQuarterly(qResult.list);

    let ttm = parseTtmResponse(tResult.raw);
    if (ttm && (ttm.pegRatio == null || !Number.isFinite(ttm.pegRatio))) {
      const peg = await fetchRatiosTtmPeg(sym, apiKey);
      if (peg != null) ttm = { ...ttm, pegRatio: peg };
    }

    const latest = mergeLatestQuarterlyWithTtm(history, ttm);
    const periods = computePeriodChanges(history, latest);

    if (history.length === 0 && !ttm && !fmpError) {
      fmpError =
        'No key-metrics data returned for this symbol. Confirm your FMP plan includes ETF fundamentals, or try regenerating the API key. This app tries stable + legacy FMP endpoints.';
    }

    indices.push({
      symbol: meta.symbol,
      name: meta.name,
      etfName: meta.etfName,
      blurb: meta.blurb,
      ttm,
      history,
      periods,
      fmpError,
    });
  }

  const anyData = indices.some((i) => i.history.length > 0 || i.ttm != null);

  return NextResponse.json({
    ok: true,
    configured: true,
    updatedAt,
    dataSource: 'financialmodelingprep.com' as const,
    granularityNote:
      'Period changes use quarterly reported metrics from FMP; “current” blends TTM where available. Short horizons (1M) align to the nearest quarter-end before the cutoff — not daily mark-to-market.',
    indices,
    anyData,
  });
}
