import { NextResponse } from 'next/server';
import { VALUATION_INDICES } from '../../../data/valuation-indices';
import { STATIC_VALUATION_BASELINE } from '../../../data/valuation-static';
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
        : 'Could not load free metrics from Yahoo / ETFDB / Alpha Vantage. If this persists on Vercel, set ALPHA_VANTAGE_API_KEY as backup.',
    });
  }
  return out;
}

function buildIndicesFromStaticBaseline(): IndexBlock[] {
  return VALUATION_INDICES.map((meta) => {
    const ttm = STATIC_VALUATION_BASELINE[meta.symbol] ?? null;
    const history: MetricPoint[] = [];
    const latest = mergeLatestQuarterlyWithTtm(history, ttm);
    const periods = computePeriodChanges(history, latest);
    return {
      symbol: meta.symbol,
      name: meta.name,
      etfName: meta.etfName,
      blurb: meta.blurb,
      ttm,
      history,
      periods,
      fmpError: ttm ? 'Loaded static baseline snapshot (live provider unavailable).' : 'No baseline snapshot found.',
    };
  });
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
    let anyData = yahooIndices.some((i) => i.ttm != null || i.history.length > 0);
    const indicesForResponse = anyData ? yahooIndices : buildIndicesFromStaticBaseline();
    if (!anyData) anyData = indicesForResponse.some((i) => i.ttm != null);
    const hasHistoricalMultiples = yahooIndices.some((i) => i.history.length > 0);

    return NextResponse.json({
      ok: true,
      configured: true,
      updatedAt,
      dataSource: anyData && indicesForResponse === yahooIndices ? 'yahoo_finance' as const : 'static_baseline' as const,
      granularityNote:
        'Live ratios: Yahoo Finance when reachable, else ETFDB public valuation pages, else Alpha Vantage OVERVIEW if ALPHA_VANTAGE_API_KEY is set. Historical P/E tables need a paid FMP plan.',
      fmpPaymentRequired: false,
      fmpBillingHint: null,
      yahooFallback: true,
      yahooNote:
        fmp.fmpPaymentRequired || !fmp.anyData
          ? anyData && indicesForResponse === yahooIndices
            ? 'FMP Key Metrics are not available on your current FMP tier (or returned no data). Using free Yahoo, ETFDB, and/or Alpha Vantage (set ALPHA_VANTAGE_API_KEY in Vercel if Yahoo is blocked). Upgrade FMP later for quarterly history and period tables.'
            : 'FMP and free live providers were unavailable from this host, so we loaded built-in baseline valuation snapshots to keep the page usable.'
          : 'Using free Yahoo / ETFDB / Alpha Vantage for ETF valuation snapshots.',
      hasHistoricalMultiples,
      indices: indicesForResponse,
      anyData,
    });
  }

  /** No FMP key — Yahoo only */
  const yahooIndices = await buildIndicesFromYahoo();
  let anyData = yahooIndices.some((i) => i.ttm != null);
  const indicesForResponse = anyData ? yahooIndices : buildIndicesFromStaticBaseline();
  if (!anyData) anyData = indicesForResponse.some((i) => i.ttm != null);
  const hasHistoricalMultiples = false;

  return NextResponse.json({
    ok: true,
    configured: true,
    updatedAt,
    dataSource: anyData && indicesForResponse === yahooIndices ? 'yahoo_finance' as const : 'static_baseline' as const,
    granularityNote:
      'Live ratios from Yahoo, ETFDB, and/or Alpha Vantage (add free ALPHA_VANTAGE_API_KEY if Yahoo is blocked). Optional FMP_API_KEY for quarterly P/E history and period tables.',
    fmpPaymentRequired: false,
    fmpBillingHint: null,
    yahooFallback: true,
    yahooNote:
      anyData && indicesForResponse === yahooIndices
        ? 'No FMP_API_KEY — using free Yahoo / ETFDB plus optional Alpha Vantage (ALPHA_VANTAGE_API_KEY) for ETF metrics. Add FMP later for historical multiples tables.'
        : 'Live providers were unavailable from this host; loaded built-in baseline valuation snapshots. Add ALPHA_VANTAGE_API_KEY to improve reliability or FMP later for historical tables.',
    hasHistoricalMultiples,
    indices: indicesForResponse,
    anyData,
  });
}
