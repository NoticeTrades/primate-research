import { NextRequest, NextResponse } from 'next/server';
import { fetchFredSeries } from '../../../lib/fred-observations';

export const dynamic = 'force-dynamic';

/** FRED series we combine for the unemployment dashboard */
const SERIES = {
  UNRATE: { id: 'UNRATE', label: 'U-3 unemployment rate', unit: '%', frequency: 'monthly' as const },
  U6RATE: { id: 'U6RATE', label: 'U-6 (broad) unemployment', unit: '%', frequency: 'monthly' as const },
  /** CBO / Fed concept — longer-run anchor; quarterly */
  NROU: { id: 'NROU', label: 'Natural rate of unemployment (estimate)', unit: '%', frequency: 'quarterly' as const },
  /** Weekly jobless claims — labor-market stress */
  ICSA: { id: 'ICSA', label: 'Initial jobless claims (SA, weekly)', unit: 'level', frequency: 'weekly' as const },
} as const;

type Obs = { date: string; value: number };

function filterRange(raw: Obs[], from: string | null, to: string | null): Obs[] {
  let out = raw;
  if (from) out = out.filter((r) => r.date >= from);
  if (to) out = out.filter((r) => r.date <= to);
  return out;
}

/** Merge two monthly series by date */
function mergeMonthly(a: Obs[], b: Obs[]): Array<{ date: string; unrate: number | null; u6: number | null }> {
  const map = new Map<string, { unrate: number | null; u6: number | null }>();
  for (const o of a) {
    const row = map.get(o.date) ?? { unrate: null, u6: null };
    row.unrate = o.value;
    map.set(o.date, row);
  }
  for (const o of b) {
    const row = map.get(o.date) ?? { unrate: null, u6: null };
    row.u6 = o.value;
    map.set(o.date, row);
  }
  return Array.from(map.entries())
    .sort(([da], [db]) => da.localeCompare(db))
    .map(([date, v]) => ({ date, ...v }));
}

function linearRegression(xs: number[], ys: number[]): { slope: number; intercept: number } | null {
  const n = xs.length;
  if (n < 3 || n !== ys.length) return null;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += xs[i];
    sumY += ys[i];
    sumXY += xs[i] * ys[i];
    sumX2 += xs[i] * xs[i];
  }
  const denom = n * sumX2 - sumX * sumX;
  if (Math.abs(denom) < 1e-12) return null;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

/** Add months to YYYY-MM-DD (uses first of month for monthly dates) */
function addMonths(iso: string, delta: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, (m ?? 1) - 1 + delta, d ?? 1);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const results: Record<
      string,
      {
        id: string;
        label: string;
        unit: string;
        frequency: string;
        observations: Obs[];
        dataSource: string;
        usedFredApi: boolean;
      }
    > = {};

    for (const def of Object.values(SERIES)) {
      try {
        const { raw, dataSource, usedFredApi } = await fetchFredSeries(def.id);
        results[def.id] = {
          id: def.id,
          label: def.label,
          unit: def.unit,
          frequency: def.frequency,
          observations: filterRange(raw, from, to),
          dataSource,
          usedFredApi,
        };
      } catch (e) {
        console.error('[unemployment]', def.id, e);
        results[def.id] = {
          id: def.id,
          label: def.label,
          unit: def.unit,
          frequency: def.frequency,
          observations: [],
          dataSource: 'error',
          usedFredApi: false,
        };
      }
    }

    const unrateObs = results.UNRATE.observations.filter((o) => Number.isFinite(o.value));
    const u6Obs = results.U6RATE.observations.filter((o) => Number.isFinite(o.value));
    const merged = mergeMonthly(unrateObs, u6Obs);

    const withDynamics = merged.map((row, i) => {
      const prev = i > 0 ? merged[i - 1] : null;
      const targetYoy = addMonths(row.date, -12);
      const rowYr = merged.find((r) => r.date === targetYoy) ?? null;

      const momUnrate =
        row.unrate != null && prev?.unrate != null ? row.unrate - prev.unrate : null;
      const yoyUnrate =
        row.unrate != null && rowYr?.unrate != null ? row.unrate - rowYr.unrate : null;
      const u6Spread =
        row.unrate != null && row.u6 != null ? row.u6 - row.unrate : null;

      return {
        ...row,
        momUnrate,
        yoyUnrate,
        u6Spread,
      };
    });

    const last = withDynamics.length ? withDynamics[withDynamics.length - 1] : null;
    const prior = withDynamics.length > 1 ? withDynamics[withDynamics.length - 2] : null;

    /** Last 24 monthly points for regression (if available) */
    const tail = unrateObs.slice(-24);
    const xs = tail.map((_, i) => i);
    const ys = tail.map((o) => o.value);
    const reg = linearRegression(xs, ys);
    const lastMonthIndex = tail.length - 1;

    type ProjectionPoint = { label: string; iso: string; projectedUnratePct: number };
    const projections: ProjectionPoint[] = [];
    if (reg && tail.length >= 6 && last) {
      for (let h = 1; h <= 12; h++) {
        const x = lastMonthIndex + h;
        const y = reg.slope * x + reg.intercept;
        const iso = addMonths(tail[tail.length - 1].date, h);
        projections.push({
          label: iso.slice(0, 7),
          iso,
          projectedUnratePct: Math.max(0, Math.min(25, Number(y.toFixed(2)))),
        });
      }
    }

    const trend =
      reg && tail.length >= 6
        ? {
            slopePctPerMonth: Number(reg.slope.toFixed(4)),
            direction:
              reg.slope < -0.015 ? ('falling' as const) : reg.slope > 0.015 ? ('rising' as const) : ('stable' as const),
            summary:
              reg.slope < -0.015
                ? 'Over the last ~2 years of data, the headline rate has trended lower on average.'
                : reg.slope > 0.015
                  ? 'Over the last ~2 years of data, the headline rate has trended higher on average.'
                  : 'Over the last ~2 years of data, the headline rate has been roughly flat.',
          }
        : null;

    const nrou = results.NROU.observations;
    const latestNrou = nrou.length ? nrou[nrou.length - 1] : null;
    const vsNatural =
      last?.unrate != null && latestNrou
        ? {
            naturalRatePct: latestNrou.value,
            asOf: latestNrou.date,
            gapPp: Number((last.unrate - latestNrou.value).toFixed(2)),
          }
        : null;

    let claims = results.ICSA.observations;
    if (claims.length > 520) claims = claims.slice(-520); // cap ~10y weekly for payload size

    return NextResponse.json({
      meta: {
        from: from ?? null,
        to: to ?? null,
        observationCountUnrate: unrateObs.length,
        dataSourceNote: 'FRED — refresh periodically; series may be revised.',
      },
      series: results,
      monthly: withDynamics,
      latest: last
        ? {
            date: last.date,
            unrate: last.unrate,
            u6: last.u6,
            momUnrate: last.momUnrate,
            yoyUnrate: last.yoyUnrate,
            u6Spread: last.u6Spread,
            priorMonthDate: prior?.date ?? null,
          }
        : null,
      trend,
      statisticalProjection: {
        method:
          'Ordinary least squares on the last up to 24 monthly U-3 readings in range; forward 12 months. Clamped to 0–25%.',
        regression: reg
          ? { slope: reg.slope, intercept: reg.intercept, monthsUsed: tail.length }
          : null,
        points: projections,
        disclaimer:
          'Model projection only — not a consensus forecast, not the Fed’s SEP, and not a prediction of payrolls or participation.',
      },
      vsNatural,
      claimsRecent: claims,
    });
  } catch (e) {
    console.error('[unemployment]', e);
    return NextResponse.json({ error: 'Failed to load unemployment data' }, { status: 500 });
  }
}
