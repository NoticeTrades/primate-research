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

/** True if headline looks like market/finance news (stocks, Fed, rates, earnings, etc.). */
function isMarketRelated(title: string): boolean {
  const t = title.toLowerCase();
  const marketTerms = /\b(stock|market|fed|rate|rates|earnings|trading|dollar|oil|inflation|treasury|bond|sec|recession|gdp|jobs report|employment|crude|gold|nasdaq|s&p|dow|yield|interest|housing|retail sales)\b/;
  const notMarket = /\b(macbook|iphone|ipad|airpods|galaxy|playstation|xbox|netflix series|movie|celebrity)\b/;
  return marketTerms.test(t) && !notMarket.test(t);
}

/** Parse RSS XML and return first few items (title, link), preferring market-moving headlines. */
async function fetchRssFallback(): Promise<BreakingItem[]> {
  const allCandidates: BreakingItem[] = [];
  const urls = [
    'https://finance.yahoo.com/news/rssindex',
    'https://feeds.content.dailyfx.com/xml/dailyfx_news',
  ];
  const opts = { cache: 'no-store' as RequestCache, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PrimateResearch/1.0)' } };

  for (const feedUrl of urls) {
    try {
      const res = await fetch(feedUrl, opts);
      const xml = await res.text();
      const source = feedUrl.includes('dailyfx') ? 'DailyFX' : 'Yahoo Finance';
      const feedItems: BreakingItem[] = [];
      let m: RegExpExecArray | null;
      const itemRegex = /<item>[\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>[\s\S]*?<link>([^<]+)<\/link>/gi;
      while ((m = itemRegex.exec(xml)) !== null) {
        const title = m[1].replace(/<[^>]+>/g, '').trim();
        const url = m[2].trim();
        if (title && url && url.startsWith('http')) {
          feedItems.push({ title, url, time: '', source, sentiment: '' });
        }
      }
      if (feedItems.length === 0) {
        const altRegex = /<item>[\s\S]*?<link>([^<]+)<\/link>[\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/gi;
        while ((m = altRegex.exec(xml)) !== null) {
          const url = m[1].trim();
          const title = m[2].replace(/<[^>]+>/g, '').trim();
          if (title && url && url.startsWith('http')) {
            feedItems.push({ title, url, time: '', source, sentiment: '' });
          }
        }
      }
      allCandidates.push(...feedItems);
    } catch {
      continue;
    }
  }
  // Dedupe by title, then prefer market-related, take up to 3
  const byTitle = new Map<string, BreakingItem>();
  for (const c of allCandidates) {
    if (!byTitle.has(c.title)) byTitle.set(c.title, c);
  }
  const unique = [...byTitle.values()];
  const marketFirst = [
    ...unique.filter((c) => isMarketRelated(c.title)),
    ...unique.filter((c) => !isMarketRelated(c.title)),
  ];
  return marketFirst.slice(0, 3);
}

/** Fetch latest market/financial news: optional Spectator Index tweet, then Alpha Vantage, with RSS fallback. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const debug = searchParams.get('debug') === '1';
  const xBearerToken = process.env.X_BEARER_TOKEN ?? process.env.TWITTER_BEARER_TOKEN;
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  let items: BreakingItem[] = [];
  let spectatorDebug: { status: 'ok' | 'skipped' | 'error'; message?: string } | undefined;

  // Optional: latest tweet from @spectatorindex (shown first in breaking banner)
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

  if (apiKey) {
    try {
      const url = new URL('https://www.alphavantage.co/query');
      url.searchParams.set('function', 'NEWS_SENTIMENT');
      url.searchParams.set('topic', 'financial_markets');
      url.searchParams.set('limit', '5');
      url.searchParams.set('apikey', apiKey);
      url.searchParams.set('sort', 'LATEST');

      const res = await fetch(url.toString(), { cache: 'no-store' });
      const data = await res.json();

      if (!data['Note'] && !data['Information']) {
        const feed = Array.isArray(data.feed) ? data.feed : Array.isArray((data as { news?: unknown[] }).news) ? (data as { news: unknown[] }).news : [];
        const avItems = feed.slice(0, 3).map((item: { title?: string; url?: string; time_published?: string; source?: string; overall_sentiment_label?: string }) => ({
          title: typeof item.title === 'string' ? item.title : '',
          url: typeof item.url === 'string' ? item.url : '',
          time: typeof item.time_published === 'string' ? item.time_published : '',
          source: typeof item.source === 'string' ? item.source : '',
          sentiment: typeof item.overall_sentiment_label === 'string' ? item.overall_sentiment_label : '',
        }));
        items.push(...avItems.filter((i: BreakingItem) => i.title && i.url));
      }
    } catch (e) {
      console.error('[breaking-news] Alpha Vantage', e);
    }
  }

  if (items.length === 0) {
    items = await fetchRssFallback();
  }

  // Ensure we always have at least one item so the banner can show
  if (items.length === 0) {
    items = [
      {
        title: 'Latest market news and moves',
        url: 'https://finance.yahoo.com/news/',
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
