'use client';

import { useState, useEffect, useRef } from 'react';
import { useVolatility } from '../contexts/VolatilityContext';

const POLL_MS = 15000;

type VolatilityRow = {
  symbol: string;
  name: string;
  description: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  previousClose: number | null;
};

function getVixZone(vix: number): { label: string; color: string; meaning: string } {
  if (vix < 12) return { label: 'Complacency', color: 'text-amber-400', meaning: 'Low fear; options cheap; potential for sudden vol expansion.' };
  if (vix < 20) return { label: 'Normal', color: 'text-emerald-400', meaning: 'Typical range; moderate implied vol.' };
  if (vix < 30) return { label: 'Elevated', color: 'text-orange-400', meaning: 'Heightened fear; larger expected moves.' };
  return { label: 'Fear / Extreme', color: 'text-red-400', meaning: 'High fear; often a contrarian signal near extremes.' };
}

function getTermStructureLabel(vix: number | null, vix3m: number | null): string {
  if (vix == null || vix3m == null || vix3m <= 0) return '—';
  if (vix3m > vix) return 'Contango (term structure normal)';
  if (vix > vix3m) return 'Backwardation (near-term stress)';
  return 'Flat';
}

export default function VolatilityPanel() {
  const { isVolatilityOpen, closeVolatility } = useVolatility();
  const [data, setData] = useState<VolatilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    try {
      setError(null);
      const res = await fetch('/api/volatility', { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load volatility data');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isVolatilityOpen) return;
    setLoading(true);
    fetchData();
    const t = setInterval(fetchData, POLL_MS);
    return () => clearInterval(t);
  }, [isVolatilityOpen]);

  useEffect(() => {
    if (!isVolatilityOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeVolatility();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isVolatilityOpen, closeVolatility]);

  useEffect(() => {
    if (!isVolatilityOpen) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) closeVolatility();
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [isVolatilityOpen, closeVolatility]);

  if (!isVolatilityOpen) return null;

  const vixRow = data.find((r) => r.symbol === '^VIX');
  const vix3mRow = data.find((r) => r.symbol === '^VIX3M');
  const vixVal = vixRow?.price ?? null;
  const vix3mVal = vix3mRow?.price ?? null;
  const zone = vixVal != null ? getVixZone(vixVal) : null;
  const termLabel = getTermStructureLabel(vixVal, vix3mVal);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        ref={panelRef}
        className="flex flex-col w-full max-w-lg rounded-xl overflow-hidden border border-zinc-700/80 bg-zinc-900/98 shadow-2xl"
      >
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-800/90 border-b border-zinc-700/80">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-bold text-amber-400 bg-amber-500/20 border border-amber-500/50">
              VOL
            </span>
            <span className="text-sm font-semibold text-white">Volatility Dashboard</span>
          </div>
          <button
            type="button"
            onClick={closeVolatility}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
          {loading && data.length === 0 ? (
            <p className="text-sm text-zinc-400">Loading volatility data…</p>
          ) : error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : (
            <>
              {/* VIX spotlight + zone */}
              {vixVal != null && zone && (
                <div className="rounded-lg bg-zinc-800/80 border border-zinc-700/60 p-3">
                  <div className="flex items-baseline justify-between gap-2 flex-wrap">
                    <div>
                      <span className="text-xs text-zinc-500 uppercase tracking-wider">VIX (S&P 500 30d implied vol)</span>
                      <p className="text-2xl font-bold text-white tabular-nums mt-0.5">{vixVal.toFixed(2)}</p>
                      <p className={`text-sm font-medium mt-1 ${zone.color}`}>{zone.label}</p>
                    </div>
                    {vixRow?.changePercent != null && (
                      <span
                        className={`text-sm font-medium tabular-nums ${
                          vixRow.changePercent >= 0 ? 'text-red-400' : 'text-emerald-400'
                        }`}
                      >
                        {vixRow.changePercent >= 0 ? '+' : ''}
                        {vixRow.changePercent.toFixed(2)}%
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-2">{zone.meaning}</p>
                </div>
              )}

              {/* Term structure */}
              <div className="rounded-lg bg-zinc-800/50 border border-zinc-700/40 px-3 py-2">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Term structure</span>
                <p className="text-xs text-zinc-300 mt-0.5">{termLabel}</p>
                {vixVal != null && vix3mVal != null && vix3mVal > 0 && (
                  <p className="text-[10px] text-zinc-500 mt-1">
                    VIX {vixVal.toFixed(1)} / VIX3M {vix3mVal.toFixed(1)}
                  </p>
                )}
              </div>

              {/* Table: all indices */}
              <div>
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">All indices</span>
                <div className="mt-1.5 overflow-x-auto rounded-lg border border-zinc-700/60">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-zinc-800/80 border-b border-zinc-700/60">
                        <th className="text-left py-2 px-2 text-zinc-400 font-medium">Index</th>
                        <th className="text-right py-2 px-2 text-zinc-400 font-medium">Last</th>
                        <th className="text-right py-2 px-2 text-zinc-400 font-medium">Chg %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((row) => {
                        const up = (row.changePercent ?? 0) >= 0;
                        const chgClass = up ? 'text-red-400' : 'text-emerald-400';
                        return (
                          <tr key={row.symbol} className="border-b border-zinc-800/80 last:border-b-0">
                            <td className="py-2 px-2">
                              <span className="font-medium text-white">{row.name}</span>
                              <p className="text-[10px] text-zinc-500 max-w-[200px] truncate" title={row.description}>
                                {row.description}
                              </p>
                            </td>
                            <td className="py-2 px-2 text-right text-white tabular-nums">
                              {row.price != null ? row.price.toFixed(2) : '—'}
                            </td>
                            <td className={`py-2 px-2 text-right tabular-nums ${chgClass}`}>
                              {row.changePercent != null
                                ? `${row.changePercent >= 0 ? '+' : ''}${row.changePercent.toFixed(2)}%`
                                : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <p className="text-[10px] text-zinc-500">Data refreshes every {POLL_MS / 1000}s. Source: Yahoo Finance.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
