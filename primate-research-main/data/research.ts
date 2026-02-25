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

export type SectionTextBlock = { type: 'text'; content: string };
export type SectionImagesBlock = { type: 'images'; images: string[]; imageClassName?: string };
export type SectionBlock = SectionTextBlock | SectionImagesBlock;

export interface ReportSection {
  title: string;
  subtitle?: string;
  content: string;
  images?: string[]; // paths to chart images in /public/charts/
  /** When set, section is rendered as ordered blocks (text + images) instead of content then images. */
  blocks?: SectionBlock[];
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
  // Week of 02/16/2026 – 02/20/2026
  // ──────────────────────────────────────────────
  {
    title: 'Weekly Market Outlook (02/16–02/20): Strong Data, Weak Markets — What\'s Going On?',
    description:
      'Strong U.S. data but weak markets: DXY weekly failure swing favors lower prices; T-Bonds watching PYH and 2023 high; NQ divergence and non-failure swing; Bitcoin daily swing at 65,081 and H4 target 79,396.8. FOMC minutes, Unemployment, GDP, PMI this week.',
    content: `Weekly Market Outlook 02/16-02/20. Hope everyone's having a great weekend. This week: FOMC meeting minutes, Unemployment Thursday, GDP and PMI Friday. Monday is no news. DXY weekly failure swing, weaker dollar outlook. T-Bonds weekly, PYH and 2023 high. Nasdaq weekly/daily, non-failure swing, swing low Nov 17, three-month bar low, 50% at 21,904.75. Bitcoin daily/H4, daily swing 65,081, target 79,396.8. Ending thoughts: data vs positioning, cross-market correlations.`,
    category: 'Weekly Market Outlook',
    date: 'Feb 16, 2026',
    dateRange: '02/16/2026 - 02/20/2026',
    slug: 'weekly-market-outlook-02-16-2026',
    tags: ['DXY', 'T-Bonds', 'NQ', 'BTC', 'Failure Swing', 'FOMC', 'Macro'],

    intro: `Hope everyone's having a great weekend! I encourage you all to take some time to review this week's market outlook—you can even use it as a guide to form your own.\n\nThis week we do not have many major news events like last week, but we do have FOMC meeting minutes, which is pretty much just a recap with a small few details about last meeting, Unemployment on Thursday and GDP and PMI on Friday.\n\nThis Monday is a no news Monday.`,

    newsEvents: [
      { day: 'Mon', date: 'Feb 16', time: '—', currency: 'USD', event: 'No major news (Presidents Day)', forecast: '', previous: '' },
      { day: 'Tue', date: 'Feb 17', time: '8:30am', currency: 'USD', event: 'Empire State Manufacturing Index', forecast: '8.5', previous: '7.7' },
      { day: 'Wed', date: 'Feb 18', time: '8:30am', currency: 'USD', event: 'Core Durable Goods Orders m/m', forecast: '0.3%', previous: '0.4%' },
      { day: 'Wed', date: 'Feb 18', time: '8:30am', currency: 'USD', event: 'Durable Goods Orders m/m', forecast: '-1.8%', previous: '5.3%' },
      { day: 'Wed', date: 'Feb 18', time: '2:00pm', currency: 'USD', event: 'FOMC Meeting Minutes', forecast: '', previous: '' },
      { day: 'Thu', date: 'Feb 19', time: '8:30am', currency: 'USD', event: 'Unemployment Claims', forecast: '229K', previous: '227K' },
      { day: 'Thu', date: 'Feb 19', time: '8:30am', currency: 'USD', event: 'Philly Fed Manufacturing Index', forecast: '7.8', previous: '12.6' },
      { day: 'Thu', date: 'Feb 19', time: '10:00am', currency: 'USD', event: 'Pending Home Sales m/m', forecast: '2.4%', previous: '-9.3%' },
      { day: 'Fri', date: 'Feb 20', time: '8:30am', currency: 'USD', event: 'Advance GDP q/q', forecast: '2.8%', previous: '4.4%' },
      { day: 'Fri', date: 'Feb 20', time: '8:30am', currency: 'USD', event: 'Core PCE Price Index m/m', forecast: '0.3%', previous: '0.2%' },
      { day: 'Fri', date: 'Feb 20', time: '8:30am', currency: 'USD', event: 'Advance GDP Price Index q/q', forecast: '3.2%', previous: '3.8%' },
      { day: 'Fri', date: 'Feb 20', time: '9:45am', currency: 'USD', event: 'Flash Manufacturing PMI', forecast: '52.1', previous: '52.4' },
      { day: 'Fri', date: 'Feb 20', time: '9:45am', currency: 'USD', event: 'Flash Services PMI', forecast: '52.8', previous: '52.7' },
      { day: 'Fri', date: 'Feb 20', time: '10:00am', currency: 'USD', event: 'New Home Sales', forecast: '735K', previous: '' },
    ],

    sections: [
      {
        title: 'DXY',
        subtitle: 'Weekly → Daily',
        content: `The DXY continues to show weakness on the higher timeframes, with structure currently favoring lower prices. We have a weekly failure swing where price made a higher high, but the subsequent high failed to break above it and instead broke below a weekly swing low, signaling that sellers have stepped in for now.\n\nWith inflation cooling and rate cuts being forecasted, I continue to expect a weaker dollar over the next few months.\n\nThe main risk to this outlook would be a broader market unwind, which could lead to short-term dollar strength.`,
        images: [
          '/charts/weekly-02-16-2026/dxy-weekly.png',
          '/charts/weekly-02-16-2026/dxy-daily.png',
        ],
      },
      {
        title: 'T-Bonds (ZB1!)',
        subtitle: 'Weekly',
        content: `Treasuries have been anything but exciting, but at the end of the day, that is not what this market is meant to be.\n\nLast week, however, bonds closed with a strong bullish bar as yields fell. Yields initially spiked following the NFP (jobs data) release on Wednesday, but the move was short-lived. The market reversed those gains the following day and pushed even lower after inflation data came in below expectations.\n\nOverall, last week's economic data was solid. The U.S. economy added 130,000 jobs in January, bringing the unemployment rate down to 4.3%. Headline CPI rose just 0.2% month over month and 2.4% year over year, while core inflation eased to 2.5%. This combination supports the soft-landing narrative rather than signaling a renewed boom-bust cycle.\n\nThat mix of "inflation under control, growth still intact, and cuts on the horizon" pulled yields lower across the curve and drove demand into duration, helping bonds rally over the week.\n\nIn the short term, I believe bonds could continue to benefit if this trend persists. If the tech/AI trade cools off, we could also see a rotation of liquidity into bonds.\n\nTwo levels I am watching in the short term are the PYH (previous year high) and the 2023 high.`,
        images: [
          '/charts/weekly-02-16-2026/tbonds-weekly.png',
        ],
      },
      {
        title: 'Nasdaq (NQ)',
        subtitle: 'Weekly → Daily',
        content: `The Nasdaq has been a very interesting market in the current environment. Based on the economic data the market has been receiving, you would expect a market like the Nasdaq — which is more volatile and tends to be more sensitive to news — to see upside. However, the Nasdaq actually closed down 1.51% last week and is now down 7% from the all-time highs set in October.\n\nOn the weekly chart, I am continuing to monitor the divergence that tech has been showing relative to the ES and YM. Over the past few weeks, other indices have made new highs, while NQ failed to do so and instead printed a lower high. That said, it has not yet broken any major market structure.\n\nOn the weekly timeframe, I am watching the swing low from the week of November 17, which also aligns with the previous three-month bar low. A move below this level could trigger short setups.\n\nHow far could it move? That's where additional levels come into play, and you'll need to watch for reactions at each one.\n\nFirst, you have the previous three-month bar low. Below that sits the prior local top from the tariff-driven volatility in February–March.\n\nUnder those levels, I am watching the 50% weekly range at 21,904.75, measured from the weekly low of 17,163.25 to the current all-time local high of 26,646.25.\n\nOn the daily chart, we have more structure to be aware of. There is a non-failure swing here where NQ made a higher high (I will attach a reference).\n\nOn this timeframe, I view swing high (E) as a pivotal top in the market. If we are going to see the weekly timeframe start trading lower, this is not a level I would want to see NQ push back up toward.`,
        images: [
          '/charts/weekly-02-16-2026/nq-weekly.png',
          '/charts/weekly-02-16-2026/nq-daily.png',
          '/charts/weekly-02-16-2026/failure-swing.png',
        ],
        blocks: [
          { type: 'text', content: 'The Nasdaq has been a very interesting market in the current environment. Based on the economic data the market has been receiving, you would expect a market like the Nasdaq — which is more volatile and tends to be more sensitive to news — to see upside. However, the Nasdaq actually closed down 1.51% last week and is now down 7% from the all-time highs set in October.' },
          { type: 'text', content: 'On the weekly chart, I am continuing to monitor the divergence that tech has been showing relative to the ES and YM. Over the past few weeks, other indices have made new highs, while NQ failed to do so and instead printed a lower high. That said, it has not yet broken any major market structure.' },
          { type: 'images', images: ['/charts/weekly-02-16-2026/nq-weekly.png', '/charts/weekly-02-16-2026/nq-daily.png'] },
          { type: 'text', content: 'On the weekly timeframe, I am watching the swing low from the week of November 17, which also aligns with the previous three-month bar low. A move below this level could trigger short setups.' },
          { type: 'text', content: "How far could it move? That's where additional levels come into play, and you'll need to watch for reactions at each one." },
          { type: 'text', content: 'First, you have the previous three-month bar low. Below that sits the prior local top from the tariff-driven volatility in February–March.' },
          { type: 'text', content: 'Under those levels, I am watching the 50% weekly range at 21,904.75, measured from the weekly low of 17,163.25 to the current all-time local high of 26,646.25.' },
          { type: 'text', content: 'On the daily chart, we have more structure to be aware of. There is a non-failure swing here where NQ made a higher high (I will attach a reference).' },
          { type: 'text', content: "On this timeframe, I view swing high (E) as a pivotal top in the market. If we are going to see the weekly timeframe start trading lower, this is not a level I would want to see NQ push back up toward." },
          { type: 'images', images: ['/charts/weekly-02-16-2026/failure-swing.png'], imageClassName: 'report-failure-swing-rotated' },
        ],
      },
      {
        title: 'Bitcoin (BTC)',
        subtitle: 'Daily / H4',
        content: `As I covered in one of my recent Market Musings in the "Vault" here at Primate Trading, I discussed the opportunity for a short-term long entry on Bitcoin.\n\nThe challenge with this trade is that if NQ begins a weekly/daily sell-off, Bitcoin will most likely struggle to see gains — or at least the type of upside movement we would want while holding a long position. That is a risk you need to be aware of.\n\nOn the daily timeframe, the broader structure still favors a bearish trend. However, we now have clearer structure with a defined daily swing low at 65,081.0.\n\nThis level should now act as a key reference point. It is not an area I would want to see Bitcoin trade back toward if the bullish case is to remain intact. If price does begin moving in that direction, it will be important to monitor whether bids step in aggressively at that level.\n\nI have this level marked on the H4 chart, with an interest in higher short-term prices toward 79,396.8.\n\nIf you want a more in-depth view on where I stand on Bitcoin, head over to the Videos section here at Primate Trading and watch the latest Market Musings.`,
        images: [
          '/charts/weekly-02-16-2026/btc-h4.png',
        ],
      },
      {
        title: 'Ending Thoughts',
        subtitle: '',
        content: `Despite strong U.S. data confirming a steady economy, markets appear to be running out of momentum, a reminder that price often leads sentiment, not the other way around. The recent divergence between solid fundamentals and weak asset performance suggests we may be entering a recalibration phase where expectations for rate cuts, valuations, and growth begin to realign.\n\nIn the weeks ahead, watch how bonds and the dollar behave relative to equities. If yields continue to fall while risk assets fail to respond, it could reflect growing caution rather than optimism about policy easing. Meanwhile, the Nasdaq's relative underperformance and Bitcoin's sensitivity to broader risk moves highlight the importance of patience. This may be an environment that rewards selectivity and short term tactical plays over chasing momentum.\n\nOverall, we are entering a stretch where data may matter less than positioning. Keep your focus on key structural levels, monitor cross market correlations, and remember that some of the most important moves happen not when new information hits, but when the market stops reacting to it.`,
        images: [],
      },
    ],
  },

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
