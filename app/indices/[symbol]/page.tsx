'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import Navigation from '../../components/Navigation';
import MarketTicker from '../../components/MarketTicker';
import ScrollFade from '../../components/ScrollFade';

interface IndexData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  ytdPercent?: number;
  holc: {
    high: number;
    open: number;
    low: number;
    close: number;
  };
  volume: number;
  marketStructure: {
    daily: string;
    weekly: string;
    monthly: string | null;
    updatedAt: string;
  } | null;
  seasonality: {
    month: number;
    avgReturn: number;
    positiveMonths: number;
    totalMonths: number;
  }[];
  seasonalKeyTerms?: {
    term: string;
    months: number[];
    description: string;
    avgReturn: number | null;
  }[];
  seasonalityYears?: number;
}

interface IndexChart {
  id: number;
  symbol: string;
  chart_url: string;
  title: string | null;
  chart_date: string;
  sort_order: number;
  created_at: string;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getStructureColor(structure: string | null | undefined): string {
  if (!structure) return 'text-zinc-400';
  const s = structure.toLowerCase();
  if (s.includes('bullish')) return 'text-green-400';
  if (s.includes('bearish')) return 'text-red-400';
  if (s.includes('mixed')) return 'text-yellow-400';
  if (s.includes('consolidat')) return 'text-blue-400';
  return 'text-zinc-400';
}

function getStructureBgColor(structure: string | null | undefined): string {
  if (!structure) return 'bg-zinc-800/50';
  const s = structure.toLowerCase();
  if (s.includes('bullish')) return 'bg-green-500/10 border-green-500/30';
  if (s.includes('bearish')) return 'bg-red-500/10 border-red-500/30';
  if (s.includes('mixed')) return 'bg-yellow-500/10 border-yellow-500/30';
  if (s.includes('consolidat')) return 'bg-blue-500/10 border-blue-500/30';
  return 'bg-zinc-800/50';
}

function formatChartDate(d: string): string {
  try {
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return d;
  }
}

export default function IndexAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const symbol = (params.symbol as string)?.toUpperCase() || '';
  const [data, setData] = useState<IndexData | null>(null);
  const [charts, setCharts] = useState<IndexChart[]>([]);
  const [chartsOpen, setChartsOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!symbol) return;

    const fetchData = async (isInitial: boolean) => {
      if (isInitial) setLoading(true);
      setError('');
      try {
        const timestamp = Date.now();
        const res = await fetch(`/api/indices/${symbol}?t=${timestamp}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
        });
        if (!res.ok) {
          const err = await res.json();
          setError(err.error || 'Failed to load index data');
          return;
        }
        const indexData = await res.json();
        if (indexData.error) {
          setError(indexData.error);
          return;
        }
        setData(indexData);
      } catch (err) {
        setError('Failed to fetch index data');
      } finally {
        if (isInitial) setLoading(false);
      }
    };

    fetchData(true);
    const interval = setInterval(() => fetchData(false), 10000);
    return () => clearInterval(interval);
  }, [symbol]);

  useEffect(() => {
    if (!symbol || symbol.length > 4) return;
    fetch(`/api/indices/${symbol}/charts`)
      .then((r) => r.json())
      .then((body) => setCharts(body.charts || []))
      .catch(() => setCharts([]));
  }, [symbol]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-blue-950/50 to-zinc-950 relative">
        <ScrollFade />
        <Navigation />
        <div className="fixed top-[72px] left-0 right-0 z-40">
          <MarketTicker />
        </div>
        <div className="pt-44 pb-24 px-6 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
            <p className="text-zinc-400">Loading {symbol}...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-blue-950/50 to-zinc-950 relative">
        <ScrollFade />
        <Navigation />
        <div className="fixed top-[72px] left-0 right-0 z-40">
          <MarketTicker />
        </div>
        <div className="pt-44 pb-24 px-6 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-red-400 mb-4">{error || 'Index not found'}</p>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { holc, marketStructure, seasonality, seasonalKeyTerms = [], seasonalityYears = 15 } = data;
  const holcRange = holc.high - holc.low;
  const holcRangePercent = holc.low > 0 ? (holcRange / holc.low) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-blue-950/50 to-zinc-950 relative">
      <ScrollFade />
      <Navigation />
      <div className="fixed top-[72px] left-0 right-0 z-40">
        <MarketTicker />
      </div>

      <div className="pt-44 pb-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header — professional */}
          <div className="mb-10">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <div className="flex flex-wrap items-baseline gap-3 gap-y-1">
              <h1 className="text-3xl sm:text-4xl font-bold text-zinc-50 tracking-tight">
                {data.name}
              </h1>
              <span className="px-2.5 py-0.5 rounded-md bg-zinc-800/80 border border-zinc-600 text-zinc-300 font-mono text-sm">
                {data.symbol}
              </span>
              <span className="text-zinc-500 text-sm font-medium">
                Equity Index Futures · Real-time
              </span>
            </div>
            <p className="text-zinc-500 text-sm mt-2">
              Price, structure, seasonality, and daily charts for {data.symbol}.
            </p>
          </div>

          {/* Price + change — hero card */}
          <div className="bg-zinc-900/95 border border-zinc-700/80 rounded-2xl p-6 sm:p-8 mb-8 shadow-xl shadow-black/20">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-500 mb-1">Current price</p>
                <p className="text-4xl sm:text-5xl font-bold text-zinc-50 tabular-nums">
                  {data.price > 0
                    ? data.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : '—'}
                </p>
                <div className="flex items-center gap-4 mt-2">
                  <span
                    className={`text-xl font-semibold tabular-nums ${data.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                  >
                    {data.change >= 0 ? '+' : ''}
                    {data.change.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span
                    className={`text-lg font-medium ${data.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                  >
                    ({data.changePercent >= 0 ? '+' : ''}{data.changePercent.toFixed(2)}%)
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                <div>
                  <p className="text-xs text-zinc-500 mb-0.5">Prev close</p>
                  <p className="text-lg font-semibold text-zinc-200">
                    {data.previousClose > 0
                      ? data.previousClose.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-0.5">Volume</p>
                  <p className="text-lg font-semibold text-zinc-200">
                    {data.volume > 0 ? data.volume.toLocaleString('en-US') : '—'}
                  </p>
                </div>
                {data.ytdPercent !== undefined && (
                  <div>
                    <p className="text-xs text-zinc-500 mb-0.5">YTD</p>
                    <p
                      className={`text-lg font-semibold ${data.ytdPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                    >
                      {data.ytdPercent >= 0 ? '+' : ''}{data.ytdPercent.toFixed(2)}%
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Market structure */}
            {marketStructure && (
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
                  Market structure
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Daily</p>
                    <div className={`px-3 py-2 rounded-lg border ${getStructureBgColor(marketStructure.daily)}`}>
                      <p className={`font-semibold text-sm ${getStructureColor(marketStructure.daily)}`}>
                        {marketStructure.daily || '—'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Weekly (HTF)</p>
                    <div className={`px-3 py-2 rounded-lg border ${getStructureBgColor(marketStructure.weekly)}`}>
                      <p className={`font-semibold text-sm ${getStructureColor(marketStructure.weekly)}`}>
                        {marketStructure.weekly || '—'}
                      </p>
                    </div>
                  </div>
                  {marketStructure.monthly && (
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Monthly</p>
                      <div className={`px-3 py-2 rounded-lg border ${getStructureBgColor(marketStructure.monthly)}`}>
                        <p className={`font-semibold text-sm ${getStructureColor(marketStructure.monthly)}`}>
                          {marketStructure.monthly}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-zinc-600 mt-4">
                  Updated {new Date(marketStructure.updatedAt).toLocaleDateString()}
                </p>
              </div>
            )}

            {/* HOLC */}
            <div className="lg:col-span-2 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
                Session (HOLC)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">High</p>
                  <p className="text-xl font-bold text-emerald-400">
                    {holc.high > 0
                      ? holc.high.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Open</p>
                  <p className="text-xl font-bold text-zinc-300">
                    {holc.open > 0
                      ? holc.open.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Low</p>
                  <p className="text-xl font-bold text-red-400">
                    {holc.low > 0
                      ? holc.low.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Close</p>
                  <p className="text-xl font-bold text-zinc-50">
                    {holc.close > 0
                      ? holc.close.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      : '—'}
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-zinc-800 flex flex-wrap gap-6">
                <div>
                  <p className="text-xs text-zinc-500 mb-0.5">Range</p>
                  <p className="text-lg font-semibold text-zinc-300">
                    {holcRange.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({holcRangePercent.toFixed(2)}%)
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-0.5">Body (O→C)</p>
                  <p
                    className={`text-lg font-semibold ${holc.close >= holc.open ? 'text-emerald-400' : 'text-red-400'}`}
                  >
                    {holc.open > 0 && holc.close > 0
                      ? `${holc.close >= holc.open ? '+' : ''}${(((holc.close - holc.open) / holc.open) * 100).toFixed(2)}%`
                      : '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Trading day charts — dropdown */}
          {charts.length > 0 && (
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden mb-8">
              <button
                onClick={() => setChartsOpen(chartsOpen === 'charts' ? null : 'charts')}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-zinc-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-50">Trading day charts</h3>
                    <p className="text-sm text-zinc-500">
                      {charts.length} chart{charts.length !== 1 ? 's' : ''} for {data.symbol}
                    </p>
                  </div>
                </div>
                <span className="text-zinc-500 transition-transform duration-200" style={{ transform: chartsOpen === 'charts' ? 'rotate(180deg)' : 'rotate(0)' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </button>
              {chartsOpen === 'charts' && (
                <div className="border-t border-zinc-800 bg-zinc-950/50">
                  <div className="p-6 space-y-6">
                    {charts.map((chart) => (
                      <div
                        key={chart.id}
                        className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900/50"
                      >
                        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between flex-wrap gap-2">
                          <span className="font-medium text-zinc-200">
                            {chart.title || `Chart — ${formatChartDate(chart.chart_date)}`}
                          </span>
                          <span className="text-xs text-zinc-500">{formatChartDate(chart.chart_date)}</span>
                        </div>
                        <div className="relative w-full min-h-[200px] bg-zinc-900">
                          <Image
                            src={chart.chart_url}
                            alt={chart.title || 'Trading chart'}
                            width={1200}
                            height={600}
                            className="w-full h-auto object-contain"
                            unoptimized
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Seasonal key terms */}
          {seasonalKeyTerms.length > 0 && (
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 mb-8">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
                Seasonal patterns ({seasonalityYears}-year data)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {seasonalKeyTerms.map((item) => (
                  <div
                    key={item.term}
                    className="p-4 rounded-xl border border-zinc-800 bg-zinc-800/30 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-semibold text-zinc-200">{item.term}</span>
                      {item.avgReturn != null && (
                        <span
                          className={`text-sm font-semibold tabular-nums ${
                            item.avgReturn >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {item.avgReturn >= 0 ? '+' : ''}{item.avgReturn.toFixed(2)}%
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Seasonality by month */}
          {seasonality.length > 0 && (
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Monthly seasonality
              </h3>
              <p className="text-xs text-zinc-500 mb-6">
                Average monthly return over the last {seasonalityYears} years. Win rate = positive months / total.
              </p>
              <div className="space-y-3">
                {seasonality.map((month) => {
                  const maxReturn = Math.max(...seasonality.map((m) => Math.abs(m.avgReturn)));
                  const barWidth = maxReturn > 0 ? (Math.abs(month.avgReturn) / maxReturn) * 100 : 0;
                  const winRate = month.totalMonths > 0 ? (month.positiveMonths / month.totalMonths) * 100 : 0;
                  return (
                    <div key={month.month} className="flex items-center gap-4">
                      <div className="w-12 text-sm font-medium text-zinc-400">
                        {MONTH_NAMES[month.month]}
                      </div>
                      <div className="flex-1 relative h-8 bg-zinc-800 rounded-lg overflow-hidden">
                        <div
                          className={`absolute inset-y-0 ${month.avgReturn >= 0 ? 'left-0 bg-emerald-500/30' : 'right-0 bg-red-500/30'}`}
                          style={{ width: `${barWidth}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-between px-3">
                          <span
                            className={`text-xs font-semibold ${month.avgReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                          >
                            {month.avgReturn >= 0 ? '+' : ''}{month.avgReturn.toFixed(2)}%
                          </span>
                          <span className="text-xs text-zinc-500">
                            {month.positiveMonths}/{month.totalMonths} ({winRate.toFixed(0)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
