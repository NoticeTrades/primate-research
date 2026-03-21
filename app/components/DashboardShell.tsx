'use client';

import Navigation from './Navigation';
import CursorGlow from './CursorGlow';
import CursorHover from './CursorHover';
import DiscordSign from './DiscordSign';
import ScrollFade from './ScrollFade';
import MarketTicker from './MarketTicker';
import DashboardNavDrawer from './DashboardNavDrawer';

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-blue-950/50 to-zinc-950 relative">
      <CursorGlow />
      <CursorHover />
      <DiscordSign />
      <ScrollFade />
      <Navigation />

      <div className="fixed top-[72px] left-0 right-0 z-40">
        <MarketTicker />
      </div>

      <DashboardNavDrawer />

      {/* pl-14: room for icon-only menu (40px) + left-3 inset */}
      <div className="pt-44 pb-24 pl-14 pr-3 sm:pr-4 relative z-10">{children}</div>
    </div>
  );
}
