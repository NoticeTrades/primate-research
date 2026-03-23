import type { TtmSnapshot } from '../lib/valuation-fmp';

/**
 * Last-resort baseline valuations so the page is never empty if providers block requests.
 * Seeded from public ETF valuation pages and meant as approximate context only.
 */
export const STATIC_VALUATION_BASELINE: Record<string, TtmSnapshot> = {
  SPY: {
    peRatio: 24.43,
    forwardPe: 21.2,
    pbRatio: 5.4,
    dividendYieldPct: 1.12,
    earningsYieldPct: 100 / 24.43,
    priceToSalesRatio: 2.85,
    enterpriseValueMultiple: 17.5,
    pegRatio: 1.85,
    date: '2026-03-20',
  },
  QQQ: {
    peRatio: 31.89,
    forwardPe: 27.5,
    pbRatio: 8.2,
    dividendYieldPct: 0.48,
    earningsYieldPct: 100 / 31.89,
    priceToSalesRatio: 7.1,
    enterpriseValueMultiple: 22.0,
    pegRatio: 1.65,
    date: '2026-03-20',
  },
  DIA: {
    peRatio: 21.04,
    forwardPe: 19.0,
    pbRatio: 4.1,
    dividendYieldPct: 1.5,
    earningsYieldPct: 100 / 21.04,
    priceToSalesRatio: 2.1,
    enterpriseValueMultiple: 14.8,
    pegRatio: 1.9,
    date: '2026-03-20',
  },
  IWM: {
    peRatio: 18.32,
    forwardPe: 16.5,
    pbRatio: 2.35,
    dividendYieldPct: 1.05,
    earningsYieldPct: 100 / 18.32,
    priceToSalesRatio: 1.45,
    enterpriseValueMultiple: 13.2,
    pegRatio: 1.55,
    date: '2026-03-20',
  },
};
