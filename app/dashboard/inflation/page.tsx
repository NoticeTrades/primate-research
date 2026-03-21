'use client';

import { useEffect, useMemo, useState } from 'react';
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

type CpiPayload = {
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

function formatMonth(d: string) {
  const [y, m] = d.split('-');
  if (!y || !m) return d;
  const dt = new Date(Number(y), Number(m) - 1, 1);
  return dt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

const RANGE_MONTHS = [
  { value: 24, label: '2Y' },
  { value: 60, label: '5Y' },
  { value: 120, label: '10Y' },
  { value: 0, label: 'All' },
] as const;

export default function InflationPage() {
  const [data, setData] = useState<CpiPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rangeMonths, setRangeMonths] = useState<number>(60);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/cpi', { cache: 'no-store' });
        const json = (await res.json()) as CpiPayload & { error?: string };
        if (!res.ok) {
          if (!cancelled) setError(json.error || 'Failed to load CPI');
          return;
        }
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError('Network error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-semibold mb-3">
          <span className="w-2 h-2 rounded-full bg-amber-300" />
          Macro
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-zinc-50 tracking-tight">Inflation (CPI)</h1>
        <p className="text-zinc-400 text-sm mt-2 max-w-2xl">
          Headline CPI index (CPIAUCSL) from FRED / BLS. Track the level, year-over-year change, and whether YoY momentum is
          heating, cooling, or sideways versus the prior six months.
        </p>
        {data?.source && (
          <p className="text-xs text-zinc-600 mt-2">
            Source: {data.source} · Series {data.seriesId}
          </p>
        )}
      </header>

      {loading && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 animate-pulse h-48" />
      )}

      {error && !loading && (
        <div className="rounded-2xl border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">{error}</div>
      )}

      {!loading && data && (
        <>
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
                {data.latest?.yoyPct != null
                  ? `${data.latest.yoyPct >= 0 ? '+' : ''}${data.latest.yoyPct.toFixed(2)}%`
                  : '—'}
              </p>
              <p className="text-xs text-zinc-500 mt-1">vs same month prior year</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 shadow-xl">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">MoM change</p>
              <p
                className={`mt-2 text-2xl font-bold tabular-nums ${
                  (data.latest?.momPct ?? 0) >= 0 ? 'text-zinc-100' : 'text-zinc-300'
                }`}
              >
                {data.latest?.momPct != null
                  ? `${data.latest.momPct >= 0 ? '+' : ''}${data.latest.momPct.toFixed(2)}%`
                  : '—'}
              </p>
              <p className="text-xs text-zinc-500 mt-1">vs prior month</p>
            </div>
            <div className={`rounded-2xl border p-4 shadow-xl ${trendBadge}`}>
              <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Trend (YoY momentum)</p>
              <p className="mt-2 text-lg font-bold capitalize">{data.trend.direction}</p>
              <p className="text-xs mt-2 leading-relaxed opacity-90">{data.trend.summary}</p>
            </div>
          </section>

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
            <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">Recent monthly data</h2>
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
