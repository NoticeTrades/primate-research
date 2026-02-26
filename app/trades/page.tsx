'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '../components/Navigation';
import CursorGlow from '../components/CursorGlow';
import CursorHover from '../components/CursorHover';
import DiscordSign from '../components/DiscordSign';
import ScrollFade from '../components/ScrollFade';
import MarketTicker from '../components/MarketTicker';

// CME point values ($ per point per contract): Mini NQ $20, Micro MNQ $2, Mini ES $12.50, Micro MES $5
const POINT_VALUE: Record<string, number> = { NQ: 20, MNQ: 2, ES: 12.5, MES: 5 };

interface Trade {
  id: number;
  symbol: string;
  side: string;
  quantity: number;
  entryPrice: number;
  exitQuantity: number;
  exitPrice: number | null;
  chartUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  status: 'open' | 'closed';
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

export default function TradesPage() {
  const router = useRouter();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({ NQ: 0, ES: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [expandedTradeId, setExpandedTradeId] = useState<number | null>(null);
  const [showClosed, setShowClosed] = useState(false);
  const [tradeNotifEnabled, setTradeNotifEnabled] = useState(true);
  const [tradeNotifEmail, setTradeNotifEmail] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsMessage, setPrefsMessage] = useState('');

  const fetchTrades = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      const res = await fetch('/api/trades', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data.trades) {
        setTrades(data.trades);
        setLastUpdated(new Date());
      }
    } catch {
      // ignore
    } finally {
      if (showRefreshing) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTrades().finally(() => setLoading(false));
    const t = setInterval(fetchTrades, 20000);
    return () => clearInterval(t);
  }, [fetchTrades]);

  useEffect(() => {
    const fetchPrices = async () => {
      const symbols = ['NQ', 'ES'];
      const next: Record<string, number> = {};
      for (const sym of symbols) {
        try {
          const res = await fetch(`/api/indices/${sym}`, { cache: 'no-store' });
          const data = await res.json();
          if (res.ok && typeof data.price === 'number') next[sym] = data.price;
        } catch {
          // keep previous
        }
      }
      setPrices((prev) => ({ ...prev, ...next }));
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const email = getCookie('user_email');
    if (!email) return;
    fetch('/api/notifications/preferences')
      .then((r) => r.json())
      .then((data) => {
        if (data.tradeNotificationsEnabled !== undefined) setTradeNotifEnabled(data.tradeNotificationsEnabled);
        if (data.tradeNotificationsEmail !== undefined) setTradeNotifEmail(data.tradeNotificationsEmail);
      })
      .catch(() => {});
  }, []);

  const saveTradePrefs = async (inApp: boolean, email: boolean) => {
    setPrefsSaving(true);
    setPrefsMessage('');
    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeNotificationsEnabled: Boolean(inApp),
          tradeNotificationsEmail: Boolean(email),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTradeNotifEnabled(inApp);
        setTradeNotifEmail(email);
        setPrefsMessage('Saved');
        setTimeout(() => setPrefsMessage(''), 2000);
      } else {
        setPrefsMessage(data.error || 'Failed to save');
      }
    } catch {
      setPrefsMessage('Failed to save');
    } finally {
      setPrefsSaving(false);
    }
  };

  const getPriceForSymbol = (symbol: string): number => {
    if (symbol === 'MNQ' || symbol === 'NQ') return prices.NQ || 0;
    if (symbol === 'MES' || symbol === 'ES') return prices.ES || 0;
    return 0;
  };

  const getPointValue = (symbol: string) => POINT_VALUE[symbol] ?? 2;

  const openTrades = trades.filter((t) => t.status === 'open');
  const closedTrades = trades.filter((t) => t.status === 'closed');

  let totalUnrealizedPnL = 0;
  let totalRealizedPnL = 0;
  for (const t of trades) {
    const pv = getPointValue(t.symbol);
    const openQty = t.quantity - (t.exitQuantity ?? 0);
    if (openQty > 0) {
      const current = getPriceForSymbol(t.symbol);
      if (current > 0) {
        const points = t.side === 'long' ? current - t.entryPrice : t.entryPrice - current;
        totalUnrealizedPnL += points * pv * openQty;
      }
    }
    if ((t.exitQuantity ?? 0) > 0 && t.exitPrice != null) {
      const points = t.side === 'long' ? t.exitPrice - t.entryPrice : t.entryPrice - t.exitPrice;
      totalRealizedPnL += points * pv * (t.exitQuantity ?? 0);
    }
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);

  const isAuthed = typeof document !== 'undefined' && !!getCookie('user_email');

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
        <div className="max-w-4xl mx-auto">
          {/* Header + last updated + refresh */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-3">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-zinc-50 mb-1">Live Trades</h1>
              <p className="text-zinc-400 text-sm">
                Real-time positions and P&L. MNQ $2, NQ $20, MES $5, ES $12.50 per point.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {lastUpdated && (
                <span className="text-xs text-zinc-500">
                  Updated {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
              <button
                onClick={() => fetchTrades(true)}
                disabled={refreshing || loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-sm font-medium transition-colors disabled:opacity-50"
              >
                <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>

          {isAuthed && (
            <div className="mb-8 p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-blue-500/10">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-200">New trade notifications</p>
                  <p className="text-xs text-zinc-500">Bell icon and email alerts</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={tradeNotifEnabled}
                    onChange={(e) => saveTradePrefs(e.target.checked, tradeNotifEmail)}
                    disabled={prefsSaving}
                    className="w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-zinc-300 group-hover:text-zinc-100">Notify in dashboard (bell)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={tradeNotifEmail}
                    onChange={(e) => saveTradePrefs(tradeNotifEnabled, e.target.checked)}
                    disabled={prefsSaving}
                    className="w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-zinc-300 group-hover:text-zinc-100">Email when a trade is added</span>
                </label>
                {prefsMessage && <span className="text-xs text-emerald-400">{prefsMessage}</span>}
              </div>
            </div>
          )}

          {/* P&L summary — always visible */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="rounded-2xl bg-gradient-to-br from-zinc-900/90 to-zinc-900/70 border border-zinc-800 p-6 shadow-lg hover:border-zinc-700 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Unrealized P&L</p>
              </div>
              <p className={`text-2xl md:text-3xl font-bold tabular-nums ${totalUnrealizedPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(totalUnrealizedPnL)}
              </p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-zinc-900/90 to-zinc-900/70 border border-zinc-800 p-6 shadow-lg hover:border-zinc-700 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Realized P&L</p>
              </div>
              <p className={`text-2xl md:text-3xl font-bold tabular-nums ${totalRealizedPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(totalRealizedPnL)}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-6 animate-pulse">
                  <div className="h-6 bg-zinc-800 rounded w-1/3 mb-4" />
                  <div className="h-4 bg-zinc-800 rounded w-2/3 mb-2" />
                  <div className="h-4 bg-zinc-800 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : trades.length === 0 ? (
            <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-16 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-800 flex items-center justify-center">
                <svg className="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <p className="text-zinc-300 font-medium mb-1">No live trades yet</p>
              <p className="text-sm text-zinc-500">Positions will appear here when they’re added.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {openTrades.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold text-zinc-200 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Open positions
                  </h2>
                  <div className="space-y-4">
                    {openTrades.map((t) => {
                      const current = getPriceForSymbol(t.symbol);
                      const openQty = t.quantity - (t.exitQuantity ?? 0);
                      const pv = getPointValue(t.symbol);
                      const points = current > 0 ? (t.side === 'long' ? current - t.entryPrice : t.entryPrice - current) : null;
                      const unrealizedPnL = points != null ? points * pv * openQty : null;
                      const isExpanded = expandedTradeId === t.id;
                      const hasDetails = !!(t.notes || t.chartUrl);
                      return (
                        <div
                          key={t.id}
                          className="rounded-2xl bg-zinc-900/90 border border-zinc-800 overflow-hidden shadow-lg hover:border-zinc-700 hover:shadow-xl transition-all duration-200"
                        >
                          <div className="p-6">
                            <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                              <div className="flex items-center gap-3">
                                <span className="px-3 py-1.5 rounded-xl font-mono font-bold text-sm bg-emerald-500/15 border border-emerald-500/40 text-emerald-400">
                                  {t.symbol} {t.side}
                                </span>
                                <span className="text-zinc-400 text-sm">
                                  {openQty} contract{openQty !== 1 ? 's' : ''} @ <span className="text-zinc-200 font-medium">{t.entryPrice.toFixed(2)}</span> avg
                                </span>
                              </div>
                              {current > 0 && (
                                <div className="text-right">
                                  <p className="text-xs text-zinc-500">Mark</p>
                                  <p className="text-lg font-semibold text-zinc-100 tabular-nums">{current.toFixed(2)}</p>
                                </div>
                              )}
                            </div>
                            {unrealizedPnL != null && (
                              <p className={`text-xl font-bold tabular-nums ${unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {formatCurrency(unrealizedPnL)} unrealized
                              </p>
                            )}
                            {hasDetails && (
                              <button
                                type="button"
                                onClick={() => setExpandedTradeId(isExpanded ? null : t.id)}
                                className="mt-4 inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                              >
                                {isExpanded ? 'Hide' : 'Show'} notes & chart
                                <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            )}
                          </div>
                          {hasDetails && isExpanded && (
                            <div className="border-t border-zinc-800 bg-zinc-950/50 p-6 space-y-4">
                              {t.notes && (
                                <div>
                                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Notes</p>
                                  <p className="text-sm text-zinc-400 whitespace-pre-wrap">{t.notes}</p>
                                </div>
                              )}
                              {t.chartUrl && (
                                <div>
                                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Chart / setup</p>
                                  <a href={t.chartUrl} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden border border-zinc-800 hover:border-emerald-500/50 transition-colors">
                                    <img src={t.chartUrl} alt="Trade chart" className="w-full h-56 object-cover object-center" />
                                  </a>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {closedTrades.length > 0 && (
                <section>
                  <button
                    type="button"
                    onClick={() => setShowClosed((c) => !c)}
                    className="flex items-center gap-2 text-lg font-semibold text-zinc-300 hover:text-zinc-100 mb-4 transition-colors"
                  >
                    <svg className={`w-5 h-5 transition-transform ${showClosed ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    Closed ({closedTrades.length})
                  </button>
                  {showClosed && (
                    <div className="space-y-4">
                      {closedTrades.map((t) => {
                        const pv = getPointValue(t.symbol);
                        const exitQty = t.exitQuantity ?? 0;
                        const points = t.exitPrice != null ? (t.side === 'long' ? t.exitPrice - t.entryPrice : t.entryPrice - t.exitPrice) : 0;
                        const realizedPnL = points * pv * exitQty;
                        return (
                          <div
                            key={t.id}
                            className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-5 hover:border-zinc-700 transition-colors"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <span className="px-3 py-1 rounded-xl font-mono text-sm bg-zinc-700/50 text-zinc-400">
                                  {t.symbol} {t.side}
                                </span>
                                <span className="text-zinc-500 text-sm">
                                  {t.quantity} @ {t.entryPrice.toFixed(2)} → exit {exitQty} @ {t.exitPrice?.toFixed(2) ?? '—'}
                                </span>
                              </div>
                              <p className={`font-bold tabular-nums ${realizedPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {formatCurrency(realizedPnL)}
                              </p>
                            </div>
                            {t.notes && <p className="mt-2 text-sm text-zinc-500">{t.notes}</p>}
                            {t.chartUrl && (
                              <a href={t.chartUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs text-blue-400 hover:underline">
                                View chart
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}
            </div>
          )}

          <div className="mt-12 rounded-2xl bg-gradient-to-r from-blue-600/20 via-blue-700/15 to-blue-600/20 border border-blue-500/25 p-8 text-center shadow-xl">
            <h2 className="text-xl font-bold text-zinc-50 mb-2">Faster calls in Discord</h2>
            <p className="text-zinc-400 mb-5 max-w-md mx-auto">Get real-time trade alerts and discussion in the community.</p>
            <a
              href="https://discord.com/invite/QGnUGdAt"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
            >
              Join Discord
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
