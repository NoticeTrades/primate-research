# Recent developments — handoff for new agents

This document summarizes **recent work** (valuation dashboard, data sources, Vercel fixes, and UX) so a new agent can continue without re-reading full threads.

**Stack reminder:** Next.js 16 (App Router), TypeScript, Tailwind, deployed on **Vercel**.

---

## 1. Dashboard shell & macro pages (earlier in thread)

- **Dashboard layout** uses a shared shell with **left navigation** (`DashboardShell` / `DashboardNavDrawer`-style pattern — see `app/dashboard/` layout).
- **`/dashboard/inflation`** — CPI from FRED (`/api/cpi`), chart + trend copy.
- **`/dashboard/unemployment`** — jobs/unemployment context (paired with inflation in product narrative).

Paths to explore: `app/dashboard/`, `app/api/cpi/`, `data/` for dashboard copy.

---

## 2. Valuation dashboard (`/dashboard/valuation`)

### Purpose

- Show **ETF proxies** for major indices: **SPY, QQQ, DIA, IWM** — trailing/forward P/E, P/B, yields, P/S, PEG, EV/EBITDA where available.
- **Historical P/E chart** — long-run market context + per-card “Chart P/E trend” modal.

### Data pipeline (`GET /api/valuation`)

**Order of resolution:**

1. **Financial Modeling Prep (FMP)** — if `FMP_API_KEY` / `FINANCIAL_MODELING_PREP_API_KEY` (see `lib/valuation-fmp.ts` `getFmpKey()`) is set **and** the plan returns usable key-metrics:
   - Quarterly history → period table + “Trailing P/E (quarterly)” chart when `hasHistoricalMultiples`.
   - **Best** for authoritative per-ETF quarterly P/E history.

2. **If FMP fails or is partial (e.g. 402 / empty):** **hybrid** merge:
   - Keep any FMP `history` / `ttm` returned.
   - Fill gaps with **free provider** snapshots merged per field.

3. **Free “merged” snapshot** (`lib/free-valuation-snapshot.ts`):
   - Fetches in parallel **per symbol**, then merges with this **field priority**:
     **Twelve Data → Finnhub → Yahoo → Alpha Vantage → ETFDB**
   - **Staggered** sequential symbol loop (~450ms) in the API to avoid rate limits (especially Alpha Vantage).

4. **Last resort:** `STATIC_VALUATION_BASELINE` in `data/valuation-static.ts` — labeled **reference snapshot / not live** in the UI.

### New / alternative sources (added to reduce reliance on Yahoo + FMP)

| Source | Env var | Role |
|--------|---------|------|
| **Twelve Data** | `TWELVE_DATA_API_KEY` | `statistics` (+ `quote` fallback) — often works from serverless when Yahoo is flaky. `lib/twelve-data-valuation.ts` |
| **Finnhub** | `FINNHUB_API_KEY` | `stock/metric` — `lib/finnhub-valuation.ts` |
| Yahoo | (none) | `lib/yahoo-valuation.ts` — quoteSummary + v7 quote, retries, timeouts |
| ETFDB | (none) | scrape HTML — `lib/etfdb-valuation.ts` — P/E, div yield, optional P/B / forward |
| Alpha Vantage | `ALPHA_VANTAGE_API_KEY` | `OVERVIEW` — `lib/alpha-vantage-valuation.ts` — **90s cache** per symbol |

### Historical long-run P/E (FRED + fallback)

- **`lib/valuation-pe-history.ts`** — tries FRED series (e.g. trailing P/E candidates, then **CAPE**) via `lib/fred-observations.ts`.
- **If FRED is unreachable** (blocked egress, timeout): **embedded sparse monthly anchors** (~2015–2025) so the chart is **not empty** — clearly labeled as **approximate / not official FRED** in API + UI copy.
- FRED fetches use **`AbortSignal.timeout(12s)`** to avoid hanging.

### API response extras

- `dataSource`: `'financialmodelingprep.com/stable' | 'yahoo_finance' | 'static_baseline' | 'blended'`
- `hasHistoricalMultiples` — FMP quarterly history present
- `hasHistoricalPe` — long-run series present (FRED or embedded)
- `historicalPe`, `historicalPeDisclaimer`
- `liveDataHints` — string[] explaining what to configure (FMP, FRED, Twelve Data, Finnhub, etc.)
- `snapshotNote` / banners — **reference snapshot** when static baseline is used

### Vercel build fix (critical)

- **`/api/valuation`** must not run long network work during `next build` (was hitting **~60s** route limit).
- Fixes applied:
  - `export const dynamic = 'force-dynamic'`, `revalidate = 0`, `maxDuration = 60`
  - Early **`NEXT_PHASE === 'phase-production-build'`** response: static placeholder, **no network**
  - FRED skip during build inside `fetchSp500PeHistoryFromFred`

### UI (`app/dashboard/valuation/page.tsx`)

- Snapshot cards; **“Chart P/E trend”** opens a **modal** with:
  - FMP quarterly P/E when `history` exists for that symbol
  - Else **FRED** (or embedded) series as **S&P 500 proxy** + disclaimer
- Separate **long-run FRED/embedded** section with range selector (5y / 10y / 20y / max).
- **Blended** mode: violet banner; **free-only** mode: sky banner; **static**: neutral “Reference snapshot”.

### Copy / education

- `data/dashboard-getting-started.ts` — valuation section mentions **Twelve Data + Finnhub** first for serverless, FMP optional for quarterly history.
- User-facing strings avoid blaming users for “missing API keys” in harsh wording where possible; hints are in `liveDataHints`.

---

## 3. Files to read first (valuation)

| Area | Files |
|------|--------|
| API | `app/api/valuation/route.ts` |
| Free merge | `lib/free-valuation-snapshot.ts` |
| Yahoo | `lib/yahoo-valuation.ts` |
| Twelve Data | `lib/twelve-data-valuation.ts` |
| Finnhub | `lib/finnhub-valuation.ts` |
| ETFDB | `lib/etfdb-valuation.ts` |
| Alpha Vantage | `lib/alpha-vantage-valuation.ts` |
| FMP helpers | `lib/valuation-fmp.ts` |
| FRED | `lib/fred-observations.ts` |
| P/E history | `lib/valuation-pe-history.ts` |
| Static fallback | `data/valuation-static.ts` |
| Index metadata | `data/valuation-indices.ts` |
| Page | `app/dashboard/valuation/page.tsx` |

---

## 4. Environment variables (valuation-relevant)

```
FMP_API_KEY or FINANCIAL_MODELING_PREP_API_KEY   # optional; best for quarterly history
TWELVE_DATA_API_KEY                              # recommended on Vercel
FINNHUB_API_KEY                                  # free tier available
ALPHA_VANTAGE_API_KEY                            # backup; rate limited
FRED_API_KEY                                     # optional; else public CSV graph export
```

---

## 5. Known limitations / follow-ups

- **Per-ETF** true quarterly P/E history without FMP is **hard**; Finnhub/Twelve Data help for **point-in-time** ratios, not always full multi-year quarterly series.
- **Embedded P/E** is a **last-resort** visual only — not a substitute for FRED when compliance matters.
- **Git push** from the agent environment sometimes **fails**; user may need to run `git push origin main` locally.
- If charts are still empty: check Vercel **outbound** access to `fred.stlouisfed.org` and provider APIs; verify env vars are set.

---

## 6. Suggested next steps for a new agent

1. Confirm production `/api/valuation` JSON: `dataSource`, `indices[].ttm`, `historicalPe`, `liveDataHints`.
2. If users need **guaranteed** live numbers: prioritize **Twelve Data + Finnhub** in Vercel env, then FMP for history.
3. Consider **reducing duplicate banners** on the valuation page if UX feels noisy (blended + free + hints).
4. Optional: add **server-side logging** (debug flag) for which provider filled each field (no secrets in logs).

---

*Last updated from development handoff — keep this file in sync when valuation behavior changes.*
