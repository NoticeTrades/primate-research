'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '../components/Navigation';
import CursorGlow from '../components/CursorGlow';
import CursorHover from '../components/CursorHover';
import DiscordSign from '../components/DiscordSign';
import ScrollFade from '../components/ScrollFade';
import MarketTicker from '../components/MarketTicker';

// CME $ per point per contract: NQ $20, MNQ $2, ES $12.50, MES $5
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

interface IndexPrice {
  symbol: string;
  price: number;
  change?: number;
  changePercent?: number;
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
  const [tradeNotifEnabled, setTradeNotifEnabled] = useState(true);
  const [tradeNotifEmail, setTradeNotifEmail] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsMessage, setPrefsMessage] = useState('');

  const fetchTrades = useCallback(async () => {
    try {
      const res = await fetch('/api/trades', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data.trades) setTrades(data.trades);
    } catch {
      // ignore
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
        body: JSON.stringify({ tradeNotificationsEnabled: inApp, tradeNotificationsEmail: email }),
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
          <div className="mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-zinc-50 mb-2">Live Trades</h1>
            <p className="text-zinc-400">
              Real-time positions and P&L. Data updates every 15–20s while you’re on the page.
            </p>
          </div>

          {isAuthed && (
            <div className="mb-8 p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
              <p className="text-sm font-medium text-zinc-300 mb-3">New trade notifications</p>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tradeNotifEnabled}
                    onChange={(e) => saveTradePrefs(e.target.checked, tradeNotifEmail)}
                    disabled={prefsSaving}
                    className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-emerald-600"
                  />
                  <span className="text-sm text-zinc-300">Notify me in the dashboard (bell)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tradeNotifEmail}
                    onChange={(e) => saveTradePrefs(tradeNotifEnabled, e.target.checked)}
                    disabled={prefsSaving}
                    className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-emerald-600"
                  />
                  <span className="text-sm text-zinc-300">Email me when a new trade is added</span>
                </label>
                {prefsMessage && <span className="text-xs text-zinc-500">{prefsMessage}</span>}
              </div>
            </div>
          )}

          {(totalUnrealizedPnL !== 0 || totalRealizedPnL !== 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {totalUnrealizedPnL !== 0 && (
                <div className="rounded-xl bg-zinc-900/80 border border-zinc-800 p-5">
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Unrealized P&L</p>
                  <p className={`text-2xl font-bold ${totalUnrealizedPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatCurrency(totalUnrealizedPnL)}
                  </p>
                </div>
              )}
              {totalRealizedPnL !== 0 && (
                <div className="rounded-xl bg-zinc-900/80 border border-zinc-800 p-5">
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Realized P&L (closed)</p>
                  <p className={`text-2xl font-bold ${totalRealizedPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatCurrency(totalRealizedPnL)}
                  </p>
                </div>
              )}
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center text-zinc-500">Loading trades…</div>
          ) : trades.length === 0 ? (
            <div className="rounded-xl bg-zinc-900/80 border border-zinc-800 p-12 text-center">
              <p className="text-zinc-400 mb-2">No live trades yet</p>
              <p className="text-sm text-zinc-500">Positions will appear here when they’re added.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {openTrades.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold text-zinc-200 mb-4">Open positions</h2>
                  <div className="space-y-4">
                    {openTrades.map((t) => {
                      const current = getPriceForSymbol(t.symbol);
                      const openQty = t.quantity - (t.exitQuantity ?? 0);
                      const pv = getPointValue(t.symbol);
                      const points = current > 0 ? (t.side === 'long' ? current - t.entryPrice : t.entryPrice - current) : null;
                      const unrealizedPnL = points != null ? points * pv * openQty : null;
                      return (
                        <div
                          key={t.id}
                          className="rounded-xl bg-zinc-900/80 border border-zinc-800 overflow-hidden"
                        >
                          <div className="p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                              <div className="flex items-center gap-3">
                                <span className="px-3 py-1 rounded-lg font-mono font-bold text-sm bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                                  {t.symbol} {t.side}
                                </span>
                                <span className="text-zinc-300">
                                  {openQty} contract{openQty !== 1 ? 's' : ''} @ {t.entryPrice.toFixed(2)} avg
                                </span>
                              </div>
                              {current > 0 && (
                                <div className="text-right">
                                  <p className="text-xs text-zinc-500">Mark</p>
                                  <p className="text-lg font-semibold text-zinc-100">{current.toFixed(2)}</p>
                                </div>
                              )}
                            </div>
                            {unrealizedPnL != null && (
                              <p className={`text-xl font-bold ${unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {formatCurrency(unrealizedPnL)} unrealized
                              </p>
                            )}
                            {t.notes && (
                              <p className="mt-3 text-sm text-zinc-400 border-t border-zinc-800 pt-3">{t.notes}</p>
                            )}
                          </div>
                          {t.chartUrl && (
                            <div className="border-t border-zinc-800 p-3 bg-zinc-950/50">
                              <p className="text-xs text-zinc-500 mb-2">Chart / setup</p>
                              <a href={t.chartUrl} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden border border-zinc-800 hover:border-zinc-600 transition-colors">
                                <img src={t.chartUrl} alt="Trade chart" className="w-full h-48 object-cover object-center" />
                              </a>
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
                  <h2 className="text-lg font-semibold text-zinc-200 mb-4">Closed</h2>
                  <div className="space-y-4">
                    {closedTrades.map((t) => {
                      const pv = getPointValue(t.symbol);
                      const exitQty = t.exitQuantity ?? 0;
                      const points = t.exitPrice != null ? (t.side === 'long' ? t.exitPrice - t.entryPrice : t.entryPrice - t.exitPrice) : 0;
                      const realizedPnL = points * pv * exitQty;
                      return (
                        <div
                          key={t.id}
                          className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <span className="px-3 py-1 rounded-lg font-mono text-sm bg-zinc-700/50 text-zinc-400">
                                {t.symbol} {t.side}
                              </span>
                              <span className="text-zinc-400 text-sm">
                                {t.quantity} @ {t.entryPrice.toFixed(2)} → exit {exitQty} @ {t.exitPrice?.toFixed(2) ?? '—'}
                              </span>
                            </div>
                            <p className={`font-bold ${realizedPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {formatCurrency(realizedPnL)}
                            </p>
                          </div>
                          {t.notes && <p className="mt-2 text-sm text-zinc-500">{t.notes}</p>}
                          {t.chartUrl && (
                            <a href={t.chartUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-xs text-blue-400 hover:underline">View chart</a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          )}

          <div className="mt-12 rounded-xl bg-gradient-to-r from-blue-600/20 to-blue-700/20 border border-blue-500/20 p-6 text-center">
            <h2 className="text-xl font-bold text-zinc-50 mb-2">Faster calls in Discord</h2>
            <p className="text-zinc-400 mb-4">Get real-time trade alerts and discussion in the community.</p>
            <a
              href="https://discord.com/invite/QGnUGdAt"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            >
              Join Discord
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
