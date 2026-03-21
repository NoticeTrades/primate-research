import { NextRequest, NextResponse } from 'next/server';
import {
  CPI_CONSENSUS_FORECASTS,
  CPI_DATA_DISCLAIMER,
  CPI_INDEX_IMPACTS,
  CPI_UPCOMING_RELEASE_WINDOWS,
} from '../../../data/cpi-macros';
import { CPI_SERIES_OPTIONS, getCpiSeriesMeta } from '../../../data/cpi-series';

export type CpiObservation = {
  date: string;
  value: number;
  yoyPct: number | null;
};

export type CpiReleaseRow = {
  reportMonthKey: string;
  reportMonthLabel: string;
  /** MoM % for the month *before* the report month (the prior print’s headline MoM) */
  previousPrintMomPct: number | null;
  /** Actual MoM % for the report month (from index) */
  actualMomPct: number | null;
  actualYoyPct: number | null;
  forecastMomPct: number | null;
  forecastYoyPct: number | null;
  forecastSource: string | null;
  surpriseMomPct: number | null;
};

export type CpiUpcoming = {
  reportMonthKey: string;
  reportMonthLabel: string;
  estimatedReleaseIsoUtc: string;
  notes: string | null;
  consensusMomPct: number | null;
  consensusYoyPct: number | null;
  consensusSource: string | null;
  trendContext: string;
};

export type CpiPayload = {
  seriesId: string;
  title: string;
  source: string;
  disclaimer: string;
  /** How this response was filtered */
  meta: {
    seriesLabel: string;
    from: string | null;
    to: string | null;
    dataSource: 'fred_api' | 'fred_csv';
    observationCount: number;
    /** True when FRED_API_KEY is set (official API); otherwise public CSV graph export */
    usedFredApi: boolean;
  };
  observations: CpiObservation[];
  latest: {
    date: string;
    value: number;
    yoyPct: number | null;
    momPct: number | null;
  } | null;
  trend: {
    direction: 'rising' | 'falling' | 'stable';
    summary: string;
    yoyPct: number | null;
  };
  /** Last headline print (most recent month) — previous / forecast / actual when available */
  lastPrint: {
    reportMonthKey: string;
    reportMonthLabel: string;
    previousPrintMomPct: number | null;
    forecastMomPct: number | null;
    forecastYoyPct: number | null;
    forecastSource: string | null;
    actualMomPct: number | null;
    actualYoyPct: number | null;
    surpriseMomPct: number | null;
  } | null;
  /** Recent months for the table */
  releaseHistory: CpiReleaseRow[];
  upcoming: CpiUpcoming | null;
  indexImpacts: typeof CPI_INDEX_IMPACTS;
};

function parseFredCsv(text: string): { date: string; value: number }[] {
  const lines = text.trim().split(/\n/);
  if (lines.length < 2) return [];
  const out: { date: string; value: number }[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const comma = line.indexOf(',');
    if (comma < 0) continue;
    const date = line.slice(0, comma).trim();
    const valStr = line.slice(comma + 1).trim();
    if (!valStr || valStr === '.') continue;
    const value = Number.parseFloat(valStr);
    if (!Number.isFinite(value)) continue;
    out.push({ date, value });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

function addYoy(rows: { date: string; value: number }[]): CpiObservation[] {
  const byDate = new Map(rows.map((r) => [r.date, r.value]));
  return rows.map((r) => {
    const d = new Date(r.date + 'T12:00:00Z');
    d.setUTCMonth(d.getUTCMonth() - 12);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const prevKey = `${y}-${m}-01`;
    const prev = byDate.get(prevKey);
    let yoyPct: number | null = null;
    if (prev != null && prev > 0) {
      yoyPct = ((r.value - prev) / prev) * 100;
    }
    return { date: r.date, value: r.value, yoyPct };
  });
}

function monthKeyFromDate(date: string): string {
  return date.slice(0, 7) + '-01';
}

function formatMonthLabel(date: string): string {
  const [y, m] = date.split('-').map(Number);
  if (!y || !m) return date;
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function attachMomPct(
  valid: { date: string; value: number; yoyPct: number | null }[]
): Array<CpiObservation & { momPct: number | null }> {
  return valid.map((row, i) => {
    if (i === 0) return { ...row, momPct: null };
    const prev = valid[i - 1].value;
    if (prev <= 0) return { ...row, momPct: null };
    const momPct = ((row.value - prev) / prev) * 100;
    return { ...row, momPct };
  });
}

function buildReleaseRows(
  withMom: Array<CpiObservation & { momPct: number | null }>
): CpiReleaseRow[] {
  const rows: CpiReleaseRow[] = [];
  for (let i = 0; i < withMom.length; i++) {
    const row = withMom[i];
    const key = monthKeyFromDate(row.date);
    const cons = CPI_CONSENSUS_FORECASTS[key];
    const actualMom = row.momPct;
    const prevMom = i > 0 ? withMom[i - 1].momPct : null;
    const fMom = cons?.momPct ?? null;
    const fYoy = cons?.yoyPct ?? null;
    let surprise: number | null = null;
    if (actualMom != null && fMom != null && Number.isFinite(actualMom) && Number.isFinite(fMom)) {
      surprise = actualMom - fMom;
    }
    rows.push({
      reportMonthKey: key,
      reportMonthLabel: formatMonthLabel(row.date),
      previousPrintMomPct: prevMom,
      actualMomPct: actualMom,
      actualYoyPct: row.yoyPct,
      forecastMomPct: fMom,
      forecastYoyPct: fYoy,
      forecastSource: cons?.source ?? null,
      surpriseMomPct: surprise,
    });
  }
  return rows;
}

function pickUpcoming(now: Date, trend: CpiPayload['trend']): CpiUpcoming | null {
  const next = CPI_UPCOMING_RELEASE_WINDOWS.find((w: (typeof CPI_UPCOMING_RELEASE_WINDOWS)[number]) => {
    const t = new Date(w.estimatedReleaseIsoUtc).getTime();
    return t > now.getTime();
  });
  if (!next) return null;
  const cons = CPI_CONSENSUS_FORECASTS[next.reportMonthKey];
  const parts: string[] = [];
  if (cons?.yoyPct != null && trend.yoyPct != null) {
    parts.push(
      `Latest YoY print is ${trend.yoyPct.toFixed(2)}%; consensus for ${next.reportMonthLabel} is ~${cons.yoyPct}% YoY.`
    );
  } else if (trend.yoyPct != null) {
    parts.push(`Latest YoY is ${trend.yoyPct.toFixed(2)}%. Watch the next release vs trend.`);
  }
  if (cons?.momPct != null) {
    parts.push(`Median MoM expectation near ${cons.momPct}% (illustrative).`);
  }
  parts.push(trend.summary);
  return {
    reportMonthKey: next.reportMonthKey,
    reportMonthLabel: next.reportMonthLabel,
    estimatedReleaseIsoUtc: next.estimatedReleaseIsoUtc,
    notes: next.notes ?? null,
    consensusMomPct: cons?.momPct ?? null,
    consensusYoyPct: cons?.yoyPct ?? null,
    consensusSource: cons?.source ?? null,
    trendContext: parts.join(' '),
  };
}

function computeTrend(obs: CpiObservation[]): CpiPayload['trend'] {
  const withYoy = obs.filter((o) => o.yoyPct != null) as (CpiObservation & { yoyPct: number })[];
  const last = withYoy[withYoy.length - 1];
  if (!last) {
    return { direction: 'stable', summary: 'Insufficient CPI history to assess trend.', yoyPct: null };
  }
  const yoy = last.yoyPct;
  const recent = withYoy.slice(-6); // last 6 YoY readings
  const older = withYoy.slice(-12, -6); // prior 6 YoY readings
  let direction: CpiPayload['trend']['direction'] = 'stable';
  if (recent.length >= 4 && older.length >= 4) {
    const avgRecent = recent.reduce((s, x) => s + x.yoyPct, 0) / recent.length;
    const avgOlder = older.reduce((s, x) => s + x.yoyPct, 0) / older.length;
    if (avgRecent > avgOlder + 0.12) direction = 'rising';
    else if (avgRecent < avgOlder - 0.12) direction = 'falling';
  } else if (yoy > 3.5) direction = 'rising';
  else if (yoy < 2) direction = 'falling';

  let summary: string;
  if (direction === 'rising') {
    summary =
      'Year-over-year inflation momentum has been firming recently versus the prior six-month window — watch for persistence in prints.';
  } else if (direction === 'falling') {
    summary =
      'YoY CPI momentum has been cooling compared with the prior six months — consistent with disinflation, subject to revisions.';
  } else {
    summary =
      'YoY inflation is moving sideways versus the prior six-month window — trend is mixed until more data prints.';
  }

  return { direction, summary, yoyPct: yoy };
}

function isAllowedSeries(id: string): boolean {
  return CPI_SERIES_OPTIONS.some((s) => s.id === id);
}

/** Accepts YYYY-MM or YYYY-MM-DD → YYYY-MM-01 */
function normalizeMonthParam(value: string | null): string | null {
  if (!value || !value.trim()) return null;
  const v = value.trim();
  if (v.length === 7 && v[4] === '-') return `${v}-01`;
  if (v.length >= 10) return `${v.slice(0, 7)}-01`;
  return null;
}

async function fetchFredSeries(seriesId: string): Promise<{
  raw: { date: string; value: number }[];
  dataSource: 'fred_api' | 'fred_csv';
  usedFredApi: boolean;
}> {
  const key = process.env.FRED_API_KEY;
  if (key) {
    try {
      const url = new URL('https://api.stlouisfed.org/fred/series/observations');
      url.searchParams.set('series_id', seriesId);
      url.searchParams.set('api_key', key);
      url.searchParams.set('file_type', 'json');
      url.searchParams.set('sort_order', 'asc');
      const res = await fetch(url.toString(), {
        next: { revalidate: 43200 },
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const json = (await res.json()) as {
          observations?: Array<{ date: string; value: string }>;
        };
        const obs = json.observations ?? [];
        const raw: { date: string; value: number }[] = [];
        for (const o of obs) {
          if (!o.date || o.value === '.' || o.value === undefined) continue;
          const value = Number.parseFloat(o.value);
          if (!Number.isFinite(value)) continue;
          raw.push({ date: o.date, value });
        }
        raw.sort((a, b) => a.date.localeCompare(b.date));
        if (raw.length > 0) {
          return { raw, dataSource: 'fred_api', usedFredApi: true };
        }
      } else {
        const errText = await res.text().catch(() => '');
        console.error('[cpi] FRED API error', res.status, errText);
      }
    } catch (e) {
      console.error('[cpi] FRED API fetch failed', e);
    }
  }

  const csvUrl = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(seriesId)}`;
  const res = await fetch(csvUrl, {
    next: { revalidate: 43200 },
    headers: { Accept: 'text/csv' },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch CPI series (CSV): ${res.status}`);
  }
  const text = await res.text();
  const raw = parseFredCsv(text);
  return { raw, dataSource: 'fred_csv', usedFredApi: false };
}

function filterByDateRange<T extends { date: string }>(rows: T[], from: string | null, to: string | null): T[] {
  return rows.filter((r) => {
    if (from && r.date < from) return false;
    if (to && r.date > to) return false;
    return true;
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seriesIdRaw = searchParams.get('series') || searchParams.get('seriesId') || 'CPIAUCSL';
    const seriesId = seriesIdRaw.toUpperCase();
    if (!isAllowedSeries(seriesId)) {
      return NextResponse.json(
        {
          error: 'Invalid series',
          allowed: CPI_SERIES_OPTIONS.map((s) => s.id),
        },
        { status: 400 }
      );
    }

    const from = normalizeMonthParam(searchParams.get('from'));
    const to = normalizeMonthParam(searchParams.get('to'));
    if (from && to && from > to) {
      return NextResponse.json({ error: 'Invalid range: from must be before or equal to to' }, { status: 400 });
    }

    const { raw, dataSource, usedFredApi } = await fetchFredSeries(seriesId);
    if (raw.length === 0) {
      return NextResponse.json({ error: 'No CPI observations returned for this series' }, { status: 502 });
    }

    const withYoy = addYoy(raw);
    const withYoyInRange = filterByDateRange(withYoy, from, to);

    const valid = withYoyInRange.filter((o) => Number.isFinite(o.value));
    if (valid.length === 0) {
      return NextResponse.json(
        { error: 'No data in the selected date range. Try widening from/to.' },
        { status: 400 }
      );
    }

    const withMom = attachMomPct(valid);
    const allReleaseRows = buildReleaseRows(withMom);
    const last = withMom[withMom.length - 1];
    let latest: CpiPayload['latest'] = null;
    if (last) {
      latest = {
        date: last.date,
        value: last.value,
        yoyPct: last.yoyPct,
        momPct: last.momPct,
      };
    }

    const trend = computeTrend(withYoyInRange);

    const lastReleaseRow = allReleaseRows[allReleaseRows.length - 1] ?? null;
    const lastPrint: CpiPayload['lastPrint'] = lastReleaseRow
      ? {
          reportMonthKey: lastReleaseRow.reportMonthKey,
          reportMonthLabel: lastReleaseRow.reportMonthLabel,
          previousPrintMomPct: lastReleaseRow.previousPrintMomPct,
          forecastMomPct: lastReleaseRow.forecastMomPct,
          forecastYoyPct: lastReleaseRow.forecastYoyPct,
          forecastSource: lastReleaseRow.forecastSource,
          actualMomPct: lastReleaseRow.actualMomPct,
          actualYoyPct: lastReleaseRow.actualYoyPct,
          surpriseMomPct: lastReleaseRow.surpriseMomPct,
        }
      : null;

    const releaseHistory = [...allReleaseRows].slice(-12).reverse();

    const upcoming = pickUpcoming(new Date(), trend);

    const seriesMeta = getCpiSeriesMeta(seriesId);
    const title = seriesMeta?.label ?? seriesId;

    const payload: CpiPayload = {
      seriesId,
      title,
      source: 'FRED / U.S. Bureau of Labor Statistics',
      disclaimer: CPI_DATA_DISCLAIMER,
      meta: {
        seriesLabel: seriesMeta?.label ?? seriesId,
        from,
        to,
        dataSource,
        observationCount: valid.length,
        usedFredApi,
      },
      observations: valid,
      latest,
      trend,
      lastPrint,
      releaseHistory,
      upcoming,
      indexImpacts: CPI_INDEX_IMPACTS,
    };

    return NextResponse.json(payload);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'CPI data unavailable' }, { status: 500 });
  }
}
