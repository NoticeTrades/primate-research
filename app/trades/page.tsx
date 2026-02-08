'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '../components/Navigation';
import CursorGlow from '../components/CursorGlow';
import CursorHover from '../components/CursorHover';
import DiscordSign from '../components/DiscordSign';
import ScrollFade from '../components/ScrollFade';
import MarketTicker from '../components/MarketTicker';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

interface Trade {
  id: string;
  symbol: string;
  type: 'long' | 'short';
  entryDate: string;
  entryPrice: number;
  exitDate?: string;
  exitPrice?: number;
  quantity: number;
  status: 'open' | 'closed';
  notes?: string;
}

interface PerformanceData {
  date: string;
  portfolio: number;
  sp500: number;
}

export default function TradesPage() {
  const router = useRouter();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [sp500Data, setSp500Data] = useState<PerformanceData[]>([]);

  // Load trades from localStorage
  useEffect(() => {
    const savedTrades = localStorage.getItem('primate-trades');
    if (savedTrades) {
      setTrades(JSON.parse(savedTrades));
    }
  }, []);

  // Fetch S&P 500 data (simplified - you can enhance this with real API)
  useEffect(() => {
    // For now, generate sample S&P 500 data
    // In production, you'd fetch this from an API
    const generateSp500Data = () => {
      const data: PerformanceData[] = [];
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 6); // Last 6 months
      
      let sp500Value = 100; // Starting at 100%
      for (let i = 0; i < 180; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        sp500Value *= 1 + (Math.random() * 0.02 - 0.01); // Random walk
        data.push({
          date: date.toISOString().split('T')[0],
          portfolio: 100, // Will be calculated from trades
          sp500: sp500Value,
        });
      }
      setSp500Data(data);
    };

    generateSp500Data();
  }, []);

  // Calculate portfolio performance
  const calculatePortfolioPerformance = () => {
    if (trades.length === 0) return sp500Data.map(d => ({ ...d, portfolio: 100 }));

    const performance: { [key: string]: number } = {};
    let portfolioValue = 100; // Starting at 100%

    // Sort trades by date
    const sortedTrades = [...trades].sort((a, b) => 
      new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
    );

    return sp500Data.map((day, index) => {
      // Calculate portfolio value for this day
      sortedTrades.forEach(trade => {
        const tradeDate = new Date(trade.entryDate);
        const dayDate = new Date(day.date);
        
        if (tradeDate <= dayDate) {
          if (trade.status === 'open' || (trade.exitDate && new Date(trade.exitDate) > dayDate)) {
            // Trade is active on this day
            const currentPrice = trade.exitDate && new Date(trade.exitDate) <= dayDate
              ? trade.exitPrice!
              : trade.entryPrice * (1 + (Math.random() * 0.1 - 0.05)); // Simulated price
            
            const pnl = trade.type === 'long'
              ? ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100
              : ((trade.entryPrice - currentPrice) / trade.entryPrice) * 100;
            
            portfolioValue += pnl * 0.1; // Assume 10% position size
          }
        }
      });

      return {
        ...day,
        portfolio: Math.max(portfolioValue, 50), // Floor at 50%
      };
    });
  };

  const performanceData = calculatePortfolioPerformance();

  // Calculate statistics
  const calculateStats = () => {
    const closedTrades = trades.filter(t => t.status === 'closed' && t.exitPrice);
    const openTrades = trades.filter(t => t.status === 'open');
    
    const totalPnL = closedTrades.reduce((sum, trade) => {
      const pnl = trade.type === 'long'
        ? (trade.exitPrice! - trade.entryPrice) * trade.quantity
        : (trade.entryPrice - trade.exitPrice!) * trade.quantity;
      return sum + pnl;
    }, 0);

    const winRate = closedTrades.length > 0
      ? (closedTrades.filter(t => {
          const pnl = t.type === 'long'
            ? (t.exitPrice! - t.entryPrice) * t.quantity
            : (t.entryPrice - t.exitPrice!) * t.quantity;
          return pnl > 0;
        }).length / closedTrades.length) * 100
      : 0;

    const avgWin = closedTrades.filter(t => {
      const pnl = t.type === 'long'
        ? (t.exitPrice! - t.entryPrice) * t.quantity
        : (t.entryPrice - t.exitPrice!) * t.quantity;
      return pnl > 0;
    }).reduce((sum, t) => {
      const pnl = t.type === 'long'
        ? (t.exitPrice! - t.entryPrice) * t.quantity
        : (t.entryPrice - t.exitPrice!) * t.quantity;
      return sum + pnl;
    }, 0) / Math.max(closedTrades.filter(t => {
      const pnl = t.type === 'long'
        ? (t.exitPrice! - t.entryPrice) * t.quantity
        : (t.entryPrice - t.exitPrice!) * t.quantity;
      return pnl > 0;
    }).length, 1);

    const avgLoss = closedTrades.filter(t => {
      const pnl = t.type === 'long'
        ? (t.exitPrice! - t.entryPrice) * t.quantity
        : (t.entryPrice - t.exitPrice!) * t.quantity;
      return pnl < 0;
    }).reduce((sum, t) => {
      const pnl = t.type === 'long'
        ? (t.exitPrice! - t.entryPrice) * t.quantity
        : (t.entryPrice - t.exitPrice!) * t.quantity;
      return sum + pnl;
    }, 0) / Math.max(closedTrades.filter(t => {
      const pnl = t.type === 'long'
        ? (t.exitPrice! - t.entryPrice) * t.quantity
        : (t.entryPrice - t.exitPrice!) * t.quantity;
      return pnl < 0;
    }).length, 1);

    const currentPortfolioValue = performanceData[performanceData.length - 1]?.portfolio || 100;
    const sp500Current = performanceData[performanceData.length - 1]?.sp500 || 100;
    const vsSp500 = currentPortfolioValue - sp500Current;

    return {
      totalTrades: trades.length,
      closedTrades: closedTrades.length,
      openTrades: openTrades.length,
      totalPnL,
      winRate,
      avgWin,
      avgLoss,
      portfolioReturn: currentPortfolioValue - 100,
      sp500Return: sp500Current - 100,
      vsSp500,
    };
  };

  const stats = calculateStats();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  return (
    <div className="min-h-screen bg-black dark:bg-zinc-950 relative">
      <CursorGlow />
      <CursorHover />
      <DiscordSign />
      <ScrollFade />
      <Navigation />
      <div className="fixed top-[72px] left-0 right-0 z-40">
        <MarketTicker />
      </div>

      <div className="pt-32 pb-24 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-black dark:text-zinc-50 mb-4">
              Trading Performance & Track Record
            </h1>
            <p className="text-lg text-zinc-700 dark:text-zinc-300">
              Real-time portfolio performance and trade history. Updated regularly to reflect current market positions and closed trades.
            </p>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 relative z-10">
            <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-zinc-200 dark:border-zinc-800">
              <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Total Return</div>
              <div className={`text-2xl font-bold ${stats.portfolioReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercent(stats.portfolioReturn)}
              </div>
              <div className="text-xs text-zinc-500 mt-1">vs S&P 500: {formatPercent(stats.vsSp500)}</div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-zinc-200 dark:border-zinc-800">
              <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Win Rate</div>
              <div className="text-2xl font-bold text-blue-600">{stats.winRate.toFixed(1)}%</div>
              <div className="text-xs text-zinc-500 mt-1">{stats.closedTrades} closed trades</div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-zinc-200 dark:border-zinc-800">
              <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Total P&L</div>
              <div className={`text-2xl font-bold ${stats.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(stats.totalPnL)}
              </div>
              <div className="text-xs text-zinc-500 mt-1">{stats.totalTrades} total trades</div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-zinc-200 dark:border-zinc-800">
              <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Open Positions</div>
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{stats.openTrades}</div>
              <div className="text-xs text-zinc-500 mt-1">{stats.closedTrades} closed</div>
            </div>
          </div>

          {/* Performance Chart */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-zinc-200 dark:border-zinc-800 mb-12 relative z-10">
            <h2 className="text-2xl font-bold text-black dark:text-zinc-50 mb-6">
              Portfolio Performance vs S&P 500
            </h2>
            <div className="w-full" style={{ height: '400px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-zinc-700" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6b7280"
                    className="dark:stroke-zinc-400"
                    tick={{ fill: '#6b7280' }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    className="dark:stroke-zinc-400"
                    tick={{ fill: '#6b7280' }}
                    label={{ value: 'Return %', angle: -90, position: 'insideLeft', fill: '#6b7280' }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#f3f4f6' }}
                    labelStyle={{ color: '#f3f4f6' }}
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    formatter={(value: any) => value !== undefined ? formatPercent(value) : ''}
                  />
                  <Legend wrapperStyle={{ color: '#6b7280' }} />
                  <Line 
                    type="monotone" 
                    dataKey="portfolio" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Portfolio"
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="sp500" 
                    stroke="#6b7280" 
                    strokeWidth={2}
                    name="S&P 500"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Trade History - Read Only Portfolio Display */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-zinc-200 dark:border-zinc-800 mb-12 relative z-10">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-black dark:text-zinc-50 mb-2">Trade History</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Complete record of closed positions and current open trades. Updated regularly to reflect portfolio performance.
              </p>
            </div>

            {/* Trades Table - Read Only */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-zinc-300 dark:border-zinc-700">
                    <th className="text-left py-4 px-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Symbol</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Type</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Entry</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Exit</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Quantity</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">P&L</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Return %</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center">
                        <div className="text-zinc-500 dark:text-zinc-400">
                          <p className="text-lg mb-2">No trades recorded yet</p>
                          <p className="text-sm">Portfolio performance will be displayed here as trades are updated.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    trades.map((trade) => {
                      const pnl = trade.status === 'closed' && trade.exitPrice
                        ? trade.type === 'long'
                          ? (trade.exitPrice - trade.entryPrice) * trade.quantity
                          : (trade.entryPrice - trade.exitPrice) * trade.quantity
                        : null;
                      
                      const returnPercent = trade.status === 'closed' && trade.exitPrice
                        ? trade.type === 'long'
                          ? ((trade.exitPrice - trade.entryPrice) / trade.entryPrice) * 100
                          : ((trade.entryPrice - trade.exitPrice) / trade.entryPrice) * 100
                        : null;

                      return (
                        <tr key={trade.id} className="border-b border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                          <td className="py-4 px-4">
                            <span className="text-black dark:text-zinc-50 font-semibold text-base">{trade.symbol}</span>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                              trade.type === 'long' 
                                ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                                : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
                            }`}>
                              {trade.type.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-black dark:text-zinc-50 font-medium">{formatCurrency(trade.entryPrice)}</div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{new Date(trade.entryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                          </td>
                          <td className="py-4 px-4">
                            {trade.exitPrice ? (
                              <>
                                <div className="text-black dark:text-zinc-50 font-medium">{formatCurrency(trade.exitPrice)}</div>
                                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{trade.exitDate ? new Date(trade.exitDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}</div>
                              </>
                            ) : (
                              <span className="text-zinc-400 dark:text-zinc-500">-</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-black dark:text-zinc-50 font-medium">{trade.quantity.toLocaleString()}</td>
                          <td className="py-4 px-4">
                            {pnl !== null ? (
                              <span className={`font-semibold text-base ${pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {formatCurrency(pnl)}
                              </span>
                            ) : (
                              <span className="text-zinc-400 dark:text-zinc-500">-</span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            {returnPercent !== null ? (
                              <span className={`font-semibold ${returnPercent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {formatPercent(returnPercent)}
                              </span>
                            ) : (
                              <span className="text-zinc-400 dark:text-zinc-500">-</span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                              trade.status === 'open'
                                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                            }`}>
                              {trade.status.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
