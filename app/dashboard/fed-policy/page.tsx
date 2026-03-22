'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FED_GENERAL_DISCLAIMER,
  FED_POLICY_INTRO,
  FED_POLICY_SECTIONS,
} from '../../../data/fed-policy-guide';
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
  LineChart,
} from 'recharts';

const PREFS_KEY = 'primateFedPolicyPrefs';

type Prefs = {
  years: 5 | 10 | 20;
  showDotPlot: boolean;
  showMarketChart: boolean;
  showStats: boolean;
  showMedianLine: boolean;
  showSepDisclaimer: boolean;
  /** Macro “how to read this” panel */
  showMacroGuide: boolean;
  /** Which FRED series IDs to plot together */
  seriesIds: string[];
};

const DEFAULT_PREFS: Prefs = {
  years: 10,
  showDotPlot: true,
  showMarketChart: true,
  showStats: true,
  showMedianLine: true,
  showSepDisclaimer: true,
  showMacroGuide: true,
  seriesIds: ['FEDFUNDS', 'DGS2', 'DGS10', 'T10Y2Y'],
};

const SERIES_COLORS: Record<string, string> = {
  FEDFUNDS: '#34d399',
  SOFR: '#f472b6',
  DGS3MO: '#2dd4bf',
  DGS2: '#60a5fa',
  DGS10: '#a78bfa',
  DGS30: '#c084fc',
  T10Y2Y: '#fbbf24',
  T5YIE: '#f97316',
  DFII10: '#a3e635',
};

type FedPayload = {
  sep: {
    meta: { meetingLabel: string; asOfDate: string; sourceUrl: string; disclaimer: string };
    horizons: Array<{ key: string; label: string; xIndex: number; minPct: number; maxPct: number; medianPct: number }>;
    dots: Array<{
      horizonKey: string;
      label: string;
      xIndex: number;
      participantIndex: number;
      ratePct: number;
      xJitter: number;
      x: number;
      y: number;
    }>;
    medianLine: Array<{
      label: string;
      xIndex: number;
      medianPct: number;
      x: number;
      y: number;
    }>;
  };
  series: Record<
    string,
    {
      id: string;
      label: string;
      unit: string;
      observations: { date: string; value: number }[];
      dataSource: string;
      usedFredApi: boolean;
    }
  >;
  seriesCatalog: Array<{ id: string; label: string; unit: string }>;
  meta: { years: number; from: string };
};

function loadPrefs(): Prefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const p = JSON.parse(raw) as Partial<Prefs>;
    return {
      ...DEFAULT_PREFS,
      ...p,
      seriesIds: Array.isArray(p.seriesIds) && p.seriesIds.length ? p.seriesIds : DEFAULT_PREFS.seriesIds,
      showMacroGuide: typeof p.showMacroGuide === 'boolean' ? p.showMacroGuide : DEFAULT_PREFS.showMacroGuide,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(p: Prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

/** Merge FRED series by date for multi-line chart */
function mergeSeriesByDate(
  series: FedPayload['series'],
  ids: string[]
): Array<Record<string, number | string>> {
  const dateMap = new Map<string, Record<string, number | string>>();

  for (const id of ids) {
    const s = series[id];
    if (!s?.observations) continue;
    for (const o of s.observations) {
      let row = dateMap.get(o.date);
      if (!row) {
        row = { date: o.date };
        dateMap.set(o.date, row);
      }
      row[id] = o.value;
    }
  }

  return Array.from(dateMap.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

/** Per-column dot colors (lighter → deeper across the horizon) */
const DOT_HORIZON_FILLS = ['#67e8f9', '#22d3ee', '#06b6d4', '#164e63'];

function SepDotShape(props: {
  cx?: number;
  cy?: number;
  payload?: { xIndex?: number };
}) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  const idx = Math.min(3, Math.max(0, payload?.xIndex ?? 0));
  const fill = DOT_HORIZON_FILLS[idx] ?? '#22d3ee';
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5.5}
      fill={fill}
      fillOpacity={0.88}
      stroke="rgba(15, 23, 42, 0.55)"
      strokeWidth={1.25}
    />
  );
}

export default function FedPolicyPage() {
  const [data, setData] = useState<FedPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

  useEffect(() => {
    setPrefs(loadPrefs());
  }, []);

  const fetchData = useCallback(async (years: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/fed-policy?years=${years}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(prefs.years);
  }, [fetchData, prefs.years]);

  const updatePrefs = useCallback((patch: Partial<Prefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      savePrefs(next);
      return next;
    });
  }, []);

  const mergedChart = useMemo(() => {
    if (!data) return [];
    return mergeSeriesByDate(data.series, prefs.seriesIds);
  }, [data, prefs.seriesIds]);

  /** Median path sorted by x so the line connects in column order */
  const medianLineSorted = useMemo(() => {
    if (!data) return [];
    return [...data.sep.medianLine].sort((a, b) => a.x - b.x);
  }, [data]);

  const dotPlotYDomain = useMemo((): [number, number] => {
    if (!data?.sep.dots.length) return [2, 5];
    let min = Infinity;
    let max = -Infinity;
    for (const d of data.sep.dots) {
      const y = d.y ?? d.ratePct;
      min = Math.min(min, y);
      max = Math.max(max, y);
    }
    if (prefs.showMedianLine) {
      for (const m of data.sep.medianLine) {
        const y = m.y ?? m.medianPct;
        min = Math.min(min, y);
        max = Math.max(max, y);
      }
    }
    const span = max - min || 0.5;
    const pad = Math.max(0.08, span * 0.14);
    return [Number((min - pad).toFixed(3)), Number((max + pad).toFixed(3))];
  }, [data, prefs.showMedianLine]);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-400/90">Dashboard</p>
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Rates & Fed Policy</h1>
        <p className="text-sm text-zinc-400 max-w-3xl leading-relaxed">{FED_POLICY_INTRO}</p>
        <p className="text-xs text-zinc-500 max-w-3xl leading-relaxed pt-1">
          Economic data from the Federal Reserve Bank of St. Louis (FRED). Adjust panels and series below; preferences
          save in this browser.
        </p>
      </header>

      {/* Macro guide — why this matters for markets */}
      {prefs.showMacroGuide && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 md:p-6 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">How to use this for markets</h2>
          <p className="text-xs text-zinc-500 leading-relaxed">{FED_GENERAL_DISCLAIMER}</p>
          <div className="grid gap-3 md:grid-cols-2">
            {FED_POLICY_SECTIONS.map((sec) => (
              <details
                key={sec.title}
                className="group rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-4 py-3 open:border-zinc-700"
              >
                <summary className="cursor-pointer text-sm font-medium text-zinc-200 list-none flex items-center justify-between gap-2">
                  {sec.title}
                  <span className="text-zinc-500 text-xs group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="text-xs text-zinc-400 mt-3 leading-relaxed">{sec.body}</p>
                {sec.bullets && sec.bullets.length > 0 && (
                  <ul className="mt-2 space-y-1.5 text-[11px] text-zinc-500 list-disc pl-4">
                    {sec.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                )}
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Controls */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 md:p-5 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Customize view</p>
        <div className="flex flex-wrap gap-4 items-center">
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <span className="text-zinc-500">History</span>
            <select
              value={prefs.years}
              onChange={(e) => updatePrefs({ years: Number(e.target.value) as Prefs['years'] })}
              className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-100 text-sm focus:ring-2 focus:ring-blue-500/50"
            >
              <option value={5}>5 years</option>
              <option value={10}>10 years</option>
              <option value={20}>20 years</option>
            </select>
          </label>
        </div>

        <div className="flex flex-wrap gap-4">
          {(
            [
              ['showMacroGuide', 'Macro guide'],
              ['showDotPlot', 'SEP dot plot'],
              ['showMedianLine', 'Median path'],
              ['showMarketChart', 'Market rates chart'],
              ['showStats', 'Latest stats'],
              ['showSepDisclaimer', 'SEP disclaimer'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={prefs[key as keyof Prefs] as boolean}
                onChange={(e) => updatePrefs({ [key]: e.target.checked } as Partial<Prefs>)}
                className="rounded border-zinc-600 bg-zinc-800 text-emerald-600 focus:ring-emerald-500"
              />
              {label}
            </label>
          ))}
        </div>

        {prefs.showMarketChart && data && (
          <div className="pt-2 border-t border-zinc-800">
            <p className="text-xs text-zinc-500 mb-2">Series on combined chart (pick any)</p>
            <div className="flex flex-wrap gap-3">
              {data.seriesCatalog.map((s) => {
                const on = prefs.seriesIds.includes(s.id);
                return (
                  <label key={s.id} className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => {
                        const next = on
                          ? prefs.seriesIds.filter((x) => x !== s.id)
                          : [...prefs.seriesIds, s.id];
                        if (next.length === 0) return;
                        updatePrefs({ seriesIds: next });
                      }}
                      className="rounded border-zinc-600 bg-zinc-800 text-emerald-600"
                    />
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: SERIES_COLORS[s.id] || '#94a3b8' }}
                      />
                      {s.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {loading && <p className="text-zinc-500 text-sm">Loading…</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      {data && !loading && (
        <>
          {prefs.showSepDisclaimer && (
            <p className="text-xs text-zinc-500 leading-relaxed border-l-2 border-amber-500/50 pl-3">
              {data.sep.meta.disclaimer}
            </p>
          )}

          {/* Dot plot */}
          {prefs.showDotPlot && (
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">FOMC federal funds projections</h2>
                  <p className="text-xs text-zinc-500 mt-1">
                    {data.sep.meta.meetingLabel} · as of {data.sep.meta.asOfDate} ·{' '}
                    <a
                      href={data.sep.meta.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline"
                    >
                      Fed materials
                    </a>
                  </p>
                </div>
              </div>
              <div className="h-[400px] w-full rounded-xl bg-gradient-to-b from-zinc-950/50 to-zinc-950/20 border border-zinc-800/60 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart margin={{ top: 12, right: 16, left: 4, bottom: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} opacity={0.65} />
                    <XAxis
                      type="number"
                      dataKey="x"
                      domain={[-0.35, 3.35]}
                      ticks={[0, 1, 2, 3]}
                      tickFormatter={(v) => {
                        const i = Math.round(Number(v));
                        return data.sep.horizons[i]?.label ?? '';
                      }}
                      stroke="#52525b"
                      tick={{ fill: '#d4d4d8', fontSize: 12 }}
                      tickLine={{ stroke: '#52525b' }}
                      axisLine={{ stroke: '#3f3f46' }}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      domain={dotPlotYDomain}
                      stroke="#52525b"
                      tick={{ fill: '#a1a1aa', fontSize: 11 }}
                      tickLine={{ stroke: '#52525b' }}
                      axisLine={{ stroke: '#3f3f46' }}
                      tickFormatter={(v) => `${v}%`}
                      width={48}
                      label={{
                        value: 'Midpoint of target range (%)',
                        angle: -90,
                        position: 'insideLeft',
                        fill: '#71717a',
                        fontSize: 11,
                        offset: 4,
                      }}
                    />
                    <Tooltip
                      cursor={{ stroke: '#64748b', strokeWidth: 1, strokeDasharray: '4 4' }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const raw = payload[0].payload as {
                          label?: string;
                          y?: number;
                          ratePct?: number;
                          medianPct?: number;
                          participantIndex?: number;
                        };
                        const isMedian =
                          raw.medianPct != null && typeof raw.participantIndex !== 'number';
                        const v = raw.y ?? raw.ratePct ?? raw.medianPct;
                        return (
                          <div className="rounded-lg border border-zinc-600 bg-zinc-900/95 px-3 py-2 text-xs shadow-xl backdrop-blur-sm">
                            <p className="font-medium text-zinc-100">{raw.label ?? '—'}</p>
                            <p className={`tabular-nums mt-0.5 ${isMedian ? 'text-amber-300' : 'text-cyan-200'}`}>
                              {typeof v === 'number' ? `${v.toFixed(2)}%` : '—'}{' '}
                              <span className="text-zinc-500">mid</span>
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: 8 }}
                      formatter={(value) => <span className="text-zinc-400 text-xs">{value}</span>}
                    />
                    <Scatter
                      name="Participant projections"
                      data={data.sep.dots}
                      fill="#22d3ee"
                      shape={SepDotShape}
                      isAnimationActive={false}
                    />
                    {prefs.showMedianLine && medianLineSorted.length > 0 && (
                      <Line
                        name="Median projection"
                        data={medianLineSorted}
                        dataKey="y"
                        stroke="#fbbf24"
                        strokeWidth={2.5}
                        dot={{ r: 5, fill: '#fbbf24', stroke: '#422006', strokeWidth: 1 }}
                        activeDot={{ r: 6 }}
                        type="linear"
                        connectNulls
                        isAnimationActive={false}
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[11px] text-zinc-500 mt-2">
                Each dot is one participant’s projection for that year-end (or longer-run equilibrium). Horizontal spread
                within a column is jitter for readability only; the median path connects official median midpoints.
              </p>
            </section>
          )}

          {/* Market rates */}
          {prefs.showMarketChart && mergedChart.length > 0 && (
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 md:p-6">
              <h2 className="text-lg font-semibold text-white mb-1">Market rates & curve</h2>
              <p className="text-xs text-zinc-500 mb-4">
                Policy anchors, nominal curve (3M–30Y), curve shape (10Y−2Y), inflation breakevens, and TIPS real yields —
                pick any combination above. {data.meta.years}-year lookback.
              </p>
              <div className="h-[360px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mergedChart} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis
                      dataKey="date"
                      stroke="#71717a"
                      tick={{ fill: '#a1a1aa', fontSize: 10 }}
                      minTickGap={40}
                    />
                    <YAxis stroke="#71717a" tick={{ fill: '#a1a1aa', fontSize: 11 }} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
                      labelFormatter={(d) => String(d)}
                    />
                    <Legend />
                    {prefs.seriesIds.map((id) => (
                      <Line
                        key={id}
                        type="monotone"
                        dataKey={id}
                        name={data.series[id]?.label ?? id}
                        stroke={SERIES_COLORS[id] || '#94a3b8'}
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {/* Stats */}
          {prefs.showStats && (
            <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {data.seriesCatalog.map(({ id }) => {
                const s = data.series[id];
                const last = s?.observations?.[s.observations.length - 1];
                return (
                  <div
                    key={id}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3"
                  >
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500">Latest</p>
                    <p className="text-xs text-zinc-300 font-medium line-clamp-2 min-h-[2rem]">{s?.label}</p>
                    <p className="text-xl font-bold tabular-nums text-white mt-1">
                      {last ? last.value.toFixed(2) : '—'}
                    </p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{last?.date ?? '—'}</p>
                  </div>
                );
              })}
            </section>
          )}
        </>
      )}
    </div>
  );
}
