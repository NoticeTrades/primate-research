/**
 * Shared FRED series fetch (JSON API if FRED_API_KEY, else public CSV graph export).
 */

export function parseFredCsv(text: string): { date: string; value: number }[] {
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

const FRED_FETCH_MS = 12_000;

function fredAbortSignal(): AbortSignal | undefined {
  try {
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
      return AbortSignal.timeout(FRED_FETCH_MS);
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

export async function fetchFredSeries(seriesId: string): Promise<{
  raw: { date: string; value: number }[];
  dataSource: 'fred_api' | 'fred_csv';
  usedFredApi: boolean;
}> {
  const signal = fredAbortSignal();
  const key = process.env.FRED_API_KEY;
  if (key) {
    try {
      const url = new URL('https://api.stlouisfed.org/fred/series/observations');
      url.searchParams.set('series_id', seriesId);
      url.searchParams.set('api_key', key);
      url.searchParams.set('file_type', 'json');
      url.searchParams.set('sort_order', 'asc');
      const res = await fetch(url.toString(), {
        next: { revalidate: 43_200 },
        headers: { Accept: 'application/json' },
        ...(signal ? { signal } : {}),
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
      }
    } catch (e) {
      console.error('[fred]', seriesId, e);
    }
  }

  const csvUrl = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(seriesId)}`;
  const res = await fetch(csvUrl, {
    next: { revalidate: 43_200 },
    headers: { Accept: 'text/csv' },
    ...(signal ? { signal } : {}),
  });
  if (!res.ok) {
    throw new Error(`FRED CSV failed for ${seriesId}: ${res.status}`);
  }
  const text = await res.text();
  const raw = parseFredCsv(text);
  return { raw, dataSource: 'fred_csv', usedFredApi: false };
}
