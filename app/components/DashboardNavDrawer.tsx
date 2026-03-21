'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type RefObject,
} from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', description: 'Indices, sectors & live trades' },
  { href: '/dashboard/inflation', label: 'Inflation (CPI)', description: 'CPI history & YoY trend' },
] as const;

type DashboardMenuContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  contentTopPx: number;
};

const DashboardMenuContext = createContext<DashboardMenuContextValue | null>(null);

export function useDashboardMenu() {
  const ctx = useContext(DashboardMenuContext);
  if (!ctx) {
    throw new Error('useDashboardMenu must be used within DashboardMenuProvider');
  }
  return ctx;
}

export function DashboardMenuProvider({
  children,
  contentTopPx,
}: {
  children: React.ReactNode;
  contentTopPx: number;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const value = useMemo(
    () => ({ open, setOpen, contentTopPx }),
    [open, contentTopPx]
  );

  return <DashboardMenuContext.Provider value={value}>{children}</DashboardMenuContext.Provider>;
}

/** Sits in the left rail of the ticker bar — flush to the viewport edge */
export function DashboardMenuTrigger() {
  const { open, setOpen } = useDashboardMenu();

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="flex h-full min-h-[48px] w-full items-center justify-center bg-zinc-950 transition hover:bg-zinc-900/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/50"
      aria-expanded={open}
      aria-controls="dashboard-nav-panel"
      aria-label="Open dashboard pages menu"
    >
      <span className="flex flex-col gap-[5px]" aria-hidden>
        <span className="block h-0.5 w-[18px] rounded-full bg-zinc-200" />
        <span className="block h-0.5 w-[18px] rounded-full bg-zinc-200" />
        <span className="block h-0.5 w-[18px] rounded-full bg-zinc-200" />
      </span>
    </button>
  );
}

export function DashboardNavPanel() {
  const pathname = usePathname();
  const { open, setOpen, contentTopPx } = useDashboardMenu();

  const topStyle = useMemo(() => ({ top: `${contentTopPx}px` }), [contentTopPx]);

  return (
    <>
      <button
        type="button"
        aria-label="Close menu"
        style={topStyle}
        className={`fixed left-0 right-0 bottom-0 z-[46] bg-black/60 backdrop-blur-[2px] transition-opacity ${
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setOpen(false)}
      />

      <aside
        id="dashboard-nav-panel"
        style={topStyle}
        className={`fixed left-0 bottom-0 z-[47] flex w-[min(100vw-2.5rem,18rem)] flex-col border-r border-zinc-800 border-t-0 bg-zinc-950/98 shadow-2xl backdrop-blur-md transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!open}
        aria-modal="true"
        role="dialog"
      >
        <div className="border-b border-zinc-800 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-400/90">Primate</p>
              <p className="text-sm font-bold text-zinc-50">Dashboard</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
            >
              Close
            </button>
          </div>
        </div>

        <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-4">
          <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Navigate</p>
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const active =
                item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`block rounded-xl border px-3 py-3 transition-colors ${
                      active
                        ? 'border-blue-500/50 bg-blue-500/10 text-blue-100'
                        : 'border-transparent bg-transparent text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900/80'
                    }`}
                  >
                    <span className="block text-sm font-semibold">{item.label}</span>
                    <span className="mt-0.5 block text-xs text-zinc-500">{item.description}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}

/** Measure chrome row (nav + ticker strip) bottom for drawer alignment */
export function useDashboardChromeTop(chromeRef: RefObject<HTMLDivElement | null>): number {
  const [topPx, setTopPx] = useState(176);

  const measure = useCallback(() => {
    const el = chromeRef.current;
    if (!el) return;
    const bottom = el.getBoundingClientRect().bottom;
    setTopPx(bottom);
  }, [chromeRef]);

  useLayoutEffect(() => {
    measure();
    const el = chromeRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure, chromeRef]);

  return topPx;
}
