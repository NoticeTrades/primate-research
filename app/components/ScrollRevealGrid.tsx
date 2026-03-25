'use client';

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

type ScrollRevealGridProps = {
  className?: string;
  /** Duration for the group fade / slide-in. */
  durationMs?: number;
  children: ReactNode;
};

/** Match IntersectionObserver: ~20% of the element must sit inside an inset viewport (not early). */
function isEnoughVisible(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight;
  const inset = vh * 0.14;
  const rootTop = inset;
  const rootBottom = vh - inset;
  const visibleTop = Math.max(rootTop, rect.top);
  const visibleBottom = Math.min(rootBottom, rect.bottom);
  const visibleHeight = Math.max(0, visibleBottom - visibleTop);
  const ratio = rect.height > 0 ? visibleHeight / rect.height : 0;
  return ratio >= 0.2;
}

/**
 * When the grid scrolls far enough into view, all children animate in together.
 * Respects prefers-reduced-motion.
 */
export default function ScrollRevealGrid({
  className = '',
  durationMs = 1150,
  children,
}: ScrollRevealGridProps) {
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

    if (isEnoughVisible(el)) {
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.2) {
          setVisible(true);
        }
      },
      {
        threshold: [0, 0.1, 0.2, 0.35, 0.5],
        rootMargin: '0px 0px -14% 0px',
      }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${className} ${
        reducedMotion
          ? 'opacity-100 translate-y-0'
          : visible
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-8'
      }`}
      style={
        reducedMotion
          ? undefined
          : {
              transitionProperty: 'opacity, transform',
              transitionDuration: `${durationMs}ms`,
              transitionTimingFunction: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
            }
      }
    >
      {children}
    </div>
  );
}
