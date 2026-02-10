'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';

interface CalendarEvent {
  event: string;
  country: string;
  date: string | null;
  time: string | null;
  impact: string;
  actual: number | null;
  estimate: number | null;
  prev: number | null;
  unit: string;
}

const COUNTRY_FLAGS: Record<string, string> = {
  US: '🇺🇸', EU: '🇪🇺', GB: '🇬🇧', JP: '🇯🇵', CN: '🇨🇳',
  CA: '🇨🇦', AU: '🇦🇺', DE: '🇩🇪', FR: '🇫🇷', CH: '🇨🇭',
  NZ: '🇳🇿', KR: '🇰🇷', IN: '🇮🇳', BR: '🇧🇷', MX: '🇲🇽',
  IT: '🇮🇹', ES: '🇪🇸', SE: '🇸🇪', NO: '🇳🇴', SG: '🇸🇬',
  HK: '🇭🇰', ZA: '🇿🇦',
};

const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States', EU: 'Eurozone', GB: 'United Kingdom', JP: 'Japan',
  CN: 'China', CA: 'Canada', AU: 'Australia', DE: 'Germany', FR: 'France',
  CH: 'Switzerland', NZ: 'New Zealand', KR: 'South Korea', IN: 'India',
  BR: 'Brazil', MX: 'Mexico', IT: 'Italy', ES: 'Spain', SE: 'Sweden',
  NO: 'Norway', SG: 'Singapore', HK: 'Hong Kong', ZA: 'South Africa',
};

const IMPACT_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  high: { label: 'High', color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30', dot: 'bg-red-500' },
  medium: { label: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-500/15', border: 'border-yellow-500/30', dot: 'bg-yellow-500' },
  low: { label: 'Low', color: 'text-green-400', bg: 'bg-green-500/15', border: 'border-green-500/30', dot: 'bg-green-500' },
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatValue(val: number | null, unit: string): string {
  if (val === null || val === undefined) return '—';
  if (unit === '%') return `${val}%`;
  if (unit && unit !== '%') return `${val} ${unit}`;
  return val.toString();
}

function getEventDateTime(event: CalendarEvent): Date | null {
  if (!event.date) return null;
  // date can be "2026-02-10 08:30:00" or "2026-02-10"
  const dateStr = event.date.includes(' ')
    ? event.date.replace(' ', 'T') + 'Z'
    : event.time
      ? `${event.date}T${event.time}Z`
      : `${event.date}T00:00:00Z`;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function getCountdown(eventDate: Date, now: Date): { text: string; isPast: boolean; isToday: boolean; isSoon: boolean } {
  const diff = eventDate.getTime() - now.getTime();
  const isPast = diff <= 0;
  const isToday = eventDate.toDateString() === now.toDateString();

  if (isPast) {
    return { text: 'Released', isPast: true, isToday, isSoon: false };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const isSoon = totalSeconds < 3600; // Less than 1 hour

  if (days > 0) {
    return { text: `${days}d ${hours}h ${minutes}m`, isPast: false, isToday, isSoon };
  }
  if (hours > 0) {
    return { text: `${hours}h ${minutes}m ${seconds}s`, isPast: false, isToday, isSoon };
  }
  if (minutes > 0) {
    return { text: `${minutes}m ${seconds}s`, isPast: false, isToday, isSoon };
  }
  return { text: `${seconds}s`, isPast: false, isToday, isSoon };
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  if (isNaN(d.getTime())) return dateStr;
  const dayName = DAY_NAMES[d.getDay()];
  return `${dayName}, ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

function formatTime12h(timeStr: string | null): string {
  if (!timeStr) return 'All Day';
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${mStr} ${ampm}`;
}

export default function EconomicCalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekRange, setWeekRange] = useState({ from: '', to: '' });
  const [now, setNow] = useState(new Date());

  // Filters
  const [countryFilter, setCountryFilter] = useState<string>('ALL');
  const [impactFilter, setImpactFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Live clock for countdowns
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch events
  const fetchEvents = useCallback(async (offset: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/calendar?week=${offset}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to fetch calendar data');
        setEvents([]);
      } else {
        setEvents(data.events || []);
        setWeekRange({ from: data.from, to: data.to });
      }
    } catch {
      setError('Failed to connect to calendar service');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents(weekOffset);
  }, [weekOffset, fetchEvents]);

  // Get unique countries from current data
  const availableCountries = useMemo(() => {
    const countries = new Set(events.map((e) => e.country).filter(Boolean));
    return Array.from(countries).sort();
  }, [events]);

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (countryFilter !== 'ALL' && e.country !== countryFilter) return false;
      if (impactFilter !== 'ALL' && e.impact !== impactFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return e.event.toLowerCase().includes(q) || e.country.toLowerCase().includes(q);
      }
      return true;
    });
  }, [events, countryFilter, impactFilter, searchQuery]);

  // Group events by date
  const groupedEvents = useMemo(() => {
    const groups: Record<string, CalendarEvent[]> = {};
    filteredEvents.forEach((e) => {
      const dateKey = e.date ? e.date.split(' ')[0] : 'unknown';
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(e);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredEvents]);

  // Stats
  const highImpactCount = useMemo(() => filteredEvents.filter((e) => e.impact === 'high').length, [filteredEvents]);
  const todayCount = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return filteredEvents.filter((e) => e.date?.startsWith(todayStr)).length;
  }, [filteredEvents]);

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-blue-600/20 rounded-xl">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Economic Calendar</h1>
              <p className="text-zinc-500 text-sm mt-0.5">
                Live market-moving events &bull; Updated every 15 min
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-3">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Total Events</div>
            <div className="text-xl font-bold text-zinc-100">{filteredEvents.length}</div>
          </div>
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-3">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">High Impact</div>
            <div className="text-xl font-bold text-red-400">{highImpactCount}</div>
          </div>
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-3">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Today</div>
            <div className="text-xl font-bold text-blue-400">{todayCount}</div>
          </div>
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-3">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Countries</div>
            <div className="text-xl font-bold text-zinc-100">{availableCountries.length}</div>
          </div>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center justify-between bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-3 mb-4">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            className="flex items-center gap-1.5 text-sm font-medium text-zinc-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-zinc-800"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Prev Week
          </button>

          <div className="text-center">
            <button
              onClick={() => setWeekOffset(0)}
              className={`text-sm font-semibold px-3 py-1 rounded-lg transition-colors ${
                weekOffset === 0
                  ? 'text-blue-400 bg-blue-500/10'
                  : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {weekOffset === 0
                ? 'This Week'
                : weekOffset === -1
                  ? 'Last Week'
                  : weekOffset === 1
                    ? 'Next Week'
                    : `${weekOffset > 0 ? '+' : ''}${weekOffset} weeks`}
            </button>
            {weekRange.from && (
              <div className="text-xs text-zinc-500 mt-0.5">
                {new Date(weekRange.from + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {' — '}
                {new Date(weekRange.to + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            )}
          </div>

          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            className="flex items-center gap-1.5 text-sm font-medium text-zinc-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-zinc-800"
          >
            Next Week
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-4 mb-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events... (e.g. CPI, NFP, Interest Rate)"
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Impact Filter */}
          <div>
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Impact Level</div>
            <div className="flex flex-wrap gap-2">
              {['ALL', 'high', 'medium', 'low'].map((impact) => {
                const isActive = impactFilter === impact;
                const config = IMPACT_CONFIG[impact];
                return (
                  <button
                    key={impact}
                    onClick={() => setImpactFilter(impact)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                      isActive
                        ? impact === 'ALL'
                          ? 'bg-blue-500/15 border-blue-500/40 text-blue-400'
                          : `${config!.bg} ${config!.border} ${config!.color}`
                        : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
                    }`}
                  >
                    {impact !== 'ALL' && (
                      <span className={`w-2 h-2 rounded-full ${config!.dot}`} />
                    )}
                    {impact === 'ALL' ? 'All Impact' : config!.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Country Filter */}
          <div>
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Country</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCountryFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                  countryFilter === 'ALL'
                    ? 'bg-blue-500/15 border-blue-500/40 text-blue-400'
                    : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
                }`}
              >
                All Countries
              </button>
              {availableCountries.map((country) => (
                <button
                  key={country}
                  onClick={() => setCountryFilter(country)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                    countryFilter === country
                      ? 'bg-blue-500/15 border-blue-500/40 text-blue-400'
                      : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
                  }`}
                >
                  <span>{COUNTRY_FLAGS[country] || '🌐'}</span>
                  {country}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Events */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-zinc-400">Loading economic events...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
            <svg className="w-10 h-10 text-red-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-red-400 text-sm font-medium mb-1">Unable to load calendar</p>
            <p className="text-zinc-500 text-xs">{error}</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-12 text-center">
            <svg className="w-12 h-12 text-zinc-700 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-zinc-400 text-sm font-medium mb-1">No events found</p>
            <p className="text-zinc-600 text-xs">Try adjusting your filters or switching weeks</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedEvents.map(([dateKey, dayEvents]) => {
              const todayStr = new Date().toISOString().split('T')[0];
              const isToday = dateKey === todayStr;

              return (
                <div key={dateKey}>
                  {/* Day Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold ${
                        isToday
                          ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                          : 'bg-zinc-800/50 text-zinc-300 border border-zinc-800'
                      }`}
                    >
                      {isToday && (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                        </span>
                      )}
                      {dateKey !== 'unknown' ? formatDateLabel(dateKey) : 'Unscheduled'}
                      {isToday && <span className="text-xs font-medium text-blue-500 ml-1">TODAY</span>}
                    </div>
                    <div className="flex-1 h-px bg-zinc-800" />
                    <span className="text-xs text-zinc-600">{dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}</span>
                  </div>

                  {/* Events for this day */}
                  <div className="space-y-2">
                    {dayEvents.map((event, idx) => {
                      const eventDate = getEventDateTime(event);
                      const countdown = eventDate ? getCountdown(eventDate, now) : null;
                      const impactCfg = IMPACT_CONFIG[event.impact] || IMPACT_CONFIG.low;
                      const actualBetter =
                        event.actual !== null && event.estimate !== null && event.actual > event.estimate;
                      const actualWorse =
                        event.actual !== null && event.estimate !== null && event.actual < event.estimate;

                      return (
                        <div
                          key={`${dateKey}-${idx}`}
                          className={`bg-zinc-900/80 border rounded-xl overflow-hidden transition-all hover:border-zinc-600 ${
                            countdown?.isSoon && !countdown.isPast
                              ? 'border-yellow-500/40 shadow-[0_0_15px_rgba(234,179,8,0.08)]'
                              : countdown?.isPast
                                ? 'border-zinc-800/60 opacity-75'
                                : 'border-zinc-800'
                          }`}
                        >
                          <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-0 px-4 py-3.5">
                            {/* Time + Countdown */}
                            <div className="flex items-center gap-3 md:w-44 shrink-0">
                              <div className="text-sm font-mono text-zinc-300 w-20">
                                {formatTime12h(event.time)}
                              </div>
                              {countdown && (
                                <div
                                  className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                                    countdown.isPast
                                      ? 'bg-zinc-800 text-zinc-500'
                                      : countdown.isSoon
                                        ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 animate-pulse'
                                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                  }`}
                                >
                                  {countdown.isPast ? '✓ Released' : `⏱ ${countdown.text}`}
                                </div>
                              )}
                            </div>

                            {/* Country + Event Name */}
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                              <span
                                className="text-lg shrink-0"
                                title={COUNTRY_NAMES[event.country] || event.country}
                              >
                                {COUNTRY_FLAGS[event.country] || '🌐'}
                              </span>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-zinc-100 truncate">
                                  {event.event}
                                </div>
                                <div className="text-xs text-zinc-500">
                                  {COUNTRY_NAMES[event.country] || event.country}
                                </div>
                              </div>
                            </div>

                            {/* Impact Badge */}
                            <div className="md:w-24 shrink-0 flex md:justify-center">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${impactCfg.bg} ${impactCfg.border} ${impactCfg.color}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${impactCfg.dot}`} />
                                {impactCfg.label}
                              </span>
                            </div>

                            {/* Values: Previous | Forecast | Actual */}
                            <div className="flex items-center gap-4 md:w-72 shrink-0 md:justify-end">
                              <div className="text-center">
                                <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Prev</div>
                                <div className="text-sm font-mono text-zinc-400">
                                  {formatValue(event.prev, event.unit)}
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Forecast</div>
                                <div className="text-sm font-mono text-zinc-300">
                                  {formatValue(event.estimate, event.unit)}
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Actual</div>
                                <div
                                  className={`text-sm font-mono font-semibold ${
                                    event.actual === null
                                      ? 'text-zinc-600'
                                      : actualBetter
                                        ? 'text-green-400'
                                        : actualWorse
                                          ? 'text-red-400'
                                          : 'text-zinc-200'
                                  }`}
                                >
                                  {formatValue(event.actual, event.unit)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="mt-8 bg-zinc-900/60 border border-zinc-800 rounded-xl px-5 py-4">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Guide</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-zinc-400">
            <div className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 mt-1 shrink-0" />
              <span><strong className="text-zinc-300">High Impact</strong> — Major market movers (CPI, NFP, FOMC, GDP). Expect significant volatility.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-500 mt-1 shrink-0" />
              <span><strong className="text-zinc-300">Medium Impact</strong> — Moderate market reactions (Retail Sales, PMI, Claims). Worth watching.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 mt-1 shrink-0" />
              <span><strong className="text-zinc-300">Low Impact</strong> — Minor events that rarely move markets significantly.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-yellow-400 mt-0.5 shrink-0">⏱</span>
              <span><strong className="text-zinc-300">Countdown</strong> — Live countdown to event release. Pulses when under 1 hour away.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-400 font-mono mt-0.5 shrink-0">▲</span>
              <span><strong className="text-zinc-300">Actual {">"} Forecast</strong> — Green actual means the number beat expectations.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-red-400 font-mono mt-0.5 shrink-0">▼</span>
              <span><strong className="text-zinc-300">Actual {"<"} Forecast</strong> — Red actual means the number missed expectations.</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 text-center text-xs text-zinc-600">
          Data sourced from FinnHub &bull; Auto-refreshes every 15 minutes &bull; Times shown in UTC
        </div>
      </div>
    </div>
  );
}
