/**
 * ETF/fundamental-style ratios via Alpha Vantage OVERVIEW (free tier API key).
 * Use when Yahoo Finance blocks server-side requests.
 */

import type { TtmSnapshot } from './valuation-fmp';

/** In-memory cache so parallel/sequential symbol fetches don’t hammer the 5 calls/min free tier. */
const overviewCache = new Map<string, { at: number; snapshot: TtmSnapshot | null }>();
const OVERVIEW_TTL_MS = 90_000;

function parseNum(s: unknown): number | null {
  if (s == null || s === 'None') return null;
  if (typeof s === 'number' && Number.isFinite(s)) return s;
  const n = parseFloat(String(s).trim());
  return Number.isFinite(n) ? n : null;
}

/**
 * OVERVIEW returns string fields: PERatio, PEGRatio, DividendYield, PriceToBookRatio, etc.
 */
export async function fetchAlphaVantageEtfValuation(symbol: string): Promise<TtmSnapshot | null> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY?.trim();
  if (!apiKey) return null;

  const sym = symbol.trim().toUpperCase();
  const now = Date.now();
  const cached = overviewCache.get(sym);
  if (cached && now - cached.at < OVERVIEW_TTL_MS) {
    return cached.snapshot;
  }

  const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodeURIComponent(sym)}&apikey=${encodeURIComponent(apiKey)}`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    if (data.Note || data.Information || data['Error Message']) {
      overviewCache.set(sym, { at: now, snapshot: null });
      return null;
    }

    const peRatio = parseNum(data.PERatio);
    const forwardPe = parseNum(data.ForwardPE);
    const pbRatio = parseNum(data.PriceToBookRatio);
    const pegRatio = parseNum(data.PEGRatio);
    let dividendYieldPct = parseNum(data.DividendYield);
    if (dividendYieldPct != null && dividendYieldPct > 0 && dividendYieldPct <= 1) {
      dividendYieldPct = dividendYieldPct * 100;
    }
    const priceToSalesRatio = parseNum(data.PriceToSalesRatioTTM);
    const enterpriseValueMultiple = parseNum(data.EVToEBITDA);

    const earningsYieldPct =
      peRatio != null && peRatio > 0 ? 100 / peRatio : null;

    if (
      peRatio == null &&
      pbRatio == null &&
      dividendYieldPct == null &&
      forwardPe == null &&
      priceToSalesRatio == null &&
      pegRatio == null &&
      enterpriseValueMultiple == null
    ) {
      overviewCache.set(sym, { at: now, snapshot: null });
      return null;
    }

    const snap: TtmSnapshot = {
      peRatio,
      pbRatio,
      dividendYieldPct,
      earningsYieldPct,
      priceToSalesRatio: priceToSalesRatio ?? null,
      enterpriseValueMultiple: enterpriseValueMultiple ?? null,
      pegRatio: pegRatio ?? null,
      forwardPe: forwardPe ?? null,
      date: new Date().toISOString().slice(0, 10),
    };
    overviewCache.set(sym, { at: now, snapshot: snap });
    return snap;
  } catch {
    overviewCache.set(sym, { at: now, snapshot: null });
    return null;
  }
}
