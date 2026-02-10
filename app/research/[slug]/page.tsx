'use client';

import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { getArticleBySlug } from '../../../data/research';
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

  const hasSections = article.sections && article.sections.length > 0;

  return (
    <div className="min-h-screen bg-black text-zinc-50">
      <Navigation />
      <div className="fixed top-[72px] left-0 right-0 z-40">
        <MarketTicker />
      </div>

      <article className="pt-44 pb-24 px-6">
        <div className="max-w-4xl mx-auto">
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

          {/* ─── Header ─── */}
          <header className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-medium px-3 py-1 rounded-full bg-blue-900/40 text-blue-400">
                {article.category}
              </span>
              {article.date && (
                <span className="text-xs text-zinc-500">{article.date}</span>
              )}
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-zinc-50 leading-tight mb-3">
              {article.title}
            </h1>
            {article.dateRange && (
              <p className="text-sm text-zinc-500 mb-4">{article.dateRange}</p>
            )}
            {article.tags && article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
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

          <div className="border-t border-zinc-800 mb-10" />

          {/* ─── Markets Covered ─── */}
          {hasSections && (
            <div className="mb-10">
              <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">Markets</h2>
              <div className="flex flex-wrap gap-2">
                {article.sections!.map((s, i) => (
                  <a
                    key={i}
                    href={`#section-${i}`}
                    className="text-sm px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-blue-400 hover:border-blue-500/30 transition-colors"
                  >
                    {s.title}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* ─── Intro Commentary ─── */}
          {article.intro && (
            <div className="mb-10">
              {article.intro.split('\n\n').filter(p => p.trim()).map((p, i) => (
                <p key={i} className="text-base text-zinc-300 leading-relaxed mb-4 last:mb-0">
                  {p}
                </p>
              ))}
            </div>
          )}

          {/* ─── News Events Table ─── */}
          {article.newsEvents && article.newsEvents.length > 0 && (
            <div className="mb-12">
              <h2 className="text-lg font-bold text-zinc-100 mb-4">News Events</h2>
              <div className="rounded-xl border border-zinc-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-zinc-900 border-b border-zinc-800 text-zinc-400">
                        <th className="text-left px-4 py-3 font-medium whitespace-nowrap">Day</th>
                        <th className="text-left px-4 py-3 font-medium whitespace-nowrap">Time</th>
                        <th className="text-left px-4 py-3 font-medium">Event</th>
                        <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Forecast</th>
                        <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Previous</th>
                      </tr>
                    </thead>
                    <tbody>
                      {article.newsEvents.map((event, i) => (
                        <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors">
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <span className="text-zinc-300 font-medium">{event.day}</span>
                            <span className="text-zinc-600 text-xs ml-1">{event.date}</span>
                          </td>
                          <td className="px-4 py-2.5 text-zinc-400 whitespace-nowrap">{event.time}</td>
                          <td className="px-4 py-2.5 text-zinc-200">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">{event.currency}</span>
                              {event.event}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right text-zinc-300 font-mono text-xs">{event.forecast || '—'}</td>
                          <td className="px-4 py-2.5 text-right text-zinc-500 font-mono text-xs">{event.previous || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── Sections with Charts ─── */}
          {hasSections && article.sections!.map((section, i) => (
            <section key={i} id={`section-${i}`} className="mb-14 scroll-mt-32">
              {/* Section header */}
              <div className="flex items-baseline gap-3 mb-2">
                <h2 className="text-2xl font-bold text-zinc-50">{section.title}</h2>
                {section.subtitle && (
                  <span className="text-sm text-zinc-500 font-medium">{section.subtitle}</span>
                )}
              </div>
              <div className="w-12 h-0.5 bg-blue-500/50 rounded-full mb-6" />

              {/* Chart images */}
              {section.images && section.images.length > 0 && (
                <div className={`grid gap-4 mb-6 ${section.images.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                  {section.images.map((img, j) => (
                    <div
                      key={j}
                      className="relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900"
                    >
                      <Image
                        src={img}
                        alt={`${section.title} chart ${j + 1}`}
                        width={800}
                        height={500}
                        className="w-full h-auto"
                        style={{ objectFit: 'contain' }}
                        unoptimized
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Commentary */}
              <div className="space-y-4">
                {section.content.split('\n\n').filter(p => p.trim()).map((p, j) => (
                  <p key={j} className="text-base text-zinc-300 leading-relaxed">
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}

          {/* ─── Fallback: plain content if no sections ─── */}
          {!hasSections && article.content && (
            <div className="space-y-6">
              {article.content.split('\n\n').filter(p => p.trim()).map((p, i) => (
                <p key={i} className="text-base text-zinc-300 leading-relaxed">{p}</p>
              ))}
            </div>
          )}

          {/* ─── Footer ─── */}
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
