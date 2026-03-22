/**
 * Index ETF proxies and educational copy for /dashboard/valuation.
 * Metrics are sourced from Financial Modeling Prep (FMP) when configured.
 */

export const VALUATION_DISCLAIMER =
  'Valuation ratios are model-dependent, can be revised, and reflect the underlying ETF’s reported metrics—not the cash index future (ES/NQ/YM/RTY) directly. Not investment advice.';

export const VALUATION_INDICES = [
  {
    symbol: 'SPY',
    name: 'S&P 500',
    etfName: 'SPDR S&P 500 ETF',
    blurb:
      'Broad U.S. large-cap blend; the baseline for “the market” multiple. Moves in SPY P/E often mirror S&P 500 index valuation.',
  },
  {
    symbol: 'QQQ',
    name: 'Nasdaq-100',
    etfName: 'Invesco QQQ Trust',
    blurb:
      'Growth and mega-cap tech heavy; typically trades at a premium P/E vs SPY. Sensitive to rates and duration.',
  },
  {
    symbol: 'DIA',
    name: 'Dow Jones',
    etfName: 'SPDR Dow Jones Industrial Average ETF',
    blurb:
      '30 large “blue chip” names, price-weighted in the index; sector mix differs from the S&P 500.',
  },
  {
    symbol: 'IWM',
    name: 'Russell 2000',
    etfName: 'iShares Russell 2000 ETF',
    blurb:
      'U.S. small caps; often shows different cyclicality and credit sensitivity vs large caps; can diverge from NQ/ES.',
  },
] as const;

/** Long-run reference levels (literature / history — approximate; regimes shift). */
export const HISTORICAL_VALUATION_CONTEXT = {
  sp500TrailingPe: {
    label: 'S&P 500 trailing P/E (long-run)',
    typicalRange: 'Roughly mid-teens to high-teens',
    meanReversionNote:
      'Post-1990s, average trailing P/E for the broad U.S. market has often clustered in the ~15–18 range, but “fair” multiples move with inflation, rates, and growth. Expensive vs history is not a timing signal by itself.',
  },
  cape: {
    label: 'CAPE (Shiller P/E)',
    typicalRange: 'Long-term mean near ~17 (varies by dataset)',
    note:
      'Uses 10-year real earnings; smoother than one-year trailing P/E and popular for cycle context. High CAPE has coexisted with years of further upside (e.g. late-cycle liquidity).',
  },
  otherMetrics: [
    {
      name: 'P / B (price to book)',
      why: 'Useful for financials and asset-heavy sectors; less informative for asset-light tech where intangibles dominate.',
    },
    {
      name: 'Earnings yield (E/P)',
      why: 'Inverse of P/E; easier to compare to bond yields (equity risk premium framing). Rising yields can mean cheaper stocks or falling earnings expectations.',
    },
    {
      name: 'Dividend yield',
      why: 'Income component; for broad indices it’s often modest but helps total return and can rise in value regimes.',
    },
    {
      name: 'P / S (when available)',
      why: 'Cross-cycle compare when earnings are volatile or negative; common for growth-heavy baskets.',
    },
  ],
} as const;
