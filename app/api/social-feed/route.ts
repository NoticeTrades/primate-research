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

const ACCOUNT_ALIASES: Record<string, string> = {
  spectaorindex: 'spectatorindex',
};

function parseRssDate(s: string): string {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

function stripXml(s: string): string {
  return s.replace(/<[^>]+>/g, '').trim();
}

function parseRssItems(xml: string, limit: number): SocialPost[] {
  const posts: SocialPost[] = [];
  // RSS item: title + link + optional pubDate.
  const itemRegex =
    /<item>[\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>[\s\S]*?<link>([^<]+)<\/link>(?:[\s\S]*?<pubDate>([^<]*)<\/pubDate>)?[\s\S]*?<\/item>/gi;

  let m: RegExpExecArray | null;
  while ((m = itemRegex.exec(xml)) !== null && posts.length < limit) {
    const titleRaw = typeof m[1] === 'string' ? m[1] : '';
    const linkRaw = typeof m[2] === 'string' ? m[2] : '';
    const pubRaw = typeof m[3] === 'string' ? m[3] : '';
    const text = stripXml(titleRaw);
    const url = linkRaw.trim();
    if (!text || !url || !url.startsWith('http')) continue;
    const createdAt = pubRaw ? parseRssDate(pubRaw.trim()) : '';
    const idMatch = /status\/(\d+)/.exec(url);
    const id = idMatch?.[1] || `${url}-${posts.length}`;
    posts.push({ id, text, createdAt, url, account: '' });
  }

  return posts;
}

async function fetchViaRssHub(account: string, limit: number): Promise<SocialPost[]> {
  const candidates = [
    `https://rsshub.app/twitter/user/${encodeURIComponent(account)}`,
    `https://rsshub.app/twitter/user/${encodeURIComponent(account)}?limit=${limit}`,
  ];

  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        cache: 'no-store',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PrimateResearch/1.0)' },
      });
      if (!res.ok) continue;
      const xml = await res.text();
      const parsed = parseRssItems(xml, limit);
      if (parsed.length === 0) continue;
      // Patch account field since parseRssItems does not know it.
      return parsed.map((p) => ({ ...p, account }));
    } catch {
      continue;
    }
  }

  return [];
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
  const bases = [
    'https://nitter.net',
    'https://nitter.poast.org',
    'https://nitter.privacydev.net',
    'https://nitter.1d4.us',
    'https://nitter.switchblade.xyz',
  ];

  for (const base of bases) {
    try {
      const rssUrl = `${base}/${encodeURIComponent(account)}/rss`;
      const res = await fetch(rssUrl, {
        cache: 'no-store',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PrimateResearch/1.0)' },
      });
      if (!res.ok) continue;
      const xml = await res.text();
      const posts: SocialPost[] = [];

      const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
      for (const block of itemBlocks) {
        if (posts.length >= limit) break;

        const titleMatch = /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i.exec(block);
        const linkMatch = /<link>([^<]+)<\/link>/i.exec(block);
        const pubMatch = /<pubDate>([^<]+)<\/pubDate>/i.exec(block);

        const titleRaw = titleMatch?.[1] || '';
        const text = stripXml(titleRaw);
        const url = (linkMatch?.[1] || '').trim();
        const createdAt = pubMatch?.[1] ? parseRssDate(pubMatch[1].trim()) : '';

        if (!text || !url || !url.startsWith('http')) continue;
        const idMatch = /status\/(\d+)/.exec(url);
        const id = idMatch?.[1] || `${account}-${posts.length}`;
        posts.push({ id, text, createdAt, url, account });
      }

      if (posts.length > 0) return posts;
    } catch {
      continue;
    }
  }

  return [];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = (searchParams.get('account') || process.env.DASHBOARD_X_ACCOUNT || 'spectatorindex').replace(/^@/, '').toLowerCase();
  const account = ACCOUNT_ALIASES[raw] || raw;
  const limit = Math.min(6, Math.max(1, parseInt(searchParams.get('limit') || '3', 10) || 3));
  const bearer = process.env.X_BEARER_TOKEN ?? process.env.TWITTER_BEARER_TOKEN;

  try {
    let posts: SocialPost[] = [];
    let source: 'x-api' | 'nitter-rss' | 'rsshub-rss' | 'none' = 'none';

    if (bearer) {
      posts = await fetchViaXApi(account, bearer, limit);
      if (posts.length > 0) source = 'x-api';
    }
    if (posts.length === 0) {
      posts = await fetchViaNitterRss(account, limit);
      if (posts.length > 0) source = 'nitter-rss';
    }
    if (posts.length === 0) {
      posts = await fetchViaRssHub(account, limit);
      if (posts.length > 0) source = 'rsshub-rss';
    }

    return NextResponse.json(
      { account, source, posts, hasToken: Boolean(bearer) },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch {
    return NextResponse.json({ account, source: 'none', hasToken: Boolean(bearer), posts: [] as SocialPost[] }, { status: 200 });
  }
}

