/**
 * CPI release expectations & calendar helpers — edit consensus values as you get them
 * (e.g. from Bloomberg / Trading Economics / your desk). Actuals are computed from FRED in /api/cpi.
 */

/** Optional consensus (MoM % / YoY %) keyed by report month `YYYY-MM-01` */
export type CpiConsensus = {
  momPct?: number;
  yoyPct?: number;
  /** e.g. "Bloomberg Econ median" */
  source?: string;
};

export const CPI_CONSENSUS_FORECASTS: Record<string, CpiConsensus> = {
  // Example entries — replace with live consensus when you have it
  '2026-01-01': { momPct: 0.4, yoyPct: 3.0, source: 'Illustrative — update before release' },
  '2026-02-01': { momPct: 0.3, yoyPct: 2.9, source: 'Illustrative — next print window' },
  '2026-03-01': { momPct: 0.3, yoyPct: 2.8, source: 'Illustrative — preview' },
};

/**
 * Next BLS CPI release windows (UTC). Update from:
 * https://www.bls.gov/schedule/news_release/cpi.htm
 * Times are approximate; BLS publishes 8:30 a.m. ET.
 */
export const CPI_UPCOMING_RELEASE_WINDOWS: Array<{
  reportMonthKey: string;
  reportMonthLabel: string;
  /** Midpoint of typical release window for countdown / display */
  estimatedReleaseIsoUtc: string;
  notes?: string;
}> = [
  {
    reportMonthKey: '2026-02-01',
    reportMonthLabel: 'February 2026',
    estimatedReleaseIsoUtc: '2026-03-11T13:30:00.000Z',
    notes: 'BLS CPI is usually second week of the month (8:30 a.m. ET) for the prior month — confirm on bls.gov.',
  },
  {
    reportMonthKey: '2026-03-01',
    reportMonthLabel: 'March 2026',
    estimatedReleaseIsoUtc: '2026-04-10T12:30:00.000Z',
    notes: 'Estimated — update from BLS schedule.',
  },
  {
    reportMonthKey: '2026-04-01',
    reportMonthLabel: 'April 2026',
    estimatedReleaseIsoUtc: '2026-05-13T12:30:00.000Z',
    notes: 'Estimated — verify on BLS.',
  },
];

/** How headline CPI surprises can flow through major symbols (education, not a prediction). */
export const CPI_INDEX_IMPACTS: Array<{
  symbol: string;
  name: string;
  whenHotterThanExpected: string;
  whenSofterThanExpected: string;
}> = [
  {
    symbol: 'ES',
    name: 'S&P 500 E-mini',
    whenHotterThanExpected:
      'Sticky inflation can lift rate expectations and compress multiples; growth names often underperform defensives in the first move.',
    whenSofterThanExpected:
      'Softer CPI often supports duration and risk appetite; easier financial conditions can help broad equities.',
  },
  {
    symbol: 'NQ',
    name: 'Nasdaq 100 E-mini',
    whenHotterThanExpected:
      'Long-duration growth/tech is sensitive to real yields; a hot print can spike yields and weigh on NQ disproportionately.',
    whenSofterThanExpected:
      'Lower inflation prints can pull yields down, which tends to help high-multiple tech on the margin.',
  },
  {
    symbol: 'RTY',
    name: 'Russell 2000 E-mini',
    whenHotterThanExpected:
      'Smaller caps are credit- and rate-sensitive; hotter CPI → higher rate path can hit RTY vs large caps.',
    whenSofterThanExpected:
      'Softer inflation can ease funding costs and support small-cap risk appetite relative to a hawkish surprise.',
  },
  {
    symbol: 'DXY',
    name: 'US Dollar Index',
    whenHotterThanExpected:
      'Higher-for-longer Fed pricing often supports USD via yield differential; hot CPI can lift DXY intraday.',
    whenSofterThanExpected:
      'Softer CPI can reduce hike/cut pricing volatility; USD often fades if markets add Fed cuts.',
  },
  {
    symbol: 'CL',
    name: 'WTI Crude Oil',
    whenHotterThanExpected:
      'Energy is a CPI input; a strong core vs energy mix matters. Broad risk-off on hot CPI can hit oil with equities.',
    whenSofterThanExpected:
      'Softer macro prints sometimes support growth narrative; oil can track risk sentiment and dollar.',
  },
  {
    symbol: 'GC',
    name: 'Gold',
    whenHotterThanExpected:
      'Hot inflation without matching Fed credibility can help gold; if real yields spike sharply, gold can initially dip.',
    whenSofterThanExpected:
      'Softer CPI that lowers real yields is generally constructive for gold, all else equal.',
  },
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    whenHotterThanExpected:
      'Crypto often trades as a liquidity/risk asset; hot CPI → tighter conditions can pressure BTC near-term.',
    whenSofterThanExpected:
      'Softer inflation can support risk-on flows; BTC can bounce with duration-sensitive assets.',
  },
];

export const CPI_DATA_DISCLAIMER =
  'Consensus figures are optional placeholders you can edit in data/cpi-macros.ts. Actual MoM/YoY are computed from the CPI index series. This is not investment advice.';
