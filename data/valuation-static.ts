import type { TtmSnapshot } from '../lib/valuation-fmp';

/**
 * Last-resort baseline valuations so the page is never empty if providers block requests.
 * Seeded from public ETF valuation pages and meant as approximate context only.
 */
export const STATIC_VALUATION_BASELINE: Record<string, TtmSnapshot> = {
  SPY: {
    peRatio: 24.43,
    forwardPe: null,
    pbRatio: null,
    dividendYieldPct: 1.12,
    earningsYieldPct: 100 / 24.43,
    priceToSalesRatio: null,
    enterpriseValueMultiple: null,
    pegRatio: null,
    date: '2026-03-20',
  },
  QQQ: {
    peRatio: 31.89,
    forwardPe: null,
    pbRatio: null,
    dividendYieldPct: 0.48,
    earningsYieldPct: 100 / 31.89,
    priceToSalesRatio: null,
    enterpriseValueMultiple: null,
    pegRatio: null,
    date: '2026-03-20',
  },
  DIA: {
    peRatio: 21.04,
    forwardPe: null,
    pbRatio: null,
    dividendYieldPct: 1.5,
    earningsYieldPct: 100 / 21.04,
    priceToSalesRatio: null,
    enterpriseValueMultiple: null,
    pegRatio: null,
    date: '2026-03-20',
  },
  IWM: {
    peRatio: 18.32,
    forwardPe: null,
    pbRatio: null,
    dividendYieldPct: 1.05,
    earningsYieldPct: 100 / 18.32,
    priceToSalesRatio: null,
    enterpriseValueMultiple: null,
    pegRatio: null,
    date: '2026-03-20',
  },
};
