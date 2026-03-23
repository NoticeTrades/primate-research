/**
 * ETFDB fallback for ETF valuation ratios (no API key).
 * Pulls P/E ratio and annual dividend yield from public ETF profile pages.
 */

import type { TtmSnapshot } from './valuation-fmp';

const ETFDB_HEADERS: Record<string, string> = {
  Accept: 'text/html,application/xhtml+xml',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

function normalizeText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseNum(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const n = parseFloat(raw.replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

/**
 * Pattern example from ETFDB text:
 * "SPY Valuation ... SPY P/E Ratio 24.43 ... SPY Dividend ... Annual Dividend Yield 1.12%"
 */
function parseEtfdbValuation(text: string, symbol: string): TtmSnapshot | null {
  const s = symbol.toUpperCase();

  const peMatch =
    text.match(new RegExp(`${s}\\s+Valuation[\\s\\S]*?${s}\\s+P/E Ratio\\s+([0-9]+(?:\\.[0-9]+)?)`, 'i')) ??
    text.match(new RegExp(`${s}\\s+P/E Ratio\\s+([0-9]+(?:\\.[0-9]+)?)`, 'i')) ??
    text.match(new RegExp(`P/E Ratio\\s+([0-9]+(?:\\.[0-9]+)?)`, 'i'));

  const divMatch =
    text.match(/Annual Dividend Yield\s+([0-9]+(?:\.[0-9]+)?)%/i) ??
    text.match(/Dividend Yield\s+([0-9]+(?:\.[0-9]+)?)%/i);

  const pbMatch =
    text.match(new RegExp(`${s}\\s+P/B Ratio\\s+([0-9]+(?:\\.[0-9]+)?)`, 'i')) ??
    text.match(/P\/B Ratio\s+([0-9]+(?:\.[0-9]+)?)/i) ??
    text.match(/Price\/Book\s+([0-9]+(?:\.[0-9]+)?)/i);

  const forwardMatch =
    text.match(new RegExp(`${s}\\s+Forward P/E\\s+([0-9]+(?:\\.[0-9]+)?)`, 'i')) ??
    text.match(/Forward P\/E\s+([0-9]+(?:\.[0-9]+)?)/i);

  const peRatio = parseNum(peMatch?.[1]);
  const dividendYieldPct = parseNum(divMatch?.[1]);
  const pbRatio = parseNum(pbMatch?.[1]);
  const forwardPe = parseNum(forwardMatch?.[1]);
  const earningsYieldPct = peRatio != null && peRatio > 0 ? 100 / peRatio : null;

  if (peRatio == null && dividendYieldPct == null) return null;

  return {
    peRatio,
    pbRatio,
    dividendYieldPct,
    earningsYieldPct,
    priceToSalesRatio: null,
    enterpriseValueMultiple: null,
    pegRatio: null,
    forwardPe,
    date: new Date().toISOString().slice(0, 10),
  };
}

export async function fetchEtfdbValuationSnapshot(symbol: string): Promise<TtmSnapshot | null> {
  const sym = symbol.trim().toUpperCase();
  if (!sym) return null;
  const url = `https://etfdb.com/etf/${encodeURIComponent(sym)}/`;

  try {
    const res = await fetch(url, {
      headers: ETFDB_HEADERS,
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const html = await res.text();
    if (!html || html.length < 2000) return null;
    const text = normalizeText(html);
    return parseEtfdbValuation(text, sym);
  } catch {
    return null;
  }
}
