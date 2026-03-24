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

  /** Last resort when FRED CSV/API is blocked (e.g. strict egress). ~decade of S&P 500–style trailing P/E anchors. */
  const embedded = getEmbeddedSp500PeFallback();
  if (embedded.length >= 12 && looksLikePriceEarningsRatio(embedded.map((p) => p.pe))) {
    return {
      points: embedded,
      metricKind: 'trailing_pe',
      chartTitle: 'S&P 500 trailing P/E (monthly, embedded fallback)',
      shortLabel: 'Trailing P/E',
      source: 'embedded benchmark (approximate — use FRED when reachable for official series)',
      fredSeriesId: null,
    };
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

/** Sparse monthly anchors so charts still render if FRED is unreachable. Not live. */
function getEmbeddedSp500PeFallback(): { date: string; pe: number }[] {
  const anchors: { y: number; m: number; pe: number }[] = [
    { y: 1990, m: 1, pe: 15.3 },
    { y: 1991, m: 7, pe: 16.8 },
    { y: 1993, m: 1, pe: 17.4 },
    { y: 1995, m: 1, pe: 18.1 },
    { y: 1997, m: 7, pe: 24.0 },
    { y: 1999, m: 12, pe: 29.5 },
    { y: 2001, m: 9, pe: 25.8 },
    { y: 2003, m: 3, pe: 18.7 },
    { y: 2005, m: 7, pe: 19.4 },
    { y: 2007, m: 10, pe: 20.6 },
    { y: 2009, m: 3, pe: 14.2 },
    { y: 2011, m: 10, pe: 13.5 },
    { y: 2013, m: 12, pe: 17.8 },
    { y: 2015, m: 1, pe: 20.0 },
    { y: 2015, m: 7, pe: 21.5 },
    { y: 2016, m: 1, pe: 18.2 },
    { y: 2016, m: 7, pe: 19.5 },
    { y: 2017, m: 1, pe: 20.8 },
    { y: 2017, m: 7, pe: 22.5 },
    { y: 2018, m: 1, pe: 24.0 },
    { y: 2018, m: 7, pe: 23.0 },
    { y: 2019, m: 1, pe: 19.5 },
    { y: 2019, m: 7, pe: 21.5 },
    { y: 2020, m: 1, pe: 22.5 },
    { y: 2020, m: 7, pe: 21.5 },
    { y: 2021, m: 1, pe: 23.5 },
    { y: 2021, m: 7, pe: 28.0 },
    { y: 2022, m: 1, pe: 25.5 },
    { y: 2022, m: 7, pe: 18.5 },
    { y: 2023, m: 1, pe: 20.0 },
    { y: 2023, m: 7, pe: 22.5 },
    { y: 2024, m: 1, pe: 23.5 },
    { y: 2024, m: 7, pe: 24.5 },
    { y: 2025, m: 1, pe: 25.5 },
    { y: 2025, m: 7, pe: 27.0 },
  ];
  return anchors.map((a) => ({
    date: `${a.y}-${String(a.m).padStart(2, '0')}-01`,
    pe: a.pe,
  }));
}
