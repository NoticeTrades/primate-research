/**
 * ETF / equity valuation ratios via Twelve Data (same key as TWELVE_DATA_API_KEY used elsewhere).
 * Often works from cloud IPs when Yahoo quoteSummary is blocked.
 *
 * Docs: https://twelvedata.com/docs#statistics
 */

import type { TtmSnapshot } from './valuation-fmp';
import { isEmptySnapshot } from './yahoo-valuation';

const TD_CACHE = new Map<string, { at: number; snap: TtmSnapshot | null }>();
const TTL_MS = 90_000;

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Flatten Twelve Data statistics / nested objects into lowercase_snake keys → number */
function flattenStatistics(obj: unknown, prefix = '', out: Map<string, number> = new Map()): Map<string, number> {
  if (obj == null) return out;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (item && typeof item === 'object' && 'name' in item && 'value' in item) {
        const name = String((item as { name: unknown }).name)
          .toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[^a-z0-9_]/g, '');
        const v = num((item as { value: unknown }).value);
        if (name && v != null) out.set(prefix + name, v);
      } else {
        flattenStatistics(item, prefix, out);
      }
    }
    return out;
  }
  if (typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const key = k.toLowerCase().replace(/\s+/g, '_');
      if (typeof v === 'number' || typeof v === 'string') {
        const n = num(v);
        if (n != null) out.set(prefix + key, n);
      } else if (v && typeof v === 'object') {
        flattenStatistics(v, prefix + key + '_', out);
      }
    }
  }
  return out;
}

function pickFromFlat(m: Map<string, number>, patterns: RegExp[]): number | null {
  for (const [k, v] of m) {
    for (const p of patterns) {
      if (p.test(k)) return v;
    }
  }
  return null;
}

export async function fetchTwelveDataValuationSnapshot(symbol: string): Promise<TtmSnapshot | null> {
  const apiKey = process.env.TWELVE_DATA_API_KEY?.trim();
  if (!apiKey) return null;

  const sym = symbol.trim().toUpperCase();
  const now = Date.now();
  const hit = TD_CACHE.get(sym);
  if (hit && now - hit.at < TTL_MS) return hit.snap;

  const url = `https://api.twelvedata.com/statistics?symbol=${encodeURIComponent(sym)}&apikey=${encodeURIComponent(apiKey)}`;

  try {
    const signal =
      typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
        ? AbortSignal.timeout(14_000)
        : undefined;
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      ...(signal ? { signal } : {}),
    });
    if (!res.ok) {
      TD_CACHE.set(sym, { at: now, snap: null });
      return null;
    }
    const data = (await res.json()) as Record<string, unknown>;
    if (data.status === 'error' || data.code != null) {
      TD_CACHE.set(sym, { at: now, snap: null });
      return null;
    }

    const statsRoot = data.statistics ?? data;
    const flat = flattenStatistics(statsRoot);

    const peRatio = pickFromFlat(flat, [
      /^trailing_pe$/,
      /^pe_ratio$/,
      /^price_to_earnings$/,
      /^pe_ttm$/,
      /trailing.*pe/,
      /^p_e_ratio$/,
    ]);
    const forwardPe = pickFromFlat(flat, [/^forward_pe$/, /^forward_p_e$/, /forward.*pe/]);
    const pbRatio = pickFromFlat(flat, [/^price_to_book$/, /^pb_ratio$/, /^p_b_ratio$/]);
    let dividendYieldPct = pickFromFlat(flat, [/^dividend_yield$/, /^dividend_yield_pct$/]);
    if (dividendYieldPct != null && dividendYieldPct > 0 && dividendYieldPct <= 1) {
      dividendYieldPct = dividendYieldPct * 100;
    }
    const pegRatio = pickFromFlat(flat, [/^peg_ratio$/, /^peg$/]);
    const priceToSalesRatio = pickFromFlat(flat, [/^price_to_sales$/, /^p_s_ratio$/, /^price_to_sales_ratio$/]);
    const enterpriseValueMultiple = pickFromFlat(flat, [
      /^enterprise_to_ebitda$/,
      /^ev_to_ebitda$/,
      /^ev\/ebitda$/,
    ]);

    const earningsYieldPct = peRatio != null && peRatio > 0 ? 100 / peRatio : null;

    let snap: TtmSnapshot | null = {
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

    const empty =
      peRatio == null &&
      pbRatio == null &&
      dividendYieldPct == null &&
      forwardPe == null &&
      priceToSalesRatio == null &&
      pegRatio == null &&
      enterpriseValueMultiple == null;

    /** Some plans expose valuation fields on `quote` but not `statistics`. */
    if (empty) {
      const qUrl = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(sym)}&apikey=${encodeURIComponent(apiKey)}`;
      const qRes = await fetch(qUrl, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        ...(signal ? { signal } : {}),
      });
      if (qRes.ok) {
        const qd = (await qRes.json()) as Record<string, unknown>;
        if (qd.status !== 'error' && qd.code == null) {
          const qFlat = flattenStatistics(qd);
          const qPe = pickFromFlat(qFlat, [/^pe$/, /^trailing_pe$/, /^p_e$/]);
          const qPb = pickFromFlat(qFlat, [/^pb$/, /^price_to_book$/]);
          let qDiv = pickFromFlat(qFlat, [/^dividend_yield$/]);
          if (qDiv != null && qDiv > 0 && qDiv <= 1) qDiv = qDiv * 100;
          if (qPe != null || qPb != null || qDiv != null) {
            snap = {
              peRatio: qPe,
              forwardPe: null,
              pbRatio: qPb,
              dividendYieldPct: qDiv,
              earningsYieldPct: qPe != null && qPe > 0 ? 100 / qPe : null,
              priceToSalesRatio: null,
              enterpriseValueMultiple: null,
              pegRatio: null,
              date: new Date().toISOString().slice(0, 10),
            };
          }
        }
      }
    }

    if (isEmptySnapshot(snap)) {
      TD_CACHE.set(sym, { at: now, snap: null });
      return null;
    }

    TD_CACHE.set(sym, { at: now, snap: snap });
    return snap;
  } catch {
    TD_CACHE.set(sym, { at: now, snap: null });
    return null;
  }
}
