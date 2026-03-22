/**
 * Best-effort free valuation snapshot: Yahoo Finance first, then Alpha Vantage OVERVIEW.
 */

import { fetchAlphaVantageEtfValuation } from './alpha-vantage-valuation';
import { fetchYahooEtfValuationSnapshot, isEmptySnapshot } from './yahoo-valuation';
import type { TtmSnapshot } from './valuation-fmp';

export async function fetchFreeEtfValuationSnapshot(symbol: string): Promise<TtmSnapshot | null> {
  const y = await fetchYahooEtfValuationSnapshot(symbol);
  if (y && !isEmptySnapshot(y)) return y;
  const av = await fetchAlphaVantageEtfValuation(symbol);
  if (av && !isEmptySnapshot(av)) return av;
  return y ?? av ?? null;
}
