/**
 * Copy for /dashboard/getting-started — how dashboard tools tie to markets & indices.
 * Not investment advice.
 */

export const DASHBOARD_GUIDE_INTRO = {
  title: 'Getting Started',
  subtitle:
    'This hub pulls together macro data and market views in one place. Use it to frame context around index futures, sector rotation, and risk — not as a signal to trade every tick.',
  disclaimer:
    'Markets discount news quickly; relationships shift over cycles. Nothing here is a recommendation to buy or sell any security or derivative.',
} as const;

export type GuideSection = {
  id: string;
  title: string;
  href: string;
  shortLabel: string;
  whatItIs: string;
  howToUse: string[];
  indicesAndMarkets: string[];
};

export const DASHBOARD_GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'home',
    title: 'Main dashboard',
    href: '/dashboard',
    shortLabel: 'Dashboard',
    whatItIs:
      'A live workspace with index prices (e.g. NQ, ES, YM, RTY, DXY, global indices), sector performance across timeframes, a market overview strip, an optional news feed, and your live trades list with P&L context.',
    howToUse: [
      'Pick an index symbol to focus charts and context; compare leaders vs laggards in sectors for rotation themes.',
      'Use the layout controls to show or hide overview, news, sector grid, and index card — your layout saves in this browser.',
      'Pair price action here with macro pages (CPI, Fed, jobs) when a report is due or positioning feels stretched.',
    ],
    indicesAndMarkets: [
      'Equity index futures (especially NQ/ES) often move on growth, rates, and liquidity expectations — the same themes CPI and the Fed toolkit speak to.',
      'Sector heatmaps show whether risk is broad (many sectors green) or narrow (few leaders) — useful when indices make new highs on weak breadth.',
      'DXY and oil appear alongside equities; a stronger dollar or energy spike can pressure multiples and consumer names even when the S&P is flat.',
    ],
  },
  {
    id: 'inflation',
    title: 'Inflation (CPI)',
    href: '/dashboard/inflation',
    shortLabel: 'CPI',
    whatItIs:
      'U.S. CPI from FRED: headline or core, with history, YoY trend, optional release-style context, and customizable date range.',
    howToUse: [
      'Compare headline vs core if you care about stickiness of services inflation vs volatile goods/energy.',
      'Zoom the window to the last year or full history to see regime changes (e.g. post-COVID, disinflation phases).',
      'Read the on-page notes on how hotter vs softer prints often affect sentiment — then watch how NQ/ES actually respond that session.',
    ],
    indicesAndMarkets: [
      'Hotter-than-expected CPI can lift rate expectations → pressure long-duration growth (often NQ-heavy) and support the dollar; softer prints can do the reverse.',
      'The first move isn’t always the lasting move: indices can gap and reverse once positioning and Fed speak are digested.',
    ],
  },
  {
    id: 'fed',
    title: 'Rates & Fed Policy',
    href: '/dashboard/fed-policy',
    shortLabel: 'Fed / rates',
    whatItIs:
      'FOMC-style federal funds projections (dot plot style), Treasury curve series, fed funds, SOFR, spreads, breakevens, and TIPS real yields — with optional macro guide and customizable charts.',
    howToUse: [
      'Compare the median path across years to your own view of cuts/holds; wide dispersion of dots means more policy uncertainty.',
      'Layer 2Y / 10Y / curve spread with EFFR to see how much easing or tightening is priced at different horizons.',
      'Toggle series on the combined chart to avoid overloading one axis; use the stats row for latest levels before a speech or CPI.',
    ],
    indicesAndMarkets: [
      'Higher real yields and a flatter or inverted curve often tighten financial conditions — historically relevant for multiples and cyclical vs defensive leadership.',
      'Steepening after cuts sometimes reflects growth expectations; indices may favor small caps (RTY) vs mega-cap growth depending on the narrative.',
    ],
  },
  {
    id: 'unemployment',
    title: 'Unemployment',
    href: '/dashboard/unemployment',
    shortLabel: 'Labor',
    whatItIs:
      'U-3, U-6, momentum, claims where available, trend summaries, and simple projection context versus a natural-rate benchmark — from official labor statistics.',
    howToUse: [
      'Watch whether unemployment is drifting vs the Fed’s full-employment narrative; large surprises in payrolls/unemployment move rate expectations.',
      'Use U-6 vs U-3 for underemployment slack — wider spreads can mean hidden labor supply.',
      'Combine with CPI: stagflation fears (hot inflation + weak jobs) read differently for indices than goldilocks.',
    ],
    indicesAndMarkets: [
      'Very tight labor + hot inflation historically pressured the Fed to stay restrictive; “bad news is good news” for cuts only works when the Fed is clearly data-dependent.',
      'Weak jobs data can hit cyclicals and small caps first; defensives and quality may outperform on growth scares.',
    ],
  },
  {
    id: 'valuation',
    title: 'Valuation',
    href: '/dashboard/valuation',
    shortLabel: 'Valuation',
    whatItIs:
      'Index ETF proxies (SPY, QQQ, DIA, IWM): trailing/forward P/E, P/B, yields, and related ratios from the best available source, with graceful fallbacks when a provider is unavailable.',
    howToUse: [
      'Compare P/E and P/B across large-cap (SPY), growth/tech-heavy (QQQ), Dow (DIA), and small caps (IWM) to see where the market is paying up for earnings.',
      'Read period % changes as expansion vs compression of multiples — often as important as price direction when earnings are volatile.',
      'Pair with Rates & Fed Policy: higher real yields typically pressure duration and high-multiple baskets unless growth accelerates.',
    ],
    indicesAndMarkets: [
      'Index futures (ES/NQ/YM/RTY) react to macro and positioning; underlying cash multiples explain part of “how much is priced in” for future earnings.',
      'QQQ-style multiples are usually above SPY; IWM can cheapen in credit stress even when NQ leads — watch dispersion, not just the headline index.',
    ],
  },
];

export const DASHBOARD_GUIDE_PUTTING_IT_TOGETHER = {
  title: 'Using everything together',
  paragraphs: [
    'Start with the main dashboard for price and sector context, then open the macro page that matches the catalyst (CPI week → inflation; FOMC → Fed policy; NFP week → unemployment). Use Valuation when you care whether multiples are expanding or compressing vs rates and earnings — especially around earnings season.',
    'Ask: “What would surprise markets?” — then check whether indices have already priced that path (extension, VIX term structure, breadth on your dashboard).',
    'Correlations break: a soft CPI can still sell off if the Fed sounds hawkish, or if tech earnings disappoint. Macro is context, not a single trigger.',
  ],
  checklist: [
    'Main dashboard: index + sectors aligned with your thesis?',
    'CPI: headline/core trend vs your inflation view?',
    'Fed page: median path vs curve — too many cuts priced?',
    'Jobs: slack building or labor still tight?',
    'Valuation: multiples expanding or compressing vs your rates/earnings view?',
  ],
} as const;
