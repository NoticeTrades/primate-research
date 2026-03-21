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

      {/* Ticker bar + menu trigger: trigger is flush left, same row as sliding ticker */}
      <DashboardMenuProvider contentTopPx={contentTopPx}>
        <div
          ref={chromeRef}
          className="fixed top-[72px] left-0 right-0 z-40 flex items-stretch border-b border-zinc-800 bg-zinc-900"
        >
          <div className="flex w-11 shrink-0 flex-col justify-stretch border-r border-zinc-800 bg-zinc-950">
            <DashboardMenuTrigger />
          </div>
          <div className="min-h-0 min-w-0 flex-1">
            <MarketTicker embedded />
          </div>
        </div>
        <DashboardNavPanel />
      </DashboardMenuProvider>

      <div
        className="relative z-10 pb-24 px-3 sm:px-4"
        style={{ paddingTop: contentTopPx }}
      >
        {children}
      </div>
    </div>
  );
}
