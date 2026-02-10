'use client';

import { useEffect, useRef, useState } from 'react';

export default function EconomicCalendarPage() {
  const widgetContainerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!widgetContainerRef.current) return;

    // Clear any existing widget
    widgetContainerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js';
    script.async = true;
    script.type = 'text/javascript';
    script.innerHTML = JSON.stringify({
      colorTheme: 'dark',
      isTransparent: true,
      width: '100%',
      height: '600',
      locale: 'en',
      importanceFilter: '-1,0,1',
      countryFilter:
        'us,eu,gb,jp,cn,ca,au,de,fr,ch',
      currencyFilter:
        'USD,EUR,GBP,JPY,CNY,CAD,AUD,CHF',
    });

    script.onload = () => {
      setIsLoaded(true);
    };

    widgetContainerRef.current.appendChild(script);

    // Mark loaded after a short delay even if onload doesn't fire
    const timer = setTimeout(() => setIsLoaded(true), 3000);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  // Key upcoming events data — these are the major recurring ones traders care about
  const keyEvents = [
    { name: 'CPI (Consumer Price Index)', frequency: 'Monthly', impact: 'High', description: 'Measures inflation at the consumer level. A higher-than-expected reading is bullish for USD.' },
    { name: 'PPI (Producer Price Index)', frequency: 'Monthly', impact: 'High', description: 'Measures inflation at the wholesale level. Leading indicator for CPI.' },
    { name: 'Non-Farm Payrolls (NFP)', frequency: 'Monthly (1st Friday)', impact: 'High', description: 'Number of jobs added/lost in the US economy. Major market mover.' },
    { name: 'FOMC Interest Rate Decision', frequency: 'Every 6 weeks', impact: 'High', description: 'Federal Reserve sets interest rates. Most impactful event for all markets.' },
    { name: 'GDP (Gross Domestic Product)', frequency: 'Quarterly', impact: 'High', description: 'Measures overall economic output. Key indicator of economic health.' },
    { name: 'Retail Sales', frequency: 'Monthly', impact: 'Medium', description: 'Consumer spending data. Reflects economic confidence and growth trends.' },
    { name: 'Unemployment Claims', frequency: 'Weekly (Thursdays)', impact: 'Medium', description: 'Number of new jobless claims. Early signal of labor market changes.' },
    { name: 'ISM Manufacturing PMI', frequency: 'Monthly', impact: 'Medium', description: 'Above 50 = expansion, below 50 = contraction in manufacturing sector.' },
  ];

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Economic Calendar
            </h1>
          </div>
          <p className="text-zinc-400 text-sm md:text-base max-w-2xl">
            Live economic events and news drivers that move markets. Track CPI, PPI, NFP, FOMC decisions, and more — updated in real-time with countdowns to upcoming releases.
          </p>
        </div>

        {/* Live Calendar Widget */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden mb-8">
          <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
              </span>
              <h2 className="text-sm font-semibold text-zinc-200">Live Economic Events</h2>
            </div>
            <span className="text-xs text-zinc-500">Auto-updates • Powered by TradingView</span>
          </div>

          {/* Loading state */}
          {!isLoaded && (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-zinc-400">Loading economic calendar...</p>
              </div>
            </div>
          )}

          {/* TradingView Widget */}
          <div
            className="tradingview-widget-container"
            style={{ minHeight: isLoaded ? 'auto' : 0, overflow: isLoaded ? 'visible' : 'hidden' }}
          >
            <div ref={widgetContainerRef} className="tradingview-widget-container__widget" />
          </div>
        </div>

        {/* Key Events Reference Guide */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-200">Key News Drivers Reference</h2>
            <p className="text-xs text-zinc-500 mt-1">Major economic events that consistently move markets</p>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Event</th>
                  <th className="px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Frequency</th>
                  <th className="px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Impact</th>
                  <th className="px-5 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Description</th>
                </tr>
              </thead>
              <tbody>
                {keyEvents.map((event, i) => (
                  <tr
                    key={i}
                    className="border-b border-zinc-800/50 last:border-b-0 hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-medium text-zinc-100">{event.name}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-zinc-400">{event.frequency}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          event.impact === 'High'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        }`}
                      >
                        {event.impact}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-zinc-400">{event.description}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-zinc-800/50">
            {keyEvents.map((event, i) => (
              <div key={i} className="px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-zinc-100">{event.name}</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                      event.impact === 'High'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    }`}
                  >
                    {event.impact}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mb-1">{event.frequency}</p>
                <p className="text-sm text-zinc-400">{event.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" /> High Impact
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-500" /> Medium Impact
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500" /> Low Impact
          </span>
          <span className="ml-auto text-zinc-600">
            Data auto-refreshes when events are released
          </span>
        </div>
      </div>
    </div>
  );
}

