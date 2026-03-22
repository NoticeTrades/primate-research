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

export default function ValuationPage() {
  const [data, setData] = useState<ValuationPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartSymbol, setChartSymbol] = useState<string>('SPY');

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
          <strong>IWM</strong>. With Financial Modeling Prep (paid tier) you also get quarterly history and period change
          tables; otherwise this page uses free Yahoo Finance snapshots for live ratios.
        </p>
        {data?.updatedAt && (
          <p className="mt-2 text-xs text-zinc-500">
            Last updated: {new Date(data.updatedAt).toLocaleString()}
            {data.configured && data.dataSource
              ? ` · Source: ${data.dataSource === 'yahoo_finance' ? 'Yahoo Finance (free)' : data.dataSource}`
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
          <p className="mt-3 text-xs opacity-90">
            Your <code className="rounded bg-black/10 px-1 py-0.5 dark:bg-white/10">?apikey=…</code> format is correct.{' '}
            <strong className="font-semibold">402 ≠ wrong key</strong> (invalid keys are usually HTTP 401). Check your FMP
            subscription includes <strong>Key Metrics</strong> / fundamentals, and that you have API credits remaining.
          </p>
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

      {!loading && data?.configured && data.yahooFallback && data.yahooNote && (
        <div className="mb-8 rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-4 text-sm text-sky-950 dark:border-sky-500/35 dark:bg-sky-950/30 dark:text-sky-100">
          <p className="font-semibold">Free data mode (Yahoo Finance)</p>
          <p className="mt-2 leading-relaxed opacity-95">{data.yahooNote}</p>
          <p className="mt-2 text-xs opacity-90">
            Yahoo and/or Alpha Vantage supply live-style ETF ratios. If Yahoo blocks this server, add{' '}
            <strong>ALPHA_VANTAGE_API_KEY</strong> in Vercel. Historical multiple series and period-% tables need upgraded
            FMP.
          </p>
        </div>
      )}

      {!loading && data?.configured && !data.anyData && (
        <div className="mb-8 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-4 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
          <p className="font-semibold">Could not load valuation metrics</p>
          <p className="mt-2">
            Yahoo Finance often blocks automated requests from hosting providers (e.g. Vercel). Add a free{' '}
            <strong>ALPHA_VANTAGE_API_KEY</strong> in Vercel → Environment Variables (same key used elsewhere on this site)
            — the valuation API will use Alpha Vantage OVERVIEW as a backup. You can upgrade FMP later for historical
            tables.
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
            {data.yahooFallback ? (
              <span className="ml-2 text-sm font-normal text-zinc-500">(Yahoo Finance · trailing / forward where shown)</span>
            ) : (
              <span className="ml-2 text-sm font-normal text-zinc-500">(TTM / latest from FMP)</span>
            )}
          </h2>
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
                    <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">{err}</p>
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
