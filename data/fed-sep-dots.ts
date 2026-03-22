/**
 * FOMC Summary of Economic Projections (SEP) — federal funds rate “dot plot” style data.
 *
 * Update after each SEP release from the Federal Reserve Board:
 * https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm
 *
 * Values below are illustrative — replace min/max/median with the official SEP table from the Fed’s PDF.
 */

export type SepHorizonKey = '2026' | '2027' | '2028' | '2029' | 'longer';

export type SepHorizon = {
  key: SepHorizonKey;
  label: string;
  xIndex: number;
  minPct: number;
  maxPct: number;
  medianPct: number;
};

export const SEP_PARTICIPANT_COUNT = 19;

/**
 * Illustrative SEP-style snapshot — update dates + numbers when the Fed publishes a new SEP.
 * Meeting date aligned with a typical December FOMC round (projection materials released with statement).
 */
export const FED_SEP_META = {
  meetingLabel: 'FOMC Summary of Economic Projections (illustrative)',
  asOfDate: '2025-12-17',
  sourceUrl: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm',
  disclaimer:
    'Dot positions are modeled from median and central tendency for visualization only. ' +
    'Replace values in data/fed-sep-dots.ts using the latest Federal Reserve SEP release. Not investment advice.',
} as const;

/**
 * Year-end projections forward from the SEP “cutoff” — illustrative ranges (%, midpoint of target range).
 */
export const FED_SEP_HORIZONS: SepHorizon[] = [
  { key: '2026', label: '2026', xIndex: 0, minPct: 3.1, maxPct: 4.1, medianPct: 3.5 },
  { key: '2027', label: '2027', xIndex: 1, minPct: 2.9, maxPct: 3.9, medianPct: 3.25 },
  { key: '2028', label: '2028', xIndex: 2, minPct: 2.7, maxPct: 3.7, medianPct: 3.1 },
  { key: '2029', label: '2029', xIndex: 3, minPct: 2.6, maxPct: 3.6, medianPct: 3.0 },
  { key: 'longer', label: 'Longer run', xIndex: 4, minPct: 2.5, maxPct: 3.5, medianPct: 2.9 },
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
