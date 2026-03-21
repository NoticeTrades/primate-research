'use client';

import { useRef } from 'react';
import Navigation from './Navigation';
import CursorGlow from './CursorGlow';
import CursorHover from './CursorHover';
import DiscordSign from './DiscordSign';
import ScrollFade from './ScrollFade';
import MarketTicker from './MarketTicker';
import {
  DashboardMenuProvider,
  DashboardMenuTrigger,
  DashboardNavPanel,
  useDashboardChromeTop,
} from './DashboardNavDrawer';

/** Space between the scrolling ticker and the main dashboard content */
const MAIN_CONTENT_GAP_PX = 20;

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const chromeRef = useRef<HTMLDivElement>(null);
  const tickerBottomPx = useDashboardChromeTop(chromeRef);
  const mainContentTopPx = tickerBottomPx + MAIN_CONTENT_GAP_PX;

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-blue-950/50 to-zinc-950 relative">
      <CursorGlow />
      <CursorHover />
      <DiscordSign />
      <ScrollFade />
      <Navigation />

      <DashboardMenuProvider contentTopPx={mainContentTopPx}>
        <div ref={chromeRef} className="fixed top-[72px] left-0 right-0 z-40">
          <MarketTicker />
        </div>
        <DashboardNavPanel />
        {/* Fixed vertical menu — same position on /dashboard and /dashboard/inflation */}
        <DashboardMenuTrigger />
        <div
          className="relative z-10 pb-24 pr-3 pl-14 sm:pr-4 sm:pl-16"
          style={{ paddingTop: mainContentTopPx }}
        >
          {children}
        </div>
      </DashboardMenuProvider>
    </div>
  );
}
