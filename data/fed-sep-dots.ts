/**
 * FOMC Summary of Economic Projections (SEP) — federal funds rate “dot plot” style data.
 *
 * Source: Federal Reserve Board, Table 1 & Figure 2, March 18, 2026 release:
 * https://www.federalreserve.gov/monetarypolicy/fomcprojtabl20260318.htm
 *
 * Median and **range** (min–max of all participants’ midpoint projections) are from that table.
 * Dots between min and median and median and max are evenly spaced for visualization (not individual submissions).
 */

export type SepHorizonKey = '2026' | '2027' | '2028' | 'longer';

export type SepHorizon = {
  key: SepHorizonKey;
  label: string;
  xIndex: number;
  /** Low of published range (%) */
  minPct: number;
  /** High of published range (%) */
  maxPct: number;
  /** Median projection (%) */
  medianPct: number;
};

export const SEP_PARTICIPANT_COUNT = 19;

export const FED_SEP_META = {
  meetingLabel: 'FOMC Summary of Economic Projections, March 18, 2026',
  asOfDate: '2026-03-18',
  sourceUrl: 'https://www.federalreserve.gov/monetarypolicy/fomcprojtabl20260318.htm',
  disclaimer:
    'Medians and ranges match the Federal Reserve’s March 18, 2026 projection table. Dot positions between range ' +
    'endpoints and the median are interpolated for display. Not investment advice.',
} as const;

/**
 * Federal funds rate projections — midpoint of target range, year-end (Table 1, March 2026).
 * Range = full participant range; central tendency in the Fed table is slightly narrower.
 */
export const FED_SEP_HORIZONS: SepHorizon[] = [
  { key: '2026', label: '2026', xIndex: 0, minPct: 2.6, maxPct: 3.6, medianPct: 3.4 },
  { key: '2027', label: '2027', xIndex: 1, minPct: 2.4, maxPct: 3.9, medianPct: 3.1 },
  { key: '2028', label: '2028', xIndex: 2, minPct: 2.6, maxPct: 3.9, medianPct: 3.1 },
  { key: 'longer', label: 'Longer run', xIndex: 3, minPct: 2.6, maxPct: 3.9, medianPct: 3.1 },
];

function linspace(a: number, b: number, count: number): number[] {
  if (count < 2) return [a];
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    out.push(a + t * (b - a));
  }
  return out;
}

function buildDotsFromHorizons(): Array<{
  horizonKey: SepHorizonKey;
  label: string;
  xIndex: number;
  participantIndex: number;
  ratePct: number;
}> {
  const out: Array<{
    horizonKey: SepHorizonKey;
    label: string;
    xIndex: number;
    participantIndex: number;
    ratePct: number;
  }> = [];

  for (const h of FED_SEP_HORIZONS) {
    const below = linspace(h.minPct, h.medianPct, 10).slice(0, 9);
    const above = linspace(h.medianPct, h.maxPct, 10).slice(1, 10);
    const rates = [...below, h.medianPct, ...above];
    for (let i = 0; i < rates.length; i++) {
      out.push({
        horizonKey: h.key,
        label: h.label,
        xIndex: h.xIndex,
        participantIndex: i,
        ratePct: Math.round(rates[i]! * 100) / 100,
      });
    }
  }

  return out;
}

export const FED_SEP_DOTS = buildDotsFromHorizons();

export function fedSepMedianSeries(): Array<{ label: string; xIndex: number; medianPct: number }> {
  return FED_SEP_HORIZONS.map((h) => ({
    label: h.label,
    xIndex: h.xIndex,
    medianPct: h.medianPct,
  }));
}
