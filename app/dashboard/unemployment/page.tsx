'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { UNEMPLOYMENT_DISCLAIMER, UNEMPLOYMENT_INTRO } from '../../../data/unemployment-guide';
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  LineChart,
} from 'recharts';

type MonthlyRow = {
  date: string;
  unrate: number | null;
  u6: number | null;
  momUnrate: number | null;
  yoyUnrate: number | null;
  u6Spread: number | null;
};

type UnemploymentPayload = {
  meta: {
    from: string | null;
    to: string | null;
    observationCountUnrate: number;
    dataSourceNote: string;
  };
  monthly: MonthlyRow[];
  latest: {
    date: string;
    unrate: number | null;
    u6: number | null;
    momUnrate: number | null;
    yoyUnrate: number | null;
    u6Spread: number | null;
    priorMonthDate: string | null;
  } | null;
  trend: {
    slopePctPerMonth: number;
    direction: 'rising' | 'falling' | 'stable';
    summary: string;
  } | null;
  statisticalProjection: {
    method: string;
    regression: { slope: number; intercept: number; monthsUsed: number } | null;
    points: Array<{ label: string; iso: string; projectedUnratePct: number }>;
    disclaimer: string;
  };
  vsNatural: {
    naturalRatePct: number;
    asOf: string;
    gapPp: number;
  } | null;
  claimsRecent: { date: string; value: number }[];
};

const PREFS_KEY = 'primateUnemploymentPrefs';

type DatePreset = 'all' | '5y' | '10y' | '20y' | 'custom';

type StoredPrefs = {
  preset: DatePreset;
  from: string | null;
  to: string | null;
};

function formatMonth(d: string) {
  const [y, m] = d.split('-');
  if (!y || !m) return d;
  const dt = new Date(Number(y), Number(m) - 1, 1);
  return dt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function monthsAgoStart(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function toMonthInputValue(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 7);
}

function buildApiUrl(from: string | null, to: string | null): string {
  const p = new URLSearchParams();
  if (from) p.set('from', from);
  if (to) p.set('to', to);
  const q = p.toString();
  return `/api/unemployment${q ? `?${q}` : ''}`;
}

function fmtPp(v: number | null | undefined, digits = 2): string {
  if (v == null || !Number.isFinite(v)) return '—';
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(digits)} pp`;
}

const CHART_RANGE = [
  { value: 60, label: '5Y' },
  { value: 120, label: '10Y' },
  { value: 0, label: 'All' },
] as const;

export default function UnemploymentPage() {
  const [preset, setPreset] = useState<DatePreset>('10y');
  const [from, setFrom] = useState<string | null>(monthsAgoStart(120));
  const [to, setTo] = useState<string | null>(null);
  const [customFromMonth, setCustomFromMonth] = useState(() => toMonthInputValue(monthsAgoStart(120)));
  const [customToMonth, setCustomToMonth] = useState('');

  const [data, setData] = useState<UnemploymentPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rangeMonths, setRangeMonths] = useState<number>(120);

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
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) as StoredPrefs;
      setPreset(s.preset);
      setFrom(s.from);
      setTo(s.to);
      setCustomFromMonth(toMonthInputValue(s.from));
      setCustomToMonth(toMonthInputValue(s.to));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      const prefs: StoredPrefs = { preset, from, to };
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
  }, [preset, from, to]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(buildApiUrl(from, to), { cache: 'no-store' });
        const json = (await res.json()) as UnemploymentPayload & { error?: string };
        if (!res.ok) {
          if (!cancelled) setError(json.error || 'Failed to load data');
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
  }, [from, to]);

  const chartMonthly = useMemo(() => {
    if (!data?.monthly?.length) return [];
    const rows = data.monthly.filter((r) => r.unrate != null && Number.isFinite(r.unrate));
    const slice = rangeMonths <= 0 ? rows : rows.slice(Math.max(0, rows.length - rangeMonths));
    return slice.map((r) => ({
      ...r,
      label: formatMonth(r.date),
      ur: r.unrate as number,
      u6v: r.u6 != null && Number.isFinite(r.u6) ? r.u6 : null,
    }));
  }, [data, rangeMonths]);

  const projectionChartData = useMemo(() => {
    if (!data?.monthly?.length || !data.statisticalProjection?.points?.length) return [];
    type ProjRow = { label: string; actual: number | null; proj: number | null };
    const rows = data.monthly.filter((r) => r.unrate != null && Number.isFinite(r.unrate));
    const slice = rangeMonths <= 0 ? rows : rows.slice(Math.max(0, rows.length - rangeMonths));
    const hist: ProjRow[] = slice.map((r) => ({
      label: formatMonth(r.date),
      actual: r.unrate as number,
      proj: null,
    }));
    if (hist.length === 0) return [];
    const last = hist[hist.length - 1];
    const out: ProjRow[] = hist.map((h) => ({ ...h }));
    out[out.length - 1] = { ...last, proj: last.actual };
    for (const p of data.statisticalProjection.points) {
      out.push({
        label: p.label,
        actual: null,
        proj: p.projectedUnratePct,
      });
    }
    return out;
  }, [data, rangeMonths]);

  const claimsChart = useMemo(() => {
    if (!data?.claimsRecent?.length) return [];
    return data.claimsRecent.map((c) => ({
      label: c.date.slice(0, 10),
      claims: c.value,
    }));
  }, [data]);

  const trendBadge =
    data?.trend?.direction === 'falling'
      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
      : data?.trend?.direction === 'rising'
        ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
        : 'bg-zinc-500/15 border-zinc-500/40 text-zinc-200';

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-200 text-xs font-semibold mb-3">
          <span className="w-2 h-2 rounded-full bg-violet-300" />
          Macro
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-zinc-50 tracking-tight">Unemployment</h1>
        <p className="text-zinc-400 text-sm mt-2 max-w-3xl leading-relaxed">{UNEMPLOYMENT_INTRO}</p>
        <p className="text-[11px] text-zinc-600 mt-3 max-w-3xl leading-relaxed border-l border-zinc-700 pl-3">
          {UNEMPLOYMENT_DISCLAIMER}
        </p>
      </header>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 sm:p-6 shadow-xl">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-1">Date range</h2>
        <p className="text-xs text-zinc-500 mb-4">Preferences save in this browser.</p>
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
            <span className="text-zinc-500">FRED ·</span> {data.meta.observationCountUnrate} monthly U-3 points in range
          </p>
        )}
      </section>

      {loading && <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 animate-pulse h-48" />}

      {error && !loading && (
        <div className="rounded-2xl border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">{error}</div>
      )}

      {!loading && data && (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 shadow-xl">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">U-3 (headline)</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-zinc-50">
                {data.latest?.unrate != null ? `${data.latest.unrate.toFixed(1)}%` : '—'}
              </p>
              <p className="text-xs text-zinc-500 mt-1">{data.latest ? formatMonth(data.latest.date) : ''}</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 shadow-xl">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">MoM change</p>
              <p
                className={`mt-2 text-2xl font-bold tabular-nums ${
                  (data.latest?.momUnrate ?? 0) <= 0 ? 'text-emerald-300' : 'text-amber-200'
                }`}
              >
                {fmtPp(data.latest?.momUnrate ?? null)}
              </p>
              <p className="text-xs text-zinc-500 mt-1">vs prior month</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 shadow-xl">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">YoY change</p>
              <p
                className={`mt-2 text-2xl font-bold tabular-nums ${
                  (data.latest?.yoyUnrate ?? 0) <= 0 ? 'text-emerald-300' : 'text-amber-200'
                }`}
              >
                {fmtPp(data.latest?.yoyUnrate ?? null)}
              </p>
              <p className="text-xs text-zinc-500 mt-1">vs same month last year</p>
            </div>
            <div className={`rounded-2xl border p-4 shadow-xl ${trendBadge}`}>
              <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Trend (≈2Y)</p>
              <p className="mt-2 text-lg font-bold capitalize">{data.trend?.direction ?? '—'}</p>
              <p className="text-xs mt-2 leading-relaxed opacity-90">{data.trend?.summary ?? 'Not enough data in range.'}</p>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 shadow-xl">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">U-6 (broad)</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-violet-200">
                {data.latest?.u6 != null ? `${data.latest.u6.toFixed(1)}%` : '—'}
              </p>
              <p className="text-xs text-zinc-500 mt-1">Includes part-time for economic reasons</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 shadow-xl">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">U-6 minus U-3</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-zinc-100">
                {data.latest?.u6Spread != null ? `${data.latest.u6Spread.toFixed(1)} pp` : '—'}
              </p>
              <p className="text-xs text-zinc-500 mt-1">Wider spread → more underemployment pain</p>
            </div>
          </section>

          {data.vsNatural && (
            <section className="rounded-2xl border border-cyan-500/25 bg-cyan-950/20 p-4 sm:p-6 shadow-xl">
              <h2 className="text-sm font-semibold text-cyan-200 uppercase tracking-wider mb-1">Vs. natural rate (estimate)</h2>
              <p className="text-xs text-zinc-500 mb-3">
                FRED series NROU — longer-run concept; revised over time. As of {formatMonth(data.vsNatural.asOf)}.
              </p>
              <div className="flex flex-wrap gap-6 items-baseline">
                <div>
                  <p className="text-[10px] uppercase text-zinc-500">Current U-3</p>
                  <p className="text-2xl font-bold text-zinc-50 tabular-nums">{data.latest?.unrate?.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-zinc-500">Natural rate (est.)</p>
                  <p className="text-2xl font-bold text-cyan-200 tabular-nums">{data.vsNatural.naturalRatePct.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-zinc-500">Gap</p>
                  <p
                    className={`text-2xl font-bold tabular-nums ${
                      data.vsNatural.gapPp <= 0 ? 'text-emerald-300' : 'text-amber-200'
                    }`}
                  >
                    {fmtPp(data.vsNatural.gapPp)}
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-zinc-600 mt-3">
                Negative gap (U-3 below natural) is common in strong labor markets; positive can signal slack — interpretation
                varies with participation and demographics.
              </p>
            </section>
          )}

          {data.statisticalProjection.points.length > 0 && (
            <section className="rounded-2xl border border-fuchsia-500/25 bg-fuchsia-950/15 p-4 sm:p-6 shadow-xl">
              <h2 className="text-sm font-semibold text-fuchsia-200 uppercase tracking-wider mb-1">Model projection (U-3)</h2>
              <p className="text-xs text-zinc-500 mb-2">{data.statisticalProjection.method}</p>
              <p className="text-[11px] text-zinc-600 mb-4 border-l border-fuchsia-500/30 pl-3">{data.statisticalProjection.disclaimer}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {data.statisticalProjection.points.slice(0, 12).map((p) => (
                  <div key={p.iso} className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2">
                    <p className="text-[10px] text-zinc-500">{p.label}</p>
                    <p className="text-lg font-semibold tabular-nums text-fuchsia-100">{p.projectedUnratePct.toFixed(2)}%</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 sm:p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">U-3 vs U-6</h2>
                <p className="text-xs text-zinc-500 mt-1">Headline vs broad unemployment rate</p>
              </div>
              <div className="flex flex-wrap gap-1 rounded-xl border border-zinc-700 bg-zinc-950/30 p-1">
                {CHART_RANGE.map((r) => (
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
                <LineChart data={chartMonthly} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
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
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #3f3f46',
                      borderRadius: '12px',
                    }}
                    formatter={(value, name) => [
                      value != null && typeof value === 'number' ? `${value.toFixed(2)}%` : '—',
                      name === 'ur' ? 'U-3' : 'U-6',
                    ]}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="ur" name="U-3" stroke="#60a5fa" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="u6v" name="U-6" stroke="#c084fc" strokeWidth={2} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {projectionChartData.length > 0 && (
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 sm:p-6 shadow-xl">
              <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-1">History + model path</h2>
              <p className="text-xs text-zinc-500 mb-4">
                Solid = actual U-3 in view; dashed = OLS extrapolation (same window as trend). Not an official forecast.
              </p>
              <div className="h-[300px] w-full min-h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={projectionChartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                    <XAxis dataKey="label" tick={{ fill: '#a1a1aa', fontSize: 9 }} interval="preserveStartEnd" minTickGap={16} />
                    <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} domain={['auto', 'auto']} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px' }}
                      formatter={(value, name) => [
                        value != null && typeof value === 'number' ? `${value.toFixed(2)}%` : '—',
                        name === 'actual' ? 'Actual U-3' : 'Model',
                      ]}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="actual" name="Actual U-3" stroke="#38bdf8" strokeWidth={2} dot={false} connectNulls />
                    <Line
                      type="monotone"
                      dataKey="proj"
                      name="Model path"
                      stroke="#f472b6"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      dot={false}
                      connectNulls
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {claimsChart.length > 0 && (
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 sm:p-6 shadow-xl">
              <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-1">Initial jobless claims</h2>
              <p className="text-xs text-zinc-500 mb-4">Weekly, seasonally adjusted — ~2 years in range. Spikes often align with stress episodes.</p>
              <div className="h-[280px] w-full min-h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={claimsChart} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                    <XAxis dataKey="label" tick={{ fill: '#a1a1aa', fontSize: 9 }} minTickGap={20} />
                    <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px' }}
                      formatter={(value) => [value != null && typeof value === 'number' ? value.toLocaleString() : '—', 'Claims']}
                    />
                    <defs>
                      <linearGradient id="claimsFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="claims" stroke="#22d3ee" fill="url(#claimsFill)" strokeWidth={1.5} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-6">
            <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">Recent monthly data</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="px-3 py-2 text-xs font-semibold uppercase text-zinc-500">Month</th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase text-zinc-500 text-right">U-3</th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase text-zinc-500 text-right">U-6</th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase text-zinc-500 text-right">MoM</th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase text-zinc-500 text-right">YoY</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.monthly]
                    .filter((r) => r.unrate != null)
                    .slice(-36)
                    .reverse()
                    .map((r) => (
                      <tr key={r.date} className="border-t border-zinc-800/60">
                        <td className="px-3 py-2 text-zinc-300 whitespace-nowrap">{formatMonth(r.date)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-zinc-100">{r.unrate?.toFixed(2)}%</td>
                        <td className="px-3 py-2 text-right tabular-nums text-zinc-400">{r.u6 != null ? `${r.u6.toFixed(2)}%` : '—'}</td>
                        <td
                          className={`px-3 py-2 text-right tabular-nums ${
                            r.momUnrate == null ? 'text-zinc-600' : r.momUnrate <= 0 ? 'text-emerald-300' : 'text-amber-200'
                          }`}
                        >
                          {fmtPp(r.momUnrate)}
                        </td>
                        <td
                          className={`px-3 py-2 text-right tabular-nums ${
                            r.yoyUnrate == null ? 'text-zinc-600' : r.yoyUnrate <= 0 ? 'text-emerald-300' : 'text-amber-200'
                          }`}
                        >
                          {fmtPp(r.yoyUnrate)}
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
