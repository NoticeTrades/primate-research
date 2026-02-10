'use client';

import { useParams, useRouter } from 'next/navigation';
import { getArticleBySlug, generateSlug, researchArticles } from '../../../data/research';
import Navigation from '../../components/Navigation';
import MarketTicker from '../../components/MarketTicker';

export default function ReportViewer() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const article = getArticleBySlug(slug);

  if (!article) {
    return (
      <div className="min-h-screen bg-black text-zinc-50">
        <Navigation />
        <div className="fixed top-[72px] left-0 right-0 z-40">
          <MarketTicker />
        </div>
        <div className="pt-44 px-6 text-center">
          <h1 className="text-3xl font-bold mb-4">Report Not Found</h1>
          <p className="text-zinc-400 mb-8">The report you&apos;re looking for doesn&apos;t exist.</p>
          <button
            onClick={() => router.push('/research')}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            Back to Research
          </button>
        </div>
      </div>
    );
  }

  // Split content into paragraphs for nice formatting
  const paragraphs = article.content
    ? article.content.split('\n\n').filter((p) => p.trim())
    : [];

  return (
    <div className="min-h-screen bg-black text-zinc-50">
      <Navigation />
      <div className="fixed top-[72px] left-0 right-0 z-40">
        <MarketTicker />
      </div>

      <article className="pt-44 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          {/* Back link */}
          <button
            onClick={() => router.push('/research')}
            className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-8"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Research
          </button>

          {/* Header */}
          <header className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-medium px-3 py-1 rounded-full bg-blue-900/40 text-blue-400">
                {article.category}
              </span>
              {article.date && (
                <span className="text-xs text-zinc-500">{article.date}</span>
              )}
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-zinc-50 leading-tight mb-4">
              {article.title}
            </h1>
            {article.dateRange && (
              <p className="text-sm text-zinc-500 mb-4">{article.dateRange}</p>
            )}
            <p className="text-lg text-zinc-400 leading-relaxed">
              {article.description}
            </p>
            {article.tags && article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-5">
                {article.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-xs px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-400 border border-zinc-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          {/* Divider */}
          <div className="border-t border-zinc-800 mb-10" />

          {/* Content */}
          <div className="space-y-6">
            {paragraphs.map((paragraph, i) => {
              // Check if it looks like a section header (short line ending with a descriptor)
              const isHeader = paragraph.length < 120 && (
                paragraph.startsWith('DXY') ||
                paragraph.startsWith('T-Bonds') ||
                paragraph.startsWith('Nasdaq') ||
                paragraph.startsWith('Bitcoin') ||
                paragraph.startsWith('Metals') ||
                paragraph.startsWith('S&P') ||
                paragraph.startsWith('Crude') ||
                paragraph.includes(' - ') && paragraph.indexOf(' - ') < 40
              );

              if (isHeader) {
                const parts = paragraph.split(' - ');
                return (
                  <div key={i} className="pt-4">
                    <h2 className="text-xl font-bold text-zinc-100 mb-2">
                      {parts[0].trim()}
                    </h2>
                    {parts.length > 1 && (
                      <p className="text-base text-zinc-300 leading-relaxed">
                        {parts.slice(1).join(' - ').trim()}
                      </p>
                    )}
                  </div>
                );
              }

              return (
                <p key={i} className="text-base text-zinc-300 leading-relaxed">
                  {paragraph}
                </p>
              );
            })}
          </div>

          {/* Footer */}
          <div className="border-t border-zinc-800 mt-16 pt-8">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-600">
                © Primate Research. This content is exclusive to members and may not be redistributed.
              </p>
              <button
                onClick={() => router.push('/research')}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium"
              >
                More Reports →
              </button>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}

