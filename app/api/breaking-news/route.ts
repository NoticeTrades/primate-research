import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** Fetch latest market/financial news from Alpha Vantage for breaking-news alert. */
export async function GET() {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ items: [], hint: 'ALPHA_VANTAGE_API_KEY not set' }, { status: 200 });
  }

  try {
    const url = new URL('https://www.alphavantage.co/query');
    url.searchParams.set('function', 'NEWS_SENTIMENT');
    url.searchParams.set('topic', 'financial_markets');
    url.searchParams.set('limit', '5');
    url.searchParams.set('apikey', apiKey);
    url.searchParams.set('sort', 'LATEST');

    const res = await fetch(url.toString(), { cache: 'no-store' });
    const data = await res.json();

    if (data['Note'] || data['Information']) {
      return NextResponse.json(
        { items: [], error: data['Note'] || data['Information'] },
        { status: 200 }
      );
    }

    const feed = Array.isArray(data.feed) ? data.feed : Array.isArray((data as { news?: unknown[] }).news) ? (data as { news: unknown[] }).news : [];
    const items = feed.slice(0, 3).map((item: { title?: string; url?: string; time_published?: string; source?: string; overall_sentiment_label?: string }) => ({
      title: typeof item.title === 'string' ? item.title : '',
      url: typeof item.url === 'string' ? item.url : '',
      time: typeof item.time_published === 'string' ? item.time_published : '',
      source: typeof item.source === 'string' ? item.source : '',
      sentiment: typeof item.overall_sentiment_label === 'string' ? item.overall_sentiment_label : '',
    }));

    return NextResponse.json(
      { items },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (e) {
    console.error('[breaking-news]', e);
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}
