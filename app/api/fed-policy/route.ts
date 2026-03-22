import { NextRequest, NextResponse } from 'next/server';
import { fetchFredSeries } from '../../../lib/fred-observations';
import {
  FED_SEP_DOTS,
  FED_SEP_HORIZONS,
  FED_SEP_META,
  fedSepMedianSeries,
} from '../../../data/fed-sep-dots';

export const dynamic = 'force-dynamic';

const FRED_MARKET_SERIES = [
  { id: 'FEDFUNDS', label: 'Effective federal funds', unit: '%' },
  { id: 'DGS2', label: '2Y Treasury (constant maturity)', unit: '%' },
  { id: 'DGS10', label: '10Y Treasury (constant maturity)', unit: '%' },
  { id: 'T10Y2Y', label: '10Y − 2Y Treasury spread', unit: 'pp' },
  { id: 'SOFR', label: 'SOFR', unit: '%' },
] as const;

function cutoffDate(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
}

function filterObs(raw: { date: string; value: number }[], from: string | null) {
  if (!from) return raw;
  return raw.filter((r) => r.date >= from);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const years = Math.min(30, Math.max(1, Number.parseInt(searchParams.get('years') || '10', 10) || 10));
    const from = cutoffDate(years);

    const medianLine = fedSepMedianSeries();

    const dots = FED_SEP_DOTS.map((d) => ({
      ...d,
      /** Slight horizontal jitter for scatter visibility (deterministic) */
      xJitter: d.xIndex + (d.participantIndex - 9) * 0.035,
    }));

    const seriesResults: Record<
      string,
      {
        id: string;
        label: string;
        unit: string;
        observations: { date: string; value: number }[];
        dataSource: string;
        usedFredApi: boolean;
      }
    > = {};

    for (const s of FRED_MARKET_SERIES) {
      try {
        const { raw, dataSource, usedFredApi } = await fetchFredSeries(s.id);
        seriesResults[s.id] = {
          id: s.id,
          label: s.label,
          unit: s.unit,
          observations: filterObs(raw, from),
          dataSource,
          usedFredApi,
        };
      } catch (e) {
        console.error('[fed-policy]', s.id, e);
        seriesResults[s.id] = {
          id: s.id,
          label: s.label,
          unit: s.unit,
          observations: [],
          dataSource: 'error',
          usedFredApi: false,
        };
      }
    }

    return NextResponse.json({
      sep: {
        meta: FED_SEP_META,
        horizons: FED_SEP_HORIZONS,
        dots,
        medianLine,
      },
      series: seriesResults,
      seriesCatalog: FRED_MARKET_SERIES,
      meta: {
        years,
        from,
      },
    });
  } catch (e) {
    console.error('[fed-policy]', e);
    return NextResponse.json({ error: 'Failed to load Fed policy data' }, { status: 500 });
  }
}
