/**
 * Company / ETF fundamentals via Finnhub (free tier available).
 * https://finnhub.io/docs/api/company-basic-financials
 */

import type { TtmSnapshot } from './valuation-fmp';

const FH_CACHE = new Map<string, { at: number; snap: TtmSnapshot | null }>();
const TTL_MS = 90_000;

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return null;
}

export async function fetchFinnhubValuationSnapshot(symbol: string): Promise<TtmSnapshot | null> {
  const token = process.env.FINNHUB_API_KEY?.trim();
  if (!token) return null;

  const sym = symbol.trim().toUpperCase();
  const now = Date.now();
  const hit = FH_CACHE.get(sym);
  if (hit && now - hit.at < TTL_MS) return hit.snap;

  const url = new URL('https://finnhub.io/api/v1/stock/metric');
  url.searchParams.set('symbol', sym);
  url.searchParams.set('metric', 'all');
  url.searchParams.set('token', token);

  try {
    const signal =
      typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
        ? AbortSignal.timeout(12_000)
        : undefined;
    const res = await fetch(url.toString(), {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      ...(signal ? { signal } : {}),
    });
    if (!res.ok) {
      FH_CACHE.set(sym, { at: now, snap: null });
      return null;
    }
    const data = (await res.json()) as { metric?: Record<string, unknown> };
    const m = data.metric;
    if (!m || typeof m !== 'object') {
      FH_CACHE.set(sym, { at: now, snap: null });
      return null;
    }

    const peRatio =
      num(m.peTTM) ?? num(m.peBasicExclExtraTTM) ?? num(m.peNormalizedAnnual) ?? num(m.peExclExtraAnnual);
    const forwardPe = num(m.forwardPE) ?? num(m.peTTMForward);
    const pbRatio = num(m.pbAnnual) ?? num(m.pbQuarterly);
    let dividendYieldPct = num(m.dividendYieldIndicatedAnnual) ?? num(m.dividendPerShareTTM);
    if (dividendYieldPct != null && dividendYieldPct > 0 && dividendYieldPct <= 1) {
      dividendYieldPct = dividendYieldPct * 100;
    }
    const pegRatio = num(m.pegTTM);
    const priceToSalesRatio = num(m.psTTM) ?? num(m.psAnnual);
    const enterpriseValueMultiple = num(m.evEbitdaTTM) ?? num(m.enterpriseValueTTM);

    const earningsYieldPct = peRatio != null && peRatio > 0 ? 100 / peRatio : null;

    if (
      peRatio == null &&
      pbRatio == null &&
      dividendYieldPct == null &&
      forwardPe == null &&
      priceToSalesRatio == null &&
      pegRatio == null &&
      enterpriseValueMultiple == null
    ) {
      FH_CACHE.set(sym, { at: now, snap: null });
      return null;
    }

    const snap: TtmSnapshot = {
      peRatio,
      forwardPe,
      pbRatio,
      dividendYieldPct,
      earningsYieldPct,
      priceToSalesRatio: priceToSalesRatio ?? null,
      enterpriseValueMultiple: enterpriseValueMultiple ?? null,
      pegRatio: pegRatio ?? null,
      date: new Date().toISOString().slice(0, 10),
    };
    FH_CACHE.set(sym, { at: now, snap: snap });
    return snap;
  } catch {
    FH_CACHE.set(sym, { at: now, snap: null });
    return null;
  }
}
