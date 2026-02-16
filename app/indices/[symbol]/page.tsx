'use client';

import { useState, useEffect } from 'react';
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

export default function IndexAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const symbol = (params.symbol as string)?.toUpperCase() || '';
  const [data, setData] = useState<IndexData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!symbol) return;
    
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/indices/${symbol}`);
        if (!res.ok) {
          const err = await res.json();
          setError(err.error || 'Failed to load index data');
          return;
        }
        const indexData = await res.json();
        setData(indexData);
      } catch (err) {
        setError('Failed to fetch index data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-zinc-400">Loading {symbol} analysis...</p>
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

  const { holc, marketStructure, seasonality } = data;
  const holcRange = holc.high - holc.low;
  const holcRangePercent = holc.low > 0 ? (holcRange / holc.low) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-blue-950/50 to-zinc-950 relative">
      <ScrollFade />
      <Navigation />
      <div className="fixed top-[72px] left-0 right-0 z-40">
        <MarketTicker />
      </div>

      <div className="pt-44 pb-24 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-lg hover:bg-zinc-800/50 transition-colors"
              >
                <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-4xl md:text-5xl font-bold text-zinc-50">{data.name}</h1>
              <span className="px-3 py-1 rounded-lg bg-zinc-800/50 border border-zinc-700 text-zinc-300 font-mono text-sm">
                {data.symbol}
              </span>
            </div>
            <p className="text-zinc-400">Real-time index analysis and market structure</p>
          </div>

          {/* Price Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-sm text-zinc-500 mb-1">Current Price</p>
                  <p className="text-4xl font-bold text-zinc-50">
                    {data.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${data.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {data.change >= 0 ? '+' : ''}{data.change.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className={`text-lg ${data.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {data.changePercent >= 0 ? '+' : ''}{data.changePercent.toFixed(2)}%
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Previous Close</p>
                  <p className="text-lg font-semibold text-zinc-300">
                    {data.previousClose.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Volume</p>
                  <p className="text-lg font-semibold text-zinc-300">
                    {data.volume.toLocaleString('en-US')}
                  </p>
                </div>
                {data.ytdPercent !== undefined && (
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">YTD Gain</p>
                    <p className={`text-lg font-semibold ${data.ytdPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {data.ytdPercent >= 0 ? '+' : ''}{data.ytdPercent.toFixed(2)}%
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Market Structure Card */}
            {marketStructure && (
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-zinc-50 mb-4">Market Structure</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Daily</p>
                    <div className={`px-3 py-2 rounded-lg border ${getStructureBgColor(marketStructure.daily)}`}>
                      <p className={`font-semibold ${getStructureColor(marketStructure.daily)}`}>
                        {marketStructure.daily || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Weekly (HTF)</p>
                    <div className={`px-3 py-2 rounded-lg border ${getStructureBgColor(marketStructure.weekly)}`}>
                      <p className={`font-semibold ${getStructureColor(marketStructure.weekly)}`}>
                        {marketStructure.weekly || 'N/A'}
                      </p>
                    </div>
                  </div>
                  {marketStructure.monthly && (
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Monthly</p>
                      <div className={`px-3 py-2 rounded-lg border ${getStructureBgColor(marketStructure.monthly)}`}>
                        <p className={`font-semibold ${getStructureColor(marketStructure.monthly)}`}>
                          {marketStructure.monthly}
                        </p>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-zinc-600 mt-4">
                    Updated {new Date(marketStructure.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* HOLC Statistics */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 mb-8">
            <h3 className="text-lg font-semibold text-zinc-50 mb-6">HOLC Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-xs text-zinc-500 mb-2">High</p>
                <p className="text-2xl font-bold text-green-400">
                  {holc.high.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-2">Open</p>
                <p className="text-2xl font-bold text-zinc-300">
                  {holc.open.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-2">Low</p>
                <p className="text-2xl font-bold text-red-400">
                  {holc.low.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-2">Close</p>
                <p className="text-2xl font-bold text-zinc-50">
                  {holc.close.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Daily Range</p>
                  <p className="text-lg font-semibold text-zinc-300">
                    {holcRange.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Range %</p>
                  <p className="text-lg font-semibold text-zinc-300">
                    {holcRangePercent.toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Body (O→C)</p>
                  <p className={`text-lg font-semibold ${holc.close >= holc.open ? 'text-green-400' : 'text-red-400'}`}>
                    {holc.close >= holc.open ? '+' : ''}
                    {((holc.close - holc.open) / holc.open * 100).toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Seasonality Chart */}
          {seasonality.length > 0 && (
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-zinc-50 mb-6">5-Year Seasonality</h3>
              <div className="space-y-3">
                {seasonality.map((month) => {
                  const maxReturn = Math.max(...seasonality.map(m => Math.abs(m.avgReturn)));
                  const barWidth = maxReturn > 0 ? (Math.abs(month.avgReturn) / maxReturn) * 100 : 0;
                  const winRate = month.totalMonths > 0 ? (month.positiveMonths / month.totalMonths) * 100 : 0;
                  
                  return (
                    <div key={month.month} className="flex items-center gap-4">
                      <div className="w-12 text-sm font-medium text-zinc-400">
                        {MONTH_NAMES[month.month]}
                      </div>
                      <div className="flex-1 relative h-8 bg-zinc-800 rounded-lg overflow-hidden">
                        <div
                          className={`absolute inset-y-0 ${month.avgReturn >= 0 ? 'left-0 bg-green-500/30' : 'right-0 bg-red-500/30'}`}
                          style={{ width: `${barWidth}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-between px-3">
                          <span className={`text-xs font-semibold ${month.avgReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
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
              <p className="text-xs text-zinc-600 mt-4">
                Average monthly return over the last 5 years. Win rate shows positive months / total months.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

