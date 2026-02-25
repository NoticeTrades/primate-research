'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { getArticleBySlug } from '../../../data/research';
import Navigation from '../../components/Navigation';
import MarketTicker from '../../components/MarketTicker';
import StructuredData from '../../components/StructuredData';
import ResearchComments from '../../components/ResearchComments';

const LIKED_KEY = 'primate-report-liked';

export default function ReportViewer() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const article = getArticleBySlug(slug);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [copyDone, setCopyDone] = useState(false);

  // Load like count and user liked from API; fallback to localStorage for guest "liked" state
  useEffect(() => {
    if (!slug) return;
    fetch(`/api/research/${encodeURIComponent(slug)}/like`)
      .then((res) => (res.ok ? res.json() : {}))
      .then((data: { likeCount?: number; userLiked?: boolean }) => {
        if (typeof data.likeCount === 'number') setLikeCount(data.likeCount);
        if (data.userLiked === true) {
          setLiked(true);
        } else {
          try {
            const raw = typeof window !== 'undefined' ? localStorage.getItem(LIKED_KEY) : null;
            const arr = raw ? (JSON.parse(raw) as string[]) : [];
            setLiked(Array.isArray(arr) && arr.includes(slug));
          } catch {
            setLiked(false);
          }
        }
      })
      .catch(() => {});
  }, [slug]);

  const toggleLike = async () => {
    const res = await fetch(`/api/research/${encodeURIComponent(slug)}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (typeof data.likeCount === 'number') setLikeCount(data.likeCount);
      if (typeof data.userLiked === 'boolean') setLiked(data.userLiked);
      return;
    }
    // Not authenticated: fallback to localStorage only (count won't update)
    try {
      const raw = localStorage.getItem(LIKED_KEY);
      const set = new Set<string>(raw ? JSON.parse(raw) : []);
      if (liked) set.delete(slug);
      else set.add(slug);
      localStorage.setItem(LIKED_KEY, JSON.stringify([...set]));
      setLiked(!liked);
    } catch {
      setLiked(!liked);
    }
  };

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    } catch {
      setCopyDone(false);
    }
  };

  // Close on Escape key (image lightbox and share popup)
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEnlargedImage(null);
        setShareOpen(false);
      }
    };
    if (enlargedImage || shareOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = enlargedImage || shareOpen ? 'hidden' : 'unset';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [enlargedImage, shareOpen]);

  if (!article) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-950 text-zinc-50">
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

  // Structured data for article SEO
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    image: article.sections?.[0]?.images?.[0] ? `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.primatetrading.com'}${article.sections[0].images[0]}` : undefined,
    datePublished: article.date || new Date().toISOString(),
    dateModified: article.date || new Date().toISOString(),
    author: {
      '@type': 'Organization',
      name: 'Primate Trading',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Primate Trading',
      logo: {
        '@type': 'ImageObject',
        url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.primatetrading.com'}/primate-logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.primatetrading.com'}/research/${slug}`,
    },
    keywords: article.tags?.join(', ') || '',
    articleSection: article.category,
  };

  return (
    <div className="min-h-screen bg-black text-zinc-50">
      <StructuredData data={articleSchema} />
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

          {/* ─── Like, Share, Comments ─── */}
          <div className="flex flex-wrap items-center gap-2 mb-10">
            <button
              type="button"
              onClick={toggleLike}
              className={`inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg border transition-colors ${
                liked
                  ? 'bg-red-500/10 border-red-500/40 text-red-400'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-red-400 hover:border-red-500/40 hover:bg-zinc-800'
              }`}
            >
              <svg className="w-4 h-4" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {liked ? 'Liked' : 'Like'}
              {likeCount > 0 && (
                <span className="text-zinc-500 dark:text-zinc-400 tabular-nums">({likeCount})</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-blue-400 hover:border-blue-500/40 hover:bg-zinc-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
            <a
              href="#report-comments"
              className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-blue-400 hover:border-blue-500/40 hover:bg-zinc-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Comments
            </a>
          </div>

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

              {section.blocks ? (
                /* Ordered blocks: text and images interleaved */
                <div className="space-y-6">
                  {section.blocks.map((block, bi) => {
                    if (block.type === 'text') {
                      return (
                        <div key={bi} className="space-y-4">
                          {block.content.split('\n\n').filter(p => p.trim()).map((p, j) => (
                            <p key={j} className="text-base text-zinc-300 leading-relaxed">
                              {p}
                            </p>
                          ))}
                        </div>
                      );
                    }
                    const isRotated = block.imageClassName?.includes('report-failure-swing-rotated');
                    return (
                      <div
                        key={bi}
                        className={`flex flex-wrap gap-4 ${block.imageClassName ?? ''} ${isRotated ? 'flex justify-center my-8' : ''}`}
                      >
                        {block.images.map((img, j) => (
                          <div
                            key={j}
                            onClick={() => setEnlargedImage(img)}
                            className={`relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 cursor-pointer hover:border-zinc-700 transition-colors group ${
                              block.images.length > 1 ? 'flex-1 min-w-0 md:max-w-[calc(50%-0.5rem)]' : 'w-full'
                            } ${isRotated ? 'max-w-2xl mx-auto' : ''}`}
                          >
                            <div className={isRotated ? 'flex justify-center [&>img]:rotate-[-90deg] [&>img]:origin-center' : ''}>
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
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center pointer-events-none">
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900/90 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs text-zinc-300 font-medium">
                                Click to enlarge
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Legacy: content first, then all images */
                <>
                  <div className="space-y-4 mb-6">
                    {section.content.split('\n\n').filter(p => p.trim()).map((p, j) => (
                      <p key={j} className="text-base text-zinc-300 leading-relaxed">
                        {p}
                      </p>
                    ))}
                  </div>
                  {section.images && section.images.length > 0 && (
                    <div className={`grid gap-4 ${section.images.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                      {section.images.map((img, j) => (
                        <div
                          key={j}
                          onClick={() => setEnlargedImage(img)}
                          className="relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 cursor-pointer hover:border-zinc-700 transition-colors group"
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
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900/90 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs text-zinc-300 font-medium">
                              Click to enlarge
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
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

          {/* ─── Comments (scroll target from top button) ─── */}
          <section id="report-comments" className="scroll-mt-32 border-t border-zinc-800 mt-16 pt-10">
            <h2 className="text-xl font-bold text-zinc-50 mb-6">Discussion</h2>
            <ResearchComments articleSlug={slug} />
          </section>

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

      {/* ─── Image Lightbox Modal ─── */}
      {enlargedImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setEnlargedImage(null)}
        >
          {/* Close button */}
          <button
            onClick={() => setEnlargedImage(null)}
            className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-zinc-800 z-10"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Enlarged image */}
          <div
            className="relative max-w-[95vw] max-h-[95vh] w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={enlargedImage}
              alt="Enlarged chart"
              width={1600}
              height={1000}
              className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg"
              unoptimized
              priority
            />
          </div>

          {/* Hint text */}
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-zinc-500">
            Click outside or press ESC to close
          </p>
        </div>
      )}

      {/* ─── Share popup ─── */}
      {shareOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShareOpen(false)}
        >
          <div
            className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-zinc-50 mb-2">Share this report</h3>
            <p className="text-sm text-zinc-400 mb-3">Copy the link to share via email, message, or anywhere else.</p>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm font-mono truncate"
              />
              <button
                type="button"
                onClick={copyLink}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium whitespace-nowrap transition-colors"
              >
                {copyDone ? 'Copied!' : 'Copy link'}
              </button>
            </div>
            <a
              href={`mailto:?subject=${encodeURIComponent(article?.title ?? 'Report')}&body=${encodeURIComponent(shareUrl)}`}
              className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Share via email
            </a>
            <button
              type="button"
              onClick={() => setShareOpen(false)}
              className="mt-4 w-full py-2 rounded-lg border border-zinc-600 text-zinc-300 hover:bg-zinc-800 transition-colors text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
