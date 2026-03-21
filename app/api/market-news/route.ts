import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type MarketNewsItem = {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  publishedTs: number;
};

const DEFAULT_QUERY =
  '(stock market OR Nasdaq OR S&P 500 OR Dow Jones OR Apple OR Microsoft OR Nvidia OR Amazon OR Meta OR Tesla OR geopolitics OR war OR sanctions OR oil supply)';

function decodeXml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function cleanTag(value: string): string {
  return decodeXml(value.replace(/<[^>]+>/g, '').trim());
}

function scoreTitle(title: string): number {
  const t = title.toLowerCase();
  let score = 0;
  if (/\b(nvidia|apple|microsoft|amazon|meta|tesla|google|alphabet)\b/.test(t)) score += 3;
  if (/\b(geopolitic|war|missile|conflict|sanction|tariff|opec|oil|middle east|russia|china)\b/.test(t)) score += 3;
  if (/\b(nasdaq|s&p|dow|russell|stocks|equities|futures|market)\b/.test(t)) score += 2;
  return score;
}

function toTimestamp(value: string): number {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

function parseRss(xml: string, limit: number, preferRelevant: boolean): MarketNewsItem[] {
  const items: MarketNewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;

  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1];
    const titleMatch = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/i);
    const sourceMatch = block.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
    const pubDateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);

    const title = titleMatch ? cleanTag(titleMatch[1]) : '';
    const url = linkMatch ? cleanTag(linkMatch[1]) : '';
    const source = sourceMatch ? cleanTag(sourceMatch[1]) || 'Google News' : 'Google News';
    const publishedAt = pubDateMatch ? cleanTag(pubDateMatch[1]) : '';
    const publishedTs = toTimestamp(publishedAt);

    if (!title || !url || !url.startsWith('http')) continue;
    items.push({ title, url, source, publishedAt, publishedTs });
  }

  const byTitle = new Map<string, MarketNewsItem>();
  for (const item of items) {
    if (!byTitle.has(item.title)) byTitle.set(item.title, item);
  }
  const unique = [...byTitle.values()];
  // Always keep newest first; default feed also lightly boosts market/geopolitical relevance.
  unique.sort((a, b) => {
    if (b.publishedTs !== a.publishedTs) return b.publishedTs - a.publishedTs;
    if (preferRelevant) return scoreTitle(b.title) - scoreTitle(a.title);
    return 0;
  });

  let filtered = unique;
  if (preferRelevant) {
    const relevant = unique.filter((item) => scoreTitle(item.title) >= 2);
    if (relevant.length >= Math.min(6, limit)) filtered = relevant;
  }
  return filtered.slice(0, limit);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawQuery = (searchParams.get('q') || '').trim();
  const isDefaultFeed = rawQuery.length === 0;
  const q = rawQuery.length > 0 ? `${rawQuery} when:7d` : `${DEFAULT_QUERY} when:3d`;
  const limit = Math.min(25, Math.max(5, parseInt(searchParams.get('limit') || '12', 10) || 12));

  try {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
    const res = await fetch(rssUrl, {
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PrimateResearch/1.0)' },
    });
    if (!res.ok) return NextResponse.json({ items: [] as MarketNewsItem[] }, { status: 200 });
    const xml = await res.text();
    const items = parseRss(xml, limit, isDefaultFeed).map(({ publishedTs, ...item }) => item);
    return NextResponse.json(
      { items, query: rawQuery },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch {
    return NextResponse.json({ items: [] as MarketNewsItem[], query: rawQuery }, { status: 200 });
  }
}

