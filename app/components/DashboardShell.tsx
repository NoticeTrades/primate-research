'use client';

import { useRef } from 'react';
import Navigation from './Navigation';
import CursorGlow from './CursorGlow';
import CursorHover from './CursorHover';
import DiscordSign from './DiscordSign';
import ScrollFade from './ScrollFade';
import MarketTicker from './MarketTicker';
import { DashboardMenuProvider, DashboardNavPanel, useDashboardChromeTop } from './DashboardNavDrawer';

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const chromeRef = useRef<HTMLDivElement>(null);
  const contentTopPx = useDashboardChromeTop(chromeRef);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-blue-950/50 to-zinc-950 relative">
      <CursorGlow />
      <CursorHover />
      <DiscordSign />
      <ScrollFade />
      <Navigation />

      <DashboardMenuProvider contentTopPx={contentTopPx}>
        {/* Full-width ticker only — menu button lives in page content beside the title */}
        <div ref={chromeRef} className="fixed top-[72px] left-0 right-0 z-40">
          <MarketTicker />
        </div>
        <DashboardNavPanel />
        <div
          className="relative z-10 pb-24 px-3 sm:px-4"
          style={{ paddingTop: contentTopPx }}
        >
          {children}
        </div>
      </DashboardMenuProvider>
    </div>
  );
}
