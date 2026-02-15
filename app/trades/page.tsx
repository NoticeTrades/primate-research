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
  symbol: 'NQ' | 'ES'; // NQ or ES micro contracts
  type: 'long' | 'short';
  entryDate: string;
  entryPrice: number; // Price in points
  exitDate?: string;
  exitPrice?: number; // Price in points
  contracts: number; // Number of micro contracts
  status: 'open' | 'closed';
  notes?: string;
  callType?: 'discord' | 'public'; // Where the call was posted
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
  const [showPortfolio, setShowPortfolio] = useState(true);
  const [showES, setShowES] = useState(true);

  // Load trades from localStorage
  useEffect(() => {
    const savedTrades = localStorage.getItem('primate-trades');
    if (savedTrades) {
      setTrades(JSON.parse(savedTrades));
    }
  }, []);

  // Fetch S&P 500 YTD historical data (live, updates every 3 hours)
  useEffect(() => {
    const fetchSP500Data = async () => {
      try {
        const response = await fetch('/api/sp500-historical', {
          cache: 'no-store', // Always fetch fresh data
        });
        if (!response.ok) {
          console.error('Failed to fetch S&P 500 historical data');
          return;
        }
        
        const result = await response.json();
        if (result.data && result.data.length > 0) {
          // Convert S&P 500 data to PerformanceData format
          // Store actual return percentages (not 100 + return)
          const performanceData: PerformanceData[] = result.data.map((item: { date: string; return: number }) => ({
            date: item.date,
            portfolio: 0, // Portfolio starts at 0% (will be calculated from trades)
            sp500: item.return, // S&P 500 YTD return as percentage (e.g., 1.08 for +1.08%)
          }));
          
          setSp500Data(performanceData);
        }
      } catch (error) {
        console.error('Error fetching S&P 500 historical data:', error);
      }
    };

    // Fetch immediately
    fetchSP500Data();
    
    // Auto-update every 3 hours (10800000 ms)
    const interval = setInterval(fetchSP500Data, 10800000);
    return () => clearInterval(interval);
  }, []);

  // Calculate portfolio performance (YTD, starting at 0%)
  const calculatePortfolioPerformance = () => {
    // If no trades, portfolio stays at 0%
    if (trades.length === 0) {
      return sp500Data.map(d => ({ ...d, portfolio: 0 }));
    }

    // Get point values for contracts
    const getPointValue = (symbol: string) => {
      return symbol === 'NQ' ? 2 : 0.5; // NQ micro = $2/point, ES micro = $0.50/point
    };

    // Calculate initial portfolio value (for percentage calculation)
    // We'll use a base value to calculate returns
    const baseValue = 10000; // $10,000 starting capital for calculation purposes
    
    // Sort trades by date
    const sortedTrades = [...trades].sort((a, b) => 
      new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
    );

    return sp500Data.map((day) => {
      const dayDate = new Date(day.date);
      let portfolioValue = baseValue; // Start with base value
      
      // Calculate P&L from all trades up to this day
      sortedTrades.forEach(trade => {
        const tradeEntryDate = new Date(trade.entryDate);
        const tradeExitDate = trade.exitDate ? new Date(trade.exitDate) : null;
        
        // Only count trades that have been entered by this day
        if (tradeEntryDate <= dayDate) {
          // If trade is closed and exit date is before or on this day, use exit price
          // If trade is still open or exit is after this day, we'd need current price
          // For now, if open, we'll use entry price (0 P&L until closed)
          if (trade.status === 'closed' && tradeExitDate && tradeExitDate <= dayDate && trade.exitPrice) {
            const pointValue = getPointValue(trade.symbol);
            const points = trade.type === 'long'
              ? trade.exitPrice - trade.entryPrice
              : trade.entryPrice - trade.exitPrice;
            const pnl = points * pointValue * trade.contracts;
            portfolioValue += pnl;
          }
          // For open trades, we'd need current market price - for now, don't count until closed
        }
      });
      
      // Calculate YTD return percentage (starting from 0%)
      const ytdReturn = ((portfolioValue - baseValue) / baseValue) * 100;
      
      return {
        ...day,
        portfolio: ytdReturn, // Portfolio YTD return starting from 0%
      };
    });
  };

  const performanceData = calculatePortfolioPerformance();

  // Calculate statistics
  const calculateStats = () => {
    const closedTrades = trades.filter(t => t.status === 'closed' && t.exitPrice);
    const openTrades = trades.filter(t => t.status === 'open');
    
    // Calculate P&L for futures contracts
    // NQ micro: $2 per point, ES micro: $0.50 per point
    const getPointValue = (symbol: string) => {
      return symbol === 'NQ' ? 2 : 0.5; // NQ micro = $2/point, ES micro = $0.50/point
    };

    const totalPnL = closedTrades.reduce((sum, trade) => {
      const pointValue = getPointValue(trade.symbol);
      const points = trade.type === 'long'
        ? trade.exitPrice! - trade.entryPrice
        : trade.entryPrice - trade.exitPrice!;
      const pnl = points * pointValue * trade.contracts;
      return sum + pnl;
    }, 0);

    const winRate = closedTrades.length > 0
      ? (closedTrades.filter(t => {
          const pointValue = getPointValue(t.symbol);
          const points = t.type === 'long'
            ? t.exitPrice! - t.entryPrice
            : t.entryPrice - t.exitPrice!;
          const pnl = points * pointValue * t.contracts;
          return pnl > 0;
        }).length / closedTrades.length) * 100
      : 0;

    const avgWin = closedTrades.filter(t => {
      const pointValue = getPointValue(t.symbol);
      const points = t.type === 'long'
        ? t.exitPrice! - t.entryPrice
        : t.entryPrice - t.exitPrice!;
      const pnl = points * pointValue * t.contracts;
      return pnl > 0;
    }).reduce((sum, t) => {
      const pointValue = getPointValue(t.symbol);
      const points = t.type === 'long'
        ? t.exitPrice! - t.entryPrice
        : t.entryPrice - t.exitPrice!;
      const pnl = points * pointValue * t.contracts;
      return sum + pnl;
    }, 0) / Math.max(closedTrades.filter(t => {
      const pointValue = getPointValue(t.symbol);
      const points = t.type === 'long'
        ? t.exitPrice! - t.entryPrice
        : t.entryPrice - t.exitPrice!;
      const pnl = points * pointValue * t.contracts;
      return pnl > 0;
    }).length, 1);

    const avgLoss = closedTrades.filter(t => {
      const pointValue = getPointValue(t.symbol);
      const points = t.type === 'long'
        ? t.exitPrice! - t.entryPrice
        : t.entryPrice - t.exitPrice!;
      const pnl = points * pointValue * t.contracts;
      return pnl < 0;
    }).reduce((sum, t) => {
      const pointValue = getPointValue(t.symbol);
      const points = t.type === 'long'
        ? t.exitPrice! - t.entryPrice
        : t.entryPrice - t.exitPrice!;
      const pnl = points * pointValue * t.contracts;
      return sum + pnl;
    }, 0) / Math.max(closedTrades.filter(t => {
      const pointValue = getPointValue(t.symbol);
      const points = t.type === 'long'
        ? t.exitPrice! - t.entryPrice
        : t.entryPrice - t.exitPrice!;
      const pnl = points * pointValue * t.contracts;
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
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-blue-950/50 to-zinc-950 relative">
      <CursorGlow />
      <CursorHover />
      <DiscordSign />
      <ScrollFade />
      <Navigation />
      <div className="fixed top-[72px] left-0 right-0 z-40">
        <MarketTicker />
      </div>

      <div className="pt-40 pb-24 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-black dark:text-zinc-50 mb-4">
              Nick's Live Positions
            </h1>
            <p className="text-lg text-zinc-700 dark:text-zinc-300">
              Real-time tracking of NQ and ES micro futures positions. Updated as trades are entered and calls are posted in Discord.
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
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-black dark:text-zinc-50">
                Portfolio Performance vs S&P 500 (YTD)
              </h2>
              {/* Toggle Controls */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPortfolio}
                    onChange={(e) => setShowPortfolio(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-zinc-300 rounded focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800"
                    suppressHydrationWarning
                  />
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                    Portfolio
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showES}
                    onChange={(e) => setShowES(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-zinc-300 rounded focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800"
                    suppressHydrationWarning
                  />
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-zinc-500"></span>
                    S&P 500 YTD
                  </span>
                </label>
              </div>
            </div>
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
                    domain={['auto', 'auto']}
                    tickFormatter={(value) => {
                      // Format as percentage return (value is already the return percentage)
                      return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
                    }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#f3f4f6' }}
                    labelStyle={{ color: '#f3f4f6' }}
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    formatter={(value: any) => {
                      if (value === undefined) return '';
                      // Both values are already return percentages
                      return formatPercent(value);
                    }}
                  />
                  {showPortfolio && (
                    <Line 
                      type="monotone" 
                      dataKey="portfolio" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="Portfolio"
                      dot={false}
                    />
                  )}
                  {showES && (
                    <Line 
                      type="monotone" 
                      dataKey="sp500" 
                      stroke="#6b7280" 
                      strokeWidth={2}
                      name="S&P 500 YTD"
                      dot={false}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Discord CTA Section */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 rounded-lg p-8 mb-12 relative z-10 text-center">
            <h2 className="text-3xl font-bold text-white mb-3">Want Access to Faster Calls?</h2>
            <p className="text-blue-100 dark:text-blue-200 mb-6 text-lg">
              Join the Discord community for real-time trade alerts, faster entry signals, and exclusive market analysis.
            </p>
            <a
              href="https://discord.com/invite/QGnUGdAt"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-4 bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 font-bold text-lg rounded-lg hover:bg-blue-50 dark:hover:bg-zinc-800 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Join Discord for Free
            </a>
          </div>

          {/* Trade History - Read Only Portfolio Display */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-zinc-200 dark:border-zinc-800 mb-12 relative z-10">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-black dark:text-zinc-50 mb-2">Live Positions & Trade History</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Complete record of NQ and ES micro futures positions. Updated in real-time as trades are entered and calls are posted.
              </p>
            </div>

            {/* Trades Table - Read Only */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-zinc-300 dark:border-zinc-700">
                    <th className="text-left py-4 px-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Symbol</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Type</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Entry (Points)</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Exit (Points)</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Contracts</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Points</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">P&L ($)</th>
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
                      // Calculate point value: NQ micro = $2/point, ES micro = $0.50/point
                      const pointValue = trade.symbol === 'NQ' ? 2 : 0.5;
                      
                      // Calculate points gained/lost
                      const points = trade.status === 'closed' && trade.exitPrice
                        ? trade.type === 'long'
                          ? trade.exitPrice - trade.entryPrice
                          : trade.entryPrice - trade.exitPrice
                        : null;
                      
                      // Calculate P&L in dollars
                      const pnl = points !== null
                        ? points * pointValue * trade.contracts
                        : null;

                      return (
                        <tr key={trade.id} className="border-b border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                          <td className="py-4 px-4">
                            <span className="text-black dark:text-zinc-50 font-semibold text-base">{trade.symbol}</span>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                              {trade.symbol === 'NQ' ? 'Micro' : 'Micro'} Futures
                            </div>
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
                            <div className="text-black dark:text-zinc-50 font-medium">{trade.entryPrice.toFixed(2)}</div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{new Date(trade.entryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                          </td>
                          <td className="py-4 px-4">
                            {trade.exitPrice ? (
                              <>
                                <div className="text-black dark:text-zinc-50 font-medium">{trade.exitPrice.toFixed(2)}</div>
                                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{trade.exitDate ? new Date(trade.exitDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}</div>
                              </>
                            ) : (
                              <span className="text-zinc-400 dark:text-zinc-500">-</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-black dark:text-zinc-50 font-medium">{trade.contracts}</td>
                          <td className="py-4 px-4">
                            {points !== null ? (
                              <span className={`font-semibold ${points >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {points >= 0 ? '+' : ''}{points.toFixed(2)} pts
                              </span>
                            ) : (
                              <span className="text-zinc-400 dark:text-zinc-500">-</span>
                            )}
                          </td>
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
