/**
 * Research articles for the /research page.
 * Add new weekly market outlook entries to the TOP of the array (newest first).
 *
 * Format:
 * - title: Article title
 * - description: Short summary (shown on the card)
 * - content: Full-text body for search (not displayed, but searched by the nav search bar)
 * - category: Label e.g. "Weekly Market Outlook", "Equity Analysis", "Macro Strategy", "Crypto Research"
 * - date: Display date e.g. "Jan 26, 2026"
 * - dateRange: Week range e.g. "01/26/2026 - 01/30/2026"
 * - slug: URL-friendly identifier e.g. "weekly-market-outlook-01-26-2026"
 * - sections: Array of content sections with optional chart images
 * - tags: Array of tags for filtering & search
 */

export interface NewsEvent {
  day: string;
  date: string;
  time: string;
  currency: string;
  event: string;
  forecast?: string;
  previous?: string;
}

export interface ReportSection {
  title: string;
  subtitle?: string;
  content: string;
  images?: string[]; // paths to chart images in /public/charts/
}

export interface ResearchArticle {
  title: string;
  description: string;
  content?: string;
  category: string;
  date?: string;
  dateRange?: string;
  pdfUrl?: string;
  slug?: string;
  tags?: string[];
  intro?: string;
  newsEvents?: NewsEvent[];
  sections?: ReportSection[];
}

// Generate a URL-friendly slug from a title
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Find an article by its slug
export function getArticleBySlug(slug: string): ResearchArticle | undefined {
  return researchArticles.find(
    (a) => (a.slug || generateSlug(a.title)) === slug
  );
}

export const researchArticles: ResearchArticle[] = [
  // ──────────────────────────────────────────────
  // Week of 01/26/2026 – 01/30/2026  (FOMC WEEK)
  // ──────────────────────────────────────────────
  {
    title: 'Weekly Market Outlook — 01/26/2026 - 01/30/2026 (FOMC Week)',
    description:
      'High-impact FOMC week covering DXY, T-Bonds, Nasdaq (NQ), Bitcoin (BTC), and Metals (Gold & Silver). Federal funds rate expected unchanged — Powell\'s commentary is the key driver. Unemployment claims Thursday, PPI Friday. Expect increased volatility.',
    content: `Hope everyone's having a great weekend! I encourage you all to take some time to review this week's market outlook—you can even use it as a guide to form your own. This week, we have several major news drivers, starting with the FOMC on Wednesday. The federal funds rate will most likely remain unchanged, but what matters most will be Powell's commentary during the press conference. Initial unemployment claims follow on Thursday, with PPI closing out the week on Friday. This is definitely a high-impact news week, so expect increased volatility. DXY - The dollar index remains a key driver across all markets this week. T-Bonds - The monthly chart remains bearish for bonds. Nasdaq (NQ) - The Nasdaq has been on a tear over the past decade but has since entered a new regime. Bitcoin (BTC) - Crypto continues to trade with macro correlation. Metals (GC & SI) - Silver's move is unprecedented.`,
    category: 'Weekly Market Outlook',
    date: 'Jan 26, 2026',
    dateRange: '01/26/2026 - 01/30/2026',
    slug: 'weekly-market-outlook-01-26-2026',
    tags: ['FOMC', 'DXY', 'T-Bonds', 'NQ', 'BTC', 'Gold', 'Silver', 'Macro', 'Volatility'],

    intro: `Hope everyone's having a great weekend! I encourage you all to take some time to review this week's market outlook—you can even use it as a guide to form your own.\n\nThis week, we have several major news drivers, starting with the FOMC on Wednesday. The federal funds rate will most likely remain unchanged, but what matters most will be Powell's commentary during the press conference.\n\nInitial unemployment claims follow on Thursday, with PPI closing out the week on Friday.\n\nThis is definitely a high-impact news week, so expect increased volatility.`,

    newsEvents: [
      { day: 'Mon', date: 'Jan 26', time: '8:30am', currency: 'USD', event: 'Core Durable Goods Orders m/m', forecast: '0.3%', previous: '0.1%' },
      { day: 'Mon', date: 'Jan 26', time: '8:30am', currency: 'USD', event: 'Durable Goods Orders m/m', forecast: '3.1%', previous: '-2.2%' },
      { day: 'Tue', date: 'Jan 27', time: 'Tentative', currency: 'USD', event: 'President Trump Speaks', forecast: '', previous: '' },
      { day: 'Tue', date: 'Jan 27', time: '10:00am', currency: 'USD', event: 'CB Consumer Confidence', forecast: '90.1', previous: '89.1' },
      { day: 'Tue', date: 'Jan 27', time: '10:00am', currency: 'USD', event: 'Richmond Manufacturing Index', forecast: '-5', previous: '-7' },
      { day: 'Wed', date: 'Jan 28', time: '2:00pm', currency: 'USD', event: 'Federal Funds Rate', forecast: '3.75%', previous: '3.75%' },
      { day: 'Wed', date: 'Jan 28', time: '2:00pm', currency: 'USD', event: 'FOMC Statement', forecast: '', previous: '' },
      { day: 'Wed', date: 'Jan 28', time: '2:30pm', currency: 'USD', event: 'FOMC Press Conference', forecast: '', previous: '' },
      { day: 'Thu', date: 'Jan 29', time: '8:30am', currency: 'USD', event: 'Unemployment Claims', forecast: '202K', previous: '200K' },
      { day: 'Fri', date: 'Jan 30', time: '8:30am', currency: 'USD', event: 'Core PPI m/m', forecast: '0.3%', previous: '0.0%' },
      { day: 'Fri', date: 'Jan 30', time: '8:30am', currency: 'USD', event: 'PPI m/m', forecast: '0.2%', previous: '0.2%' },
    ],

    sections: [
      {
        title: 'DXY',
        subtitle: 'Weekly → Daily',
        content: 'The dollar index remains a key driver across all markets this week.',
        images: [
          '/charts/weekly-01-26-2026/dxy-weekly.png',
          '/charts/weekly-01-26-2026/dxy-daily.png',
        ],
      },
      {
        title: 'T-Bonds',
        subtitle: 'Monthly',
        content: `The monthly chart remains bearish for bonds. I believe Japan has played a role in the suppression here.\n\nThat said, uncertainty in the U.S. has also been a reason bonds have not rallied, with yields trading higher. Investors are demanding higher yields due to concerns about the long-term outlook of the U.S. economy, which is not a good sign.\n\nI believe bonds will continue to struggle.`,
        images: [
          '/charts/weekly-01-26-2026/tbonds-monthly.png',
        ],
      },
      {
        title: 'Nasdaq (NQ)',
        subtitle: 'Weekly → Daily',
        content: `The Nasdaq has been on a tear over the past decade but has since entered a new regime—one that hasn't been in play over the last few years.\n\nUncertainty is higher than it has been in a long time. Fiscal policy is all over the place, Japan is raising rates, and the carry trade potentially coming under pressure is back in play. Additionally, a looming U.S. credit issue is emerging, making it important to watch credit-related companies such as Visa (V) and Mastercard (MA).\n\nI believe markets have held up well largely due to AI, but also because of massive inflows not only from institutions but from retail as well. When looking at traditional "safe havens" or places to park capital with a relatively long-term outlook, there are limited alternatives beyond metals. Equities have somewhat filled that role—not entirely, but enough to help explain why markets continue to hold up during a period that doesn't fully make sense.`,
        images: [
          '/charts/weekly-01-26-2026/nq-weekly.png',
          '/charts/weekly-01-26-2026/nq-daily.png',
        ],
      },
      {
        title: 'Bitcoin (BTC)',
        subtitle: 'Daily',
        content: 'Crypto continues to trade with macro correlation. Key levels on the daily chart.',
        images: [
          '/charts/weekly-01-26-2026/btc-daily.png',
        ],
      },
      {
        title: 'Metals (GC & SI)',
        subtitle: 'Daily Gold · H4 Silver',
        content: `This move in silver is something I've never seen before in the few years I've been in the markets.\n\nI have tried playing the short side, telling myself that markets can't keep trading higher. They can.\n\nThat said, silver does not look bad for a potential local top heading into this week's FOMC.\n\nWe have a double top on the RSI in gold and a divergence on the RSI in silver.\n\nFriday's session was one of silver's biggest gains of this rally, making it something I'm interested in fading and watching closely off the open.\n\nI'm watching the Y.O on both gold and silver, but the lower timeframes will be your best friend here. There are no clear levels for me on the higher timeframes.`,
        images: [
          '/charts/weekly-01-26-2026/gold-daily.png',
          '/charts/weekly-01-26-2026/silver-h4.png',
        ],
      },
    ],
  },

  // ──────────────────────────────────────────────
  // Add new weekly outlooks above this line
  // Copy the template below and fill in your data:
  // ──────────────────────────────────────────────
  // {
  //   title: 'Weekly Market Outlook — MM/DD/YYYY - MM/DD/YYYY',
  //   description: 'Short summary of the week...',
  //   content: `Full written commentary here...`,
  //   category: 'Weekly Market Outlook',
  //   date: 'Mon DD, YYYY',
  //   dateRange: 'MM/DD/YYYY - MM/DD/YYYY',
  //   slug: 'weekly-market-outlook-MM-DD-YYYY',
  //   tags: ['Tag1', 'Tag2'],
  //   intro: `Opening commentary...`,
  //   newsEvents: [
  //     { day: 'Mon', date: 'Jan 01', time: '8:30am', currency: 'USD', event: 'Event Name', forecast: '0.0%', previous: '0.0%' },
  //   ],
  //   sections: [
  //     {
  //       title: 'Section Title',
  //       subtitle: 'Timeframe',
  //       content: 'Analysis commentary...',
  //       images: ['/charts/weekly-MM-DD-YYYY/chart-name.png'],
  //     },
  //   ],
  // },
];
