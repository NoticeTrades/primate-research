'use client';

import { useState, useEffect, useRef } from 'react';

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
  onShowComments?: () => void;
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
  onShowComments,
}: VideoCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false); // Track if video has been loaded/started
  const [isLoading, setIsLoading] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false); // Track when video is buffering
  const [loadProgress, setLoadProgress] = useState(0); // Track loading progress
  const [currentViewCount, setCurrentViewCount] = useState<number | null>(viewCount ?? null);
  const [hasTrackedView, setHasTrackedView] = useState(false);
  const [isTrackingView, setIsTrackingView] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [userLiked, setUserLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  // Truncate description if it's longer than 50 words
  const WORD_LIMIT = 50;
  const words = description ? description.split(/\s+/) : [];
  const shouldTruncate = words.length > WORD_LIMIT;
  const truncatedDescription = shouldTruncate 
    ? words.slice(0, WORD_LIMIT).join(' ') + '...'
    : description;
  const displayDescription = isDescriptionExpanded ? description : truncatedDescription;

  // Check authentication and load initial data
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/check');
        const data = await res.json();
        setIsAuthenticated(data.authenticated);
      } catch (error) {
        setIsAuthenticated(false);
      }
    };
    checkAuth();

    // Load likes and save status if video has a database ID
    if (videoDbId && (videoType === 'exclusive' || isExclusive)) {
      loadLikeStatus();
      loadSaveStatus();
      loadCommentCount();
    }

    // Listen for comment updates
    const handleCommentsUpdated = () => {
      if (videoDbId && (videoType === 'exclusive' || isExclusive)) {
        loadCommentCount();
      }
    };
    window.addEventListener('commentsUpdated', handleCommentsUpdated);
    return () => {
      window.removeEventListener('commentsUpdated', handleCommentsUpdated);
    };
  }, [videoDbId, videoType, isExclusive]);

  const loadLikeStatus = async () => {
    if (!videoDbId) return;
    try {
      const res = await fetch(`/api/videos/${videoDbId}/like`);
      if (res.ok) {
        const data = await res.json();
        setLikeCount(data.likeCount || 0);
        setUserLiked(data.userLiked || false);
      }
    } catch (error) {
      console.error('Failed to load like status:', error);
    }
  };

  const loadSaveStatus = async () => {
    if (!videoDbId) return;
    try {
      const res = await fetch(`/api/videos/${videoDbId}/save?videoType=${videoType || 'exclusive'}`);
      if (res.ok) {
        const data = await res.json();
        setSaved(data.saved || false);
      }
    } catch (error) {
      console.error('Failed to load save status:', error);
    }
  };

  const loadCommentCount = async () => {
    if (!videoDbId) return;
    try {
      const res = await fetch(`/api/videos/${videoDbId}/comments?videoType=${videoType || 'exclusive'}`);
      if (res.ok) {
        const data = await res.json();
        setCommentCount(data.comments?.length || 0);
      }
    } catch (error) {
      console.error('Failed to load comment count:', error);
    }
  };

  const handleLike = async () => {
    if (!isAuthenticated || !videoDbId || isLiking) return;
    
    setIsLiking(true);
    try {
      const res = await fetch(`/api/videos/${videoDbId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoType: videoType || 'exclusive' }),
      });
      if (res.ok) {
        const data = await res.json();
        setLikeCount(data.likeCount || 0);
        setUserLiked(data.userLiked || false);
      } else if (res.status === 401) {
        // Redirect to login
        window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleSave = async () => {
    if (!isAuthenticated || !videoDbId || isSaving) return;
    
    setIsSaving(true);
    try {
      const res = await fetch(`/api/videos/${videoDbId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoType: videoType || 'exclusive' }),
      });
      if (res.ok) {
        const data = await res.json();
        setSaved(data.saved || false);
      } else if (res.status === 401) {
        // Redirect to login
        window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      }
    } catch (error) {
      console.error('Failed to toggle save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Track view when exclusive video starts playing (only once per page load)
  const handlePlay = async () => {
    setIsPlaying(true);
    setHasStarted(true); // Mark that video has started
    setIsLoading(false);
    
    // Track view for exclusive videos (only once per page load, prevent duplicate calls)
    if (isExclusive && videoDbId && videoType === 'exclusive' && !hasTrackedView && !isTrackingView) {
      setHasTrackedView(true); // Mark as tracked immediately to prevent duplicate calls
      setIsTrackingView(true); // Prevent concurrent API calls
      
      try {
        const res = await fetch(`/api/videos/${videoDbId}/view`, {
          method: 'POST',
        });
        if (res.ok) {
          const data = await res.json();
          setCurrentViewCount(data.viewCount);
        } else {
          // If API call failed, reset so it can retry
          setHasTrackedView(false);
        }
      } catch (error) {
        console.error('Failed to track video view:', error);
        // Reset on error so it can retry
        setHasTrackedView(false);
      } finally {
        setIsTrackingView(false);
      }
    }
  };
  
  // Handle pause - keep video visible, just pause it
  const handlePause = () => {
    setIsPlaying(false);
    // Don't reset hasStarted - keep video element visible
    // Don't reset hasTrackedView - we want to track once per page load
  };
  
  // Handle when user clicks play button
  const handlePlayClick = () => {
    setIsLoading(true);
    setIsBuffering(true);
    setIsPlaying(true);
    setHasStarted(true);
    
    // Switch to aggressive preloading when user clicks play
    if (videoRef.current && isExclusiveVideo) {
      videoRef.current.preload = 'auto';
      // Force browser to start loading aggressively
      videoRef.current.load();
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

  const showIframe = videoUrl && isYouTube && (isPlaying || hasStarted);
  const showVideo = videoUrl && isExclusiveVideo && (isPlaying || hasStarted); // Keep video visible once started
  const embedUrl = showIframe
    ? getEmbedUrl(videoUrl!, { autoplay: isPlaying, mute: false })
    : '';

  return (
    <div
      className={`group flex flex-col bg-white dark:bg-zinc-900 rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 border relative z-10 ${
        isExclusiveVideo
          ? 'border-blue-500/30 dark:border-blue-500/30 shadow-blue-500/10'
          : 'border-zinc-200 dark:border-zinc-800'
      }`}
    >
      <div className="relative aspect-video bg-zinc-100 dark:bg-zinc-800 shrink-0 overflow-hidden rounded-t-lg">
        {showIframe ? (
          <iframe
            key="play"
            src={embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={title}
          />
        ) : showVideo ? (
          videoError ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 dark:from-zinc-900 dark:to-zinc-950 p-8 text-center">
              <svg className="w-16 h-16 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-400 font-medium mb-2">Video failed to load</p>
              <p className="text-zinc-400 text-sm">Please check your connection or try again later.</p>
            </div>
          ) : (
            <div className="relative w-full h-full">
              {/* Initial loading spinner */}
              {isLoading && !hasStarted && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-white text-sm">Loading video...</p>
                    {loadProgress > 0 && (
                      <p className="text-white/70 text-xs mt-1">{Math.round(loadProgress)}% loaded</p>
                    )}
                  </div>
                </div>
              )}
              {/* Buffering indicator (shows when video is playing but buffering) */}
              {isBuffering && hasStarted && isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-10 pointer-events-none">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 border-3 border-white/80 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-white text-xs">Buffering...</p>
                  </div>
                </div>
              )}
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                autoPlay={isPlaying}
                preload="metadata"
                crossOrigin="anonymous"
                playsInline
                className="w-full h-full"
                onPlay={handlePlay}
                onPause={handlePause}
                onEnded={handlePause}
                onWaiting={() => {
                  // Video is waiting for data (buffering)
                  setIsBuffering(true);
                  if (!hasStarted) {
                    setIsLoading(true);
                  }
                }}
                onCanPlay={() => {
                  // Video can start playing - start playing immediately if user clicked play
                  setIsLoading(false);
                  setIsBuffering(false);
                  setHasStarted(true);
                }}
                onCanPlayThrough={() => {
                  // Video has buffered enough to play through
                  setIsBuffering(false);
                  setIsLoading(false);
                  setHasStarted(true);
                }}
                onPlaying={() => {
                  // Video is actually playing
                  setIsLoading(false);
                  setIsBuffering(false);
                  setHasStarted(true);
                }}
                onProgress={(e) => {
                  // Track loading progress and optimize buffering
                  const video = e.currentTarget;
                  if (video.buffered.length > 0 && video.duration > 0) {
                    const bufferedEnd = video.buffered.end(video.buffered.length - 1);
                    const progress = (bufferedEnd / video.duration) * 100;
                    setLoadProgress(progress);
                    
                    // If we have enough buffered (5%), allow playback
                    if (progress > 5 && !hasStarted && isPlaying) {
                      setIsLoading(false);
                    }
                    
                    // Monitor buffering ahead - if low, switch to aggressive preload
                    if (isPlaying && video.currentTime > 0) {
                      const bufferedAhead = bufferedEnd - video.currentTime;
                      if (bufferedAhead < 5 && video.preload !== 'auto') {
                        // Less than 5 seconds buffered - switch to aggressive loading
                        video.preload = 'auto';
                      }
                    }
                  }
                }}
                onError={(e) => {
                  console.error('Video playback error:', e);
                  setVideoError(true);
                  setIsPlaying(false);
                  setIsLoading(false);
                  setIsBuffering(false);
                }}
                onLoadedData={() => {
                  setVideoError(false);
                  setIsLoading(false);
                  setHasStarted(true);
                }}
                onLoadStart={() => {
                  setVideoError(false);
                  setIsLoading(true);
                  setIsBuffering(true);
                  setLoadProgress(0);
                }}
                onLoadedMetadata={() => {
                  // Metadata loaded - video is ready to start buffering
                  setIsLoading(false);
                }}
              >
                <source src={videoUrl} type="video/mp4" />
                <source src={videoUrl} type="video/webm" />
                Your browser does not support the video tag.
              </video>
            </div>
          )
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
                    onClick={handlePlayClick}
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
                onClick={handlePlayClick}
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
      </div>
      <div className="p-5 flex flex-col flex-1 min-h-0 border-t border-zinc-100 dark:border-zinc-800 relative z-20 bg-white dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-lg font-semibold text-black dark:text-zinc-50 group-hover:text-blue-600 dark:group-hover:text-blue-500 transition-colors flex-1">
            {title}
          </h3>
          <div className="flex items-center gap-2 shrink-0">
            {isYouTube && (
              <span className="px-2 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded whitespace-nowrap flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                YouTube
              </span>
            )}
            {isExclusiveVideo && (
              <span className="px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded whitespace-nowrap">
                EXCLUSIVE
              </span>
            )}
          </div>
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
            {displayDescription ?? 'No description.'}
          </p>
          {shouldTruncate && (
            <button
              onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
              className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              {isDescriptionExpanded ? 'Read less' : 'Read more'}
            </button>
          )}
        </div>
        
        {/* Like, Save, and Comment buttons */}
        {videoDbId && (videoType === 'exclusive' || isExclusive) && (
          <div className="flex items-center gap-4 pt-4 mt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              onClick={handleLike}
              disabled={!isAuthenticated || isLiking}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                userLiked
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              } ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              title={!isAuthenticated ? 'Sign in to like' : userLiked ? 'Unlike' : 'Like'}
            >
              <svg
                className={`w-5 h-5 ${userLiked ? 'fill-current' : ''}`}
                fill={userLiked ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              <span className="text-sm font-medium">{likeCount}</span>
            </button>

            <button
              onClick={handleSave}
              disabled={!isAuthenticated || isSaving}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                saved
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              } ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              title={!isAuthenticated ? 'Sign in to save' : saved ? 'Unsave' : 'Save video'}
            >
              <svg
                className={`w-5 h-5 ${saved ? 'fill-current' : ''}`}
                fill={saved ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
              <span className="text-sm font-medium">{saved ? 'Saved' : 'Save'}</span>
            </button>

            {onShowComments && (
              <button
                onClick={onShowComments}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <span className="text-sm font-medium">
                  {commentCount > 0 ? `${commentCount} ${commentCount === 1 ? 'comment' : 'comments'}` : 'Comment'}
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
