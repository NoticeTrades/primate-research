import { NextResponse } from 'next/server';
import { VALUATION_INDICES } from '../../../data/valuation-indices';
import {
  computePeriodChanges,
  getFmpKey,
  mergeLatestQuarterlyWithTtm,
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

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    next: { revalidate: 300 },
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return null;
  return res.json();
}

function fmpErrorMessage(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const msg = (data as { 'Error Message'?: string; error?: string })['Error Message'] ?? (data as { error?: string }).error;
  return typeof msg === 'string' ? msg : null;
}

async function fetchRatiosTtmPeg(symbol: string, apiKey: string): Promise<number | null> {
  const data = await fetchJson(
    `https://financialmodelingprep.com/api/v3/ratios-ttm/${encodeURIComponent(symbol)}?apikey=${encodeURIComponent(apiKey)}`
  );
  if (!data || fmpErrorMessage(data)) return null;
  const arr = Array.isArray(data) ? data : [data];
  const row = arr[0] as Record<string, unknown> | undefined;
  if (!row) return null;
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
    const qUrl = `https://financialmodelingprep.com/api/v3/key-metrics/${encodeURIComponent(sym)}?period=quarter&limit=120&apikey=${encodeURIComponent(apiKey)}`;
    const tUrl = `https://financialmodelingprep.com/api/v3/key-metrics-ttm/${encodeURIComponent(sym)}?apikey=${encodeURIComponent(apiKey)}`;

    const [qData, tData] = await Promise.all([fetchJson(qUrl), fetchJson(tUrl)]);

    let fmpError: string | null = fmpErrorMessage(qData) ?? fmpErrorMessage(tData);

    const history = parseKeyMetricsQuarterly(Array.isArray(qData) ? qData : []);

    let ttm = parseTtmResponse(tData);
    if (ttm && (ttm.pegRatio == null || !Number.isFinite(ttm.pegRatio))) {
      const peg = await fetchRatiosTtmPeg(sym, apiKey);
      if (peg != null) ttm = { ...ttm, pegRatio: peg };
    }

    const latest = mergeLatestQuarterlyWithTtm(history, ttm);
    const periods = computePeriodChanges(history, latest);

    if (history.length === 0 && !ttm && !fmpError) {
      fmpError = 'No key-metrics data returned for this symbol.';
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
