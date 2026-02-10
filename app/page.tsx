'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from './components/Navigation';
import MarketTicker from './components/MarketTicker';
import VideoCard from './components/VideoCard';
import ScrollButton from './components/ScrollButton';
import SpotlightCall from './components/SpotlightCall';
import ScrollFade from './components/ScrollFade';
import ProfilePicture from './components/ProfilePicture';
import CursorGlow from './components/CursorGlow';
import CursorHover from './components/CursorHover';
import DiscordSign from './components/DiscordSign';
import { researchArticles, generateSlug } from '../data/research';
import StructuredData from './components/StructuredData';

export default function Home() {
  const router = useRouter();
  const [researchOpacity, setResearchOpacity] = useState(0);

  // Get the latest article from research data
  const latestArticle = researchArticles[0] || null;

  const handleLatestArticleClick = () => {
    // Check if user is logged in via cookie
    const match = document.cookie.match(/(^| )user_email=([^;]+)/);
    const isLoggedIn = !!match;
    const slug = latestArticle?.slug || generateSlug(latestArticle?.title || '');
    const reportPath = `/research/${slug}`;

    if (isLoggedIn) {
      router.push(reportPath);
    } else {
      router.push(`/signup?redirect=${encodeURIComponent(reportPath)}`);
    }
  };

  // Featured research calls – Seeking Alpha articles + key performance
  const featuredCalls = [
    {
      badge: 'Equity · Bull case',
      title: 'RKLB: Space Pioneer at a Discount',
      highlight: 'Called discount buying opportunity at $16–18 (Mar 2025). Price now ~$72.',
      description:
        'Made the cautious case for Rocket Lab as a long-term opportunity when the stock traded in the $16–18 range. Strong revenue growth and positioning in launch and space systems supported the thesis. Current price reflects significant upside from the identified entry zone.',
      linkUrl: 'https://seekingalpha.com/article/4764746-space-pioneer-at-a-discount-the-cautious-case-for-rocket-lab-now',
      linkLabel: 'View report on Seeking Alpha',
      imageSrc: '/rklb-chart.png',
      imageAlt: 'RKLB 1-year price chart',
    },
    {
      badge: 'Crypto · Bear case',
      title: 'Why Trumpcoin Could Hurt Solana',
      highlight: 'Called for caution / sell around $242. SOL later declined to ~$86.',
      description:
        'Outlined risks to Solana from political-narrative-driven flows and valuation. The call highlighted downside risk from stretched positioning. Price has since retraced substantially from the levels discussed, validating the risk-aware view.',
      linkUrl: 'https://seekingalpha.com/article/4751094-why-trumpcoin-could-hurt-solana',
      linkLabel: 'View report on Seeking Alpha',
      imageSrc: '/sol-chart.jpg',
      imageAlt: 'SOL-USD 5-year price chart',
    },
    {
      badge: 'Markets · Video',
      title: 'Tech Local Tops — Jan 28 Call',
      highlight: 'Flagged potential local tops in tech. Market corrected ~5–6% shortly after.',
      description:
        'Video on X discussed the potential for near-term local tops in technology and related markets. The broad tech complex subsequently saw a roughly 5–6% correction, aligning with the risk-off framing shared in the update.',
      linkUrl: 'https://x.com/noticetrades/status/2016567117659734475',
      linkLabel: 'Watch on X',
      imageSrc: '/x-post.png',
      imageAlt: 'X post — Tech local tops Jan 28',
    },
  ];

  // Add your videos here
  // You can use either:
  // - YouTube watch URLs: 'https://www.youtube.com/watch?v=VIDEO_ID' or 'https://youtu.be/VIDEO_ID'
  // - YouTube embed URLs: 'https://www.youtube.com/embed/VIDEO_ID'
  // - Vimeo embed URLs: 'https://player.vimeo.com/video/VIDEO_ID'
  // Thumbnails are optional - YouTube thumbnails will be auto-generated if not provided
  const videos = [
    {
      title: 'How to Use Market Structure (For Beginners)',
      description:
        'This presentation covers how you can use market structure within your trading framework. It is IMPORTANT to note that this will NOT make you profitable but will serve as a guide to support your trading.',
      videoUrl: 'https://www.youtube.com/watch?v=N4WGsdHnDNI&t=345s',
      thumbnailUrl: '', // Optional: Custom thumbnail URL. Leave empty for auto-generated YouTube thumbnail
      date: 'Dec 2024',
      duration: '', // Optional: Video duration
    },
    {
      title: 'Understanding The Swing Failure Pattern (SFP) in Trading',
      description:
        'Learn how to identify and trade the Swing Failure Pattern, a key technical analysis concept for market structure trading.',
      videoUrl: 'https://www.youtube.com/watch?v=e6oCCj-VSR8',
      thumbnailUrl: '',
      date: 'Dec 2023',
      duration: '',
    },
    {
      title: 'Why Most Traders Fail... (The 3 Steps To Success)',
      description:
        'I talk about a topic that isn\'t talked about enough... Why most traders fail.. and I mean why they ACTUALLY fail. It isn\'t the concept you trade.. it\'s how you approach the market, and how you have been skipping 2 steps..',
      videoUrl: 'https://www.youtube.com/watch?v=6tFvBGBFeO8&t=627s',
      thumbnailUrl: '',
      date: 'Sep 2023',
      duration: '',
    },
    // Add more videos by copying the format above
  ];

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const windowHeight = window.innerHeight;
      const researchSection = document.getElementById('research');
      
      if (researchSection) {
        const sectionTop = researchSection.offsetTop;
        const sectionStart = sectionTop - windowHeight * 0.8; // Start fading in before reaching section
        
        if (scrollPosition < sectionStart) {
          setResearchOpacity(0);
        } else if (scrollPosition > sectionTop - windowHeight * 0.3) {
          setResearchOpacity(1);
        } else {
          const fadeRange = windowHeight * 0.5;
          const scrollProgress = scrollPosition - sectionStart;
          const newOpacity = scrollProgress / fadeRange;
          setResearchOpacity(Math.max(0, Math.min(1, newOpacity)));
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial call
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Structured data for SEO
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Primate Trading',
    alternateName: 'Primate Research',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://www.primatetrading.com',
    description: 'Real-time market analysis, weekly research reports, and trading insights across equities, crypto, and macroeconomic trends.',
    sameAs: [
      // Add your social media links here when available
      // 'https://twitter.com/primatetrading',
      // 'https://linkedin.com/company/primatetrading',
    ],
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Primate Trading',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://www.primatetrading.com',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.primatetrading.com'}/research?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <div className="min-h-screen bg-black dark:bg-zinc-950 relative">
      <StructuredData data={organizationSchema} />
      <StructuredData data={websiteSchema} />
      <CursorGlow />
      <CursorHover />
      <DiscordSign />
      <ScrollFade />
      <Navigation />
      <div className="fixed top-[72px] left-0 right-0 z-40">
        <MarketTicker />
      </div>
      
      {/* Hero Section */}
      <section
        id="home"
        className="pt-44 pb-24 px-6 relative overflow-hidden min-h-[80vh] flex items-center"
      >
        <div className="max-w-7xl mx-auto relative z-10 w-full">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-black dark:text-zinc-50 mb-6 leading-tight">
              Edge Through the Regime
            </h1>
            <p className="text-xl md:text-2xl text-zinc-700 dark:text-zinc-300 mb-8 leading-relaxed max-w-3xl mx-auto">
              Real-time market analysis, comprehensive research, and video insights across equities, crypto, and macro markets. Built for traders and investors who demand clarity.
            </p>
            <div className="flex flex-wrap gap-4 mb-8 justify-center">
              <ScrollButton targetId="research" variant="primary">
                View Research
              </ScrollButton>
              <ScrollButton targetId="videos" variant="secondary">
                Watch Videos
              </ScrollButton>
            </div>
            
          </div>
        </div>
      </section>

      {/* Latest Article Section */}
      {latestArticle && (
        <section className="px-6 -mt-12 pb-12 relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="relative group">
              {/* Glow effect behind the card */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600/20 via-blue-500/10 to-blue-600/20 rounded-2xl blur-lg opacity-60 group-hover:opacity-100 transition-opacity duration-500" />

              <div
                onClick={handleLatestArticleClick}
                className="relative bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 md:p-8 cursor-pointer hover:border-zinc-700 transition-all duration-300 backdrop-blur-sm"
              >
                {/* Top row: badge + date */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-bold uppercase tracking-wider text-blue-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                      Latest Report
                    </span>
                    <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      {latestArticle.category}
                    </span>
                  </div>
                  {latestArticle.date && (
                    <span className="text-xs text-zinc-500 font-medium hidden sm:block">
                      {latestArticle.date}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-xl md:text-2xl font-bold text-zinc-50 mb-3 group-hover:text-blue-400 transition-colors duration-300">
                  {latestArticle.title}
                </h3>

                {/* Description */}
                <p className="text-sm md:text-base text-zinc-400 leading-relaxed mb-5 line-clamp-3">
                  {latestArticle.description}
                </p>

                {/* Tags */}
                {latestArticle.tags && latestArticle.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-5">
                    {latestArticle.tags.slice(0, 6).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700/50"
                      >
                        {tag}
                      </span>
                    ))}
                    {latestArticle.tags.length > 6 && (
                      <span className="px-2 py-0.5 text-[11px] font-medium text-zinc-500">
                        +{latestArticle.tags.length - 6} more
                      </span>
                    )}
                  </div>
                )}

                {/* CTA */}
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-blue-400 group-hover:text-blue-300 transition-colors">
                    Read Full Report
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </span>
                  <span className="text-[11px] text-zinc-600 hidden sm:block">
                    Free account required
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Featured calls / Research Section */}
      <section
        id="research"
        className="py-24 px-6 bg-black dark:bg-zinc-950 relative transition-opacity duration-700"
        style={{ opacity: researchOpacity }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="mb-16">
            <h2 className="text-5xl font-bold text-black dark:text-zinc-50 mb-4">
              Featured Research
            </h2>
            <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-3xl">
              Select published calls and video updates across equities, crypto, and markets—with key outcomes and links to full reports.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {featuredCalls.map((call, index) => (
              <SpotlightCall key={index} {...call} />
            ))}
          </div>
        </div>
      </section>

      {/* Videos Section */}
      <section
        id="videos"
        className="py-24 px-6 bg-black dark:bg-zinc-950"
      >
        <div className="max-w-7xl mx-auto">
          <div className="mb-16">
            <h2 className="text-5xl font-bold text-black dark:text-zinc-50 mb-4">
              Market Videos
            </h2>
            <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-3xl">
              Real-time market commentary and analysis. Video content covering
              current market conditions, trends, and investment opportunities.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {videos.map((video, index) => (
              <VideoCard key={index} {...video} />
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section
        id="about"
        className="py-24 px-6 bg-white dark:bg-zinc-950"
      >
        <div className="max-w-5xl mx-auto">
          <h2 className="text-5xl font-bold text-black dark:text-zinc-50 mb-16">
            About
          </h2>
          
          {/* Nick Thomas Section */}
          <div className="mb-20">
            <div className="flex flex-col md:flex-row gap-8 items-start mb-8">
              <ProfilePicture />
              <div className="flex-1">
                <h3 className="text-3xl font-bold text-black dark:text-zinc-50 mb-2">
                  Nick Thomas
                </h3>
                <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-6">
                  Founder, Analyst
                </p>
                <p className="text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
                  Carolinas-based. US Indices & Crypto Speculator. Obsessed with markets in all forms.
                </p>
                <p className="text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed mb-6">
                  Nick is a Market Analyst with experience producing actionable research across crypto, equities, and macro-driven markets. Published contributor for major financial platforms including Benzinga and Seeking Alpha, with a background in fundamental analysis, technical structure, and sentiment evaluation. Proven ability to synthesize complex market data into clear insights for both institutional-style audiences and active market participants.
                </p>
                {/* Social Media Links */}
                <div className="flex flex-wrap gap-3">
                  <a
                    href="https://x.com/noticetrades"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    X
                  </a>
                  <a
                    href="https://www.youtube.com/@noticetrades"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                    YouTube
                  </a>
                  <a
                    href="https://noticetrades.substack.com/?utm_campaign=profile_chips"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V16.5a2.498 2.498 0 0 0 2.498 2.498h14.7a2.498 2.498 0 0 0 2.498-2.498v-5.688H1.46zm16.848 5.688a.833.833 0 0 1-.833.833h-3.748a.833.833 0 0 1-.833-.833v-1.248a.833.833 0 0 1 .833-.833h3.748a.833.833 0 0 1 .833.833v1.248z"/>
                    </svg>
                    Substack
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Primate Trading Mission */}
          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-12">
            <h3 className="text-3xl font-bold text-black dark:text-zinc-50 mb-6">
              The Mission
            </h3>
            <div className="space-y-6">
              <p className="text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed">
                Primate Trading serves as an educational hub designed to help traders and investors understand the current regime in financial markets. Our mission is to provide the knowledge and analytical framework needed to navigate today's complex market landscape—breaking down how markets work, how the machine runs, and what drives price action across equities, crypto, and macro markets.
              </p>
              <p className="text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed">
                Through real-time market analysis, comprehensive research reports, and educational video content, we focus on regime identification, active investing strategies, trade execution, and comprehensive risk management. We bridge the gap between institutional-level research and accessible, practical guidance, helping traders understand not just what's happening in markets, but why it's happening and how to position accordingly. Our goal is to empower active market participants with the clarity, context, and analytical tools needed to make informed decisions and manage risk effectively in any market environment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-zinc-950 dark:bg-black border-t border-zinc-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-zinc-400 dark:text-zinc-500 text-sm">
              © {new Date().getFullYear()} Primate Trading. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm">
              <a
                href="/privacy"
                className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-300 dark:hover:text-zinc-400 transition-colors"
              >
                Privacy Policy
              </a>
              <a
                href="/terms"
                className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-300 dark:hover:text-zinc-400 transition-colors"
              >
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
