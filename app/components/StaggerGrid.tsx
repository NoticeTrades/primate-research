'use client';

import { Children, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

type StaggerGridProps = {
  className?: string;
  /** Delay between each child starting its animation (larger = more “one by one”). */
  staggerMs?: number;
  /** How long each item’s motion takes once it starts. */
  durationMs?: number;
  children: ReactNode;
};

/**
 * When the grid enters the viewport, children animate in one by one
 * (drop-in from above). Respects prefers-reduced-motion.
 */
export default function StaggerGrid({
  className = '',
  staggerMs = 260,
  durationMs = 1100,
  children,
}: StaggerGridProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setReducedMotion(true);
      setVisible(true);
      return;
    }
    const el = ref.current;
    if (!el) return;

    // Sync check before paint: avoids flash of empty cards when this grid is already on screen (e.g. refresh mid-page).
    const vh = window.innerHeight;
    const rect = el.getBoundingClientRect();
    const margin = vh * 0.06;
    const alreadyVisible = rect.top < vh - margin && rect.bottom > margin;
    if (alreadyVisible) {
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.05, rootMargin: '0px 0px 8% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {Children.map(children, (child, i) => (
        <div
          key={i}
          className={
            reducedMotion
              ? 'opacity-100 translate-y-0'
              : visible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 -translate-y-8'
          }
          style={
            reducedMotion
              ? undefined
              : {
                  transitionProperty: 'opacity, transform',
                  transitionDuration: `${durationMs}ms`,
                  transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
                  transitionDelay: visible ? `${i * staggerMs}ms` : '0ms',
                }
          }
        >
          {child}
        </div>
      ))}
    </div>
  );
}
