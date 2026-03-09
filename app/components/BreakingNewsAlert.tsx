'use client';

import { useState, useEffect } from 'react';

const DISMISS_KEY = 'breaking-news-dismissed';
/** If user dismissed the banner, show it again after this many ms (so they can see it on later visits). */
const DISMISS_TTL_MS = 30 * 60 * 1000; // 30 minutes

type BreakingItem = {
  title: string;
  url: string;
  time: string;
  source: string;
  sentiment: string;
};

const POLL_MS = 5 * 60 * 1000; // 5 minutes

function getDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = sessionStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return true; // legacy "1" value
    return Date.now() - ts < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

function setDismissedStorage() {
  try {
    sessionStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {}
}

/** Format API time (e.g. 20240315T211811) or ISO string to "9:18:11 PM" */
function formatTime(timeStr: string): string {
  if (!timeStr) return '';
  try {
    let date: Date;
    if (/^\d{8}T\d{6}$/.test(timeStr)) {
      const y = timeStr.slice(0, 4);
      const m = timeStr.slice(4, 6);
      const d = timeStr.slice(6, 8);
      const h = timeStr.slice(9, 11);
      const min = timeStr.slice(11, 13);
      const s = timeStr.slice(13, 15);
      date = new Date(`${y}-${m}-${d}T${h}:${min}:${s}Z`);
    } else {
      date = new Date(timeStr);
    }
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
  } catch {
    return '';
  }
}

export default function BreakingNewsAlert() {
  const [items, setItems] = useState<BreakingItem[]>([]);
  const [dismissed, setDismissed] = useState(() => getDismissed());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = () => {
      fetch('/api/breaking-news', { cache: 'no-store' })
        .then((r) => r.json())
        .then((data) => {
          const list = Array.isArray(data.items) ? data.items : [];
          setItems(list);
        })
        .catch(() => {
          // If API fails, show a single fallback so the banner still appears
          setItems([
            { title: 'Latest market news', url: 'https://finance.yahoo.com/news/', time: '', source: '', sentiment: '' },
          ]);
        })
        .finally(() => setLoading(false));
    };

    fetchNews();
    const t = setInterval(fetchNews, POLL_MS);
    return () => clearInterval(t);
  }, []);

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDismissedStorage();
    setDismissed(true);
  };

  const latest = items[0];
  if (loading || !latest?.title || dismissed) return null;

  const timeDisplay = formatTime(latest.time) || new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
  const headline = latest.title.trim().toUpperCase();

  return (
    <div
      className="fixed bottom-0 right-0 z-[100] flex items-center bg-red-600 text-white shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-full"
      aria-live="polite"
      style={{ minHeight: '44px' }}
    >
      <div className="flex items-center gap-3 px-4 py-2.5 max-w-2xl min-w-0">
        <span className="flex-shrink-0 text-sm font-medium tabular-nums whitespace-nowrap">
          {timeDisplay}
        </span>
        <span className="flex-shrink-0 text-white/80">|</span>
        {latest.url ? (
          <a
            href={latest.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-0 text-sm font-semibold text-white hover:underline truncate sm:whitespace-normal sm:line-clamp-2"
            title={latest.title}
          >
            {headline}
          </a>
        ) : (
          <span className="flex-1 min-w-0 text-sm font-semibold truncate sm:whitespace-normal sm:line-clamp-2">
            {headline}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className="flex-shrink-0 p-2.5 text-white hover:bg-red-700 transition-colors cursor-pointer touch-manipulation select-none"
        aria-label="Dismiss"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
