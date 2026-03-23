/**
 * Long-run market P/E history from FRED (S&P 500–based series).
 * Tries trailing P/E first; falls back to Shiller CAPE when needed.
 */

import { fetchFredSeries } from './fred-observations';

export type HistoricalPeMetricKind = 'trailing_pe' | 'cape';

export type HistoricalPePayload = {
  points: { date: string; pe: number }[];
  metricKind: HistoricalPeMetricKind;
  chartTitle: string;
  shortLabel: string;
  source: string;
  fredSeriesId: string | null;
};

/** Reject mistaken series (e.g. S&P 500 index level ~2000–6000). */
function looksLikePriceEarningsRatio(values: number[]): boolean {
  if (values.length < 12) return false;
  const tail = values.slice(-120);
  const sorted = [...tail].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  const max = Math.max(...tail);
  const min = Math.min(...tail);
  if (!Number.isFinite(median) || median <= 0) return false;
  /** Index levels are thousands; PE/CAPE stay in a much tighter band (with rare spikes). */
  if (max > 500 || min < 0) return false;
  if (median < 3 || median > 150) return false;
  return true;
}

const CANDIDATES: {
  id: string;
  metricKind: HistoricalPeMetricKind;
  chartTitle: string;
  shortLabel: string;
}[] = [
  {
    id: 'SP500_PE_RATIO_MONTH',
    metricKind: 'trailing_pe',
    chartTitle: 'S&P 500 trailing P/E (monthly)',
    shortLabel: 'Trailing P/E',
  },
  {
    id: 'MULTPL_SP500_PE_RATIO_MONTH',
    metricKind: 'trailing_pe',
    chartTitle: 'S&P 500 trailing P/E (monthly)',
    shortLabel: 'Trailing P/E',
  },
  {
    id: 'CAPE',
    metricKind: 'cape',
    chartTitle: 'S&P 500 cyclically adjusted P/E — CAPE (monthly, Shiller)',
    shortLabel: 'CAPE',
  },
];

/**
 * Fetches one validated monthly series from FRED. Same underlying curve is used as a
 * broad-market benchmark for all ETF symbols on the valuation page (with a short disclaimer).
 */
export async function fetchSp500PeHistoryFromFred(): Promise<HistoricalPePayload> {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return {
      points: [],
      metricKind: 'trailing_pe',
      chartTitle: 'S&P 500 P/E history',
      shortLabel: 'P/E',
      source: '',
      fredSeriesId: null,
    };
  }

  for (const c of CANDIDATES) {
    try {
      const { raw, dataSource } = await fetchFredSeries(c.id);
      const vals = raw.map((r) => r.value);
      if (!looksLikePriceEarningsRatio(vals)) continue;
      const points = raw.map((r) => ({ date: r.date.slice(0, 10), pe: r.value }));
      return {
        points,
        metricKind: c.metricKind,
        chartTitle: c.chartTitle,
        shortLabel: c.shortLabel,
        source: `FRED · ${c.id} (${dataSource})`,
        fredSeriesId: c.id,
      };
    } catch {
      /* try next candidate */
    }
  }

  return {
    points: [],
    metricKind: 'trailing_pe',
    chartTitle: 'S&P 500 P/E history',
    shortLabel: 'P/E',
    source: '',
    fredSeriesId: null,
  };
}
