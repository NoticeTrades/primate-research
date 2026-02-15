'use client';

import { Suspense, useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Navigation from '../components/Navigation';
import CursorGlow from '../components/CursorGlow';
import CursorHover from '../components/CursorHover';
import DiscordSign from '../components/DiscordSign';
import MarketTicker from '../components/MarketTicker';
import ResearchCard from '../components/ResearchCard';
import { researchArticles, generateSlug } from '../../data/research';
import type { ResearchArticle } from '../../data/research';

function matchSearch(article: ResearchArticle, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase().trim();
  const inTitle = article.title.toLowerCase().includes(q);
  const inDesc = article.description.toLowerCase().includes(q);
  const inCategory = article.category.toLowerCase().includes(q);
  const inContent = article.content?.toLowerCase().includes(q) ?? false;
  const inTags =
    article.tags?.some((t) => t.toLowerCase().includes(q)) ?? false;
  return inTitle || inDesc || inCategory || inContent || inTags;
}

function matchCategory(article: ResearchArticle, selected: string[]): boolean {
  if (selected.length === 0) return true;
  return selected.includes(article.category);
}

function matchTags(article: ResearchArticle, selected: string[]): boolean {
  if (selected.length === 0) return true;
  if (!article.tags?.length) return false;
  return selected.some((t) => article.tags!.includes(t));
}

export default function ResearchPage() {
  return (
    <Suspense>
      <ResearchPageContent />
    </Suspense>
  );
}

function ResearchPageContent() {
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});

  // Fetch like counts for all reports
  useEffect(() => {
    fetch('/api/research/likes')
      .then((res) => (res.ok ? res.json() : {}))
      .then((counts: Record<string, number>) => setLikeCounts(counts))
      .catch(() => {});
  }, []);

  // Pre-fill search from ?q= query param (e.g. from nav search bar)
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setSearchQuery(q);
    }
  }, [searchParams]);

  const { categories, allTags } = useMemo(() => {
    const cats = Array.from(
      new Set(researchArticles.map((a) => a.category))
    ).sort();
    const tags = Array.from(
      new Set(researchArticles.flatMap((a) => a.tags ?? []))
    ).sort();
    return { categories: cats, allTags: tags };
  }, []);

  const filtered = useMemo(() => {
    return researchArticles.filter(
      (article) =>
        matchSearch(article, searchQuery) &&
        matchCategory(article, selectedCategories) &&
        matchTags(article, selectedTags)
    );
  }, [searchQuery, selectedCategories, selectedTags]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) => {
      const next = prev.includes(cat)
        ? prev.filter((c) => c !== cat)
        : [...prev, cat];
      return next;
    });
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategories([]);
    setSelectedTags([]);
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedCategories.length > 0 ||
    selectedTags.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-950 relative">
      <CursorGlow />
      <CursorHover />
      <DiscordSign />
      <Navigation />
      <div className="fixed top-[72px] left-0 right-0 z-40">
        <MarketTicker />
      </div>

      <div className="pt-44 pb-24 px-4 md:px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          {/* Header + search */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-black dark:text-zinc-50 mb-2">
              Research Reports
            </h1>
            <p className="text-lg text-zinc-700 dark:text-zinc-300 mb-6">
              Comprehensive market analysis and research reports
            </p>

            <div className="relative max-w-2xl">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by keyword (title, description, category, tags)..."
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
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left sidebar – filters */}
            <aside className="lg:w-56 shrink-0">
              <div className="lg:sticky lg:top-32 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Filters
                  </h2>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      suppressHydrationWarning
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {/* Category filter */}
                <div>
                  <h3 className="text-sm font-medium text-black dark:text-zinc-200 mb-3">
                    Category
                  </h3>
                  <ul className="space-y-2">
                    <li>
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={selectedCategories.length === 0}
                          onChange={() => setSelectedCategories([])}
                          className="rounded border-zinc-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500"
                          suppressHydrationWarning
                        />
                        <span className="text-sm text-zinc-700 dark:text-zinc-300 group-hover:text-black dark:group-hover:text-zinc-50">
                          All
                        </span>
                      </label>
                    </li>
                    {categories.map((cat) => (
                      <li key={cat}>
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(cat)}
                            onChange={() => toggleCategory(cat)}
                            className="rounded border-zinc-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500"
                            suppressHydrationWarning
                          />
                          <span className="text-sm text-zinc-700 dark:text-zinc-300 group-hover:text-black dark:group-hover:text-zinc-50">
                            {cat}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Tag filter */}
                {allTags.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-black dark:text-zinc-200 mb-3">
                      Tags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {allTags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            selectedTags.includes(tag)
                              ? 'bg-blue-600 text-white dark:bg-blue-500'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                          }`}
                          suppressHydrationWarning
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </aside>

            {/* Article grid */}
            <main className="min-w-0 flex-1">
              {filtered.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filtered.map((report, index) => {
                    const articleSlug = report.slug || generateSlug(report.title);
                    return (
                      <ResearchCard
                        key={index}
                        {...report}
                        likeCount={likeCounts[articleSlug] ?? 0}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-12 text-center">
                  <p className="text-zinc-600 dark:text-zinc-400 mb-2">
                    No articles match your search or filters.
                  </p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    suppressHydrationWarning
                  >
                    Clear filters and search
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
