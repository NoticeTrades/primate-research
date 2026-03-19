import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type NewsItem = {
  title: string;
  url: string;
  source: string;
};

const NEWS_QUERIES: Record<string, string> = {
  NQ: 'Nasdaq 100 stocks market news',
  ES: 'S&P 500 stocks market news',
  YM: 'Dow Jones Industrial Average news',
  RTY: 'Russell 2000 stocks news',
  DAX: 'DAX index Germany stocks news',
  GER40: 'Germany 40 DAX stocks news',
  FTSE: 'FTSE 100 UK stocks news',
  DXY: 'US Dollar Index DXY forex news',
  CL: 'WTI crude oil futures news',
};

function decodeXml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseRss(xml: string, limit: number): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex =
    /<item>[\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>[\s\S]*?<link>([\s\S]*?)<\/link>[\s\S]*?<source[^>]*>([\s\S]*?)<\/source>?/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRegex.exec(xml)) !== null && items.length < limit) {
    const title = decodeXml(m[1].replace(/<[^>]+>/g, '').trim());
    const url = decodeXml(m[2].replace(/<[^>]+>/g, '').trim());
    const source = decodeXml((m[3] || 'Google News').replace(/<[^>]+>/g, '').trim()) || 'Google News';
    if (title && url && url.startsWith('http')) items.push({ title, url, source });
  }

  if (items.length > 0) return items;

  const fallbackRegex =
    /<item>[\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>[\s\S]*?<link>([\s\S]*?)<\/link>/gi;
  while ((m = fallbackRegex.exec(xml)) !== null && items.length < limit) {
    const title = decodeXml(m[1].replace(/<[^>]+>/g, '').trim());
    const url = decodeXml(m[2].replace(/<[^>]+>/g, '').trim());
    if (title && url && url.startsWith('http')) items.push({ title, url, source: 'Google News' });
  }

  return items;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const index = (searchParams.get('index') || '').toUpperCase();
  const limit = Math.min(6, Math.max(1, parseInt(searchParams.get('limit') || '4', 10) || 4));
  const query = NEWS_QUERIES[index] || `${index} market news`;

  try {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    const res = await fetch(rssUrl, {
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PrimateResearch/1.0)' },
    });
    if (!res.ok) return NextResponse.json({ items: [] as NewsItem[] }, { status: 200 });

    const xml = await res.text();
    const items = parseRss(xml, limit);
    return NextResponse.json({ index, items }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch {
    return NextResponse.json({ index, items: [] as NewsItem[] }, { status: 200 });
  }
}

