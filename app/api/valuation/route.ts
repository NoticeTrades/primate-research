import { NextResponse } from 'next/server';
import { VALUATION_INDICES } from '../../../data/valuation-indices';
import { fetchFreeEtfValuationSnapshot } from '../../../lib/free-valuation-snapshot';
import {
  computePeriodChanges,
  explainFmpResponseError,
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
  history: MetricPoint[];
  periods: PeriodSnapshot[];
  fmpError: string | null;
};

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
  const apiErr = parseFmpApiError(data);
  if (apiErr) return { list: [], error: explainFmpResponseError(httpStatus, ok, data) };
  if (!ok || httpStatus !== 200) return { list: [], error: explainFmpResponseError(httpStatus, ok, data) };
  const list = normalizeFmpListResponse(data);
  return { list, error: null };
}

async function fetchKeyMetricsTtm(symbol: string, apiKey: string): Promise<{ raw: unknown; error: string | null }> {
  const enc = encodeURIComponent(symbol);
  const key = encodeURIComponent(apiKey);
  const url = `${FMP_STABLE}/key-metrics-ttm?symbol=${enc}&apikey=${key}`;
  const { data, ok, httpStatus } = await fetchFmpJson(url);
  const apiErr = parseFmpApiError(data);
  if (apiErr) return { raw: null, error: explainFmpResponseError(httpStatus, ok, data) };
  if (!ok || httpStatus !== 200) return { raw: null, error: explainFmpResponseError(httpStatus, ok, data) };
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

async function buildIndicesFromFmp(apiKey: string): Promise<{
  indices: IndexBlock[];
  anyData: boolean;
  fmpPaymentRequired: boolean;
}> {
  const indices: IndexBlock[] = [];

  for (const meta of VALUATION_INDICES) {
    const sym = meta.symbol;
    const [qResult, tResult] = await Promise.all([
      fetchKeyMetricsQuarterly(sym, apiKey),
      fetchKeyMetricsTtm(sym, apiKey),
    ]);

    const errs = [qResult.error, tResult.error].filter((x): x is string => Boolean(x));
    let fmpError: string | null = errs.length ? [...new Set(errs)].join(' | ') : null;

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
  const fmpPaymentRequired = indices.some((i) =>
    /402|Payment Required|no API credits|paid tier|not included in your current subscription/i.test(i.fmpError ?? '')
  );

  return { indices, anyData, fmpPaymentRequired };
}

async function buildIndicesFromYahoo(): Promise<IndexBlock[]> {
  const out: IndexBlock[] = [];
  for (let i = 0; i < VALUATION_INDICES.length; i++) {
    const meta = VALUATION_INDICES[i];
    if (i > 0) await new Promise((r) => setTimeout(r, 200));
    const ttm = await fetchFreeEtfValuationSnapshot(meta.symbol);
    const history: MetricPoint[] = [];
    const latest = mergeLatestQuarterlyWithTtm(history, ttm);
    const periods = computePeriodChanges(history, latest);
    out.push({
      symbol: meta.symbol,
      name: meta.name,
      etfName: meta.etfName,
      blurb: meta.blurb,
      ttm,
      history,
      periods,
      fmpError: ttm
        ? null
        : 'Could not load metrics (Yahoo Finance may block server requests; add ALPHA_VANTAGE_API_KEY in Vercel as a free backup).',
    });
  }
  return out;
}

export async function GET() {
  const updatedAt = new Date().toISOString();
  const apiKey = getFmpKey();

  /** Try FMP first when a key is configured */
  if (apiKey) {
    const fmp = await buildIndicesFromFmp(apiKey);
    const fmpWorks = fmp.anyData && !fmp.fmpPaymentRequired;

    if (fmpWorks) {
      const hasHistoricalMultiples = fmp.indices.some((i) => i.history.length > 0);
      return NextResponse.json({
        ok: true,
        configured: true,
        updatedAt,
        dataSource: 'financialmodelingprep.com/stable' as const,
        granularityNote:
          'FMP stable: period changes use quarterly metrics; “current” blends TTM where available. Short horizons align to quarter-end, not daily.',
        fmpPaymentRequired: false,
        fmpBillingHint: null,
        yahooFallback: false,
        yahooNote: null,
        hasHistoricalMultiples,
        indices: fmp.indices,
        anyData: fmp.anyData,
      });
    }

    /** 402 / empty → free Yahoo Finance snapshots */
    const yahooIndices = await buildIndicesFromYahoo();
    const anyData = yahooIndices.some((i) => i.ttm != null || i.history.length > 0);
    const hasHistoricalMultiples = yahooIndices.some((i) => i.history.length > 0);

    return NextResponse.json({
      ok: true,
      configured: true,
      updatedAt,
      dataSource: 'yahoo_finance' as const,
      granularityNote:
        'Live ratios: Yahoo Finance when reachable, else Alpha Vantage OVERVIEW if ALPHA_VANTAGE_API_KEY is set (recommended on Vercel — Yahoo often blocks servers). Historical P/E tables need a paid FMP plan.',
      fmpPaymentRequired: false,
      fmpBillingHint: null,
      yahooFallback: true,
      yahooNote:
        fmp.fmpPaymentRequired || !fmp.anyData
          ? 'FMP Key Metrics are not available on your current FMP tier (or returned no data). Using free Yahoo Finance and/or Alpha Vantage (set ALPHA_VANTAGE_API_KEY in Vercel if Yahoo blocks this host). Upgrade FMP later for quarterly history and period tables.'
          : 'Using free Yahoo / Alpha Vantage for ETF valuation snapshots.',
      hasHistoricalMultiples,
      indices: yahooIndices,
      anyData,
    });
  }

  /** No FMP key — Yahoo only */
  const yahooIndices = await buildIndicesFromYahoo();
  const anyData = yahooIndices.some((i) => i.ttm != null);
  const hasHistoricalMultiples = false;

  return NextResponse.json({
    ok: true,
    configured: true,
    updatedAt,
    dataSource: 'yahoo_finance' as const,
    granularityNote:
      'Live ratios from Yahoo Finance and/or Alpha Vantage (add free ALPHA_VANTAGE_API_KEY if Yahoo blocks servers). Optional FMP_API_KEY for quarterly P/E history and period tables.',
    fmpPaymentRequired: false,
    fmpBillingHint: null,
    yahooFallback: true,
    yahooNote:
      'No FMP_API_KEY — using free Yahoo Finance + optional Alpha Vantage (ALPHA_VANTAGE_API_KEY) for ETF metrics. Add FMP later for historical multiples tables.',
    hasHistoricalMultiples,
    indices: yahooIndices,
    anyData,
  });
}
