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
export type SectionTweetBlock = { type: 'tweet'; url: string };
export type SectionBlock = SectionTextBlock | SectionImagesBlock | SectionTweetBlock;

export interface ReportSection {
  title: string;
  subtitle?: string;
  content: string;
  images?: string[]; // paths to chart images in /public/charts/
  /** When set, section is rendered as ordered blocks (text + images) instead of content then images. */
  blocks?: SectionBlock[];
  /** Optional Twitter/X post URL to embed inline (e.g. where the tweet is mentioned). */
  tweetUrl?: string;
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
  // Weekly Market Outlook — Week of March 23, 2026
  // ──────────────────────────────────────────────
  {
    title:
      'Weekly Market Outlook (03/23-03/27): Record NYSE Volume, a 3.40% ES Bar in Five Minutes—DXY, Bonds, Indices & BTC',
    description:
      'Historic down- then up-volume on the NYSE (Jason Goepfert), a once-in-a-generation 5-minute ES bar, risk management, then DXY under the prior year low, ZB1! toward PYL, divergent NQ/ES dailies, and Bitcoin consolidation.',
    content: `Weekly Market Outlook 03/23-03/27. Heavy down volume then heaviest up volume ever. Jason Goepfert. ES 5-minute bar 3.40% March 23 2026 6509.75 to 6731.00 221 points. Standard deviation fat tails circuit breaker 1987 flash crash. DXY TACO Iran Trump productive discussions prior year low March 2 88-90. ZB bonds safety inflation Fed PYL 4-7%. NQ ES divergence Mag 7 outflows YTD ES NQ YM RTY 3-month bar low 2025 TRH. BTC consolidation prior to indices 2021-2022. Ending trader market protect capital.`,
    category: 'Weekly Market Outlook',
    date: 'Mar 23, 2026',
    dateRange: '03/23/2026 - 03/27/2026',
    slug: 'weekly-market-outlook-03-23-2026',
    tags: [
      'ES',
      'Volume',
      'NYSE',
      'DXY',
      'ZB1!',
      'NQ',
      'BTC',
      'Macro',
      'Risk Management',
    ],

    sections: [
      {
        title: 'Record NYSE volume & the ES move',
        subtitle: 'Context before the charts',
        content: '',
        images: ['/charts/weekly-03-23-2026/heavy-volume.png'],
        blocks: [
          {
            type: 'text',
            content: `The markets recently experienced one of the heaviest down volume days in history, and today we had the complete opposite, with the heaviest up volume day ever.`,
          },
          { type: 'images', images: ['/charts/weekly-03-23-2026/heavy-volume.png'] },
          {
            type: 'text',
            content: `Source: [Jason Goepfert on X](https://x.com/jasongoepfert)`,
          },
          {
            type: 'text',
            content: `At 7:05 a.m. ET on March 23, 2026, on one 5-minute bar, a 3.40% measured move from the low of 6,509.75 to a high of 6,731.00—221 points. That sounds like a move you see on the NQ, where a 200-point move is quite normal, but no, this was on the ES.`,
          },
          {
            type: 'text',
            content: `To understand just how extreme that is statistically, the standard deviation of a typical 5-minute ES bar runs about 0.10% to 0.15% under normal conditions, and maybe 0.25% to 0.30% on a high-volatility day. A 3.40% move works out to somewhere between 13 and 28 standard deviations. Even with the fat tails ES returns are known for, that number is essentially off the chart.`,
          },
          { type: 'images', images: ['/charts/weekly-03-23-2026/es-5min-context.png'] },
          {
            type: 'text',
            content: `ES returns do have fat tails, so these events do occur, but they are confined to a tiny handful of moments in market history—March 2020 circuit breaker opens, the 1987 crash cascade, Flash Crash (May 2010), COVID lockdown days, a few post-9/11 sessions, and the recent tariff madness. This is an event that has only ever occurred 5 to 10 times in ES futures history. That is roughly 1 in 50,000 to 1 in 100,000 five-minute bars.\n\nA 3.40% single 5-minute bar on the ES is essentially a once-a-decade to once-a-generation event.`,
          },
          {
            type: 'text',
            content: `These types of moves can ruin a trader's account if risk is not managed, which should be your number one priority when trading the financial markets, especially during the extreme environments we are seeing today.\n\nLet's dive into the charts.`,
          },
        ],
      },
      {
        title: 'DXY (US Dollar Index)',
        subtitle: 'Daily',
        content: `There has been a common phrase surrounding U.S. President Donald Trump when an extreme environment comes across his administration. This phrase is called "TACO," or "Trump Always Chickens Out."\n\nToday, Trump said "the US and Iran have had productive discussions" to end the Iran war, which caused the DXY to fall and U.S. indices and metals to rise.\n\nLooking at the daily DXY chart, DXY is still trading under and rejecting the prior year low. The main cause of the DXY decline has been risk-off sentiment due to geopolitical tensions surrounding the U.S.-Israel vs. Iran conflict, rather than pure fundamentals.\n\nFrom a technical standpoint, DXY still remains weak and I'm expecting the bear trend to continue once again. The March 2nd low will be a pivotal level for bulls and bears.\n\nI'm still calling for the 88-90 range on DXY.`,
        images: ['/charts/weekly-03-23-2026/dxy-daily.png'],
      },
      {
        title: 'ZB1! (Bonds)',
        subtitle: 'Daily',
        content: `Bonds rose today because investors briefly shifted back toward safety and began to price in a slightly lower path for future inflation and Fed tightening after an intense selloff tied to war- and oil-driven inflation fears over the past few weeks.\n\nOver the last three to four weeks, Treasury yields had marched to nine-month highs as the Iran war and a spike in oil upended expectations for 2026 rate cuts and forced a sharp repricing across the curve, which is why prices were falling.\n\nToday's rally reflects some cooling of that panic—oil has eased and headlines have hinted at de-escalation and potential openings for diplomacy, which takes a bit of pressure off inflation expectations and supports bond prices.\n\nWhile rising concerns about U.S. deficits and heavy Treasury issuance have been one structural driver of higher yields, the day-to-day move was less about "lost trust" and more about tactical repositioning after a crowded selloff, with investors seeing value at higher yields rather than demanding even more risk premium.\n\nI am expecting Bonds to continue to fall another 4%-7% towards the PYL.`,
        images: ['/charts/weekly-03-23-2026/zb1-daily.png'],
      },
      {
        title: 'NQ / ES',
        subtitle: 'Daily — side by side',
        content: `After the two major U.S. stock indices formed a divergence on the daily chart, the NQ started the downside move and led as the weaker market, as the Mag 7 saw major outflows and has continued to see pretty big outflows over the last few trading days.\n\nRecently though, the NQ has remained strong during selloffs and has seen decent recoveries compared to the other indices.\n\nYTD, the ES is down 3.65%, NQ is down 3.59%, YM is down 4.13%, and RTY is down only 0.18%, with the idea of lower rates and inflation still being seen as possible.\n\nThe trend we've seen has been interesting. You would expect that with the potential for lower inflation, which has been the trend in regards to Core CPI, that risk-on markets would rise, but I believe the markets have been pricing this in for the most part over the last 2 to 3 years.\n\nLooking at the daily chart on the NQ and ES the trend remains bearish and more so heavily bearish on ES.\n\nPrice has reclaimed above the 3-month bar low, which could be the start of a local bottom and a move higher to form some sort of swing high on the weekly charts. That is what I would watch over the next 1 to 3 weeks.\n\nMy view on the stock indices leans more neutral to bearish rather than bullish given the current macro environment. Earnings will play a big factor, as earnings have overall been healthy, but any sort of sentiment shift there could lead to major selloffs.\n\nOverall, I'm expecting a short-term rally that will eventually fade back down towards 2025 TRH (Trading Range High).`,
        images: ['/charts/weekly-03-23-2026/es-nq-daily.png'],
      },
      {
        title: 'Bitcoin (BTC)',
        subtitle: 'Daily',
        content: `Bitcoin has been an interesting story. In an older report, before this website was created, I talked about how Bitcoin has in the past traded lower prior to the indices during big macro events. One of the biggest being the 2021 to 2022 inflation crisis, where Bitcoin traded lower weeks before the indices.\n\nThe daily chart on Bitcoin is still not bullish, but has formed a base where accumulation and consolidation are occurring.\n\nTo me, if you are a bull, this market is in a consolidation environment where I would not expect major gains or any sort of major bull trend.`,
        images: ['/charts/weekly-03-23-2026/btc-daily.png'],
      },
      {
        title: 'Ending thoughts',
        subtitle: '',
        content: `Overall, this has not been an easy market to trade, and that should be quite obvious after the 7 a.m. candle if it hasn't been already.\n\nThis is a market where if you are up, protect capital and take profits. It's a trader's market, not an investing market. The macro environment just does not support that narrative currently.\n\nI hope you found this market outlook helpful. If you have any questions, please feel free to reach me in the live chat or on Discord in the top right corner of the site.\n\nTrade safely.`,
      },
    ],
  },

  // ──────────────────────────────────────────────
  // Weekly Market Outlook — Week of March 16, 2026
  // ──────────────────────────────────────────────
  {
    title: 'Weekly Market Outlook (03/16-03/20): Dollar at Key Level, Oil and Equities in Focus',
    description:
      'Charts and levels as futures roll to June contracts. DXY at 100.157, risk-off from Iran/US–Israel; CL spike then cool to 94. Heather Long on jobs. Hedge fund shorts at multi-year highs (Goldman prime brokerage). ES/NQ: gap down, ES unable to run Friday high; NQ short bias, watching November lows. NQ short into Tuesday overnight.',
    content: `Weekly Market Outlook 03/16-03/20. Happy Monday. Charts and levels as futures roll over; June contracts. Short NQ into Tuesday overnight. DXY 100.157, eight tests, fake out March 12; risk-off Iran/US-Israel; CL above 100 then cooled to 94. Jobs cooled; Heather Long, Chief Economist Navy Federal. Truflation 1.54%. Hedge funds boosted index shorts to highest share since Sept 2022 (Goldman prime brokerage), 93rd percentile; week through March 6 +8.3% short equity ETFs. ES daily: gap down low of day, ES could not run Friday high; NQ/YM/RTY could. Jensen Huang NVDA $1T revenue—rally then fade. Hedging into rallies; looking for ES toward November lows, NQ already ran. Shorter report; updates in chat.`,
    category: 'Weekly Market Outlook',
    date: 'Mar 16, 2026',
    dateRange: '03/16/2026 - 03/20/2026',
    slug: 'weekly-chart-analysis-03-16-2026',
    tags: ['DXY', 'NQ', 'ES', 'CL', 'Truflation', 'CPI', 'Volume', 'Open Interest', 'Macro', 'Hedge Funds'],

    intro: `Happy Monday to everyone. I hope you all are having a good start to your week. In this report we will be going over the charts and levels I am watching as futures contracts roll over.\n\nBe sure you are switched over to the June contracts.\n\nIn regard to my current positions, I am short the NQ heading into Tuesday’s overnight trading and will go over my analysis as to why that is and how I will be playing it. With that, let’s start with the DXY.`,

    sections: [
      {
        title: 'Volume & Open Interest',
        subtitle: 'By contract month',
        content: `Volume and open interest by expiry show where participation is concentrated and how positioning is shifting as we roll into June contracts.\n\nMarch 2026 (MAR 2026) continues to dominate volume with 609,146 total contracts (GLOBEX 607,641; PNT CLEARPORT 1,505), including EFP and EFR activity. Open interest at the close is 222,769, down 28,717 from the prior period—consistent with roll-out ahead of expiry.\n\nJune 2026 (JUN 2026) is building as the next front month, with total volume 87,121 and open interest at 51,719, up 36,498. September and December 2026 show much smaller volume and open interest; December 2029 has 1 contract open—typical back-month liquidity.\n\nOverall, the structure points to a normal roll from MAR into JUN, with liquidity and focus shifting to the next front month.`,
        images: ['/charts/weekly-03-16-2026/volume-oi.png'],
      },
      {
        title: 'DXY (US Dollar Index)',
        subtitle: 'Daily',
        content: `The dollar has struggled to see continuation above the previous year low at 100.157. We have seen DXY trade toward that level and even take a deviation above it (a fake out) on March 12—eight times now.\n\nThe last few daily bull bars on DXY have come from risk-off sentiment in global markets amid increased tension around the Iran/US–Israel conflict. Those macro tensions have also pushed CL to spike above 100 in the last few trading days; it has since cooled toward 94.\n\nWith this uncertainty—and with uncertainty around the AI trade—jobs have cooled. [According](https://x.com/byHeatherLong/status/2029915324951527800) to Heather Long, Chief Economist at Navy Federal, “The US economy has LOST jobs since April 2025.” She notes that total job gains from May 2025 to February 2026 are now -19,000, and that “Companies are not hiring in the face of all of these headwinds and uncertainty. And even healthcare is starting to slow down.” Her post is embedded below.\n\nThe question for DXY now is whether we can reclaim above the previous year low and build a solid base to trade higher.\n\nFundamentally, with lower rates, inflation easing since Trump’s inauguration (Truflation sitting at 1.54%), and the broader shift in how the dollar is acting as the global currency as the U.S. has in recent months lost close partners, that is a bigger-picture recipe for a lower DXY. But short-term noise can interfere: if we continue to see risk-off in US indices and equities, the DXY will most likely continue to hold higher for the time being.\n\nAfter the DXY ran the PYL (previous year low), the daily structure has remained in a short-term bullish trend. I will be watching this structure to validate a potential shift. For now my bias for short-term DXY remains neutral to bullish.`,
        images: ['/charts/weekly-03-16-2026/dxy-daily.png'],
        tweetUrl: 'https://x.com/byHeatherLong/status/2029915324951527800',
      },
      {
        title: 'Truflation US CPI',
        subtitle: 'Year over year, updating daily',
        content: `The Truflation US CPI Inflation Index (TruCPI-US) offers a high-frequency read on inflation. As noted above, Truflation is sitting at 1.54% year over year—inflation has been lowering since Trump’s inauguration, and this context is relevant for the Fed, rates, and the dollar. The BLS-reported rate is 2.40%; the year-to-date range is 0.68% (YTD low) to 1.95% (YTD high).`,
        images: ['/charts/weekly-03-16-2026/truflation-cpi.png'],
      },
      {
        title: 'Crude Oil (CL)',
        subtitle: 'Daily — NYMEX',
        content: `Macro tensions around Iran/US–Israel have driven CL to spike above 100 in recent trading days; it has since cooled toward 94. As of the chart snapshot, price is near 94.34 (open 94.41, high 94.64, low 93.88, close 94.34). How CL behaves around current levels and the recent high will be key for trend continuation versus a deeper correction.`,
        images: ['/charts/weekly-03-16-2026/cl-daily.png'],
      },
      {
        title: 'Hedge Fund Positioning',
        subtitle: 'Goldman Sachs prime brokerage data',
        content: `Over the last few trading weeks, hedge funds have increased their exposure to being short the indices as a hedge. Goldman Sachs’ prime brokerage has reported that hedge funds boosted short positions in equity index and ETF “macro products” to the highest share of gross market value since September 2022, placing index-related shorts in roughly the 93rd percentile of the past five years. In the week through March 6 alone, hedge funds increased short positions in equity ETFs by about 8.3%—a weekly pace of bearish deployment that has been exceeded only once in the last five years, underscoring how aggressively they have been adding index-linked hedges into the recent volatility.\n\nThis does not necessarily indicate that markets will crash lower, but it can point to a potential slower grind down rather than a fast drop, as hedge funds appear to be keeping stock while hedging short and viewing this as a short-term macro issue.`,
      },
      {
        title: 'US Indices (ES & NQ)',
        subtitle: 'Daily — same view on NQ',
        content: `Let’s dive into the US indices now. On the ES daily chart, my view here is the same on NQ. The market opened with an initial gap down, but it was very short-lived as that was the low of the day after.\n\nES had a move up toward the previous bar high (Friday’s high) but was unable to run the high, while NQ, YM, and RTY were able to trade above the prior bar high. This will be a key level to watch: if the market starts to fade lower after this move. That is what happened when Jensen Huang, during a press conference, said that NVDA revenue is expected to surpass $1 trillion by 2027. The market had an initial rally to this, which caused NQ to run the previous bar high, but it was very short-lived and traded back inside the daily range.\n\nWith this move, this gives me the idea that we are seeing hedge funds and institutions take advantage of these rallies to hedge their overall equities exposure. This is the short-term trend I am trying to play along with.\n\nI am looking for a move lower on ES toward the November lows. NQ has already run that; I would like to see ES play catch-up here rather than a divergence play back up.`,
        images: ['/charts/weekly-03-16-2026/es-daily.png'],
      },
      {
        title: 'Closing',
        subtitle: '',
        content: `This is a shorter report, but I wanted to give my thoughts today to help guide myself this week—and you the reader as well. I will continue to update you all in the chat here, and if you have any questions please feel free to reach out.`,
      },
    ],
  },

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
