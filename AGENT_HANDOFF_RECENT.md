# Primate Research — Comprehensive Agent Handoff (Recent Work)

This document is the **single source of truth** for what was changed recently, why it was changed, and what a future agent should verify before making more edits.

Use this when returning to the project after context loss.

---

## 0) Project context

- Stack: Next.js 16 (App Router), TypeScript, Tailwind CSS.
- Repo: `NoticeTrades/primate-research`
- Primary branch: `main`
- Current recent head in this workstream: `6397e73`
- Deployment target: Vercel

---

## 1) High-level outcome of recent sessions

Recent work focused on:

1. **Homepage visual behavior and animation polish**
   - Top dark-blue gradient tuning.
   - Research/Video section glow tuning.
   - Scroll reveal behavior iteration (staggered -> grouped reveal).
   - Eliminating visual “pop-in” artifacts.

2. **Latest content card reliability on refresh**
   - Moved latest-content acquisition from client-side fetch to server-side load for first render.

3. **Favicon/icon stack cleanup**
   - Moved to static favicon assets and metadata wiring.

4. **About section spacing + divider consistency**
   - Divider placement and section spacing tuned to match requested rhythm.

5. **Research/dashboard quality-of-life fixes from earlier in sequence**
   - Dynamic research list API for dashboard sidebar freshness.
   - Market overview daily % fixes.
   - Valuation modal/history improvements and fallback logic.

---

## 2) Recent commit timeline (most relevant)

From newest to older:

- `6397e73` — Home: animate full research/video card frame with scroll reveal; tighten About top spacing
- `a3111c1` — Home: SSR latest block, stricter scroll reveal, About spacing
- `76a7fcc` — Homepage: group scroll reveal (no stagger), About rule above heading
- `198e7ef` — Homepage: page fade-in, fix stagger flash on load, About title rule
- `2fadb9c` — Homepage: slight bump to page blue band and research/video halos
- `904c4f5` — Homepage: slower stagger reveal, dial back blue (older approach)
- `ae818bf` — Homepage: match latest-card glow on research/video blocks, stagger scroll-in (older approach)
- `0eb925f` — Use static favicon assets, restore homepage blue gradient
- `cfaff2b` — round favicon/apple icon route versions (later superseded by static files)

Important: several animation approaches were tried; the **current** implementation is grouped reveal via `ScrollRevealGrid`.

---

## 3) Current homepage architecture (IMPORTANT)

## 3.1 Server/client split

- `app/page.tsx` is now a **server component** wrapper:
  - Loads latest card data using `getLatestContentForHome()`.
  - Renders `HomeClient` with `initialLatestContent`.
- `app/HomeClient.tsx` is the interactive client component with:
  - page fade-in logic
  - hero/research/videos/about/footer rendering
  - latest card click routing behavior

### Why this split exists

Previously, latest card data came from a client fetch to `/api/latest-content`, causing the card to appear late and “pop in” after refresh. SSR preload removes that visual bug.

## 3.2 Latest card data source

- Shared logic is in `lib/latest-content.ts`:
  - compares latest `researchArticles[0]` vs latest DB video (`videos` table by `created_at`)
  - returns a normalized `LatestContentPayload`
- API route `app/api/latest-content/route.ts` now just calls the shared helper and returns JSON.

This keeps API and SSR behavior consistent.

## 3.3 Scroll reveal behavior (current)

- Component: `app/components/ScrollRevealGrid.tsx`
- Behavior:
  - reveals blocks as **one unit** (not one-by-one stagger)
  - uses `IntersectionObserver` with stricter trigger (`intersectionRatio >= 0.2`, `rootMargin: '0px 0px -14% 0px'`)
  - respects `prefers-reduced-motion`
  - uses `useLayoutEffect` + `isEnoughVisible()` to avoid load/refresh flash

### Critical design decision

`ScrollRevealGrid` now wraps the **full shell** of each section (glow + dark panel + grid), not just the inner card grid. This was done to avoid a “random black background appears first” effect.

## 3.4 Current visual classes to know

In `app/HomeClient.tsx`:

- Root background gradient:
  - `bg-gradient-to-b from-zinc-950 via-blue-950/36 to-zinc-950`
- Research/Video glow halo:
  - `from-blue-600/[0.10] via-blue-500/[0.05] to-blue-600/[0.10]`
  - opacity around `0.42` (`hover: 0.55`)
- Dark panel behind grids:
  - `bg-zinc-900/95 border-zinc-800`

## 3.5 About section spacing/dividers (current)

- About section container currently uses:
  - `className="pt-28 pb-24 px-6 relative"`
- About heading is preceded by a top divider wrapper:
  - `border-t ... pt-12`
- Mission section below has its own divider:
  - `border-t ... pt-12`

Spacing was tuned to reduce gap between Videos -> About while keeping About -> Mission visually balanced.

---

## 4) Favicon / app icons (current, authoritative)

Current implementation uses static files + metadata references.

### Files

- `app/favicon.ico`
- `public/favicon_192x192.png`
- `public/favicon_512x512.png`

### Metadata wiring

`app/layout.tsx` has:

- `icons.icon` with `/favicon.ico` and `/favicon_192x192.png`
- `icons.shortcut` -> `/favicon.ico`
- `icons.apple` -> `/favicon_512x512.png`
- cache-bust query strings are present (`?v=20260324-4`)

### Important history note

`app/icon.tsx` and `app/apple-icon.tsx` were deleted in favor of static assets to avoid route-based icon rendering inconsistencies.

---

## 5) Other key functional changes made in this broader window

These were implemented before the latest homepage polish and may matter during future edits:

1. **Dashboard sidebar research freshness**
   - `app/api/research/list/route.ts`
   - `app/components/DashboardSidebar.tsx`
   - Goal: newly published reports appear without stale static bundle behavior.

2. **Market overview daily % accuracy**
   - `app/api/market-overview/route.ts`
   - Adjusted daily alignment/dedupe and live futures handling.

3. **Valuation UX/data improvements**
   - `app/dashboard/valuation/page.tsx`
   - `lib/valuation-pe-history.ts`
   - Modal alignment/history range/fallback handling improved.

4. **Research card/content UX**
   - `app/components/ResearchCard.tsx`
   - `app/research/[slug]/page.tsx`
   - Description trimming + Read More behavior adjustments.

5. **Ticker inline enhancements in reports**
   - `app/components/ReportContentWithTickers.tsx`
   - popular tickers, daily % coloring, hover pricing behavior.

---

## 6) Known gotchas for future agents

1. **Homepage visual tweaks are sensitive to perceived timing**
   - Small changes to `rootMargin`, thresholds, or transition duration can make reveals trigger too early/late.

2. **Do not reintroduce client fetch for latest card unless intentionally needed**
   - It can bring back refresh pop-in.

3. **Section shell vs grid-only animation matters**
   - If only the inner grid is animated, user may perceive the dark shell as “random pop.”

4. **Favicon caching can mislead QA**
   - Browser aggressively caches favicon assets; query version and hard refresh might be needed.

5. **Git push may intermittently timeout in tool environment**
   - Retry usually succeeds; in worst case user can push locally.

---

## 7) Files a new agent should open first (fast onboarding)

### Homepage + animation

- `app/page.tsx`
- `app/HomeClient.tsx`
- `app/components/ScrollRevealGrid.tsx`
- `app/globals.css`

### Latest card data flow

- `lib/latest-content.ts`
- `app/api/latest-content/route.ts`
- `data/research.ts`

### Icons

- `app/layout.tsx`
- `app/favicon.ico`
- `public/favicon_192x192.png`
- `public/favicon_512x512.png`

---

## 8) If user asks for “make homepage animation feel better”

Recommended safe knobs (in order):

1. Change `durationMs` on `ScrollRevealGrid` usage in `app/HomeClient.tsx`
2. Adjust `intersectionRatio` threshold in `ScrollRevealGrid.tsx` (small increments)
3. Adjust `rootMargin` bottom inset (`-14%` -> `-10%` / `-18%`)
4. Only then touch transform distance (`translate-y-8`) and easing

Avoid changing everything at once.

---

## 9) Validation checklist after homepage edits

Run:

- `npm run build`
- Manual checks:
  - hard refresh at top of home page
  - refresh while scrolled near research/videos sections
  - confirm latest card appears immediately (no delayed mount)
  - confirm research/videos are hidden before trigger and reveal when reached
  - confirm About spacing rhythm vs Mission divider

---

## 10) Quick status summary for next session

- Home page uses server-loaded latest card and grouped scroll reveal.
- Favicon stack is static-file based and metadata wired.
- Visual design intent:
  - dark base
  - subtle blue middle gradient
  - subtle halo around research/videos
  - synchronized reveal of section shell + cards.

If behavior regresses, compare against commits:
- visual reveal sync: `6397e73`
- SSR latest card + strict reveal baseline: `a3111c1`

---

Keep this file updated whenever behavior or implementation strategy changes.
