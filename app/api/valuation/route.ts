import { NextResponse } from 'next/server';
import { VALUATION_INDICES } from '../../../data/valuation-indices';
import {
  computePeriodChanges,
  getFmpKey,
  mergeLatestQuarterlyWithTtm,
  normalizeFmpListResponse,
  parseFmpApiError,
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

/** Current FMP APIs only — `/api/v3/` legacy routes are disabled for accounts created after Aug 2025. */
const FMP_STABLE = 'https://financialmodelingprep.com/stable';

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

async function fetchKeyMetricsQuarterly(symbol: string, apiKey: string): Promise<{ list: unknown[]; error: string | null }> {
  const enc = encodeURIComponent(symbol);
  const key = encodeURIComponent(apiKey);
  const url = `${FMP_STABLE}/key-metrics?symbol=${enc}&period=quarter&limit=120&apikey=${key}`;
  const { data, ok, httpStatus } = await fetchFmpJson(url);
  const err = parseFmpApiError(data);
  if (err) return { list: [], error: err };
  if (!ok && httpStatus !== 200) return { list: [], error: `HTTP ${httpStatus}` };
  const list = normalizeFmpListResponse(data);
  return { list, error: null };
}

async function fetchKeyMetricsTtm(symbol: string, apiKey: string): Promise<{ raw: unknown; error: string | null }> {
  const enc = encodeURIComponent(symbol);
  const key = encodeURIComponent(apiKey);
  const url = `${FMP_STABLE}/key-metrics-ttm?symbol=${enc}&apikey=${key}`;
  const { data, ok, httpStatus } = await fetchFmpJson(url);
  const err = parseFmpApiError(data);
  if (err) return { raw: null, error: err };
  if (!ok && httpStatus !== 200) return { raw: null, error: `HTTP ${httpStatus}` };
  if (parseTtmResponse(data) != null) return { raw: data, error: null };
  return { raw: null, error: null };
}

async function fetchRatiosTtmPeg(symbol: string, apiKey: string): Promise<number | null> {
  const enc = encodeURIComponent(symbol);
  const key = encodeURIComponent(apiKey);
  const url = `${FMP_STABLE}/ratios-ttm?symbol=${enc}&apikey=${key}`;
  const { data, ok } = await fetchFmpJson(url);
  if (!ok || parseFmpApiError(data)) return null;
  const list = normalizeFmpListResponse(data);
  const row = (list[0] ?? data) as Record<string, unknown> | undefined;
  if (!row || typeof row !== 'object') return null;
  const peg =
    typeof row.priceEarningsToGrowthRatio === 'number'
      ? row.priceEarningsToGrowthRatio
      : typeof row.pegRatio === 'number'
        ? row.pegRatio
        : null;
  return typeof peg === 'number' && Number.isFinite(peg) ? peg : null;
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
        'No key-metrics data returned for this symbol. Confirm your FMP plan includes ETF fundamentals, or check symbol coverage in the FMP stable API docs.';
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
    dataSource: 'financialmodelingprep.com/stable' as const,
    granularityNote:
      'Uses FMP stable endpoints only (legacy /api/v3 is not called). Period changes use quarterly metrics; “current” blends TTM where available.',
    indices,
    anyData,
  });
}
