import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SPECTATOR_INDEX_USERNAME = 'spectatorindex';

type BreakingItem = { title: string; url: string; time: string; source: string; sentiment: string };

type SpectatorResult = { item: BreakingItem } | { error: string; status?: number; detail?: string };

/** Fetch latest tweet from @spectatorindex via X API v2. */
async function fetchSpectatorIndexTweet(bearerToken: string): Promise<SpectatorResult | null> {
  try {
    // In case token was pasted URL-encoded (e.g. %2F for /)
    const token = decodeURIComponent(bearerToken.trim());
    const authHeader = { Authorization: `Bearer ${token}` };

    const userRes = await fetch(
      `https://api.twitter.com/2/users/by/username/${SPECTATOR_INDEX_USERNAME}`,
      { cache: 'no-store', headers: authHeader }
    );
    if (!userRes.ok) {
      const errBody = await userRes.text();
      let detail: string;
      try {
        const j = JSON.parse(errBody);
        detail = j.detail ?? j.error ?? errBody.slice(0, 200);
      } catch {
        detail = errBody.slice(0, 200);
      }
      console.error('[breaking-news] X user lookup failed', userRes.status, detail);
      return { error: 'user_lookup_failed', status: userRes.status, detail };
    }
    const userData = await userRes.json();
    const userId = userData?.data?.id;
    if (!userId) {
      console.error('[breaking-news] X user lookup no id', userData);
      return { error: 'no_user_id', detail: JSON.stringify(userData).slice(0, 200) };
    }

    const tweetsRes = await fetch(
      `https://api.twitter.com/2/users/${userId}/tweets?max_results=1&tweet.fields=created_at,text`,
      { cache: 'no-store', headers: authHeader }
    );
    if (!tweetsRes.ok) {
      const errBody = await tweetsRes.text();
      let detail: string;
      try {
        const j = JSON.parse(errBody);
        detail = j.detail ?? j.error ?? errBody.slice(0, 200);
      } catch {
        detail = errBody.slice(0, 200);
      }
      console.error('[breaking-news] X tweets fetch failed', tweetsRes.status, detail);
      return { error: 'tweets_fetch_failed', status: tweetsRes.status, detail };
    }
    const tweetsData = await tweetsRes.json();
    const tweet = Array.isArray(tweetsData?.data) ? tweetsData.data[0] : null;
    if (!tweet?.id || typeof tweet.text !== 'string') {
      console.error('[breaking-news] X no tweet in response', tweetsData);
      return { error: 'no_tweet', detail: JSON.stringify(tweetsData).slice(0, 200) };
    }

    const text = tweet.text.trim();
    if (!text) return { error: 'empty_tweet' };

    const time = typeof tweet.created_at === 'string' ? tweet.created_at : '';
    const url = `https://x.com/${SPECTATOR_INDEX_USERNAME}/status/${tweet.id}`;

    return {
      item: {
        title: text,
        url,
        time,
        source: 'Spectator Index',
        sentiment: '',
      },
    };
  } catch (e) {
    console.error('[breaking-news] X/Spectator Index', e);
    return { error: 'exception', detail: e instanceof Error ? e.message : String(e) };
  }
}

/** True if headline is about: stocks down a lot / big movers, indices, forex, or crypto only. */
function isRelevant(title: string): boolean {
  const t = title.toLowerCase();
  const stockMovers = /\b(plunge|plunges|plunged|drop\s|drops|selloff|sell-off|crash|tumbles|tumbling|tumbled|dives|diving|slump|rout|correction|bear\s|down\s+\d+%|worst\s+day|sinking|sank|plummet|tank|tanking|loss|losers|meltdown)\b/;
  const indices = /\b(nasdaq|s&p|s\s*&\s*p|dow|spx|ndx|russell|index|indices|es\b|nq\b)\b/;
  const forex = /\b(forex|fx\b|dollar|euro|yen|pound|sterling|currency|currencies|dxy|eur\/usd|gbp|fed\s|interest\s+rate)\b/;
  const crypto = /\b(bitcoin|crypto|ethereum|btc\b|eth\b|solana|binance|coinbase)\b/;
  const notRelevant = /\b(macbook|iphone|ipad|airpods|celebrity|netflix series|movie)\b/;
  return !notRelevant.test(t) && (stockMovers.test(t) || indices.test(t) || forex.test(t) || crypto.test(t));
}

/** Parse a single RSS feed URL; returns items (title, link). */
async function parseRssFeed(feedUrl: string, sourceLabel: string, opts: RequestInit): Promise<BreakingItem[]> {
  const res = await fetch(feedUrl, opts);
  const xml = await res.text();
  const feedItems: BreakingItem[] = [];
  let m: RegExpExecArray | null;
  const itemRegex = /<item>[\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>[\s\S]*?<link>([^<]+)<\/link>/gi;
  while ((m = itemRegex.exec(xml)) !== null) {
    const title = m[1].replace(/<[^>]+>/g, '').trim();
    const url = m[2].trim();
    if (title && url && url.startsWith('http')) {
      feedItems.push({ title, url, time: '', source: sourceLabel, sentiment: '' });
    }
  }
  if (feedItems.length === 0) {
    const altRegex = /<item>[\s\S]*?<link>([^<]+)<\/link>[\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/gi;
    while ((m = altRegex.exec(xml)) !== null) {
      const url = m[1].trim();
      const title = m[2].replace(/<[^>]+>/g, '').trim();
      if (title && url && url.startsWith('http')) {
        feedItems.push({ title, url, time: '', source: sourceLabel, sentiment: '' });
      }
    }
  }
  return feedItems;
}

/** Fetch futures/macro news from CME Group RSS (no API key). */
async function fetchCmeRss(): Promise<BreakingItem[]> {
  const opts = { cache: 'no-store' as RequestCache, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PrimateResearch/1.0)' } };
  const urls: [string, string][] = [
    ['https://www.cmegroup.com/rss/commentary-home-insights-analysis.rss', 'CME Research'],
    ['http://feeds.feedburner.com/EconomicEventsInterestRates', 'CME Rates'],
    ['http://feeds.feedburner.com/EconomicEventsEnergy', 'CME Energy'],
  ];
  const allCandidates: BreakingItem[] = [];
  for (const [url, label] of urls) {
    try {
      const items = await parseRssFeed(url, label, opts);
      allCandidates.push(...items);
    } catch {
      continue;
    }
  }
  const byTitle = new Map<string, BreakingItem>();
  for (const c of allCandidates) {
    if (!byTitle.has(c.title)) byTitle.set(c.title, c);
  }
  const unique = [...byTitle.values()];
  const futuresFirst = [
    ...unique.filter((c) => isRelevant(c.title)),
    ...unique.filter((c) => !isRelevant(c.title)),
  ];
  return futuresFirst.slice(0, 5);
}

/** Optional: Finnhub market news (free API key at finnhub.io). */
async function fetchFinnhubNews(apiKey: string): Promise<BreakingItem[]> {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/news?category=general&minId=0&token=${encodeURIComponent(apiKey)}`,
      { cache: 'no-store' }
    );
    const data = await res.json();
    const list = Array.isArray(data) ? data : [];
    const items: BreakingItem[] = list.slice(0, 5).map((item: { headline?: string; url?: string; datetime?: number; source?: string }) => ({
      title: typeof item.headline === 'string' ? item.headline : '',
      url: typeof item.url === 'string' ? item.url : '',
      time: typeof item.datetime === 'number' ? new Date(item.datetime * 1000).toISOString() : '',
      source: typeof item.source === 'string' ? item.source : 'Finnhub',
      sentiment: '',
    }));
    return items.filter((i: BreakingItem) => i.title && i.url);
  } catch (e) {
    console.error('[breaking-news] Finnhub', e);
    return [];
  }
}

/** General RSS fallback (Yahoo, DailyFX); prefer futures-related. */
async function fetchRssFallback(): Promise<BreakingItem[]> {
  const allCandidates: BreakingItem[] = [];
  const urls: [string, string][] = [
    ['https://finance.yahoo.com/news/rssindex', 'Yahoo Finance'],
    ['https://feeds.content.dailyfx.com/xml/dailyfx_news', 'DailyFX'],
  ];
  const opts = { cache: 'no-store' as RequestCache, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PrimateResearch/1.0)' } };

  for (const [feedUrl, sourceLabel] of urls) {
    try {
      const feedItems = await parseRssFeed(feedUrl, sourceLabel, opts);
      allCandidates.push(...feedItems);
    } catch {
      continue;
    }
  }
  const byTitle = new Map<string, BreakingItem>();
  for (const c of allCandidates) {
    if (!byTitle.has(c.title)) byTitle.set(c.title, c);
  }
  const unique = [...byTitle.values()];
  const futuresFirst = [
    ...unique.filter((c) => isRelevant(c.title)),
    ...unique.filter((c) => !isRelevant(c.title)),
  ];
  return futuresFirst.slice(0, 3);
}

/** Fetch Alpha Vantage NEWS_SENTIMENT for one topic. */
async function fetchAlphaVantageTopic(apiKey: string, topic: string): Promise<BreakingItem[]> {
  const url = new URL('https://www.alphavantage.co/query');
  url.searchParams.set('function', 'NEWS_SENTIMENT');
  url.searchParams.set('topic', topic);
  url.searchParams.set('limit', '5');
  url.searchParams.set('apikey', apiKey);
  url.searchParams.set('sort', 'LATEST');
  const res = await fetch(url.toString(), { cache: 'no-store' });
  const data = await res.json();
  if (data['Note'] || data['Information']) return [];
  const feed = Array.isArray(data.feed) ? data.feed : Array.isArray((data as { news?: unknown[] }).news) ? (data as { news: unknown[] }).news : [];
  return feed.slice(0, 5).map((item: { title?: string; url?: string; time_published?: string; source?: string; overall_sentiment_label?: string }) => ({
    title: typeof item.title === 'string' ? item.title : '',
    url: typeof item.url === 'string' ? item.url : '',
    time: typeof item.time_published === 'string' ? item.time_published : '',
    source: typeof item.source === 'string' ? item.source : 'Alpha Vantage',
    sentiment: typeof item.overall_sentiment_label === 'string' ? item.overall_sentiment_label : '',
  }));
}

/** Fetch latest futures/macro breaking news: Spectator (optional), then API + CME RSS, then fallback. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const debug = searchParams.get('debug') === '1';
  const xBearerToken = process.env.X_BEARER_TOKEN ?? process.env.TWITTER_BEARER_TOKEN;
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  const finnhubKey = process.env.FINNHUB_API_KEY;
  let items: BreakingItem[] = [];
  let spectatorDebug: { status: 'ok' | 'skipped' | 'error'; message?: string } | undefined;

  // Optional: latest tweet from @spectatorindex (shown first)
  if (xBearerToken) {
    const result = await fetchSpectatorIndexTweet(xBearerToken);
    if (result && 'item' in result) {
      items.push(result.item);
      if (debug) spectatorDebug = { status: 'ok' };
    } else if (result && debug) {
      spectatorDebug = {
        status: 'error',
        message: [result.error, result.status, result.detail].filter(Boolean).join(' — '),
      };
    } else if (debug) {
      spectatorDebug = { status: 'error', message: result?.error ?? 'unknown' };
    }
  } else if (debug) {
    spectatorDebug = { status: 'skipped', message: 'X_BEARER_TOKEN not set' };
  }

  // Alpha Vantage: indices/forex (economy_macro, financial_markets) + crypto (blockchain)
  if (apiKey) {
    try {
      const [macro, financial, crypto] = await Promise.all([
        fetchAlphaVantageTopic(apiKey, 'economy_macro'),
        fetchAlphaVantageTopic(apiKey, 'financial_markets'),
        fetchAlphaVantageTopic(apiKey, 'blockchain'),
      ]);
      const combined = [...macro, ...financial, ...crypto].filter((i: BreakingItem) => i.title && i.url);
      const byTitle = new Map<string, BreakingItem>();
      for (const c of combined) {
        if (!byTitle.has(c.title)) byTitle.set(c.title, c);
      }
      const unique = [...byTitle.values()];
      const futuresFirst = [
        ...unique.filter((c) => isRelevant(c.title)),
        ...unique.filter((c) => !isRelevant(c.title)),
      ];
      items.push(...futuresFirst.slice(0, 5));
    } catch (e) {
      console.error('[breaking-news] Alpha Vantage', e);
    }
  }

  // CME Group RSS (futures/rates/energy) — no API key
  if (items.length < 5) {
    const cmeItems = await fetchCmeRss();
    const existingTitles = new Set(items.map((i) => i.title));
    for (const c of cmeItems) {
      if (items.length >= 5) break;
      if (!existingTitles.has(c.title)) {
        existingTitles.add(c.title);
        items.push(c);
      }
    }
  }

  // Optional: Finnhub market news
  if (finnhubKey && items.length < 5) {
    const fhItems = await fetchFinnhubNews(finnhubKey);
    const existingTitles = new Set(items.map((i) => i.title));
    const futuresFirst = [
      ...fhItems.filter((c) => isRelevant(c.title)),
      ...fhItems.filter((c) => !isRelevant(c.title)),
    ];
    for (const c of futuresFirst) {
      if (items.length >= 5) break;
      if (!existingTitles.has(c.title)) {
        existingTitles.add(c.title);
        items.push(c);
      }
    }
  }

  if (items.length === 0) {
    items = await fetchRssFallback();
  }

  // Prefer futures-related order; keep Spectator first if present
  const head = items[0]?.source === 'Spectator Index' ? [items[0]] : [];
  const rest = items[0]?.source === 'Spectator Index' ? items.slice(1) : items;
  const futuresFirst = [
    ...rest.filter((c) => isRelevant(c.title)),
    ...rest.filter((c) => !isRelevant(c.title)),
  ];
  items = [...head, ...futuresFirst.slice(0, 5 - head.length)];

  if (items.length === 0) {
    items = [
      {
        title: 'Stocks, indices, forex & crypto — latest moves',
        url: 'https://finance.yahoo.com/',
        time: new Date().toISOString(),
        source: 'Markets',
        sentiment: '',
      },
    ];
  }

  const body: { items: BreakingItem[]; debug?: { spectator_index?: typeof spectatorDebug } } = { items };
  if (debug && spectatorDebug) body.debug = { spectator_index: spectatorDebug };

  return NextResponse.json(body, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}
