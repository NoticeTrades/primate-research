/**
 * Educational copy for the Rates & Fed Policy dashboard — macro context for markets.
 * Not investment advice.
 */

export const FED_POLICY_INTRO =
  'Policy rates, the Treasury curve, and inflation compensation interact to drive funding costs, discount rates, and risk appetite. Use the charts to see how conditions evolve — not to predict short-term price moves.';

export const FED_POLICY_SECTIONS: Array<{
  title: string;
  body: string;
  bullets?: string[];
}> = [
  {
    title: 'SEP “dot plot” (projections)',
    body:
      'The Summary of Economic Projections shows where FOMC participants see the appropriate policy rate at year-end. Markets often compare this path to what is priced in futures and OIS; large gaps can mean repricing risk when data surprise.',
    bullets: [
      'Wider dispersion of dots = more disagreement inside the Committee.',
      'The median line is a consensus summary, not a commitment or forecast for markets.',
    ],
  },
  {
    title: 'Effective fed funds & SOFR',
    body:
      'These anchor the overnight cost of money in the U.S. They matter for bank funding, money-market yields, margin and financing for levered strategies, and the general level of “risk-free” carry versus risky assets.',
    bullets: [
      'SOFR is the dominant reference for derivatives and loans; it typically tracks the effective funds rate closely.',
    ],
  },
  {
    title: 'Treasury curve (2Y, 10Y, 30Y) & 10Y−2Y',
    body:
      'Short yields embed near-term policy expectations; long yields add growth and inflation expectations plus term premium. The 2s10s spread is widely watched: inversions often preceded recessions historically, while steepening can follow cuts or reflect growth expectations.',
    bullets: [
      '10Y yields feed into mortgage rates and equity valuation multiples (discount-rate channel).',
      '30Y reflects long-horizon growth, inflation, and fiscal term premium.',
    ],
  },
  {
    title: 'Real yields (TIPS) & breakeven inflation',
    body:
      'The 10-year TIPS yield is a real (inflation-adjusted) risk-free rate — a key gauge of financial conditions. Breakevens (nominal minus TIPS-implied) proxy market-implied inflation compensation; they move with oil, risk sentiment, and Fed credibility.',
    bullets: [
      'Higher real yields tend to tighten conditions for duration-heavy assets.',
    ],
  },
];

export const FED_GENERAL_DISCLAIMER =
  'Macro series describe the environment; they do not predict returns. Past relationships (e.g. curve inversion) are not guarantees. Not investment advice.';
