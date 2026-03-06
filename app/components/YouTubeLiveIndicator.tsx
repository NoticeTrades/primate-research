'use client';

import { useState, useEffect } from 'react';

const YOUTUBE_CHANNEL_URL = 'https://www.youtube.com/@noticetrades';

export default function YouTubeLiveIndicator() {
  const [status, setStatus] = useState<{ live: boolean; videoId?: string; title?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLive = async () => {
      try {
        const res = await fetch('/api/youtube-live');
        const data = await res.json();
        setStatus({ live: !!data.live, videoId: data.videoId, title: data.title });
      } catch {
        setStatus({ live: false });
      } finally {
        setLoading(false);
      }
    };

    fetchLive();
    const interval = setInterval(fetchLive, 90 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <a
        href={YOUTUBE_CHANNEL_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800/80 border border-zinc-700 text-zinc-400 text-sm font-medium"
      >
        <span className="w-2 h-2 rounded-full bg-zinc-500 animate-pulse" />
        YouTube
      </a>
    );
  }

  const live = status?.live && status.videoId;
  const href = live ? `https://www.youtube.com/watch?v=${status.videoId}` : YOUTUBE_CHANNEL_URL;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
        live
          ? 'bg-red-600 hover:bg-red-500 text-white border border-red-500 shadow-lg shadow-red-500/20'
          : 'bg-zinc-800/80 border border-zinc-700 text-zinc-500 hover:text-zinc-400'
      }`}
      title={live ? status.title || 'Watch live on YouTube' : 'YouTube channel'}
    >
      {live ? (
        <>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
          </span>
          <span className="animate-pulse">LIVE</span>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
        </>
      ) : (
        <>
          <span className="w-2 h-2 rounded-full bg-zinc-600" />
          Offline
          <svg className="w-4 h-4 opacity-70" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
        </>
      )}
    </a>
  );
}
