/**
 * Best-effort free valuation snapshots:
 * Fetches Yahoo, ETFDB, and Alpha Vantage in parallel, then merges field-by-field.
 * Order of preference per field: Yahoo → Alpha Vantage → ETFDB (Yahoo usually freshest; AV when Yahoo blocks datacenter IPs).
 */

import { fetchAlphaVantageEtfValuation } from './alpha-vantage-valuation';
import { fetchEtfdbValuationSnapshot } from './etfdb-valuation';
import { fetchYahooEtfValuationSnapshot, isEmptySnapshot } from './yahoo-valuation';
import type { TtmSnapshot } from './valuation-fmp';

function pickNum(
  key: keyof TtmSnapshot,
  order: readonly (TtmSnapshot | null | undefined)[],
): number | null {
  for (const s of order) {
    if (!s) continue;
    const v = s[key];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return null;
}

/** Merge free-provider snapshots (Yahoo > Alpha Vantage > ETFDB). */
export function mergeFreeValuationSnapshots(
  yahoo: TtmSnapshot | null,
  alphaVantage: TtmSnapshot | null,
  etfdb: TtmSnapshot | null,
): TtmSnapshot | null {
  const order = [yahoo, alphaVantage, etfdb] as const;
  const peRatio = pickNum('peRatio', order);
  const forwardPe = pickNum('forwardPe', order);
  const pbRatio = pickNum('pbRatio', order);
  const dividendYieldPct = pickNum('dividendYieldPct', order);
  const priceToSalesRatio = pickNum('priceToSalesRatio', order);
  const pegRatio = pickNum('pegRatio', order);
  const enterpriseValueMultiple = pickNum('enterpriseValueMultiple', order);

  const earningsYieldPct =
    peRatio != null && peRatio > 0 ? 100 / peRatio : pickNum('earningsYieldPct', order);

  const date =
    (yahoo?.date && String(yahoo.date)) ||
    (alphaVantage?.date && String(alphaVantage.date)) ||
    (etfdb?.date && String(etfdb.date)) ||
    new Date().toISOString().slice(0, 10);

  const merged: TtmSnapshot = {
    peRatio,
    forwardPe,
    pbRatio,
    dividendYieldPct,
    earningsYieldPct,
    priceToSalesRatio,
    enterpriseValueMultiple,
    pegRatio,
    date,
  };

  if (isEmptySnapshot(merged)) return null;
  return merged;
}

export async function fetchFreeEtfValuationSnapshot(symbol: string): Promise<TtmSnapshot | null> {
  const [y, e, av] = await Promise.all([
    fetchYahooEtfValuationSnapshot(symbol),
    fetchEtfdbValuationSnapshot(symbol),
    fetchAlphaVantageEtfValuation(symbol),
  ]);
  return mergeFreeValuationSnapshots(y, av, e);
}
