'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// Country options for the filter
const COUNTRIES = [
  { code: 'us', flag: '🇺🇸', name: 'United States' },
  { code: 'eu', flag: '🇪🇺', name: 'Eurozone' },
  { code: 'gb', flag: '🇬🇧', name: 'United Kingdom' },
  { code: 'jp', flag: '🇯🇵', name: 'Japan' },
  { code: 'cn', flag: '🇨🇳', name: 'China' },
  { code: 'ca', flag: '🇨🇦', name: 'Canada' },
  { code: 'au', flag: '🇦🇺', name: 'Australia' },
  { code: 'de', flag: '🇩🇪', name: 'Germany' },
  { code: 'fr', flag: '🇫🇷', name: 'France' },
  { code: 'ch', flag: '🇨🇭', name: 'Switzerland' },
  { code: 'nz', flag: '🇳🇿', name: 'New Zealand' },
];

// Impact levels: -1 = low, 0 = medium, 1 = high (TradingView's encoding)
const IMPACT_OPTIONS = [
  { value: 'all', label: 'All Impact', dot: 'bg-blue-500' },
  { value: 'high', label: 'High', dot: 'bg-red-500' },
  { value: 'medium', label: 'Medium', dot: 'bg-yellow-500' },
  { value: 'low', label: 'Low', dot: 'bg-green-500' },
];

// Key events reference
const KEY_EVENTS = [
  { name: 'CPI (Consumer Price Index)', frequency: 'Monthly', impact: 'High', description: 'Measures inflation at the consumer level. A higher-than-expected reading is bullish for USD.' },
  { name: 'PPI (Producer Price Index)', frequency: 'Monthly', impact: 'High', description: 'Measures inflation at the wholesale level. Leading indicator for CPI.' },
  { name: 'Non-Farm Payrolls (NFP)', frequency: 'Monthly (1st Friday)', impact: 'High', description: 'Number of jobs added/lost in the US economy. Major market mover.' },
  { name: 'FOMC Interest Rate Decision', frequency: 'Every 6 weeks', impact: 'High', description: 'Federal Reserve sets interest rates. Most impactful event for all markets.' },
  { name: 'GDP (Gross Domestic Product)', frequency: 'Quarterly', impact: 'High', description: 'Measures overall economic output. Key indicator of economic health.' },
  { name: 'Retail Sales', frequency: 'Monthly', impact: 'Medium', description: 'Consumer spending data. Reflects economic confidence and growth trends.' },
  { name: 'Unemployment Claims', frequency: 'Weekly (Thursdays)', impact: 'Medium', description: 'Number of new jobless claims. Early signal of labor market changes.' },
  { name: 'ISM Manufacturing PMI', frequency: 'Monthly', impact: 'Medium', description: 'Above 50 = expansion, below 50 = contraction in manufacturing sector.' },
];

export default function EconomicCalendarPage() {
  const widgetContainerRef = useRef<HTMLDivElement>(null);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([
    'us', 'eu', 'gb', 'jp', 'cn', 'ca', 'au', 'de', 'fr', 'ch', 'nz',
  ]);
  const [impactFilter, setImpactFilter] = useState('all');
  const [widgetKey, setWidgetKey] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Build the TradingView importance filter string
  const getImportanceFilter = useCallback(() => {
    switch (impactFilter) {
      case 'high': return '1';
      case 'medium': return '0';
      case 'low': return '-1';
      default: return '-1,0,1';
    }
  }, [impactFilter]);

  // Render the TradingView widget
  useEffect(() => {
    if (!widgetContainerRef.current) return;

    // Clear existing widget
    widgetContainerRef.current.innerHTML = '';
    setIsLoaded(false);

    const wrapper = document.createElement('div');
    wrapper.className = 'tradingview-widget-container';

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    wrapper.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js';
    script.async = true;
    script.type = 'text/javascript';
    script.innerHTML = JSON.stringify({
      colorTheme: 'dark',
      isTransparent: true,
      width: '100%',
      height: '500',
      locale: 'en',
      importanceFilter: getImportanceFilter(),
      countryFilter: selectedCountries.join(','),
    });

    script.onload = () => {
      setTimeout(() => setIsLoaded(true), 1000);
    };

    wrapper.appendChild(script);
    widgetContainerRef.current.appendChild(wrapper);

    // Fallback loaded state
    const timer = setTimeout(() => setIsLoaded(true), 4000);

    return () => clearTimeout(timer);
  }, [widgetKey, getImportanceFilter, selectedCountries]);

  // Toggle a country on/off
  const toggleCountry = (code: string) => {
    setSelectedCountries((prev) => {
      const updated = prev.includes(code)
        ? prev.filter((c) => c !== code)
        : [...prev, code];
      // Don't allow empty — keep at least one
      return updated.length > 0 ? updated : prev;
    });
  };

  // Apply filters → re-render widget
  const applyFilters = () => {
    setWidgetKey((k) => k + 1);
  };

  // Select only US
  const selectUSOnly = () => {
    setSelectedCountries(['us']);
    setWidgetKey((k) => k + 1);
  };

  // Select all countries
  const selectAllCountries = () => {
    setSelectedCountries(COUNTRIES.map((c) => c.code));
    setWidgetKey((k) => k + 1);
  };

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-blue-600/20 rounded-xl">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Economic Calendar</h1>
              <p className="text-zinc-500 text-sm mt-0.5">
                Live market-moving events with forecasts, actuals &amp; countdowns
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl px-5 py-5 mb-5 space-y-4">
          {/* Impact Filter */}
          <div>
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2.5">Impact Level</div>
            <div className="flex flex-wrap gap-2">
              {IMPACT_OPTIONS.map((opt) => {
                const isActive = impactFilter === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setImpactFilter(opt.value);
                      setWidgetKey((k) => k + 1);
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium border transition-all ${
                      isActive
                        ? 'bg-blue-500/15 border-blue-500/40 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.1)]'
                        : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${opt.dot}`} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Country Filter */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Countries</div>
              <div className="flex gap-2">
                <button
                  onClick={selectUSOnly}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
                >
                  🇺🇸 US Only
                </button>
                <span className="text-zinc-700">|</span>
                <button
                  onClick={selectAllCountries}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
                >
                  Select All
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {COUNTRIES.map((country) => {
                const isActive = selectedCountries.includes(country.code);
                return (
                  <button
                    key={country.code}
                    onClick={() => {
                      toggleCountry(country.code);
                      // Auto-apply after toggle
                      setTimeout(() => setWidgetKey((k) => k + 1), 50);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                      isActive
                        ? 'bg-blue-500/15 border-blue-500/40 text-blue-400'
                        : 'bg-zinc-800/30 border-zinc-800 text-zinc-600 hover:border-zinc-700 hover:text-zinc-400'
                    }`}
                    title={country.name}
                  >
                    <span className="text-base">{country.flag}</span>
                    <span className="hidden sm:inline">{country.code.toUpperCase()}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Live Calendar Widget */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden mb-6">
          <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
              </span>
              <h2 className="text-sm font-semibold text-zinc-200">Live Economic Events</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-600">
                {selectedCountries.length === COUNTRIES.length
                  ? 'All countries'
                  : `${selectedCountries.length} ${selectedCountries.length === 1 ? 'country' : 'countries'}`}
                {' · '}
                {impactFilter === 'all' ? 'All impact' : `${impactFilter} impact`}
              </span>
            </div>
          </div>

          {/* Loading overlay */}
          {!isLoaded && (
            <div className="flex items-center justify-center py-24">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-zinc-400">Loading economic calendar...</p>
              </div>
            </div>
          )}

          {/* TradingView Widget */}
          <div
            ref={widgetContainerRef}
            style={{ minHeight: isLoaded ? 'auto' : 0, overflow: isLoaded ? 'visible' : 'hidden' }}
          />
        </div>

        {/* Key News Drivers Toggle */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-zinc-800/30 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-semibold text-zinc-200">Key News Drivers Reference Guide</span>
            </div>
            <svg
              className={`w-5 h-5 text-zinc-500 transition-transform duration-200 ${showGuide ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showGuide && (
            <div className="border-t border-zinc-800">
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
                    {KEY_EVENTS.map((event, i) => (
                      <tr key={i} className="border-b border-zinc-800/50 last:border-b-0 hover:bg-zinc-800/30 transition-colors">
                        <td className="px-5 py-3.5">
                          <span className="text-sm font-medium text-zinc-100">{event.name}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm text-zinc-400">{event.frequency}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${
                              event.impact === 'High'
                                ? 'bg-red-500/15 text-red-400 border-red-500/30'
                                : 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${event.impact === 'High' ? 'bg-red-500' : 'bg-yellow-500'}`} />
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
                {KEY_EVENTS.map((event, i) => (
                  <div key={i} className="px-5 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-zinc-100">{event.name}</span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${
                          event.impact === 'High'
                            ? 'bg-red-500/15 text-red-400 border-red-500/30'
                            : 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
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
          )}
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
            Live data &bull; Auto-updates when events are released
          </span>
        </div>
      </div>
    </div>
  );
}
