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
  DASHBOARD_NAV_OFFSET_PX,
} from './DashboardNavDrawer';

/** Space between the scrolling ticker and the main dashboard content */
const MAIN_CONTENT_GAP_PX = 20;

/** Hamburger sits below the ticker strip (not tied to drawer top under nav) */
const MENU_BUTTON_EXTRA_OFFSET_PX = 14;

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

      {/* Drawer + overlay start under the main nav (72px) so the sidebar aligns with the header; menu button is lower, under the ticker */}
      <DashboardMenuProvider
        drawerTopPx={DASHBOARD_NAV_OFFSET_PX}
        menuButtonTopPx={tickerBottomPx + MENU_BUTTON_EXTRA_OFFSET_PX}
      >
        <div ref={chromeRef} className="fixed top-[72px] left-0 right-0 z-40">
          <MarketTicker embedded />
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
