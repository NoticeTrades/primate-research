import { NextResponse } from 'next/server';
import { VALUATION_INDICES } from '../../../data/valuation-indices';
import { STATIC_VALUATION_BASELINE } from '../../../data/valuation-static';
import { fetchFreeEtfValuationSnapshot } from '../../../lib/free-valuation-snapshot';
import { isEmptySnapshot } from '../../../lib/yahoo-valuation';
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
import { fetchSp500PeHistoryFromFred } from '../../../lib/valuation-pe-history';

/** Avoid static generation / prerender during `next build` (FRED + FMP can exceed the ~60s route budget on Vercel). */
export const dynamic = 'force-dynamic';
export const revalidate = 0;
/** Allow enough time to merge Yahoo + ETFDB + Alpha Vantage + FRED on cold starts (raise on Vercel Pro if needed). */
export const maxDuration = 60;

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

/** Stagger symbols to reduce Alpha Vantage free-tier bursts and Yahoo rate limits. */
async function fetchFreeSnapshotsSequential(): Promise<(TtmSnapshot | null)[]> {
  const snaps: (TtmSnapshot | null)[] = [];
  for (let i = 0; i < VALUATION_INDICES.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 450));
    snaps.push(await fetchFreeEtfValuationSnapshot(VALUATION_INDICES[i].symbol));
  }
  return snaps;
}

function mergeTtmPreferFmpThenFree(fmp: TtmSnapshot | null, free: TtmSnapshot | null): TtmSnapshot | null {
  if (isEmptySnapshot(fmp) && isEmptySnapshot(free)) return null;
  if (isEmptySnapshot(fmp)) return free;
  if (isEmptySnapshot(free)) return fmp;
  const f = fmp!;
  const r = free!;
  const peRatio = f.peRatio ?? r.peRatio;
  const merged: TtmSnapshot = {
    peRatio: f.peRatio ?? r.peRatio,
    forwardPe: f.forwardPe ?? r.forwardPe,
    pbRatio: f.pbRatio ?? r.pbRatio,
    dividendYieldPct: f.dividendYieldPct ?? r.dividendYieldPct,
    earningsYieldPct: null,
    priceToSalesRatio: f.priceToSalesRatio ?? r.priceToSalesRatio,
    enterpriseValueMultiple: f.enterpriseValueMultiple ?? r.enterpriseValueMultiple,
    pegRatio: f.pegRatio ?? r.pegRatio,
    date: f.date ?? r.date ?? new Date().toISOString().slice(0, 10),
  };
  merged.earningsYieldPct =
    peRatio != null && peRatio > 0 ? 100 / peRatio : f.earningsYieldPct ?? r.earningsYieldPct ?? null;
  return merged;
}

/** When FMP returns quarterly rows but no TTM, surface the latest quarter as the card snapshot. */
function enrichTtmFromQuarterlyHistoryIfNeeded(ttm: TtmSnapshot | null, history: MetricPoint[]): TtmSnapshot | null {
  if (!isEmptySnapshot(ttm) || history.length === 0) return ttm;
  const last = history[history.length - 1];
  const peRatio = last.peRatio;
  return {
    peRatio: last.peRatio,
    pbRatio: last.pbRatio,
    dividendYieldPct: last.dividendYieldPct,
    earningsYieldPct:
      last.earningsYieldPct ?? (peRatio != null && peRatio > 0 ? 100 / peRatio : null),
    priceToSalesRatio: last.priceToSalesRatio,
    enterpriseValueMultiple: null,
    pegRatio: null,
    forwardPe: null,
    date: last.date,
  };
}

function buildHybridIndicesFromFmpAndFree(
  fmpBlocks: IndexBlock[],
  freeSnaps: (TtmSnapshot | null)[],
): IndexBlock[] {
  return fmpBlocks.map((block, i) => {
    const free = freeSnaps[i] ?? null;
    let ttm = mergeTtmPreferFmpThenFree(block.ttm, free);
    ttm = enrichTtmFromQuarterlyHistoryIfNeeded(ttm, block.history);
    const history = block.history;
    const latest = mergeLatestQuarterlyWithTtm(history, ttm);
    const periods = computePeriodChanges(history, latest);
    const hasSomething =
      (ttm && !isEmptySnapshot(ttm)) || history.length > 0 || (free && !isEmptySnapshot(free));
    const fmpError = hasSomething
      ? null
      : block.fmpError ??
        'Could not load live metrics from Financial Modeling Prep or free providers (Yahoo / ETFDB / Alpha Vantage).';
    return {
      ...block,
      ttm,
      history,
      periods,
      fmpError,
    };
  });
}

async function buildIndicesFromYahoo(): Promise<IndexBlock[]> {
  const freeSnaps = await fetchFreeSnapshotsSequential();
  return VALUATION_INDICES.map((meta, i) => {
    const ttm = freeSnaps[i] ?? null;
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
      fmpError: ttm && !isEmptySnapshot(ttm) ? null : 'Could not load free metrics from Yahoo / ETFDB / Alpha Vantage at this time.',
    };
  });
}

function buildLiveDataHints(input: {
  dataSource: string;
  hasHistoricalMultiples: boolean;
  hasHistoricalPe: boolean;
  fmpKeyConfigured: boolean;
}): string[] {
  const hints: string[] = [];
  if (input.dataSource === 'static_baseline') {
    hints.push(
      'Static fallback is active. Prefer TWELVE_DATA_API_KEY (statistics/quote) and/or FINNHUB_API_KEY — they usually work from Vercel when Yahoo is blocked. Add FINANCIAL_MODELING_PREP_API_KEY only if you want a single paid fundamentals vendor.',
    );
  }
  if (!input.fmpKeyConfigured && input.dataSource !== 'static_baseline') {
    hints.push(
      'Optional: FINANCIAL_MODELING_PREP_API_KEY unlocks FMP quarterly P/E history in one vendor. Live snapshots already merge Twelve Data, Finnhub, Yahoo, ETFDB, and Alpha Vantage.',
    );
  }
  if (
    input.fmpKeyConfigured &&
    input.dataSource !== 'financialmodelingprep.com/stable' &&
    !input.hasHistoricalMultiples
  ) {
    hints.push(
      'Per-ETF quarterly P/E history needs FMP key-metrics on your plan. Until then, use Twelve Data / Finnhub snapshots and the long-run P/E chart (FRED or embedded fallback).',
    );
  }
  if (!input.hasHistoricalPe) {
    hints.push(
      'Long-run P/E chart: allow fred.stlouisfed.org or set FRED_API_KEY. If FRED is blocked, an embedded approximate S&P 500 series may be used so the chart is not empty.',
    );
  }
  return hints;
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
      fmpError: ttm ? null : 'No baseline snapshot found.',
    };
  });
}

const HISTORICAL_PE_EMPTY_DISCLAIMER =
  'When available, the chart uses an S&P 500–based monthly series from FRED as a broad U.S. large-cap valuation backdrop. Other index ETFs can trade at different absolute multiples.';

async function buildHistoricalPeJson() {
  const hp = await fetchSp500PeHistoryFromFred();
  if (hp.points.length === 0) {
    return {
      historicalPe: null as null | {
        points: { date: string; pe: number }[];
        metricKind: 'trailing_pe' | 'cape';
        chartTitle: string;
        shortLabel: string;
        source: string;
        fredSeriesId: string | null;
      },
      historicalPeDisclaimer: HISTORICAL_PE_EMPTY_DISCLAIMER,
    };
  }
  const embedded = hp.source.includes('embedded');
  return {
    historicalPe: {
      points: hp.points,
      metricKind: hp.metricKind,
      chartTitle: hp.chartTitle,
      shortLabel: hp.shortLabel,
      source: hp.source,
      fredSeriesId: hp.fredSeriesId,
    },
    historicalPeDisclaimer: embedded
      ? 'Approximate embedded S&P 500–style trailing P/E (only used when FRED is unreachable). Not an official FRED series. QQQ / DIA / IWM differ from the S&P — use as a broad backdrop.'
      : 'This curve is the S&P 500 index (broad U.S. large-cap), not the selected ETF’s exact history. QQQ / DIA / IWM often differ in level—use as a market-wide backdrop.',
  };
}

/** Next sets this while collecting static data during `next build` — skip all outbound network. */
function isNextProductionBuild(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build';
}

/** Fast, deterministic response so `next build` never waits on FRED/FMP/Yahoo (60s Vercel route limit). */
function buildTimePlaceholderResponse() {
  const updatedAt = new Date().toISOString();
  const indicesForResponse = buildIndicesFromStaticBaseline();
  const anyData = indicesForResponse.some((i) => i.ttm != null);
  return NextResponse.json({
    ok: true,
    configured: true,
    updatedAt,
    dataSource: 'static_baseline' as const,
    granularityNote:
      'Live ratios from Twelve Data (TWELVE_DATA_API_KEY), Finnhub (FINNHUB_API_KEY), Yahoo, ETFDB, and/or Alpha Vantage. FRED or embedded fallback for long-run P/E.',
    fmpPaymentRequired: false,
    fmpBillingHint: null,
    yahooFallback: true,
    yahooNote:
      'Build-time placeholder only — open the dashboard at runtime for live valuation data and FRED history.',
    snapshotNote: 'Reference snapshot: approximate values while live feeds are unavailable.',
    hasHistoricalMultiples: false,
    hasHistoricalPe: false,
    historicalPe: null,
    historicalPeDisclaimer: HISTORICAL_PE_EMPTY_DISCLAIMER,
    liveDataHints: buildLiveDataHints({
      dataSource: 'static_baseline',
      hasHistoricalMultiples: false,
      hasHistoricalPe: false,
      fmpKeyConfigured: Boolean(getFmpKey()),
    }),
    indices: indicesForResponse,
    anyData,
  });
}

export async function GET() {
  if (isNextProductionBuild()) {
    return buildTimePlaceholderResponse();
  }

  const updatedAt = new Date().toISOString();
  const apiKey = getFmpKey();

  /** Try FMP first when a key is configured */
  if (apiKey) {
    const fmp = await buildIndicesFromFmp(apiKey);
    const fmpWorks = fmp.anyData && !fmp.fmpPaymentRequired;

    if (fmpWorks) {
      const hasHistoricalMultiples = fmp.indices.some((i) => i.history.length > 0);
      const pe = await buildHistoricalPeJson();
      const hasHistoricalPe = pe.historicalPe != null && pe.historicalPe.points.length > 0;
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
        snapshotNote: null,
        hasHistoricalMultiples,
        hasHistoricalPe,
        liveDataHints: buildLiveDataHints({
          dataSource: 'financialmodelingprep.com/stable',
          hasHistoricalMultiples,
          hasHistoricalPe,
          fmpKeyConfigured: true,
        }),
        ...pe,
        indices: fmp.indices,
        anyData: fmp.anyData,
      });
    }

    /** 402 / empty / partial → merge FMP blocks with Yahoo + ETFDB + Alpha Vantage (live gaps filled). */
    const freeSnaps = await fetchFreeSnapshotsSequential();
    const hybridIndices = buildHybridIndicesFromFmpAndFree(fmp.indices, freeSnaps);
    let anyData = hybridIndices.some((i) => i.ttm != null || i.history.length > 0);
    const indicesForResponse = anyData ? hybridIndices : buildIndicesFromStaticBaseline();
    if (!anyData) anyData = indicesForResponse.some((i) => i.ttm != null);
    const hasHistoricalMultiples = hybridIndices.some((i) => i.history.length > 0);
    const fmpContributedAnything = fmp.indices.some(
      (i) => i.history.length > 0 || (i.ttm != null && !isEmptySnapshot(i.ttm)),
    );
    const dataSource = !anyData
      ? ('static_baseline' as const)
      : fmpContributedAnything
        ? ('blended' as const)
        : ('yahoo_finance' as const);
    const pe = await buildHistoricalPeJson();
    const hasHistoricalPe = pe.historicalPe != null && pe.historicalPe.points.length > 0;

    return NextResponse.json({
      ok: true,
      configured: true,
      updatedAt,
      dataSource,
      granularityNote:
        dataSource === 'blended'
          ? 'Blended: Financial Modeling Prep fundamentals where your plan allows, plus Twelve Data / Finnhub / Yahoo / ETFDB / Alpha Vantage to fill gaps. FRED or embedded fallback supplies long-run S&P 500 P/E.'
          : 'Live ratios: Twelve Data & Finnhub (when keys are set), then Yahoo, ETFDB, Alpha Vantage. FRED or embedded fallback for long-run P/E.',
      fmpPaymentRequired: false,
      fmpBillingHint: null,
      yahooFallback: true,
      yahooNote:
        fmp.fmpPaymentRequired || !fmp.anyData
          ? dataSource === 'blended'
            ? 'FMP did not return a full dataset on this plan or request. We merged any FMP history/TTM with Twelve Data, Finnhub, Yahoo, ETFDB, and Alpha Vantage for the freshest available snapshot.'
            : anyData && dataSource === 'yahoo_finance'
              ? 'Primary fundamentals provider is currently unavailable. Using merged Yahoo, ETFDB, and/or Alpha Vantage sources for live-style snapshots.'
              : 'FMP and free live providers were unavailable from this host, so we loaded built-in baseline valuation snapshots to keep the page usable.'
          : 'Using free Yahoo / ETFDB / Alpha Vantage for ETF valuation snapshots.',
      snapshotNote:
        dataSource === 'static_baseline'
          ? 'Reference snapshot: approximate values while live feeds are unavailable.'
          : null,
      hasHistoricalMultiples,
      hasHistoricalPe,
      liveDataHints: buildLiveDataHints({
        dataSource,
        hasHistoricalMultiples,
        hasHistoricalPe,
        fmpKeyConfigured: true,
      }),
      ...pe,
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
  const dataSource =
    anyData && indicesForResponse === yahooIndices ? ('yahoo_finance' as const) : ('static_baseline' as const);
  const pe = await buildHistoricalPeJson();
  const hasHistoricalPe = pe.historicalPe != null && pe.historicalPe.points.length > 0;

  return NextResponse.json({
    ok: true,
    configured: true,
    updatedAt,
    dataSource,
    granularityNote:
      'Live ratios from Twelve Data (TWELVE_DATA_API_KEY), Finnhub (FINNHUB_API_KEY), Yahoo, ETFDB, and/or Alpha Vantage. FRED or embedded fallback for long-run P/E.',
    fmpPaymentRequired: false,
    fmpBillingHint: null,
    yahooFallback: true,
    yahooNote:
      anyData && indicesForResponse === yahooIndices
        ? 'Using merged Twelve Data, Finnhub, Yahoo, ETFDB, and Alpha Vantage (when configured) for live-style ETF snapshots.'
        : 'Live providers were unavailable from this host; built-in baseline valuation snapshots are shown.',
    snapshotNote:
      dataSource === 'static_baseline'
        ? 'Reference snapshot: approximate values while live feeds are unavailable.'
        : null,
    hasHistoricalMultiples,
    hasHistoricalPe,
    liveDataHints: buildLiveDataHints({
      dataSource,
      hasHistoricalMultiples,
      hasHistoricalPe,
      fmpKeyConfigured: false,
    }),
    ...pe,
    indices: indicesForResponse,
    anyData,
  });
}
