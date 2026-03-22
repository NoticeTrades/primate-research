'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CPI_SERIES_OPTIONS, DEFAULT_CPI_SERIES_ID } from '../../../data/cpi-series';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from 'recharts';

type CpiObservation = {
  date: string;
  value: number;
  yoyPct: number | null;
};

type CpiReleaseRow = {
  reportMonthKey: string;
  reportMonthLabel: string;
  previousPrintMomPct: number | null;
  actualMomPct: number | null;
  actualYoyPct: number | null;
  forecastMomPct: number | null;
  forecastYoyPct: number | null;
  forecastSource: string | null;
  surpriseMomPct: number | null;
};

type CpiUpcoming = {
  reportMonthKey: string;
  reportMonthLabel: string;
  estimatedReleaseIsoUtc: string;
  notes: string | null;
  consensusMomPct: number | null;
  consensusYoyPct: number | null;
  consensusSource: string | null;
  trendContext: string;
};

type CpiIndexImpact = {
  symbol: string;
  name: string;
  whenHotterThanExpected: string;
  whenSofterThanExpected: string;
};

type CpiPayload = {
  seriesId: string;
  title: string;
  source: string;
  disclaimer: string;
  meta: {
    seriesLabel: string;
    from: string | null;
    to: string | null;
    dataSource: 'fred_api' | 'fred_csv';
    observationCount: number;
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
  releaseHistory: CpiReleaseRow[];
  upcoming: CpiUpcoming | null;
  indexImpacts: CpiIndexImpact[];
};

function formatMonth(d: string) {
  const [y, m] = d.split('-');
  if (!y || !m) return d;
  const dt = new Date(Number(y), Number(m) - 1, 1);
  return dt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function fmtPct(v: number | null | undefined, digits = 2): string {
  if (v == null || !Number.isFinite(v)) return '—';
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(digits)}%`;
}

function fmtRel(v: number | null | undefined, digits = 2): string {
  if (v == null || !Number.isFinite(v)) return '—';
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(digits)} pp`;
}

const RANGE_MONTHS = [
  { value: 24, label: '2Y' },
  { value: 60, label: '5Y' },
  { value: 120, label: '10Y' },
  { value: 0, label: 'All' },
] as const;

const CPI_PREFS_KEY = 'primateCpiPrefs';

type DatePreset = 'all' | '5y' | '10y' | '20y' | 'custom';

type StoredCpiPrefs = {
  seriesId: string;
  preset: DatePreset;
  from: string | null;
  to: string | null;
};

function readStoredCpiPrefs(): StoredCpiPrefs | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CPI_PREFS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredCpiPrefs;
  } catch {
    return null;
  }
}

function monthsAgoStart(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function buildCpiApiUrl(seriesId: string, from: string | null, to: string | null): string {
  const p = new URLSearchParams();
  p.set('series', seriesId);
  if (from) p.set('from', from);
  if (to) p.set('to', to);
  return `/api/cpi?${p.toString()}`;
}

/** YYYY-MM-01 → YYYY-MM for month inputs */
function toMonthInputValue(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 7);
}

export default function InflationPage() {
  const [seriesId, setSeriesId] = useState<string>(DEFAULT_CPI_SERIES_ID);
  const [preset, setPreset] = useState<DatePreset>('10y');
  const [from, setFrom] = useState<string | null>(monthsAgoStart(120));
  const [to, setTo] = useState<string | null>(null);
  const [customFromMonth, setCustomFromMonth] = useState(() => toMonthInputValue(monthsAgoStart(120)));
  const [customToMonth, setCustomToMonth] = useState('');

  const [data, setData] = useState<CpiPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rangeMonths, setRangeMonths] = useState<number>(60);

  const applyDatePreset = useCallback((p: DatePreset) => {
    setPreset(p);
    if (p === 'all') {
      setFrom(null);
      setTo(null);
    } else if (p === '5y') {
      setFrom(monthsAgoStart(60));
      setTo(null);
    } else if (p === '10y') {
      setFrom(monthsAgoStart(120));
      setTo(null);
    } else if (p === '20y') {
      setFrom(monthsAgoStart(240));
      setTo(null);
    }
  }, []);

  useEffect(() => {
    const s = readStoredCpiPrefs();
    if (s) {
      if (CPI_SERIES_OPTIONS.some((o) => o.id === s.seriesId)) {
        setSeriesId(s.seriesId);
      }
      setPreset(s.preset);
      setFrom(s.from);
      setTo(s.to);
      setCustomFromMonth(toMonthInputValue(s.from));
      setCustomToMonth(toMonthInputValue(s.to));
    }
  }, []);

  useEffect(() => {
    try {
      const prefs: StoredCpiPrefs = { seriesId, preset, from, to };
      localStorage.setItem(CPI_PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // ignore
    }
  }, [seriesId, preset, from, to]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const url = buildCpiApiUrl(seriesId, from, to);
        const res = await fetch(url, { cache: 'no-store' });
        const json = (await res.json()) as CpiPayload & { error?: string };
        if (!res.ok) {
          if (!cancelled) setError(json.error || 'Failed to load CPI');
          if (!cancelled) setData(null);
          return;
        }
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError('Network error');
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [seriesId, from, to]);

  const chartRows = useMemo(() => {
    if (!data?.observations?.length) return [];
    const obs = data.observations.filter((o) => Number.isFinite(o.value));
    const slice =
      rangeMonths <= 0 ? obs : obs.slice(Math.max(0, obs.length - rangeMonths));
    return slice.map((o) => ({
      ...o,
      label: formatMonth(o.date),
      yoy: o.yoyPct != null && Number.isFinite(o.yoyPct) ? Number(o.yoyPct.toFixed(2)) : null,
    }));
  }, [data, rangeMonths]);

  const trendBadge =
    data?.trend.direction === 'rising'
      ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
      : data?.trend.direction === 'falling'
        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
        : 'bg-zinc-500/15 border-zinc-500/40 text-zinc-200';

  const upcomingDateLabel = data?.upcoming
    ? new Date(data.upcoming.estimatedReleaseIsoUtc).toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      })
    : null;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-semibold mb-3">
          <span className="w-2 h-2 rounded-full bg-amber-300" />
          Macro
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-zinc-50 tracking-tight">Inflation (CPI)</h1>
        <p className="text-zinc-400 text-sm mt-2 max-w-2xl">
          U.S. consumer price data from the Federal Reserve Bank of St. Louis (FRED). Pick headline vs core and your date
          range — preferences save in this browser.
        </p>
        {data?.source && (
          <p className="text-xs text-zinc-600 mt-2">
            Source: {data.source} · {data.meta?.seriesLabel ?? data.title} ({data.seriesId})
          </p>
        )}
        {data?.disclaimer && (
          <p className="text-[11px] text-zinc-600 mt-2 max-w-3xl leading-relaxed border-l border-zinc-700 pl-3">
            {data.disclaimer}
          </p>
        )}
      </header>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 sm:p-6 shadow-xl">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-1">Series & date range</h2>
        <p className="text-xs text-zinc-500 mb-4 max-w-3xl">
          Trend, tables, and charts below reflect your selection.
        </p>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
          <label className="block flex-1 min-w-[200px]">
            <span className="text-xs text-zinc-500">CPI series</span>
            <select
              value={seriesId}
              onChange={(e) => setSeriesId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800/40 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              {CPI_SERIES_OPTIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.shortLabel} — {s.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-1 rounded-xl border border-zinc-700 bg-zinc-950/30 p-1 self-start">
            {(
              [
                ['all', 'All data'],
                ['5y', '5Y'],
                ['10y', '10Y'],
                ['20y', '20Y'],
                ['custom', 'Custom'],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  if (k === 'custom') {
                    setPreset('custom');
                    setCustomFromMonth(toMonthInputValue(from));
                    setCustomToMonth(toMonthInputValue(to));
                  } else {
                    applyDatePreset(k);
                  }
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  preset === k ? 'bg-blue-600 text-white' : 'text-zinc-300 hover:bg-zinc-800/70'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {preset === 'custom' && (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label>
              <span className="text-xs text-zinc-500 block mb-1">From month</span>
              <input
                type="month"
                value={customFromMonth}
                onChange={(e) => setCustomFromMonth(e.target.value)}
                className="rounded-lg border border-zinc-700 bg-zinc-800/40 px-3 py-2 text-sm text-zinc-200"
              />
            </label>
            <label>
              <span className="text-xs text-zinc-500 block mb-1">To month (optional)</span>
              <input
                type="month"
                value={customToMonth}
                onChange={(e) => setCustomToMonth(e.target.value)}
                className="rounded-lg border border-zinc-700 bg-zinc-800/40 px-3 py-2 text-sm text-zinc-200"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                const f = customFromMonth ? `${customFromMonth}-01` : null;
                const t = customToMonth ? `${customToMonth}-01` : null;
                setFrom(f);
                setTo(t);
              }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Apply range
            </button>
          </div>
        )}
        {!loading && data?.meta && (
          <p className="text-[11px] text-zinc-600 mt-4 border-t border-zinc-800 pt-3">
            <span className="text-zinc-500">FRED ·</span> {data.meta.observationCount} monthly points
            {' · '}
            {data.meta.from || data.meta.to ? (
              <span>
                {data.meta.from ?? 'start'} → {data.meta.to ?? 'latest'}
              </span>
            ) : (
              <span>full history</span>
            )}
          </p>
        )}
      </section>

      {loading && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 animate-pulse h-48" />
      )}

      {error && !loading && (
        <div className="rounded-2xl border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">{error}</div>
      )}

      {!loading && data && (
        <>
          {/* Summary cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 shadow-xl">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Latest index</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-zinc-50">
                {data.latest ? data.latest.value.toLocaleString('en-US', { maximumFractionDigits: 3 }) : '—'}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {data.latest ? formatMonth(data.latest.date) : ''} · 1982–84 = 100
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 shadow-xl">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">YoY change</p>
              <p
                className={`mt-2 text-2xl font-bold tabular-nums ${
                  (data.latest?.yoyPct ?? 0) >= 0 ? 'text-amber-200' : 'text-emerald-300'
                }`}
              >
                {fmtPct(data.latest?.yoyPct ?? null)}
              </p>
              <p className="text-xs text-zinc-500 mt-1">vs same month prior year</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 shadow-xl">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">MoM change (latest)</p>
              <p
                className={`mt-2 text-2xl font-bold tabular-nums ${
                  (data.latest?.momPct ?? 0) >= 0 ? 'text-zinc-100' : 'text-zinc-300'
                }`}
              >
                {fmtPct(data.latest?.momPct ?? null)}
              </p>
              <p className="text-xs text-zinc-500 mt-1">vs prior month (from index)</p>
            </div>
            <div className={`rounded-2xl border p-4 shadow-xl ${trendBadge}`}>
              <p className="text-xs font-semibold uppercase tracking-wider opacity-80">YoY momentum</p>
              <p className="mt-2 text-lg font-bold capitalize">{data.trend.direction}</p>
              <p className="text-xs mt-2 leading-relaxed opacity-90">{data.trend.summary}</p>
            </div>
          </section>

          {/* Last print: previous vs forecast vs actual */}
          {data.lastPrint && (
            <section className="rounded-2xl border border-blue-500/30 bg-blue-950/20 p-4 sm:p-6 shadow-xl">
              <h2 className="text-sm font-semibold text-blue-200 uppercase tracking-wider mb-1">Last print</h2>
              <p className="text-xs text-zinc-500 mb-4">
                {data.lastPrint.reportMonthLabel} — prior month’s MoM vs consensus vs actual (MoM / YoY). Surprise = actual
                MoM minus consensus MoM when both exist.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
                  <p className="text-[10px] font-semibold uppercase text-zinc-500">Previous MoM</p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-zinc-100">
                    {fmtPct(data.lastPrint.previousPrintMomPct)}
                  </p>
                  <p className="text-[10px] text-zinc-600 mt-1">Month before</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
                  <p className="text-[10px] font-semibold uppercase text-zinc-500">Forecast MoM</p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-sky-200">
                    {fmtPct(data.lastPrint.forecastMomPct)}
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
                  <p className="text-[10px] font-semibold uppercase text-zinc-500">Actual MoM</p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-zinc-50">
                    {fmtPct(data.lastPrint.actualMomPct)}
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
                  <p className="text-[10px] font-semibold uppercase text-zinc-500">Surprise (MoM)</p>
                  <p
                    className={`mt-1 text-lg font-bold tabular-nums ${
                      (data.lastPrint.surpriseMomPct ?? 0) > 0
                        ? 'text-amber-300'
                        : (data.lastPrint.surpriseMomPct ?? 0) < 0
                          ? 'text-emerald-300'
                          : 'text-zinc-400'
                    }`}
                  >
                    {fmtRel(data.lastPrint.surpriseMomPct)}
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
                  <p className="text-[10px] font-semibold uppercase text-zinc-500">Forecast YoY</p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-sky-200">
                    {fmtPct(data.lastPrint.forecastYoyPct)}
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
                  <p className="text-[10px] font-semibold uppercase text-zinc-500">Actual YoY</p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-amber-100">
                    {fmtPct(data.lastPrint.actualYoyPct)}
                  </p>
                </div>
              </div>
              {data.lastPrint.forecastSource && (
                <p className="text-[11px] text-zinc-600 mt-3">Consensus source: {data.lastPrint.forecastSource}</p>
              )}
            </section>
          )}

          {/* Upcoming */}
          {data.upcoming && (
            <section className="rounded-2xl border border-amber-500/25 bg-amber-950/15 p-4 sm:p-6 shadow-xl">
              <h2 className="text-sm font-semibold text-amber-200 uppercase tracking-wider mb-1">Upcoming release</h2>
              <p className="text-xs text-zinc-500 mb-3">
                Report: <span className="text-zinc-300 font-medium">{data.upcoming.reportMonthLabel}</span> · Estimated
                window: <span className="text-zinc-300">{upcomingDateLabel}</span>
              </p>
              {data.upcoming.notes && <p className="text-[11px] text-zinc-600 mb-3">{data.upcoming.notes}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                  <p className="text-[10px] font-semibold uppercase text-zinc-500">Expected MoM (consensus)</p>
                  <p className="mt-1 text-xl font-bold tabular-nums text-amber-100">
                    {fmtPct(data.upcoming.consensusMomPct)}
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                  <p className="text-[10px] font-semibold uppercase text-zinc-500">Expected YoY (consensus)</p>
                  <p className="mt-1 text-xl font-bold tabular-nums text-amber-100">
                    {fmtPct(data.upcoming.consensusYoyPct)}
                  </p>
                </div>
              </div>
              {data.upcoming.consensusSource && (
                <p className="text-[11px] text-zinc-600 mb-2">Source: {data.upcoming.consensusSource}</p>
              )}
              <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3">
                <p className="text-[10px] font-semibold uppercase text-zinc-500 mb-1">Trend vs expectations</p>
                <p className="text-sm text-zinc-300 leading-relaxed">{data.upcoming.trendContext}</p>
              </div>
            </section>
          )}

          {/* Release history table */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-6">
            <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-1">Recent prints</h2>
            <p className="text-xs text-zinc-500 mb-4 max-w-3xl">
              Actual MoM / YoY from the index. Manual consensus in{' '}
              <code className="text-zinc-400">data/cpi-macros.ts</code> overrides when present; otherwise MoM/YoY
              “forecasts” use a <span className="text-zinc-400">3-month rolling average of prior prints</span> as a trend
              proxy (not a survey). Surprise = actual MoM minus forecast MoM.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[800px]">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="px-2 py-2 text-[10px] font-semibold uppercase text-zinc-500">Month</th>
                    <th className="px-2 py-2 text-[10px] font-semibold uppercase text-zinc-500 text-right">Prev MoM</th>
                    <th className="px-2 py-2 text-[10px] font-semibold uppercase text-zinc-500 text-right">Fcst MoM</th>
                    <th className="px-2 py-2 text-[10px] font-semibold uppercase text-zinc-500 text-right">Actual MoM</th>
                    <th className="px-2 py-2 text-[10px] font-semibold uppercase text-zinc-500 text-right">Surprise</th>
                    <th className="px-2 py-2 text-[10px] font-semibold uppercase text-zinc-500 text-right">Fcst YoY</th>
                    <th className="px-2 py-2 text-[10px] font-semibold uppercase text-zinc-500 text-right">Actual YoY</th>
                  </tr>
                </thead>
                <tbody>
                  {data.releaseHistory.map((r) => (
                    <tr key={r.reportMonthKey} className="border-t border-zinc-800/60">
                      <td className="px-2 py-2 text-zinc-300 whitespace-nowrap">{r.reportMonthLabel}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-zinc-400">{fmtPct(r.previousPrintMomPct)}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-sky-300/90">{fmtPct(r.forecastMomPct)}</td>
                      <td className="px-2 py-2 text-right tabular-nums font-medium text-zinc-100">
                        {fmtPct(r.actualMomPct)}
                      </td>
                      <td
                        className={`px-2 py-2 text-right tabular-nums font-medium ${
                          r.surpriseMomPct == null
                            ? 'text-zinc-600'
                            : r.surpriseMomPct > 0
                              ? 'text-amber-300'
                              : r.surpriseMomPct < 0
                                ? 'text-emerald-300'
                                : 'text-zinc-400'
                        }`}
                      >
                        {fmtRel(r.surpriseMomPct)}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-sky-300/90">{fmtPct(r.forecastYoyPct)}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-amber-200/90">{fmtPct(r.actualYoyPct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Index impacts */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 sm:p-6 shadow-xl">
            <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-1">How CPI can impact indices</h2>
            <p className="text-xs text-zinc-500 mb-4 max-w-3xl">
              Not predictions — typical first-order narratives when headline CPI is <span className="text-amber-200">hotter</span> vs{' '}
              <span className="text-emerald-300">softer</span> than expected. Actual moves depend on positioning, revisions, and the
              rest of the data (core, supercore, wages).
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.indexImpacts.map((row) => (
                <div
                  key={row.symbol}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 flex flex-col gap-2"
                >
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-lg font-bold text-blue-200">{row.symbol}</span>
                    <span className="text-xs text-zinc-500">{row.name}</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-amber-400/90 mb-0.5">Hotter than expected</p>
                    <p className="text-xs text-zinc-400 leading-relaxed">{row.whenHotterThanExpected}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-emerald-400/90 mb-0.5">Softer than expected</p>
                    <p className="text-xs text-zinc-400 leading-relaxed">{row.whenSofterThanExpected}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Charts */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 sm:p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">CPI index level</h2>
                <p className="text-xs text-zinc-500 mt-1">{data.title}</p>
              </div>
              <div className="flex flex-wrap gap-1 rounded-xl border border-zinc-700 bg-zinc-950/30 p-1">
                {RANGE_MONTHS.map((r) => (
                  <button
                    key={r.label}
                    type="button"
                    onClick={() => setRangeMonths(r.value)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      rangeMonths === r.value ? 'bg-blue-600 text-white' : 'text-zinc-300 hover:bg-zinc-800/70'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[320px] w-full min-h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartRows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#a1a1aa', fontSize: 10 }}
                    interval="preserveStartEnd"
                    minTickGap={24}
                  />
                  <YAxis
                    tick={{ fill: '#a1a1aa', fontSize: 11 }}
                    domain={['auto', 'auto']}
                    tickFormatter={(v) => Number(v).toFixed(0)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #3f3f46',
                      borderRadius: '12px',
                    }}
                    labelStyle={{ color: '#e4e4e7' }}
                    formatter={(value) =>
                      value != null && typeof value === 'number' ? [value.toFixed(3), 'CPI'] : ['—', 'CPI']
                    }
                  />
                  <Line type="monotone" dataKey="value" name="CPI" stroke="#60a5fa" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 sm:p-6 shadow-xl">
            <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-1">Year-over-year % change</h2>
            <p className="text-xs text-zinc-500 mb-4">Inflation rate implied by the CPI index vs 12 months earlier</p>
            <div className="h-[300px] w-full min-h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartRows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis dataKey="label" tick={{ fill: '#a1a1aa', fontSize: 10 }} interval="preserveStartEnd" minTickGap={24} />
                  <YAxis
                    tick={{ fill: '#a1a1aa', fontSize: 11 }}
                    tickFormatter={(v) => `${v}%`}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #3f3f46',
                      borderRadius: '12px',
                    }}
                    formatter={(value) =>
                      value != null && typeof value === 'number'
                        ? [`${value >= 0 ? '+' : ''}${value.toFixed(2)}%`, 'YoY']
                        : ['—', 'YoY']
                    }
                  />
                  <defs>
                    <linearGradient id="cpiYoyFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="yoy"
                    name="YoY %"
                    fill="url(#cpiYoyFill)"
                    stroke="#fbbf24"
                    strokeWidth={2}
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-6">
            <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">Monthly index & YoY</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[480px]">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="px-3 py-2 text-xs font-semibold uppercase text-zinc-500">Month</th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase text-zinc-500 text-right">CPI</th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase text-zinc-500 text-right">YoY %</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.observations]
                    .filter((o) => Number.isFinite(o.value))
                    .slice(-24)
                    .reverse()
                    .map((o) => (
                      <tr key={o.date} className="border-t border-zinc-800/60">
                        <td className="px-3 py-2 text-zinc-300">{formatMonth(o.date)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-zinc-100">{o.value.toFixed(3)}</td>
                        <td
                          className={`px-3 py-2 text-right tabular-nums font-medium ${
                            o.yoyPct == null
                              ? 'text-zinc-500'
                              : o.yoyPct >= 0
                                ? 'text-amber-200'
                                : 'text-emerald-300'
                          }`}
                        >
                          {o.yoyPct == null ? '—' : `${o.yoyPct >= 0 ? '+' : ''}${o.yoyPct.toFixed(2)}%`}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
