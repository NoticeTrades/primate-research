/**
 * FOMC Summary of Economic Projections (SEP) — federal funds rate “dot plot” style data.
 *
 * Update after each SEP release from the Federal Reserve Board:
 * https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm
 *
 * Values below are illustrative of a typical post-cut cycle (median / range structure).
 * Replace `horizons` min/max/median with the official SEP table when you refresh.
 */

export type SepHorizonKey = '2025' | '2026' | '2027' | '2028' | 'longer';

export type SepHorizon = {
  key: SepHorizonKey;
  /** X-axis label */
  label: string;
  /** Numeric position for charts (longer run plotted to the right) */
  xIndex: number;
  /** Central tendency low (% midpoints of target range or appropriate mid) */
  minPct: number;
  /** Central tendency high */
  maxPct: number;
  /** Median projection (%), midpoints */
  medianPct: number;
};

/** FOMC participants (up to 19 dots per horizon in the published chart). */
export const SEP_PARTICIPANT_COUNT = 19;

/**
 * December 2024–style illustrative central tendency + median (update from Fed PDF).
 * Ranges reflect typical SEP dispersion — not real-time official submission data.
 */
export const FED_SEP_META = {
  meetingLabel: 'FOMC SEP (illustrative)',
  /** ISO date of the projection round — update when you refresh data */
  asOfDate: '2024-12-18',
  sourceUrl: 'https://www.federalreserve.gov/monetarypolicy/fomcminutes20241218.htm',
  disclaimer:
    'Dot positions are derived from published median and central tendency for visualization. ' +
    'Update `data/fed-sep-dots.ts` from the latest Federal Reserve SEP materials. Not investment advice.',
} as const;

export const FED_SEP_HORIZONS: SepHorizon[] = [
  { key: '2025', label: '2025', xIndex: 0, minPct: 3.4, maxPct: 4.0, medianPct: 3.6 },
  { key: '2026', label: '2026', xIndex: 1, minPct: 3.0, maxPct: 3.8, medianPct: 3.4 },
  { key: '2027', label: '2027', xIndex: 2, minPct: 2.8, maxPct: 3.6, medianPct: 3.1 },
  { key: '2028', label: '2028', xIndex: 3, minPct: 2.8, maxPct: 3.5, medianPct: 3.1 },
  { key: 'longer', label: 'Longer run', xIndex: 4, minPct: 2.5, maxPct: 3.5, medianPct: 3.0 },
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

/** 19 dots per horizon: 9 below median, official median, 9 above — matches dot-plot style dispersion. */
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

/** Median points for line overlay */
export function fedSepMedianSeries(): Array<{ label: string; xIndex: number; medianPct: number }> {
  return FED_SEP_HORIZONS.map((h) => ({
    label: h.label,
    xIndex: h.xIndex,
    medianPct: h.medianPct,
  }));
}
