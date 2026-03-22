/**
 * Financial Modeling Prep helpers for index ETF valuation (quarterly + TTM).
 */

export type ValuationPeriodId = '1m' | '3m' | '6m' | '1y' | 'ytd';

export const VALUATION_PERIODS: { id: ValuationPeriodId; label: string; description: string }[] = [
  { id: '1m', label: '1M', description: '~1 month (nearest quarter-end before cutoff)' },
  { id: '3m', label: '3M', description: '~3 months' },
  { id: '6m', label: '6M', description: '~6 months' },
  { id: '1y', label: '1Y', description: '~1 year' },
  { id: 'ytd', label: 'YTD', description: 'Year to date' },
];

export type MetricPoint = {
  date: string;
  peRatio: number | null;
  pbRatio: number | null;
  dividendYieldPct: number | null;
  earningsYieldPct: number | null;
  priceToSalesRatio: number | null;
};

export type PeriodSnapshot = {
  period: ValuationPeriodId;
  label: string;
  baselineDate: string | null;
  endDate: string | null;
  peChangePct: number | null;
  pbChangePct: number | null;
  peStart: number | null;
  peEnd: number | null;
  pbStart: number | null;
  pbEnd: number | null;
};

function num(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

/** FMP often returns dividend yield as 0.015 for 1.5%. Normalize to percentage points. */
function dividendToPct(v: unknown): number | null {
  const n = num(v);
  if (n == null) return null;
  if (n > 0 && n < 1) return n * 100;
  return n;
}

function earningsYieldToPct(v: unknown): number | null {
  const n = num(v);
  if (n == null) return null;
  if (n > 0 && n < 1) return n * 100;
  return n;
}

/** FMP stable/legacy may use date, fiscalDateEnding, or calendarYear + period. */
export function resolveKeyMetricDate(raw: Record<string, unknown>): string | null {
  if (typeof raw.date === 'string') return raw.date.slice(0, 10);
  if (typeof raw.fiscalDateEnding === 'string') return raw.fiscalDateEnding.slice(0, 10);
  const y =
    typeof raw.calendarYear === 'number'
      ? raw.calendarYear
      : typeof raw.calendarYear === 'string'
        ? Number.parseInt(raw.calendarYear, 10)
        : typeof raw.year === 'number'
          ? raw.year
          : typeof raw.year === 'string'
            ? Number.parseInt(raw.year, 10)
            : NaN;
  if (!Number.isFinite(y)) return null;
  const p = raw.period;
  let month = 12;
  let day = 31;
  if (typeof p === 'string') {
    const q = p.trim().toUpperCase();
    if (q === 'Q1' || q === '1') {
      month = 3;
      day = 31;
    } else if (q === 'Q2' || q === '2') {
      month = 6;
      day = 30;
    } else if (q === 'Q3' || q === '3') {
      month = 9;
      day = 30;
    } else if (q === 'Q4' || q === '4') {
      month = 12;
      day = 31;
    }
  }
  return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** FMP returns `{ "Error Message": "..." }` with HTTP 200 for many failures. */
export function parseFmpApiError(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const msg =
    (data as { 'Error Message'?: string; error?: string })['Error Message'] ?? (data as { error?: string }).error;
  return typeof msg === 'string' ? msg : null;
}

export function normalizeFmpListResponse(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.data)) return d.data;
    if (Array.isArray(d.historical)) return d.historical;
  }
  return [];
}

export function normalizeFmpTtmObject(data: unknown): Record<string, unknown> | null {
  if (data == null) return null;
  if (Array.isArray(data) && data.length > 0 && data[0] && typeof data[0] === 'object') {
    return data[0] as Record<string, unknown>;
  }
  if (typeof data === 'object' && !Array.isArray(data)) {
    const o = data as Record<string, unknown>;
    if (o.data != null && typeof o.data === 'object') {
      const inner = o.data as unknown;
      if (Array.isArray(inner) && inner[0] && typeof inner[0] === 'object') return inner[0] as Record<string, unknown>;
      if (!Array.isArray(inner) && typeof inner === 'object') return inner as Record<string, unknown>;
    }
    return o;
  }
  return null;
}

export function parseKeyMetricRow(raw: Record<string, unknown>): MetricPoint | null {
  const date = resolveKeyMetricDate(raw);
  if (!date) return null;

  const peRatio =
    num(raw.peRatio) ??
    num(raw.priceToEarningsRatio) ??
    num((raw as { pe?: number }).pe);

  const pbRatio =
    num(raw.pbRatio) ?? num(raw.priceToBookRatio) ?? num((raw as { priceBookRatio?: number }).priceBookRatio);

  const dividendYieldPct =
    dividendToPct(raw.dividendYield) ?? dividendToPct((raw as { dividendYieldRatio?: number }).dividendYieldRatio);

  const earningsYieldPct =
    earningsYieldToPct(raw.earningsYield) ?? (peRatio != null && peRatio > 0 ? 100 / peRatio : null);

  const priceToSalesRatio = num(raw.priceToSalesRatio) ?? num((raw as { priceSalesRatio?: number }).priceSalesRatio);

  return {
    date,
    peRatio,
    pbRatio,
    dividendYieldPct,
    earningsYieldPct,
    priceToSalesRatio,
  };
}

export function parseKeyMetricsQuarterly(data: unknown): MetricPoint[] {
  if (!Array.isArray(data)) return [];
  const out: MetricPoint[] = [];
  for (const row of data) {
    if (!row || typeof row !== 'object') continue;
    const p = parseKeyMetricRow(row as Record<string, unknown>);
    if (p) out.push(p);
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

function periodStartDate(period: ValuationPeriodId, now = new Date()): Date {
  if (period === 'ytd') return new Date(now.getFullYear(), 0, 1);
  const days: Record<Exclude<ValuationPeriodId, 'ytd'>, number> = {
    '1m': 30,
    '3m': 91,
    '6m': 182,
    '1y': 365,
  };
  const d = new Date(now);
  d.setDate(d.getDate() - days[period]);
  return d;
}

/** Last observation with date <= d (by string YYYY-MM-DD). */
function lastOnOrBefore(series: MetricPoint[], d: Date): MetricPoint | null {
  const iso = d.toISOString().slice(0, 10);
  let best: MetricPoint | null = null;
  for (const p of series) {
    if (p.date <= iso) best = p;
  }
  return best;
}

export function computePeriodChanges(
  series: MetricPoint[],
  latest: MetricPoint | null
): PeriodSnapshot[] {
  if (!latest || series.length === 0) {
    return VALUATION_PERIODS.map((p) => ({
      period: p.id,
      label: p.label,
      baselineDate: null,
      endDate: latest?.date ?? null,
      peChangePct: null,
      pbChangePct: null,
      peStart: null,
      peEnd: latest?.peRatio ?? null,
      pbStart: null,
      pbEnd: latest?.pbRatio ?? null,
    }));
  }

  const now = new Date();
  return VALUATION_PERIODS.map(({ id, label }) => {
    const start = periodStartDate(id, now);
    const baseline = lastOnOrBefore(series, start);
    const end = latest;

    const peStart = baseline?.peRatio ?? null;
    const peEnd = end.peRatio ?? null;
    const pbStart = baseline?.pbRatio ?? null;
    const pbEnd = end.pbRatio ?? null;

    const peChangePct =
      peStart != null && peEnd != null && peStart !== 0
        ? ((peEnd - peStart) / peStart) * 100
        : null;
    const pbChangePct =
      pbStart != null && pbEnd != null && pbStart !== 0
        ? ((pbEnd - pbStart) / pbStart) * 100
        : null;

    return {
      period: id,
      label,
      baselineDate: baseline?.date ?? null,
      endDate: end.date,
      peChangePct,
      pbChangePct,
      peStart,
      peEnd,
      pbStart,
      pbEnd,
    };
  });
}

export type TtmSnapshot = {
  peRatio: number | null;
  pbRatio: number | null;
  dividendYieldPct: number | null;
  earningsYieldPct: number | null;
  priceToSalesRatio: number | null;
  enterpriseValueMultiple: number | null;
  pegRatio: number | null;
  date: string | null;
};

export function parseTtmRow(raw: Record<string, unknown>): TtmSnapshot | null {
  const peRatio = num(raw.peRatio) ?? num(raw.priceToEarningsRatio);
  const pbRatio = num(raw.pbRatio) ?? num(raw.priceToBookRatio);
  const dividendYieldPct = dividendToPct(raw.dividendYield);
  const earningsYieldPct =
    earningsYieldToPct(raw.earningsYield) ?? (peRatio != null && peRatio > 0 ? 100 / peRatio : null);
  const priceToSalesRatio = num(raw.priceToSalesRatio);
  const enterpriseValueMultiple =
    num(raw.enterpriseValueMultiple) ??
    num((raw as { enterpriseValueOverEBITDA?: number }).enterpriseValueOverEBITDA);
  const pegRatio = num(raw.pegRatio);
  const date = resolveKeyMetricDate(raw);

  if (
    peRatio == null &&
    pbRatio == null &&
    dividendYieldPct == null &&
    earningsYieldPct == null &&
    priceToSalesRatio == null &&
    enterpriseValueMultiple == null &&
    pegRatio == null
  ) {
    return null;
  }

  return {
    peRatio,
    pbRatio,
    dividendYieldPct,
    earningsYieldPct,
    priceToSalesRatio,
    enterpriseValueMultiple,
    pegRatio,
    date,
  };
}

export function parseTtmResponse(data: unknown): TtmSnapshot | null {
  const row = normalizeFmpTtmObject(data);
  if (!row) return null;
  return parseTtmRow(row);
}

export function getFmpKey(): string | null {
  const raw =
    process.env.FMP_API_KEY ||
    process.env.FINANCIAL_MODELING_PREP_API_KEY ||
    process.env.FMP_KEY ||
    process.env.FINANCIAL_MODELING_PREP_KEY;
  const k = typeof raw === 'string' ? raw.trim() : '';
  if (!k || k === 'demo') return null;
  return k;
}

/** Prefer TTM snapshot for “current” multiples; fall back to last quarterly point. */
export function mergeLatestQuarterlyWithTtm(
  series: MetricPoint[],
  ttm: TtmSnapshot | null
): MetricPoint | null {
  const last = series.length ? series[series.length - 1] : null;
  if (!last && !ttm) return null;
  const base: MetricPoint =
    last ??
    ({
      date: ttm?.date ?? new Date().toISOString().slice(0, 10),
      peRatio: null,
      pbRatio: null,
      dividendYieldPct: null,
      earningsYieldPct: null,
      priceToSalesRatio: null,
    } as MetricPoint);

  return {
    date: ttm?.date ?? base.date,
    peRatio: ttm?.peRatio ?? base.peRatio,
    pbRatio: ttm?.pbRatio ?? base.pbRatio,
    dividendYieldPct: ttm?.dividendYieldPct ?? base.dividendYieldPct,
    earningsYieldPct: ttm?.earningsYieldPct ?? base.earningsYieldPct,
    priceToSalesRatio: ttm?.priceToSalesRatio ?? base.priceToSalesRatio,
  };
}
