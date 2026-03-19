import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type StockMover = {
  ticker: string;
  price: number;
  changePercent: number;
  change: number;
  volume: number;
};

const INDEX_CONSTITUENTS: Record<string, string[]> = {
  NQ: ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'META', 'GOOGL', 'TSLA', 'AVGO', 'COST', 'AMD', 'NFLX', 'ADBE', 'QCOM', 'INTC', 'CSCO'],
  ES: ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'META', 'GOOGL', 'BRK-B', 'JPM', 'XOM', 'LLY', 'AVGO', 'V', 'UNH', 'PG', 'MA'],
  YM: ['AAPL', 'MSFT', 'JPM', 'UNH', 'V', 'HD', 'GS', 'MCD', 'CAT', 'IBM', 'MMM', 'DIS', 'WMT', 'NKE', 'KO'],
  RTY: ['SMCI', 'FSLR', 'CELH', 'AFRM', 'SOFI', 'CROX', 'PLTR', 'RKLB', 'UPST', 'RIVN', 'APP', 'IOT', 'DUOL', 'ONON', 'SOUN'],
  DAX: ['SAP.DE', 'SIE.DE', 'ALV.DE', 'BAS.DE', 'BMW.DE', 'MBG.DE', 'IFX.DE', 'BAYN.DE', 'DBK.DE', 'ADS.DE'],
  GER40: ['SAP.DE', 'SIE.DE', 'ALV.DE', 'BAS.DE', 'BMW.DE', 'MBG.DE', 'IFX.DE', 'BAYN.DE', 'DBK.DE', 'ADS.DE'],
  FTSE: ['SHEL.L', 'HSBA.L', 'BP.L', 'AZN.L', 'ULVR.L', 'GSK.L', 'RIO.L', 'BATS.L', 'LSEG.L', 'BARC.L'],
};

function parseNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return 0;
  const cleaned = value.replace(/%/g, '').trim();
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

async function fetchYahooConstituentMovers(index: string, limit: number): Promise<{ gainers: StockMover[]; losers: StockMover[] } | null> {
  const tickers = INDEX_CONSTITUENTS[index];
  if (!tickers || tickers.length === 0) return null;

  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(tickers.join(','))}`;
  const res = await fetch(url, {
    cache: 'no-store',
    headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; PrimateResearch/1.0)' },
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { quoteResponse?: { result?: Array<Record<string, unknown>> } };
  const rows = Array.isArray(data?.quoteResponse?.result) ? data.quoteResponse.result : [];
  if (rows.length === 0) return null;

  const movers: StockMover[] = rows
    .map((r) => {
      const ticker = String(r.symbol ?? '').trim();
      if (!ticker) return null;
      const price = parseNumber(r.regularMarketPrice);
      const changePercent = parseNumber(r.regularMarketChangePercent);
      const change = parseNumber(r.regularMarketChange);
      const volume = parseNumber(r.regularMarketVolume);
      if (!Number.isFinite(changePercent)) return null;
      return { ticker, price, changePercent, change, volume };
    })
    .filter((x): x is StockMover => x !== null);

  if (movers.length === 0) return null;

  const sorted = [...movers].sort((a, b) => b.changePercent - a.changePercent);
  const gainers = sorted.slice(0, limit);
  const losers = [...sorted].reverse().slice(0, limit);
  return { gainers, losers };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const index = (searchParams.get('index') || 'index').toUpperCase();
  const limit = Math.min(5, Math.max(1, parseInt(searchParams.get('limit') || '5', 10) || 5));

  try {
    const yahooMovers = await fetchYahooConstituentMovers(index, limit);
    if (yahooMovers) {
      return NextResponse.json(
        { index, source: 'yahoo-constituents', gainers: yahooMovers.gainers, losers: yahooMovers.losers },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { index, source: 'unavailable', gainers: [], losers: [], error: 'No free constituent data mapping for this symbol yet.' },
        { status: 200, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    const res = await fetch(
      `https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=${encodeURIComponent(apiKey)}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return NextResponse.json({ error: 'Failed to fetch movers' }, { status: 500 });

    const data = (await res.json()) as Record<string, unknown>;

    if (typeof data?.['Note'] === 'string' || typeof data?.['Information'] === 'string') {
      return NextResponse.json(
        {
          error: 'Alpha Vantage rate limit reached',
          hint: typeof data?.['Note'] === 'string' ? data?.['Note'] : data?.['Information'],
        },
        { status: 429 }
      );
    }

    const rawGainers = Array.isArray(data.top_gainers) ? data.top_gainers : [];
    const rawLosers = Array.isArray(data.top_losers) ? data.top_losers : [];

    const mapRow = (r: unknown): StockMover | null => {
      if (!r || typeof r !== 'object') return null;
      const obj = r as Record<string, unknown>;
      const ticker = String(obj.ticker || '').trim();
      if (!ticker) return null;
      return {
        ticker,
        price: parseNumber(obj.price),
        changePercent: parseNumber(obj.change_percentage),
        change: parseNumber(obj.change_amount),
        volume: parseNumber(obj.volume),
      };
    };

    const gainers = rawGainers.map(mapRow).filter((x): x is StockMover => x != null).slice(0, limit);
    const losers = rawLosers.map(mapRow).filter((x): x is StockMover => x != null).slice(0, limit);

    return NextResponse.json(
      { index, source: 'alpha-marketwide', gainers, losers },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch {
    return NextResponse.json({ error: 'Failed to fetch movers' }, { status: 500 });
  }
}

