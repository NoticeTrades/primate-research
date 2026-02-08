'use client';

import { useState } from 'react';

interface VideoCardProps {
  title: string;
  description: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  date?: string;
  duration?: string;
  viewCount?: number | null;
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
  thumbnailUrl,
  date,
  duration,
  viewCount,
}: VideoCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  // Convert YouTube URL to embed format if needed
  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    
    // If already an embed URL, return as is
    if (url.includes('/embed/')) {
      return url.includes('?') ? `${url}&autoplay=1` : `${url}?autoplay=1`;
    }
    
    // Convert YouTube watch URL to embed URL
    const youtubeWatchRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
    const match = url.match(youtubeWatchRegex);
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}?autoplay=1`;
    }
    
    // If it's already an embed URL or other format, add autoplay
    return url.includes('?') ? `${url}&autoplay=1` : `${url}?autoplay=1`;
  };

  // Get YouTube thumbnail if no thumbnail provided
  const getThumbnailUrl = () => {
    if (thumbnailUrl) return thumbnailUrl;
    
    if (videoUrl) {
      const youtubeWatchRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
      const match = videoUrl.match(youtubeWatchRegex);
      if (match) {
        return `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`;
      }
    }
    
    return '';
  };

  return (
    <div className="group bg-white dark:bg-zinc-900 rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-zinc-200 dark:border-zinc-800">
      <div className="relative aspect-video bg-zinc-100 dark:bg-zinc-800">
        {videoUrl && isPlaying ? (
          <iframe
            src={getEmbedUrl(videoUrl)}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={title}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {getThumbnailUrl() ? (
              <img
                src={getThumbnailUrl()}
                alt={title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-zinc-400 dark:text-zinc-600">
                <svg
                  className="w-16 h-16"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
              </div>
            )}
            {videoUrl && (
              <button
                onClick={() => setIsPlaying(true)}
                className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/50 transition-colors group-hover:scale-110"
                suppressHydrationWarning
              >
                <div className="w-16 h-16 bg-white/90 dark:bg-zinc-800/90 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-black dark:text-white ml-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                </div>
              </button>
            )}
          </div>
        )}
        {duration && !isPlaying && (
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
            {duration}
          </div>
        )}
      </div>
      <div className="p-5">
        <h3 className="text-lg font-semibold text-black dark:text-zinc-50 group-hover:text-blue-600 dark:group-hover:text-blue-500 transition-colors mb-2 line-clamp-2">
          {title}
        </h3>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400 mb-2">
          {date && <span>{date}</span>}
          {viewCount != null && viewCount > 0 && (
            <span>{formatViews(viewCount)}</span>
          )}
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
          {description}
        </p>
      </div>
    </div>
  );
}
