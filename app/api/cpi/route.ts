import { NextResponse } from 'next/server';

const FRED_CSV = 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=CPIAUCSL';

export type CpiObservation = {
  date: string;
  value: number;
  yoyPct: number | null;
};

export type CpiPayload = {
  seriesId: string;
  title: string;
  source: string;
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

export async function GET() {
  try {
    const res = await fetch(FRED_CSV, {
      next: { revalidate: 43200 }, // 12h
      headers: { Accept: 'text/csv' },
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch CPI series' }, { status: 502 });
    }
    const text = await res.text();
    const raw = parseFredCsv(text);
    const withYoy = addYoy(raw);

    const valid = withYoy.filter((o) => Number.isFinite(o.value));
    const last = valid[valid.length - 1];
    const prev = valid[valid.length - 2];
    let latest: CpiPayload['latest'] = null;
    if (last) {
      let momPct: number | null = null;
      if (prev) {
        momPct = ((last.value - prev.value) / prev.value) * 100;
      }
      latest = {
        date: last.date,
        value: last.value,
        yoyPct: last.yoyPct,
        momPct,
      };
    }

    const trend = computeTrend(withYoy);

    const payload: CpiPayload = {
      seriesId: 'CPIAUCSL',
      title: 'Consumer Price Index for All Urban Consumers: All Items',
      source: 'FRED / U.S. Bureau of Labor Statistics',
      observations: withYoy,
      latest,
      trend,
    };

    return NextResponse.json(payload);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'CPI data unavailable' }, { status: 500 });
  }
}
