'use client';

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

type ScrollRevealGridProps = {
  className?: string;
  /** Duration for the group fade / slide-in. */
  durationMs?: number;
  children: ReactNode;
};

/**
 * When the grid scrolls into view, all children animate in together.
 * Respects prefers-reduced-motion.
 */
export default function ScrollRevealGrid({
  className = '',
  durationMs = 700,
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
    <div
      ref={ref}
      className={`${className} ${
        reducedMotion
          ? 'opacity-100 translate-y-0'
          : visible
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-6'
      }`}
      style={
        reducedMotion
          ? undefined
          : {
              transitionProperty: 'opacity, transform',
              transitionDuration: `${durationMs}ms`,
              transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
            }
      }
    >
      {children}
    </div>
  );
}
