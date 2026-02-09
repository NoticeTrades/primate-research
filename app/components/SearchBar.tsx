'use client';

import { useState } from 'react';

interface Article {
  id: string;
  title: string;
  content: string;
  date: string;
  category: string;
}

interface SearchBarProps {
  articles?: Article[];
  onSearch?: (results: Article[]) => void;
}

export default function SearchBar({ articles = [], onSearch }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<Article[]>([]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      if (onSearch) onSearch([]);
      return;
    }

    // Simple keyword search - will be enhanced when articles are uploaded
    const searchResults = articles.filter((article) => {
      const searchLower = query.toLowerCase();
      return (
        article.title.toLowerCase().includes(searchLower) ||
        article.content.toLowerCase().includes(searchLower) ||
        article.category.toLowerCase().includes(searchLower)
      );
    });

    setResults(searchResults);
    setIsOpen(searchResults.length > 0);
    if (onSearch) onSearch(searchResults);
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="Search articles..."
          className="w-full px-4 py-2 pl-10 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-black dark:text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          suppressHydrationWarning
        />
        <svg
          className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400"
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

      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {results.map((article) => (
            <button
              key={article.id}
              onClick={() => {
                setIsOpen(false);
                // Navigate to article or scroll to it
                const element = document.getElementById(`article-${article.id}`);
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="w-full text-left px-4 py-3 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors border-b border-zinc-200 dark:border-zinc-700 last:border-b-0"
              suppressHydrationWarning
            >
              <div className="font-medium text-black dark:text-zinc-50 text-sm">
                {article.title}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {article.category} • {article.date}
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && searchQuery && results.length === 0 && (
        <div className="absolute top-full mt-2 w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-lg z-50 p-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No articles found matching "{searchQuery}"
        </div>
      )}
    </div>
  );
}
