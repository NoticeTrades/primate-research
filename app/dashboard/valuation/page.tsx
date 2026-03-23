'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  HISTORICAL_VALUATION_CONTEXT,
  VALUATION_DISCLAIMER,
  VALUATION_INDICES,
} from '../../../data/valuation-indices';
import { VALUATION_PERIODS } from '../../../lib/valuation-fmp';

type MetricPoint = {
  date: string;
  peRatio: number | null;
  pbRatio: number | null;
  dividendYieldPct: number | null;
  earningsYieldPct: number | null;
  priceToSalesRatio: number | null;
};

type TtmSnapshot = {
  peRatio: number | null;
  pbRatio: number | null;
  dividendYieldPct: number | null;
  earningsYieldPct: number | null;
  priceToSalesRatio: number | null;
  enterpriseValueMultiple: number | null;
  pegRatio: number | null;
  forwardPe?: number | null;
  date: string | null;
};

type PeriodSnapshot = {
  period: string;
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

type IndexBlock = {
  symbol: string;
  name: string;
  etfName: string;
  blurb: string;
  ttm: TtmSnapshot | null;
  history: MetricPoint[];
  periods: PeriodSnapshot[];
  fmpError: string | null;
};

type HistoricalPeBlock = {
  points: { date: string; pe: number }[];
  metricKind: 'trailing_pe' | 'cape';
  chartTitle: string;
  shortLabel: string;
  source: string;
  fredSeriesId: string | null;
};

type ValuationPayload = {
  ok: boolean;
  configured: boolean;
  updatedAt: string;
  dataSource?: string;
  message?: string;
  granularityNote?: string;
  anyData?: boolean;
  /** True when FMP returned quarterly P/E history (period table + chart) */
  hasHistoricalMultiples?: boolean;
  /** FRED monthly S&P 500 P/E (or CAPE) series */
  hasHistoricalPe?: boolean;
  historicalPe?: HistoricalPeBlock | null;
  historicalPeDisclaimer?: string;
  snapshotNote?: string | null;
  fmpPaymentRequired?: boolean;
  fmpBillingHint?: string | null;
  yahooFallback?: boolean;
  yahooNote?: string | null;
  indices: IndexBlock[];
};

function fmtNum(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toFixed(digits);
}

function fmtPct(n: number | null | undefined, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(digits)}%`;
}

function formatQuarter(d: string) {
  const [y, m] = d.split('-');
  if (!y || !m) return d;
  const dt = new Date(Number(y), Number(m) - 1, 1);
  return dt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function formatMonthDay(d: string) {
  const [y, mo, day] = d.split('-');
  if (!y || !mo) return d;
  const dt = new Date(Number(y), Number(mo) - 1, day ? Number(day) : 1);
  return dt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

type PeRange = '5y' | '10y' | '20y' | 'max';

function filterPeByRange(points: { date: string; pe: number }[], range: PeRange): { date: string; pe: number }[] {
  if (range === 'max' || points.length === 0) return points;
  const last = points[points.length - 1]?.date;
  if (!last) return points;
  const end = new Date(last);
  const years = range === '5y' ? 5 : range === '10y' ? 10 : 20;
  const start = new Date(end);
  start.setFullYear(start.getFullYear() - years);
  return points.filter((p) => new Date(p.date) >= start);
}

export default function ValuationPage() {
  const [data, setData] = useState<ValuationPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartSymbol, setChartSymbol] = useState<string>('SPY');
  const [peRange, setPeRange] = useState<PeRange>('10y');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/valuation', { cache: 'no-store' });
      const json = (await res.json()) as ValuationPayload;
      if (!res.ok) setError('Could not load valuation data.');
      setData(json);
    } catch {
      setError('Network error loading valuation data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const bySymbol = useMemo(() => {
    const m = new Map<string, IndexBlock>();
    for (const i of data?.indices ?? []) m.set(i.symbol, i);
    return m;
  }, [data]);

  const chartRows = useMemo(() => {
    const block = bySymbol.get(chartSymbol);
    if (!block?.history?.length) return [];
    const tail = block.history.slice(-48);
    return tail.map((h) => ({
      date: h.date,
      label: formatQuarter(h.date),
      pe: h.peRatio,
      pb: h.pbRatio,
    }));
  }, [bySymbol, chartSymbol]);

  const fredPeRows = useMemo(() => {
    const pts = data?.historicalPe?.points;
    if (!pts?.length) return [];
    const sliced = filterPeByRange(pts, peRange);
    return sliced.map((p) => ({
      date: p.date,
      label: formatMonthDay(p.date),
      pe: p.pe,
    }));
  }, [data?.historicalPe?.points, peRange]);

  const periodRows = useMemo(() => {
    const ids = VALUATION_PERIODS.map((p) => p.id);
    return ids.map((pid) => {
      const cells = VALUATION_INDICES.map((meta) => {
        const idx = bySymbol.get(meta.symbol);
        const p = idx?.periods.find((x) => x.period === pid);
        return {
          symbol: meta.symbol,
          peChangePct: p?.peChangePct ?? null,
          pbChangePct: p?.pbChangePct ?? null,
        };
      });
      return { period: pid, label: VALUATION_PERIODS.find((x) => x.id === pid)?.label ?? pid, cells };
    });
  }, [bySymbol]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-500/90">Dashboard</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
          Index valuation (ETF proxies)
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Trailing and cross-sectional multiples for <strong>SPY</strong>, <strong>QQQ</strong>, <strong>DIA</strong>, and{' '}
          <strong>IWM</strong>. This page uses the best available data source at runtime and falls back gracefully when a
          provider is unavailable.
        </p>
        {data?.updatedAt && (
          <p className="mt-2 text-xs text-zinc-500">
            Last updated: {new Date(data.updatedAt).toLocaleString()}
            {data.configured && data.dataSource
              ? ` · Source: ${
                  data.dataSource === 'yahoo_finance'
                    ? 'Yahoo / ETFDB / Alpha Vantage (free)'
                    : data.dataSource === 'static_baseline'
                      ? 'Static baseline snapshot'
                      : data.dataSource
                }`
              : null}
          </p>
        )}
      </header>

      {loading && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
          Loading valuation data…
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {!loading && data?.configured && data.fmpPaymentRequired && data.fmpBillingHint && (
        <div className="mb-8 rounded-xl border border-violet-500/45 bg-violet-500/10 px-4 py-4 text-sm text-violet-950 dark:border-violet-500/35 dark:bg-violet-950/40 dark:text-violet-100">
          <p className="font-semibold">Financial Modeling Prep: HTTP 402 (Payment Required)</p>
          <p className="mt-2 leading-relaxed opacity-95">{data.fmpBillingHint}</p>
          <a
            href="https://site.financialmodelingprep.com/developer/docs/pricing"
            className="mt-2 inline-block text-sm font-medium text-violet-700 underline hover:no-underline dark:text-violet-300"
            target="_blank"
            rel="noreferrer"
          >
            FMP pricing & plan features →
          </a>
        </div>
      )}

      {!loading && data?.configured && data.yahooFallback && data.yahooNote && data.dataSource !== 'static_baseline' && (
        <div className="mb-8 rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-4 text-sm text-sky-950 dark:border-sky-500/35 dark:bg-sky-950/30 dark:text-sky-100">
          <p className="font-semibold">Free data mode (Yahoo / ETFDB / Alpha Vantage)</p>
          <p className="mt-2 leading-relaxed opacity-95">{data.yahooNote}</p>
          <p className="mt-2 text-xs opacity-90">
            Yahoo, ETFDB, and/or Alpha Vantage supply live-style ETF ratios. If one source is blocked on this host,
            the API automatically falls back to another source.
          </p>
        </div>
      )}

      {!loading && data?.configured && data.dataSource === 'static_baseline' && data.yahooNote && (
        <div className="mb-8 rounded-xl border border-zinc-200 bg-zinc-50/90 px-4 py-4 text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-200">
          <p className="font-semibold">Reference snapshot</p>
          <p className="mt-2 leading-relaxed opacity-95">{data.yahooNote}</p>
          <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
            Ratios below are approximate placeholders so the dashboard stays usable when live feeds fail. They are not
            real-time quotes.
          </p>
        </div>
      )}

      {!loading && data?.configured && !data.anyData && (
        <div className="mb-8 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-4 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
          <p className="font-semibold">Could not load valuation metrics</p>
          <p className="mt-2">
            Live valuation providers are temporarily unavailable from this host. The page retries automatically and may
            use a baseline snapshot until live feeds recover.
          </p>
        </div>
      )}

      {data?.granularityNote && data.configured && (
        <p className="mb-6 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{data.granularityNote}</p>
      )}

      {/* Snapshot cards */}
      {!loading && data?.configured && data.anyData && (
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Current snapshot
            {data.dataSource === 'static_baseline' ? (
              <span className="ml-2 text-sm font-normal text-zinc-500">(reference snapshot · not live)</span>
            ) : data.yahooFallback ? (
              <span className="ml-2 text-sm font-normal text-zinc-500">(free provider mix · trailing / forward where shown)</span>
            ) : (
              <span className="ml-2 text-sm font-normal text-zinc-500">(TTM / latest from FMP)</span>
            )}
          </h2>
          {data.snapshotNote && data.dataSource !== 'static_baseline' && (
            <p className="mb-4 text-sm text-sky-800 dark:text-sky-200/90">{data.snapshotNote}</p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {VALUATION_INDICES.map((meta) => {
              const block = bySymbol.get(meta.symbol);
              const t = block?.ttm;
              const err = block?.fmpError;
              return (
                <div
                  key={meta.symbol}
                  className="flex flex-col rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{meta.symbol}</p>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-50">{meta.name}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{meta.blurb}</p>
                  {err && (
                    <p className="mt-2 text-xs text-amber-700 dark:text-amber-400/90">{err}</p>
                  )}
                  <dl className="mt-3 grid grid-cols-2 gap-x-2 gap-y-2 text-xs">
                    <div>
                      <dt className="text-zinc-500">P/E (trailing)</dt>
                      <dd className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">{fmtNum(t?.peRatio)}</dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">P/E (forward)</dt>
                      <dd className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {fmtNum(t?.forwardPe ?? null)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">P/B</dt>
                      <dd className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">{fmtNum(t?.pbRatio)}</dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">Earnings yield</dt>
                      <dd className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {fmtNum(t?.earningsYieldPct)}%
                      </dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">Div. yield</dt>
                      <dd className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {fmtNum(t?.dividendYieldPct)}%
                      </dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">P/S</dt>
                      <dd className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">{fmtNum(t?.priceToSalesRatio)}</dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">PEG</dt>
                      <dd className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">{fmtNum(t?.pegRatio)}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-zinc-500">EV / EBITDA (TTM)</dt>
                      <dd className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {fmtNum(t?.enterpriseValueMultiple)}
                      </dd>
                    </div>
                  </dl>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Long-run S&P 500 P/E (FRED) — works without FMP quarterly history */}
      {!loading && data?.configured && data.anyData && data.hasHistoricalPe && data.historicalPe && (
        <section className="mb-10">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{data.historicalPe.chartTitle}</h2>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                <span className="font-mono text-[11px] text-zinc-600 dark:text-zinc-500">{data.historicalPe.source}</span>
                {data.historicalPe.metricKind === 'cape' ? (
                  <span> · CAPE uses 10-year real earnings; levels differ from one-year trailing P/E.</span>
                ) : (
                  <span> · Broad U.S. large-cap index multiple (monthly).</span>
                )}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">{data.historicalPeDisclaimer}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <label className="flex items-center gap-2">
                <span className="text-zinc-500">Context</span>
                <select
                  value={chartSymbol}
                  onChange={(e) => setChartSymbol(e.target.value)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  {VALUATION_INDICES.map((m) => (
                    <option key={m.symbol} value={m.symbol}>
                      {m.symbol} — {m.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2">
                <span className="text-zinc-500">Range</span>
                <select
                  value={peRange}
                  onChange={(e) => setPeRange(e.target.value as PeRange)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="5y">5 years</option>
                  <option value="10y">10 years</option>
                  <option value="20y">20 years</option>
                  <option value="max">Max</option>
                </select>
              </label>
            </div>
          </div>
          <div className="h-80 w-full rounded-xl border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-950/40">
            {fredPeRows.length === 0 ? (
              <p className="p-8 text-center text-sm text-zinc-500">No points in this range.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={fredPeRows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-800" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} className="text-zinc-500" interval="preserveStartEnd" />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    className="text-zinc-500"
                    domain={['auto', 'auto']}
                    label={{
                      value: data.historicalPe.shortLabel,
                      angle: -90,
                      position: 'insideLeft',
                      fontSize: 10,
                    }}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 12 }}
                    formatter={(v: number | undefined) => [v != null ? v.toFixed(2) : '—', data.historicalPe?.shortLabel ?? 'P/E']}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="pe"
                    name={data.historicalPe.shortLabel}
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      )}

      {/* Period change matrix — FMP quarterly history only */}
      {!loading && data?.configured && data.anyData && data.hasHistoricalMultiples && (
        <section className="mb-10">
          <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">How multiples changed</h2>
          <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
            % change in <strong>P/E</strong> and <strong>P/B</strong> from the baseline quarter on or before each horizon
            (see API note on quarterly granularity). Green = multiple expansion, red = compression.
          </p>
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-xs dark:border-zinc-800 dark:bg-zinc-900/80">
                  <th className="px-3 py-2 font-semibold text-zinc-600 dark:text-zinc-400">Period</th>
                  {VALUATION_INDICES.map((m) => (
                    <th key={m.symbol} className="px-3 py-2 font-semibold text-zinc-800 dark:text-zinc-200">
                      {m.symbol}
                      <span className="block text-[10px] font-normal text-zinc-500">Δ P/E · Δ P/B</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periodRows.map((row) => (
                  <tr key={row.period} className="border-b border-zinc-100 dark:border-zinc-800/80">
                    <td className="px-3 py-2 font-medium text-zinc-700 dark:text-zinc-300">{row.label}</td>
                    {row.cells.map((c) => {
                      const pe = c.peChangePct;
                      const pb = c.pbChangePct;
                      const peColor =
                        pe == null ? '' : pe > 0 ? 'text-emerald-600 dark:text-emerald-400' : pe < 0 ? 'text-red-600 dark:text-red-400' : '';
                      const pbColor =
                        pb == null ? '' : pb > 0 ? 'text-emerald-600 dark:text-emerald-400' : pb < 0 ? 'text-red-600 dark:text-red-400' : '';
                      return (
                        <td key={c.symbol} className="px-3 py-2 font-mono text-xs">
                          <span className={peColor}>{fmtPct(pe)}</span>
                          <span className="text-zinc-400"> · </span>
                          <span className={pbColor}>{fmtPct(pb)}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Chart */}
      {!loading && data?.configured && data.anyData && data.hasHistoricalMultiples && (
        <section className="mb-10">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Trailing P/E (quarterly)</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Quarterly history from Financial Modeling Prep.</p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-zinc-500">Index</span>
              <select
                value={chartSymbol}
                onChange={(e) => setChartSymbol(e.target.value)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              >
                {VALUATION_INDICES.map((m) => (
                  <option key={m.symbol} value={m.symbol}>
                    {m.symbol} — {m.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="h-80 w-full rounded-xl border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-950/40">
            {chartRows.length === 0 ? (
              <p className="p-8 text-center text-sm text-zinc-500">No historical P/E series for this symbol.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartRows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-800" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} className="text-zinc-500" />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    className="text-zinc-500"
                    domain={['auto', 'auto']}
                    label={{ value: 'P/E', angle: -90, position: 'insideLeft', fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 12 }}
                    formatter={(v: number | undefined) => [v != null ? v.toFixed(2) : '—', 'P/E']}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="pe" name="P/E" stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      )}

      {/* Historical context */}
      <section className="mb-10 rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-6 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Historical context (not live data)</h2>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          <p>
            <strong>{HISTORICAL_VALUATION_CONTEXT.sp500TrailingPe.label}:</strong>{' '}
            {HISTORICAL_VALUATION_CONTEXT.sp500TrailingPe.typicalRange}. {HISTORICAL_VALUATION_CONTEXT.sp500TrailingPe.meanReversionNote}
          </p>
          <p>
            <strong>{HISTORICAL_VALUATION_CONTEXT.cape.label}:</strong> {HISTORICAL_VALUATION_CONTEXT.cape.typicalRange}.{' '}
            {HISTORICAL_VALUATION_CONTEXT.cape.note}
          </p>
          <ul className="list-disc space-y-2 pl-5">
            {HISTORICAL_VALUATION_CONTEXT.otherMetrics.map((m) => (
              <li key={m.name}>
                <strong>{m.name}</strong> — {m.why}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="border-t border-zinc-200 pt-6 text-xs text-zinc-500 dark:border-zinc-800">
        <p>{VALUATION_DISCLAIMER}</p>
      </footer>
    </div>
  );
}
