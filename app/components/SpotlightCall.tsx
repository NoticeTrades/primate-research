'use client';

interface SpotlightCallProps {
  badge: string;
  title: string;
  highlight: string;
  description: string;
  linkUrl: string;
  linkLabel: string;
  imageSrc?: string;
  imageAlt?: string;
}

export default function SpotlightCall({
  badge,
  title,
  highlight,
  description,
  linkUrl,
  linkLabel,
  imageSrc,
  imageAlt,
}: SpotlightCallProps) {
  return (
    <article className="flex flex-col bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
      {imageSrc && (
        <div className="relative aspect-[16/9] bg-zinc-100 dark:bg-zinc-800 shrink-0">
          <img
            src={imageSrc}
            alt={imageAlt ?? title}
            className="w-full h-full object-cover object-center"
          />
        </div>
      )}
      <div className="p-5 md:p-6 flex flex-col flex-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2">
          {badge}
        </span>
        <h3 className="text-xl font-bold text-black dark:text-zinc-50 mb-2">
          {title}
        </h3>
        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-3">
          {highlight}
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 flex-1">
          {description}
        </p>
        <a
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 mt-4 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
        >
          {linkLabel}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </article>
  );
}
