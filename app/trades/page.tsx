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
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [sp500Data, setSp500Data] = useState<PerformanceData[]>([]);
  const [formData, setFormData] = useState<Partial<Trade>>({
    symbol: '',
    type: 'long',
    entryDate: new Date().toISOString().split('T')[0],
    entryPrice: 0,
    exitDate: '',
    exitPrice: 0,
    quantity: 0,
    status: 'open',
    notes: '',
  });

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingTrade) {
      // Update existing trade
      const updated = trades.map(t => 
        t.id === editingTrade.id ? { ...formData, id: editingTrade.id } as Trade : t
      );
      setTrades(updated);
      localStorage.setItem('primate-trades', JSON.stringify(updated));
      setEditingTrade(null);
    } else {
      // Add new trade
      const newTrade: Trade = {
        id: Date.now().toString(),
        symbol: formData.symbol!,
        type: formData.type!,
        entryDate: formData.entryDate!,
        entryPrice: formData.entryPrice!,
        exitDate: formData.exitDate || undefined,
        exitPrice: formData.exitPrice || undefined,
        quantity: formData.quantity!,
        status: formData.status!,
        notes: formData.notes,
      };
      
      const updated = [...trades, newTrade];
      setTrades(updated);
      localStorage.setItem('primate-trades', JSON.stringify(updated));
    }

    // Reset form
    setFormData({
      symbol: '',
      type: 'long',
      entryDate: new Date().toISOString().split('T')[0],
      entryPrice: 0,
      exitDate: '',
      exitPrice: 0,
      quantity: 0,
      status: 'open',
      notes: '',
    });
    setShowForm(false);
  };

  const handleEdit = (trade: Trade) => {
    setEditingTrade(trade);
    setFormData(trade);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this trade?')) {
      const updated = trades.filter(t => t.id !== id);
      setTrades(updated);
      localStorage.setItem('primate-trades', JSON.stringify(updated));
    }
  };

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
              Trade Performance Tracker
            </h1>
            <p className="text-lg text-zinc-700 dark:text-zinc-300">
              Track your trades and compare performance against the S&P 500
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

          {/* Trade Management */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-zinc-200 dark:border-zinc-800 mb-12 relative z-10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-black dark:text-zinc-50">Trades</h2>
              <button
                onClick={() => {
                  setEditingTrade(null);
                  setShowForm(!showForm);
                  setFormData({
                    symbol: '',
                    type: 'long',
                    entryDate: new Date().toISOString().split('T')[0],
                    entryPrice: 0,
                    exitDate: '',
                    exitPrice: 0,
                    quantity: 0,
                    status: 'open',
                    notes: '',
                  });
                }}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors shadow-lg hover:shadow-xl"
                suppressHydrationWarning
              >
                {showForm ? 'Cancel' : '+ Add Trade'}
              </button>
            </div>

            {/* Trade Form */}
            {showForm && (
              <form onSubmit={handleSubmit} className="mb-8 p-6 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Symbol
                    </label>
                    <input
                      type="text"
                      value={formData.symbol}
                      onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-black dark:text-zinc-50"
                      required
                      suppressHydrationWarning
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Type
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as 'long' | 'short' })}
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-black dark:text-zinc-50"
                      suppressHydrationWarning
                    >
                      <option value="long">Long</option>
                      <option value="short">Short</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Entry Date
                    </label>
                    <input
                      type="date"
                      value={formData.entryDate}
                      onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-black dark:text-zinc-50"
                      required
                      suppressHydrationWarning
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Entry Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.entryPrice || ''}
                      onChange={(e) => setFormData({ ...formData, entryPrice: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-black dark:text-zinc-50"
                      required
                      suppressHydrationWarning
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.quantity || ''}
                      onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-black dark:text-zinc-50"
                      required
                      suppressHydrationWarning
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as 'open' | 'closed' })}
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-black dark:text-zinc-50"
                      suppressHydrationWarning
                    >
                      <option value="open">Open</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>

                  {formData.status === 'closed' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                          Exit Date
                        </label>
                        <input
                          type="date"
                          value={formData.exitDate || ''}
                          onChange={(e) => setFormData({ ...formData, exitDate: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-black dark:text-zinc-50"
                          suppressHydrationWarning
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                          Exit Price
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.exitPrice || ''}
                          onChange={(e) => setFormData({ ...formData, exitPrice: parseFloat(e.target.value) })}
                          className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-black dark:text-zinc-50"
                          suppressHydrationWarning
                        />
                      </div>
                    </>
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-black dark:text-zinc-50"
                      rows={3}
                      suppressHydrationWarning
                    />
                  </div>
                </div>

                <div className="mt-4 flex gap-4">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    suppressHydrationWarning
                  >
                    {editingTrade ? 'Update Trade' : 'Add Trade'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingTrade(null);
                    }}
                    className="px-6 py-2 bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-400 dark:hover:bg-zinc-600 text-black dark:text-zinc-50 rounded-lg transition-colors"
                    suppressHydrationWarning
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Trades Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Symbol</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Type</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Entry</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Exit</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Quantity</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">P&L</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-zinc-500">
                        No trades yet. Click "Add Trade" to get started.
                      </td>
                    </tr>
                  ) : (
                    trades.map((trade) => {
                      const pnl = trade.status === 'closed' && trade.exitPrice
                        ? trade.type === 'long'
                          ? (trade.exitPrice - trade.entryPrice) * trade.quantity
                          : (trade.entryPrice - trade.exitPrice) * trade.quantity
                        : null;

                      return (
                        <tr key={trade.id} className="border-b border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                          <td className="py-3 px-4 text-black dark:text-zinc-50 font-medium">{trade.symbol}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              trade.type === 'long' 
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            }`}>
                              {trade.type.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-zinc-700 dark:text-zinc-300">
                            {formatCurrency(trade.entryPrice)}<br />
                            <span className="text-xs text-zinc-500">{new Date(trade.entryDate).toLocaleDateString()}</span>
                          </td>
                          <td className="py-3 px-4 text-zinc-700 dark:text-zinc-300">
                            {trade.exitPrice ? (
                              <>
                                {formatCurrency(trade.exitPrice)}<br />
                                <span className="text-xs text-zinc-500">{trade.exitDate ? new Date(trade.exitDate).toLocaleDateString() : ''}</span>
                              </>
                            ) : (
                              <span className="text-zinc-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-zinc-700 dark:text-zinc-300">{trade.quantity}</td>
                          <td className="py-3 px-4">
                            {pnl !== null ? (
                              <span className={pnl >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                {formatCurrency(pnl)}
                              </span>
                            ) : (
                              <span className="text-zinc-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              trade.status === 'open'
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                            }`}>
                              {trade.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEdit(trade)}
                                className="text-blue-600 hover:text-blue-700 text-sm"
                                suppressHydrationWarning
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(trade.id)}
                                className="text-red-600 hover:text-red-700 text-sm"
                                suppressHydrationWarning
                              >
                                Delete
                              </button>
                            </div>
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
