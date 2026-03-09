'use client';

import { useState, useEffect } from 'react';

const DISMISS_KEY = 'breaking-news-dismissed';

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
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

function setDismissedStorage() {
  try {
    sessionStorage.setItem(DISMISS_KEY, '1');
  } catch {}
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
          setItems(Array.isArray(data.items) ? data.items : []);
        })
        .catch(() => setItems([]))
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

  const isNegative = latest.sentiment?.toLowerCase() === 'negative' || latest.sentiment?.toLowerCase() === 'somewhat_negative';

  return (
    <div
      className="fixed bottom-6 right-6 z-[100] max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-300"
      aria-live="polite"
    >
      <div
        className={`rounded-xl border shadow-xl overflow-hidden ${
          isNegative
            ? 'bg-red-950/95 border-red-800/60'
            : 'bg-zinc-900/95 border-zinc-700/80'
        }`}
      >
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-zinc-700/50">
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
              isNegative
                ? 'bg-red-900/80 text-red-200 border border-red-700/50'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-600'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isNegative ? 'bg-red-400 animate-pulse' : 'bg-amber-400'}`} />
            Breaking
          </span>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-2 -m-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700/80 active:bg-zinc-600 transition-colors cursor-pointer touch-manipulation select-none"
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-3">
          {latest.url ? (
            <a
              href={latest.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`block text-sm font-medium leading-snug hover:underline ${
                isNegative ? 'text-red-100' : 'text-zinc-200'
              }`}
            >
              {latest.title}
            </a>
          ) : (
            <p className={`text-sm font-medium leading-snug ${isNegative ? 'text-red-100' : 'text-zinc-200'}`}>
              {latest.title}
            </p>
          )}
          {latest.source && (
            <p className="mt-1 text-[10px] text-zinc-500 uppercase tracking-wider">{latest.source}</p>
          )}
        </div>
      </div>
    </div>
  );
}
