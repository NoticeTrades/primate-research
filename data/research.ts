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
 * - pdfUrl: Path to PDF in /public/pdfs/ or external URL
 * - tags: Array of tags for filtering & search
 */

export interface ResearchArticle {
  title: string;
  description: string;
  content?: string;
  category: string;
  date?: string;
  dateRange?: string;
  pdfUrl?: string;
  tags?: string[];
}

export const researchArticles: ResearchArticle[] = [
  // ──────────────────────────────────────────────
  // Week of 01/26/2026 – 01/30/2026  (FOMC WEEK)
  // ──────────────────────────────────────────────
  {
    title: 'Weekly Market Outlook — 01/26/2026 - 01/30/2026 (FOMC Week)',
    description:
      'High-impact FOMC week covering DXY, T-Bonds, Nasdaq (NQ), Bitcoin (BTC), and Metals (Gold & Silver). Federal funds rate expected unchanged — Powell\'s commentary is the key driver. Unemployment claims Thursday, PPI Friday. Expect increased volatility.',
    content: `Hope everyone's having a great weekend! I encourage you all to take some time to review this week's market outlook—you can even use it as a guide to form your own.

This week, we have several major news drivers, starting with the FOMC on Wednesday. The federal funds rate will most likely remain unchanged, but what matters most will be Powell's commentary during the press conference.

Initial unemployment claims follow on Thursday, with PPI closing out the week on Friday.

This is definitely a high-impact news week, so expect increased volatility.

DXY - The dollar index remains a key driver across all markets this week.

T-Bonds - The monthly chart remains bearish for bonds. Japan has played a role in the suppression here. Uncertainty in the U.S. has also been a reason bonds have not rallied, with yields trading higher. Investors are demanding higher yields due to concerns about the long-term outlook of the U.S. economy. Bonds will continue to struggle.

Nasdaq (NQ) - The Nasdaq has been on a tear over the past decade but has since entered a new regime. Uncertainty is higher than it has been in a long time. Fiscal policy is all over the place, Japan is raising rates, and the carry trade potentially coming under pressure is back in play. A looming U.S. credit issue is emerging — watch credit-related companies such as Visa (V) and Mastercard (MA). Markets have held up well largely due to AI, but also because of massive inflows from institutions and retail.

Bitcoin (BTC) - Crypto continues to trade with macro correlation. Key levels on the daily chart.

Metals (GC & SI) - Silver's move is unprecedented. Double top on RSI in gold and divergence on RSI in silver. Friday's session was one of silver's biggest gains of this rally. Watching the yearly open on both gold and silver.`,
    category: 'Weekly Market Outlook',
    date: 'Jan 26, 2026',
    dateRange: '01/26/2026 - 01/30/2026',
    pdfUrl: '/pdfs/weekly-market-outlook-01-26-2026.pdf',
    tags: ['FOMC', 'DXY', 'T-Bonds', 'NQ', 'BTC', 'Gold', 'Silver', 'Macro', 'Volatility'],
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
  //   pdfUrl: '/pdfs/weekly-market-outlook-MM-DD-YYYY.pdf',
  //   tags: ['Tag1', 'Tag2'],
  // },
];
