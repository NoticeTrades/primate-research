import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type SocialPost = {
  id: string;
  text: string;
  createdAt: string;
  url: string;
  account: string;
};

function parseRssDate(s: string): string {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

async function fetchViaXApi(account: string, bearerToken: string, limit: number): Promise<SocialPost[]> {
  const token = decodeURIComponent(bearerToken.trim());
  const authHeader = { Authorization: `Bearer ${token}` };
  const userRes = await fetch(`https://api.twitter.com/2/users/by/username/${encodeURIComponent(account)}`, {
    cache: 'no-store',
    headers: authHeader,
  });
  if (!userRes.ok) return [];
  const userData = await userRes.json();
  const userId = userData?.data?.id;
  if (!userId) return [];

  const tweetsRes = await fetch(
    `https://api.twitter.com/2/users/${userId}/tweets?max_results=${Math.min(10, Math.max(1, limit))}&tweet.fields=created_at,text`,
    { cache: 'no-store', headers: authHeader }
  );
  if (!tweetsRes.ok) return [];
  const tweetsData = await tweetsRes.json();
  const rows = Array.isArray(tweetsData?.data) ? tweetsData.data : [];
  return rows.slice(0, limit).map((t: { id?: string; text?: string; created_at?: string }) => ({
    id: t.id || '',
    text: (t.text || '').trim(),
    createdAt: t.created_at || '',
    url: t.id ? `https://x.com/${account}/status/${t.id}` : `https://x.com/${account}`,
    account,
  })).filter((p: SocialPost) => p.id && p.text);
}

async function fetchViaNitterRss(account: string, limit: number): Promise<SocialPost[]> {
  const rssUrl = `https://nitter.net/${encodeURIComponent(account)}/rss`;
  const res = await fetch(rssUrl, {
    cache: 'no-store',
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PrimateResearch/1.0)' },
  });
  if (!res.ok) return [];
  const xml = await res.text();
  const posts: SocialPost[] = [];
  const itemRegex = /<item>[\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>[\s\S]*?<link>([^<]+)<\/link>[\s\S]*?<pubDate>([^<]*)<\/pubDate>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRegex.exec(xml)) !== null && posts.length < limit) {
    const text = m[1].replace(/<[^>]+>/g, '').trim();
    const url = m[2].trim();
    const createdAt = parseRssDate(m[3].trim());
    const idMatch = /status\/(\d+)/.exec(url);
    const id = idMatch?.[1] || `${account}-${posts.length}`;
    if (text && url.startsWith('http')) {
      posts.push({ id, text, createdAt, url, account });
    }
  }
  return posts;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const account = (searchParams.get('account') || process.env.DASHBOARD_X_ACCOUNT || 'spectatorindex').replace(/^@/, '');
  const limit = Math.min(6, Math.max(1, parseInt(searchParams.get('limit') || '3', 10) || 3));
  const bearer = process.env.X_BEARER_TOKEN ?? process.env.TWITTER_BEARER_TOKEN;

  try {
    let posts: SocialPost[] = [];
    let source: 'x-api' | 'nitter-rss' | 'none' = 'none';

    if (bearer) {
      posts = await fetchViaXApi(account, bearer, limit);
      if (posts.length > 0) source = 'x-api';
    }
    if (posts.length === 0) {
      posts = await fetchViaNitterRss(account, limit);
      if (posts.length > 0) source = 'nitter-rss';
    }

    return NextResponse.json(
      { account, source, posts },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch {
    return NextResponse.json({ account, source: 'none', posts: [] as SocialPost[] }, { status: 200 });
  }
}

