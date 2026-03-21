'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', description: 'Indices, sectors & live trades' },
  { href: '/dashboard/inflation', label: 'Inflation (CPI)', description: 'CPI history & YoY trend' },
] as const;

export default function DashboardNavDrawer() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

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

  return (
    <>
      {/* Left rail button — fixed below site nav + ticker */}
      <div className="fixed left-3 top-[120px] z-[45] sm:left-4 sm:top-[124px]">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/95 px-3 py-2.5 text-sm font-semibold text-zinc-100 shadow-lg shadow-black/40 backdrop-blur-sm transition hover:border-blue-500/50 hover:bg-zinc-800/90 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          aria-expanded={open}
          aria-controls="dashboard-nav-panel"
          aria-label="Open dashboard pages menu"
        >
          <span className="flex flex-col gap-0.5" aria-hidden>
            <span className="block h-0.5 w-5 rounded-full bg-zinc-300" />
            <span className="block h-0.5 w-5 rounded-full bg-zinc-300" />
            <span className="block h-0.5 w-5 rounded-full bg-zinc-300" />
          </span>
          <span className="hidden sm:inline">Pages</span>
        </button>
      </div>

      {/* Overlay */}
      <button
        type="button"
        aria-label="Close menu"
        className={`fixed inset-0 z-[46] bg-black/60 backdrop-blur-[2px] transition-opacity ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setOpen(false)}
      />

      {/* Slide panel */}
      <aside
        id="dashboard-nav-panel"
        className={`fixed left-0 top-0 z-[47] flex h-full w-[min(100vw-3rem,18rem)] flex-col border-r border-zinc-800 bg-zinc-950/98 shadow-2xl backdrop-blur-md transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!open}
      >
        <div className="border-b border-zinc-800 px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
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

        <nav className="flex-1 overflow-y-auto px-3 py-4">
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
