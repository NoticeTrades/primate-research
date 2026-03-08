import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type OverviewCacheEntry = { name: string; sector: string; marketCap: number; ts: number };
const OVERVIEW_CACHE = new Map<string, OverviewCacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const SECTOR_OPTIONS = [
  'Technology',
  'Healthcare',
  'Financial Services',
  'Consumer Cyclical',
  'Consumer Defensive',
  'Industrials',
  'Basic Materials',
  'Energy',
  'Utilities',
  'Real Estate',
  'Communication Services',
  'Unknown',
] as const;

/** Normalize Alpha Vantage / GICS sector names to a single canonical form for filtering. */
function normalizeSector(s: string): string {
  const t = (s || '').trim();
  if (!t || t === '—') return '—';
  if (t.toLowerCase() === 'unknown') return '—';
  const lower = t.toLowerCase();
  if (lower.includes('information technology') || lower === 'technology') return 'Technology';
  if (lower.includes('health') || lower.includes('life science')) return 'Healthcare';
  if (lower.includes('financial') || lower === 'finance') return 'Financial Services';
  if (lower.includes('consumer cyclical') || lower.includes('consumer discretionary')) return 'Consumer Cyclical';
  if (lower.includes('consumer defensive') || lower.includes('consumer staple')) return 'Consumer Defensive';
  if (lower.includes('industrial')) return 'Industrials';
  if (lower.includes('basic material')) return 'Basic Materials';
  if (lower.includes('energy')) return 'Energy';
  if (lower.includes('utilit')) return 'Utilities';
  if (lower.includes('real estate')) return 'Real Estate';
  if (lower.includes('communication')) return 'Communication Services';
  return t;
}

async function fetchOverview(symbol: string): Promise<OverviewCacheEntry | null> {
  const cached = OVERVIEW_CACHE.get(symbol);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached;
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`,
      { cache: 'no-store' }
    );
    const data = await res.json();
    const name = typeof data?.Name === 'string' ? data.Name : symbol;
    const sector = typeof data?.Sector === 'string' ? data.Sector : '—';
    const cap = data?.MarketCapitalization;
    const marketCap = typeof cap === 'string' ? parseFloat(cap) : typeof cap === 'number' ? cap : 0;
    const entry: OverviewCacheEntry = { name, sector, marketCap, ts: Date.now() };
    OVERVIEW_CACHE.set(symbol, entry);
    return entry;
  } catch {
    return null;
  }
}

export type MostActiveRow = {
  ticker: string;
  name: string;
  price: number;
  changePercent: number;
  change: number;
  volume: number;
  volumeDollar: number;
  marketCap: number;
  sector: string;
};

export async function GET(request: Request) {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: 'Alpha Vantage API key not configured',
        hint: 'Add ALPHA_VANTAGE_API_KEY to your environment variables (e.g. in Vercel: Project → Settings → Environment Variables). Get a free key at https://www.alphavantage.co/support/#api-key',
      },
      { status: 503 }
    );
  }
  const { searchParams } = new URL(request.url);
  const type = (searchParams.get('type') || 'active').toLowerCase(); // active | gainers | losers | value
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));
  const sector = searchParams.get('sector') || 'all'; // all or specific sector

  try {
    const res = await fetch(
      `https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=${apiKey}`,
      { cache: 'no-store' }
    );
    const data = await res.json();
    if (data['Note'] || data['Information']) {
      return NextResponse.json(
        { error: data['Note'] || data['Information'] || 'Rate limit or API error' },
        { status: 429 }
      );
    }
    const rawGainers = Array.isArray(data.top_gainers) ? data.top_gainers : [];
    const rawLosers = Array.isArray(data.top_losers) ? data.top_losers : [];
    const rawActive = Array.isArray(data.most_actively_traded) ? data.most_actively_traded : [];

    let rawList: typeof rawActive;
    if (type === 'gainers') rawList = rawGainers;
    else if (type === 'losers') rawList = rawLosers;
    else if (type === 'value') {
      rawList = [...rawActive]
        .map((r: { ticker?: string; price?: string; volume?: string }) => {
          const p = parseFloat(String(r.price || 0)) || 0;
          const v = parseFloat(String(r.volume || 0)) || 0;
          return { ...r, _volDollar: p * v };
        })
        .sort((a: { _volDollar?: number }, b: { _volDollar?: number }) => (b._volDollar || 0) - (a._volDollar || 0));
    } else rawList = rawActive;

    const slice = rawList.slice(0, limit);
    const symbols = [
      ...new Set(
        slice
          .map((r: { ticker?: string }) => String(r.ticker || '').trim())
          .filter((s: unknown): s is string => typeof s === 'string' && s.length > 0)
      ),
    ] as string[];
    const overviews = await Promise.all(symbols.map((s) => fetchOverview(s)));

    const overviewBySymbol = new Map<string, OverviewCacheEntry | null>();
    symbols.forEach((s, i) => overviewBySymbol.set(s, overviews[i] ?? null));

    const rows: MostActiveRow[] = slice.map((r: Record<string, unknown>) => {
      const ticker = String(r.ticker || '').trim();
      const price = parseFloat(String(r.price || 0)) || 0;
      const change = parseFloat(String(r.change_amount || 0)) || 0;
      const changePercent = parseFloat(String(r.change_percentage || 0).replace('%', '')) || 0;
      const volume = parseFloat(String(r.volume || 0)) || 0;
      const volumeDollar = price * volume;
      const ov = overviewBySymbol.get(ticker);
      const rawSector = ov?.sector ?? '—';
      return {
        ticker,
        name: ov?.name || ticker,
        price,
        changePercent,
        change,
        volume,
        volumeDollar,
        marketCap: ov?.marketCap ?? 0,
        sector: normalizeSector(rawSector),
      };
    });

    let filtered = rows;
    if (sector !== 'all' && sector !== '') {
      const normalizedFilter = normalizeSector(sector);
      filtered = rows.filter((row) => row.sector === normalizedFilter);
    }

    const fromData = rows.map((r) => r.sector).filter((s): s is string => Boolean(s) && s !== '—');
    const hasUnknown = rows.some((r) => r.sector === '—');
    const fromSet = new Set(fromData);
    if (hasUnknown) fromSet.add('Unknown');
    SECTOR_OPTIONS.forEach((s) => fromSet.add(s));
    const sectors = ['All', ...[...fromSet].sort()];

    return NextResponse.json({
      data: filtered,
      sectors,
    });
  } catch (e) {
    console.error('[most-active]', e);
    return NextResponse.json({ error: 'Failed to fetch most active data' }, { status: 500 });
  }
}
