'use client';

import { useState } from 'react';

interface VideoCardProps {
  title: string;
  description: string;
  videoUrl?: string;
  videoType?: 'youtube' | 'exclusive' | 'external';
  thumbnailUrl?: string;
  date?: string;
  duration?: string;
  viewCount?: number | null;
  isExclusive?: boolean;
  videoDbId?: number | null;
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K views`;
  return `${n} views`;
}

export default function VideoCard({
  title,
  description,
  videoUrl,
  videoType = 'youtube',
  thumbnailUrl,
  date,
  duration,
  viewCount,
  isExclusive = false,
  videoDbId = null,
}: VideoCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [currentViewCount, setCurrentViewCount] = useState<number | null>(viewCount ?? null);

  // Track view when exclusive video starts playing
  const handlePlay = async () => {
    setIsPlaying(true);
    
    // Track view for exclusive videos
    if (isExclusive && videoDbId && videoType === 'exclusive') {
      try {
        const res = await fetch(`/api/videos/${videoDbId}/view`, {
          method: 'POST',
        });
        if (res.ok) {
          const data = await res.json();
          setCurrentViewCount(data.viewCount);
        }
      } catch (error) {
        console.error('Failed to track video view:', error);
      }
    }
  };

  // Build YouTube embed URL with optional autoplay and mute (mute allows autoplay on hover)
  const getEmbedUrl = (url: string, options: { autoplay?: boolean; mute?: boolean } = {}) => {
    if (!url) return '';
    const { autoplay = true, mute = false } = options;
    const params = new URLSearchParams();
    if (autoplay) params.set('autoplay', '1');
    if (mute) params.set('mute', '1');
    const query = params.toString();

    const youtubeWatchRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
    const embedRegex = /youtube\.com\/embed\/([^&\n?#]+)/;
    let videoId: string | null = null;
    if (url.includes('/embed/')) {
      const m = url.match(embedRegex);
      videoId = m ? m[1] : null;
    } else {
      const m = url.match(youtubeWatchRegex);
      videoId = m ? m[1] : null;
    }
    if (!videoId) return url.includes('?') ? `${url}&${query}` : `${url}?${query}`;
    return `https://www.youtube.com/embed/${videoId}${query ? `?${query}` : ''}`;
  };

  // Get YouTube thumbnail if no thumbnail provided
  const getThumbnailUrl = () => {
    // Return thumbnail if provided and not empty
    if (thumbnailUrl && thumbnailUrl.trim() !== '') return thumbnailUrl;
    
    if (videoUrl) {
      // For YouTube videos, generate thumbnail URL
      const youtubeWatchRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
      const match = videoUrl.match(youtubeWatchRegex);
      if (match) {
        return `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`;
      }
    }
    
    return '';
  };

  const isYouTube = videoType === 'youtube' || (!videoType && videoUrl?.includes('youtube'));
  const isExclusiveVideo = videoType === 'exclusive' || isExclusive;
  const showIframe = videoUrl && isYouTube && (isPlaying || isHovering);
  const showVideo = videoUrl && isExclusiveVideo && isPlaying;
  const embedUrl = showIframe
    ? getEmbedUrl(videoUrl!, { autoplay: true, mute: isHovering && !isPlaying })
    : '';

  return (
    <div
      className={`group flex flex-col bg-white dark:bg-zinc-900 rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 border relative z-10 ${
        isExclusiveVideo
          ? 'border-blue-500/30 dark:border-blue-500/30 shadow-blue-500/10'
          : 'border-zinc-200 dark:border-zinc-800'
      }`}
      onMouseEnter={() => videoUrl && isYouTube && setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="relative aspect-video bg-zinc-100 dark:bg-zinc-800 shrink-0 overflow-hidden rounded-t-lg">
        {showIframe ? (
          <>
            <iframe
              key={isHovering ? 'hover' : 'play'}
              src={embedUrl}
              className={`w-full h-full ${isHovering && !isPlaying ? 'pointer-events-none' : ''}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={title}
            />
            {isHovering && !isPlaying && (
              <button
                type="button"
                className="absolute inset-0 cursor-pointer"
                onClick={() => setIsPlaying(true)}
                aria-label="Play with sound"
              />
            )}
          </>
        ) : showVideo && isExclusiveVideo ? (
          <video
            src={videoUrl}
            controls
            autoPlay
            className="w-full h-full"
            onPlay={handlePlay}
            onPause={() => setIsPlaying(false)}
          >
            Your browser does not support the video tag.
          </video>
        ) : (
          <div className="w-full h-full flex items-center justify-center relative bg-gradient-to-br from-zinc-800 to-zinc-900 dark:from-zinc-900 dark:to-zinc-950">
            {getThumbnailUrl() ? (
              <>
                <img
                  src={getThumbnailUrl()}
                  alt={title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // If thumbnail fails to load, hide it and show placeholder
                    e.currentTarget.style.display = 'none';
                  }}
                />
                {videoUrl && (
                  <button
                    onClick={() => setIsPlaying(true)}
                    className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors"
                    suppressHydrationWarning
                  >
                    <div className={`w-16 h-16 ${isExclusiveVideo ? 'bg-blue-500/90 hover:bg-blue-600/90' : 'bg-white/90 dark:bg-zinc-800/90'} rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110`}>
                      <svg
                        className={`w-8 h-8 ${isExclusiveVideo ? 'text-white' : 'text-black dark:text-white'} ml-1`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                      </svg>
                    </div>
                  </button>
                )}
              </>
            ) : (
              <>
                {/* Placeholder for videos without thumbnails */}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-10">
                  {isExclusiveVideo && (
                    <div className="mb-4 px-3 py-1 text-xs font-bold text-blue-400 bg-blue-500/20 border border-blue-500/30 rounded-full">
                      EXCLUSIVE
                    </div>
                  )}
                  <svg
                    className={`w-20 h-20 mb-3 ${isExclusiveVideo ? 'text-blue-400' : 'text-zinc-400 dark:text-zinc-600'}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                  <p className={`text-sm font-medium ${isExclusiveVideo ? 'text-blue-300' : 'text-zinc-400 dark:text-zinc-500'}`}>
                    {title}
                  </p>
                </div>
            {videoUrl && (
              <button
                onClick={handlePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors z-20"
                suppressHydrationWarning
              >
                    <div className={`w-20 h-20 ${isExclusiveVideo ? 'bg-blue-500/90 hover:bg-blue-600/90' : 'bg-white/90 dark:bg-zinc-800/90'} rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-110`}>
                      <svg
                        className={`w-10 h-10 ${isExclusiveVideo ? 'text-white' : 'text-black dark:text-white'} ml-1`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                      </svg>
                    </div>
                  </button>
                )}
              </>
            )}
          </div>
        )}
        {duration && !showIframe && (
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
            {duration}
          </div>
        )}
        {isHovering && !isPlaying && (
          <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            Muted · click for sound
          </div>
        )}
      </div>
      <div className="p-5 flex flex-col flex-1 min-h-0 border-t border-zinc-100 dark:border-zinc-800 relative z-20 bg-white dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-lg font-semibold text-black dark:text-zinc-50 group-hover:text-blue-600 dark:group-hover:text-blue-500 transition-colors flex-1">
            {title}
          </h3>
          {isExclusiveVideo && (
            <span className="px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded whitespace-nowrap shrink-0">
              EXCLUSIVE
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 text-xs text-zinc-500 dark:text-zinc-400 mb-3">
          {date && <span>{date}</span>}
          {(date && (currentViewCount != null && currentViewCount > 0)) && <span aria-hidden>·</span>}
          {currentViewCount != null && currentViewCount > 0 && <span>{formatViews(currentViewCount)}</span>}
        </div>
        <div className="flex-1 min-h-[60px]">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-500 mb-1.5">
            Description
          </p>
          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line break-words">
            {description ?? 'No description.'}
          </p>
        </div>
      </div>
    </div>
  );
}
