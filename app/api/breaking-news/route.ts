import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type BreakingItem = { title: string; url: string; time: string; source: string; sentiment: string };

/** Parse RSS XML and return first few items (title, link). */
async function fetchRssFallback(): Promise<BreakingItem[]> {
  try {
    const res = await fetch('https://finance.yahoo.com/news/rssindex', {
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PrimateResearch/1.0)' },
    });
    const xml = await res.text();
    const items: BreakingItem[] = [];
    // Match <item>...</item> with <title>, <link>, optional <pubDate>
    const itemRegex = /<item>[\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>[\s\S]*?<link>([^<]+)<\/link>[\s\S]*(?:<pubDate>([^<]*)<\/pubDate>)?[\s\S]*?<\/item>/gi;
    let m;
    while ((m = itemRegex.exec(xml)) !== null && items.length < 3) {
      const title = m[1].replace(/<[^>]+>/g, '').trim();
      const url = m[2].trim();
      const pubDate = m[3] ? m[3].trim() : '';
      if (title && url) items.push({ title, url, time: pubDate, source: 'Yahoo Finance', sentiment: '' });
    }
    return items;
  } catch {
    return [];
  }
}

/** Fetch latest market/financial news from Alpha Vantage, with RSS fallback. */
export async function GET() {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  let items: BreakingItem[] = [];

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
        items = feed.slice(0, 3).map((item: { title?: string; url?: string; time_published?: string; source?: string; overall_sentiment_label?: string }) => ({
          title: typeof item.title === 'string' ? item.title : '',
          url: typeof item.url === 'string' ? item.url : '',
          time: typeof item.time_published === 'string' ? item.time_published : '',
          source: typeof item.source === 'string' ? item.source : '',
          sentiment: typeof item.overall_sentiment_label === 'string' ? item.overall_sentiment_label : '',
        }));
      }
    } catch (e) {
      console.error('[breaking-news] Alpha Vantage', e);
    }
  }

  if (items.length === 0) {
    items = await fetchRssFallback();
  }

  return NextResponse.json(
    { items },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}
