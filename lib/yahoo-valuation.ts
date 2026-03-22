/**
 * Free ETF valuation snapshots via Yahoo Finance (unofficial; no API key).
 * quoteSummary is often blocked or empty from server IPs — v7 /finance/quote is more reliable (see sector-performance, indices routes).
 */

import type { TtmSnapshot } from './valuation-fmp';

const YAHOO_HEADERS: Record<string, string> = {
  Accept: 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

function withReferer(symbol: string): Record<string, string> {
  const s = encodeURIComponent(symbol);
  return {
    ...YAHOO_HEADERS,
    Referer: `https://finance.yahoo.com/quote/${s}`,
  };
}

/** Yahoo often wraps numbers as `{ raw: number }` or `{ fmt: string }`. */
function yahooNum(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
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

export function isEmptySnapshot(t: TtmSnapshot | null): boolean {
  if (!t) return true;
  return (
    t.peRatio == null &&
    t.pbRatio == null &&
    t.dividendYieldPct == null &&
    t.forwardPe == null &&
    t.priceToSalesRatio == null &&
    t.pegRatio == null &&
    t.enterpriseValueMultiple == null
  );
}

/** v10 quoteSummary — richer when Yahoo allows it. */
async function fetchQuoteSummarySnapshot(symbol: string): Promise<TtmSnapshot | null> {
  const sym = symbol.trim().toUpperCase();
  const modules = 'summaryDetail,defaultKeyStatistics,financialData';
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(sym)}?modules=${modules}`;

  try {
    const res = await fetch(url, {
      headers: withReferer(sym),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      quoteSummary?: { result?: Array<Record<string, unknown>>; error?: unknown };
    };
    if (json?.quoteSummary?.error) return null;
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
      yahooNum(summaryDetail.priceToBook) ?? yahooNum(defaultKeyStatistics.priceToBook);

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

/**
 * v7 quote — same endpoint as sector-performance / nav bar; often returns trailingPE, forwardPE, priceToBook for ETFs.
 */
function parseV7QuoteRow(q: Record<string, unknown>): TtmSnapshot | null {
  const peRatio =
    yahooNum(q.trailingPE) ??
    yahooNum(q.trailingPe) ??
    yahooNum((q as { trailing_pe?: unknown }).trailing_pe);
  const forwardPe =
    yahooNum(q.forwardPE) ?? yahooNum(q.forwardPe) ?? yahooNum((q as { forward_pe?: unknown }).forward_pe);
  const pbRatio = yahooNum(q.priceToBook) ?? yahooNum(q.priceToBookRatio);
  const dividendYieldPct = yahooDividendYieldPct(q.dividendYield) ?? yahooDividendYieldPct((q as { yield?: unknown }).yield);
  const pegRatio = yahooNum(q.pegRatio);
  const priceToSalesRatio = yahooNum(q.priceToSalesTrailing12Months);
  const enterpriseValueMultiple = yahooNum(q.enterpriseToEbitda);

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
}

async function fetchV7QuoteSnapshot(symbol: string, host: 'query1' | 'query2'): Promise<TtmSnapshot | null> {
  const sym = symbol.trim().toUpperCase();
  const base = host === 'query1' ? 'query1.finance.yahoo.com' : 'query2.finance.yahoo.com';
  const url = `https://${base}/v7/finance/quote?symbols=${encodeURIComponent(sym)}`;

  try {
    const res = await fetch(url, {
      headers: withReferer(sym),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { quoteResponse?: { result?: Array<Record<string, unknown>> } };
    const q = json?.quoteResponse?.result?.[0];
    if (!q || typeof q !== 'object') return null;
    return parseV7QuoteRow(q);
  } catch {
    return null;
  }
}

function mergeSnapshots(a: TtmSnapshot | null, b: TtmSnapshot | null): TtmSnapshot | null {
  if (isEmptySnapshot(a) && isEmptySnapshot(b)) return null;
  if (isEmptySnapshot(a)) return b;
  if (isEmptySnapshot(b)) return a;
  const x = a as TtmSnapshot;
  const y = b as TtmSnapshot;
  return {
    peRatio: x.peRatio ?? y.peRatio,
    pbRatio: x.pbRatio ?? y.pbRatio,
    dividendYieldPct: x.dividendYieldPct ?? y.dividendYieldPct,
    earningsYieldPct: x.earningsYieldPct ?? y.earningsYieldPct,
    priceToSalesRatio: x.priceToSalesRatio ?? y.priceToSalesRatio,
    enterpriseValueMultiple: x.enterpriseValueMultiple ?? y.enterpriseValueMultiple,
    pegRatio: x.pegRatio ?? y.pegRatio,
    forwardPe: x.forwardPe ?? y.forwardPe,
    date: x.date ?? y.date,
  };
}

/**
 * Fetch live valuation-style ratios for an ETF/stock ticker.
 * Tries quoteSummary + v7 quote (query1 & query2) and merges results.
 */
export async function fetchYahooEtfValuationSnapshot(symbol: string): Promise<TtmSnapshot | null> {
  const sym = symbol.trim().toUpperCase();
  if (!sym) return null;

  const [fromSummary, fromV7q1, fromV7q2] = await Promise.all([
    fetchQuoteSummarySnapshot(sym),
    fetchV7QuoteSnapshot(sym, 'query1'),
    fetchV7QuoteSnapshot(sym, 'query2'),
  ]);

  let merged = mergeSnapshots(fromSummary, fromV7q1);
  merged = mergeSnapshots(merged, fromV7q2);

  if (merged && !isEmptySnapshot(merged)) return merged;

  /** Last resort: simpler User-Agent (some edge networks behave differently). */
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(sym)}`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; PrimateResearch/1.0)',
        Referer: `https://finance.yahoo.com/quote/${encodeURIComponent(sym)}`,
      },
      cache: 'no-store',
    });
    if (res.ok) {
      const json = (await res.json()) as { quoteResponse?: { result?: Array<Record<string, unknown>> } };
      const q = json?.quoteResponse?.result?.[0];
      if (q && typeof q === 'object') {
        const fallback = parseV7QuoteRow(q);
        return mergeSnapshots(merged, fallback);
      }
    }
  } catch {
    // ignore
  }

  return merged && !isEmptySnapshot(merged) ? merged : null;
}
