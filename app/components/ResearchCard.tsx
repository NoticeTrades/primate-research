'use client';

import { useRouter } from 'next/navigation';
import { generateSlug } from '../../data/research';

interface ResearchCardProps {
  title: string;
  description: string;
  content?: string;
  category: string;
  date?: string;
  dateRange?: string;
  pdfUrl?: string;
  slug?: string;
  tags?: string[];
}

export default function ResearchCard({
  title,
  description,
  category,
  date,
  dateRange,
  slug,
  tags,
}: ResearchCardProps) {
  const router = useRouter();

  const handleViewReport = () => {
    const articleSlug = slug || generateSlug(title);
    router.push(`/research/${articleSlug}`);
  };

  return (
    <div className="group bg-white dark:bg-zinc-900 rounded-lg p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400">
          {category}
        </span>
        {date && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {date}
          </span>
        )}
      </div>
      <h3 className="text-xl font-semibold text-black dark:text-zinc-50 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-500 transition-colors">
        {title}
      </h3>
      {dateRange && (
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-2">
          {dateRange}
        </p>
      )}
      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4 line-clamp-3">
        {description}
      </p>
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map((tag, index) => (
            <span
              key={index}
              className="text-xs px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      <button
        onClick={handleViewReport}
        className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
        suppressHydrationWarning
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
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        View Report
      </button>
    </div>
  );
}
