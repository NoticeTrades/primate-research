/**
 * Free ETF valuation snapshots via Yahoo Finance quoteSummary (unofficial; no API key).
 * Use for live trailing P/E, P/B, yields when paid fundamentals APIs are unavailable.
 */

import type { TtmSnapshot } from './valuation-fmp';

const YAHOO_HEADERS = {
  Accept: 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

/** Yahoo often wraps numbers as `{ raw: number }` or `{ fmt: string }`. */
function yahooNum(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (v && typeof v === 'object' && v !== null && 'raw' in v) {
    const r = (v as { raw: unknown }).raw;
    if (typeof r === 'number' && Number.isFinite(r)) return r;
  }
  return null;
}

/** Dividend yield may be 0.015 for 1.5% — normalize to percentage points. */
function yahooDividendYieldPct(v: unknown): number | null {
  const n = yahooNum(v);
  if (n == null) return null;
  if (n > 0 && n <= 1) return n * 100;
  return n;
}

/**
 * Fetch live valuation-style ratios for an ETF/stock ticker.
 * Returns null if Yahoo blocks the request or data is missing.
 */
export async function fetchYahooEtfValuationSnapshot(symbol: string): Promise<TtmSnapshot | null> {
  const sym = symbol.trim().toUpperCase();
  if (!sym) return null;

  const modules = 'summaryDetail,defaultKeyStatistics,financialData';
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(sym)}?modules=${modules}`;

  try {
    const res = await fetch(url, {
      headers: YAHOO_HEADERS,
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      quoteSummary?: { result?: Array<Record<string, unknown>>; error?: unknown };
    };
    const err = json?.quoteSummary?.error;
    if (err) return null;
    const row = json?.quoteSummary?.result?.[0];
    if (!row || typeof row !== 'object') return null;

    const summaryDetail = (row.summaryDetail ?? {}) as Record<string, unknown>;
    const defaultKeyStatistics = (row.defaultKeyStatistics ?? {}) as Record<string, unknown>;
    const financialData = (row.financialData ?? {}) as Record<string, unknown>;

    const peRatio =
      yahooNum(summaryDetail.trailingPE) ??
      yahooNum(defaultKeyStatistics.trailingPE) ??
      yahooNum(defaultKeyStatistics.peRatio);

    const forwardPe = yahooNum(summaryDetail.forwardPE) ?? yahooNum(defaultKeyStatistics.forwardPE);

    const pbRatio =
      yahooNum(summaryDetail.priceToBook) ??
      yahooNum(defaultKeyStatistics.priceToBook);

    const dividendYieldPct =
      yahooDividendYieldPct(summaryDetail.dividendYield) ??
      yahooDividendYieldPct(defaultKeyStatistics.dividendYield);

    const priceToSalesRatio = yahooNum(financialData.priceToSalesTrailing12Months);

    const pegRatio = yahooNum(defaultKeyStatistics.pegRatio);

    const enterpriseValueMultiple =
      yahooNum(defaultKeyStatistics.enterpriseToEbitda) ?? yahooNum(financialData.enterpriseToEbitda);

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
      return null;
    }

    return {
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
  } catch {
    return null;
  }
}
