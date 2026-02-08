'use client';

import Navigation from '../components/Navigation';
import CursorGlow from '../components/CursorGlow';
import CursorHover from '../components/CursorHover';
import DiscordSign from '../components/DiscordSign';
import ScrollFade from '../components/ScrollFade';
import MarketTicker from '../components/MarketTicker';
import ResearchCard from '../components/ResearchCard';

export default function ResearchPage() {
  // TEMPORARY: Auth disabled for deployment
  // TODO: Enable authentication with database/auth service
  const isAuthenticated = true; // Set to false to require login

  // Sample research data - replace with your actual content
  const researchReports = [
    {
      title: 'Equity Market Analysis: Tech Sector Q4 2024',
      description:
        'Comprehensive analysis of technology sector performance, valuation metrics, and forward-looking trends in the fourth quarter of 2024.',
      category: 'Equity Analysis',
      date: 'Dec 2024',
      pdfUrl: '#',
      tags: ['Technology', 'Valuation', 'Q4 2024'],
    },
    {
      title: 'Macroeconomic Outlook: Interest Rate Environment',
      description:
        'Deep dive into current interest rate policies, their impact on markets, and strategic positioning recommendations.',
      category: 'Macro Strategy',
      date: 'Nov 2024',
      pdfUrl: '#',
      tags: ['Interest Rates', 'Monetary Policy', 'Macro'],
    },
    {
      title: 'Cryptoasset Research: Layer 2 Scaling Solutions',
      description:
        'Analysis of Layer 2 blockchain solutions, their token economics, and investment thesis for the evolving crypto landscape.',
      category: 'Crypto Research',
      date: 'Oct 2024',
      pdfUrl: '#',
      tags: ['Blockchain', 'Layer 2', 'Tokenomics'],
    },
  ];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-white text-xl">Please log in to access research reports.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black dark:bg-zinc-950 relative">
      <CursorGlow />
      <CursorHover />
      <DiscordSign />
      <ScrollFade />
      <Navigation />
      <div className="fixed top-[72px] left-0 right-0 z-40">
        <MarketTicker />
      </div>

      <div className="pt-32 pb-24 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-black dark:text-zinc-50 mb-4">
              Research Reports
            </h1>
            <p className="text-lg text-zinc-700 dark:text-zinc-300">
              Comprehensive market analysis and research reports
            </p>
          </div>

          {/* Research Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {researchReports.map((report, index) => (
              <ResearchCard key={index} {...report} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
