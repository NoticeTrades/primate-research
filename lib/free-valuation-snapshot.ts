/**
 * Best-effort free valuation snapshot chain:
 * Yahoo Finance -> ETFDB -> Alpha Vantage OVERVIEW.
 */

import { fetchAlphaVantageEtfValuation } from './alpha-vantage-valuation';
import { fetchEtfdbValuationSnapshot } from './etfdb-valuation';
import { fetchYahooEtfValuationSnapshot, isEmptySnapshot } from './yahoo-valuation';
import type { TtmSnapshot } from './valuation-fmp';

export async function fetchFreeEtfValuationSnapshot(symbol: string): Promise<TtmSnapshot | null> {
  const y = await fetchYahooEtfValuationSnapshot(symbol);
  if (y && !isEmptySnapshot(y)) return y;
  const e = await fetchEtfdbValuationSnapshot(symbol);
  if (e && !isEmptySnapshot(e)) return e;
  const av = await fetchAlphaVantageEtfValuation(symbol);
  if (av && !isEmptySnapshot(av)) return av;
  return y ?? e ?? av ?? null;
}
