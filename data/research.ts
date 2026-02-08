/**
 * Research articles for the /research page.
 * Add new entries to the array below. Each article can link to a PDF URL or external page.
 *
 * Format:
 * - title: Article title
 * - description: Short summary (shown on the card)
 * - category: Label e.g. "Equity Analysis", "Macro Strategy", "Crypto Research"
 * - date: Display date e.g. "Dec 2024"
 * - pdfUrl: Full URL to the PDF or article (use # or leave empty to hide "View Report" button)
 * - tags: Optional array of tags
 */

export interface ResearchArticle {
  title: string;
  description: string;
  category: string;
  date?: string;
  pdfUrl?: string;
  tags?: string[];
}

export const researchArticles: ResearchArticle[] = [
  {
    title: 'Equity Market Analysis: Tech Sector Q4 2024',
    description:
      'Comprehensive analysis of technology sector performance, valuation metrics, and forward-looking trends in the fourth quarter of 2024.',
    category: 'Equity Analysis',
    date: 'Dec 2024',
    pdfUrl: '#',
    tags: ['Technology', 'Valuation', 'Q4 2024'],
  },
  {
    title: 'Macroeconomic Outlook: Interest Rate Environment',
    description:
      'Deep dive into current interest rate policies, their impact on markets, and strategic positioning recommendations.',
    category: 'Macro Strategy',
    date: 'Nov 2024',
    pdfUrl: '#',
    tags: ['Interest Rates', 'Monetary Policy', 'Macro'],
  },
  {
    title: 'Cryptoasset Research: Layer 2 Scaling Solutions',
    description:
      'Analysis of Layer 2 blockchain solutions, their token economics, and investment thesis for the evolving crypto landscape.',
    category: 'Crypto Research',
    date: 'Oct 2024',
    pdfUrl: '#',
    tags: ['Blockchain', 'Layer 2', 'Tokenomics'],
  },
];
