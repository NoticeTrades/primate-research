'use client';

import { useMemo, useState, useEffect } from 'react';
import Navigation from '../components/Navigation';
import CursorGlow from '../components/CursorGlow';
import CursorHover from '../components/CursorHover';
import DiscordSign from '../components/DiscordSign';
import ScrollFade from '../components/ScrollFade';
import MarketTicker from '../components/MarketTicker';
import VideoCard from '../components/VideoCard';
import { videos as initialVideos, getYouTubeVideoId } from '../../data/videos';
import type { VideoEntry, VideoCategory } from '../../data/videos';
import { useRef } from 'react';

type SortOption = 'newest' | 'oldest' | 'most_views' | 'least_views';

function matchSearch(video: VideoEntry, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase().trim();
  return (
    video.title.toLowerCase().includes(q) ||
    video.description.toLowerCase().includes(q)
  );
}

function parseDate(dateStr: string | undefined): number {
  if (!dateStr) return 0;
  const parts = dateStr.split(' ');
  if (parts.length !== 2) return 0;
  const months: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };
  const month = months[parts[0]];
  const year = parseInt(parts[1], 10);
  if (month == null || isNaN(year)) return 0;
  return year * 12 + month;
}

export default function VideosPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [categoryFilter, setCategoryFilter] = useState<VideoCategory>('all');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [viewCounts, setViewCounts] = useState<Record<string, number | null>>({});
  const [dbVideos, setDbVideos] = useState<VideoEntry[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch videos from database
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await fetch('/api/videos');
        if (res.ok) {
          const data = await res.json();
          setDbVideos(data.videos || []);
        }
      } catch (error) {
        console.error('Failed to fetch videos from database:', error);
      } finally {
        setVideosLoading(false);
      }
    };
    fetchVideos();
  }, []);

  // Combine static videos (from data file) with database videos
  const allVideos = useMemo(() => {
    // Database videos first (newest), then static videos
    return [...dbVideos, ...initialVideos];
  }, [dbVideos]);

  const videoIds = useMemo(
    () =>
      allVideos
        .map((v) => getYouTubeVideoId(v.videoUrl))
        .filter((id): id is string => id != null),
    [allVideos]
  );

  useEffect(() => {
    if (videoIds.length === 0) return;
    
    const fetchViewCounts = async () => {
      try {
        const response = await fetch(`/api/youtube-stats?ids=${videoIds.join(',')}`);
        if (!response.ok) {
          console.warn('Failed to fetch YouTube stats:', response.status);
          return;
        }
        const data: Record<string, number | null> = await response.json();
        setViewCounts(data);
      } catch (error) {
        console.error('Error fetching YouTube view counts:', error);
        // Don't set empty object, keep previous state or set nulls
        setViewCounts((prev) => {
          const newCounts: Record<string, number | null> = {};
          videoIds.forEach((id) => {
            newCounts[id] = prev[id] ?? null;
          });
          return newCounts;
        });
      }
    };
    
    fetchViewCounts();
  }, [videoIds.join(',')]);

  // Close category dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(e.target as Node)
      ) {
        setShowCategoryDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    let result = allVideos.filter((v) => matchSearch(v, searchQuery));
    
    // Apply category filter
    if (categoryFilter !== 'all') {
      result = result.filter((v) => v.category === categoryFilter || !v.category);
    }
    
    return result;
  }, [searchQuery, categoryFilter, allVideos]);

  const sorted = useMemo(() => {
    const withViews = filtered.map((v) => {
      const videoId = getYouTubeVideoId(v.videoUrl);
      return {
        title: v.title,
        description: v.description,
        videoUrl: v.videoUrl,
        videoType: v.videoType,
        thumbnailUrl: v.thumbnailUrl,
        date: v.date,
        duration: v.duration,
        videoId,
        dateNum: parseDate(v.date),
        viewCount: videoId ? (viewCounts[videoId] ?? null) : null,
        isExclusive: v.isExclusive,
      };
    });
    const order = [...withViews];
    if (sortBy === 'newest') {
      order.sort((a, b) => b.dateNum - a.dateNum);
    } else if (sortBy === 'oldest') {
      order.sort((a, b) => a.dateNum - b.dateNum);
    } else if (sortBy === 'most_views') {
      // Sort by view count descending, but put null values at the end
      order.sort((a, b) => {
        if (a.viewCount === null && b.viewCount === null) return 0;
        if (a.viewCount === null) return 1; // null goes to end
        if (b.viewCount === null) return -1; // null goes to end
        return b.viewCount - a.viewCount; // higher views first
      });
    } else if (sortBy === 'least_views') {
      // Sort by view count ascending, but put null values at the end
      order.sort((a, b) => {
        if (a.viewCount === null && b.viewCount === null) return 0;
        if (a.viewCount === null) return 1; // null goes to end
        if (b.viewCount === null) return -1; // null goes to end
        return a.viewCount - b.viewCount; // lower views first
      });
    }
    return order;
  }, [filtered, sortBy, viewCounts]);

  const clearSearch = () => setSearchQuery('');

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 relative">
      <CursorGlow />
      <CursorHover />
      <DiscordSign />
      <ScrollFade />
      <Navigation />
      <div className="fixed top-[72px] left-0 right-0 z-40">
        <MarketTicker />
      </div>

      <div className="pt-32 pb-24 px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header + search */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl md:text-5xl font-bold text-black dark:text-zinc-50">
                The Vault
              </h1>
              <span className="px-3 py-1 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-full">
                EXCLUSIVE
              </span>
            </div>
            <p className="text-lg text-zinc-700 dark:text-zinc-300 mb-6">
              Exclusive video content and educational market analysis
            </p>

            <div className="flex flex-col sm:flex-row gap-4 max-w-4xl">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search videos (e.g. market structure, SFP, traders)..."
                  className="w-full px-4 py-3 pl-11 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-black dark:text-zinc-50 placeholder-zinc-500 dark:placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  suppressHydrationWarning
                />
                <svg
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              
              {/* Category Filter Dropdown */}
              <div
                className="relative pt-2"
                onMouseEnter={() => setShowCategoryDropdown(true)}
                onMouseLeave={() => setShowCategoryDropdown(false)}
                ref={categoryDropdownRef}
              >
                <button
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap"
                  suppressHydrationWarning
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <span>
                    {categoryFilter === 'all'
                      ? 'All Categories'
                      : categoryFilter.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </span>
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${showCategoryDropdown ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showCategoryDropdown && (
                  <div className="absolute top-full left-0 pt-2 w-56 z-50">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
                      <div className="py-1">
                        {(['all', 'market-analysis', 'trading-strategies', 'educational', 'live-trading', 'market-structure', 'risk-management'] as VideoCategory[]).map((cat) => (
                          <button
                            key={cat}
                            onClick={() => {
                              setCategoryFilter(cat);
                              setShowCategoryDropdown(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                              categoryFilter === cat
                                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                                : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                            }`}
                            suppressHydrationWarning
                          >
                            {cat === 'all'
                              ? 'All Categories'
                              : cat.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left sidebar – sort */}
            <aside className="lg:w-52 shrink-0">
              <div className="lg:sticky lg:top-32 space-y-6">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Sort by
                </h2>
                <ul className="space-y-1">
                  {(
                    [
                      { value: 'newest' as const, label: 'Newest first' },
                      { value: 'oldest' as const, label: 'Oldest first' },
                      { value: 'most_views' as const, label: 'Most views' },
                      { value: 'least_views' as const, label: 'Least views' },
                    ] as const
                  ).map(({ value, label }) => (
                    <li key={value}>
                      <button
                        type="button"
                        onClick={() => setSortBy(value)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          sortBy === value
                            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                            : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                        suppressHydrationWarning
                      >
                        {label}
                      </button>
                    </li>
                  ))}
                </ul>
                {searchQuery.trim() && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    suppressHydrationWarning
                  >
                    Clear search
                  </button>
                )}
              </div>
            </aside>

            {/* Video grid */}
            <main className="min-w-0 flex-1">
              {sorted.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {sorted.map((video) => (
                    <VideoCard
                      key={video.videoUrl}
                      title={video.title}
                      description={video.description}
                      videoUrl={video.videoUrl}
                      videoType={video.videoType}
                      thumbnailUrl={video.thumbnailUrl}
                      date={video.date}
                      duration={video.duration}
                      viewCount={video.viewCount}
                      isExclusive={video.isExclusive}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-12 text-center">
                  <p className="text-zinc-600 dark:text-zinc-400 mb-2">
                    No videos match your search.
                  </p>
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    suppressHydrationWarning
                  >
                    Clear search
                  </button>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
