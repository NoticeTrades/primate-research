'use client';

import { Children, useEffect, useRef, useState, type ReactNode } from 'react';

type StaggerGridProps = {
  className?: string;
  staggerMs?: number;
  children: ReactNode;
};

/**
 * When the grid enters the viewport, children animate in one by one
 * (drop-in from above). Respects prefers-reduced-motion.
 */
export default function StaggerGrid({
  className = '',
  staggerMs = 115,
  children,
}: StaggerGridProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setReducedMotion(true);
      setVisible(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.07, rootMargin: '0px 0px -7% 0px' }
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
                  transitionDuration: '720ms',
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
