'use client';

import { useEffect, useState } from 'react';

export default function ScrollFade() {
  const [opacity, setOpacity] = useState(1);
  const [blueGradientOpacity, setBlueGradientOpacity] = useState(0.3);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const windowHeight = window.innerHeight;
      const fadeStart = windowHeight * 0.5; // Start fading after 50% of viewport
      const fadeEnd = windowHeight * 1.2; // Fully faded at 120% of viewport (smoother transition)
      
      if (scrollPosition < fadeStart) {
        setOpacity(1);
      } else if (scrollPosition > fadeEnd) {
        setOpacity(0);
      } else {
        // Calculate opacity based on scroll position
        const fadeRange = fadeEnd - fadeStart;
        const scrollProgress = scrollPosition - fadeStart;
        const newOpacity = 1 - (scrollProgress / fadeRange);
        setOpacity(Math.max(0, Math.min(1, newOpacity)));
      }

      // Blue gradient on left side - keep consistent opacity throughout
      // Start with base opacity and slightly increase with scroll, but keep it visible
      const baseOpacity = 0.3;
      const maxOpacity = 0.5;
      const scrollIntensity = Math.min(scrollPosition / (windowHeight * 2), 1);
      const newBlueOpacity = baseOpacity + (scrollIntensity * (maxOpacity - baseOpacity));
      setBlueGradientOpacity(Math.max(0.3, Math.min(0.5, newBlueOpacity)));
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial call
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <div
        className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-700"
        style={{ opacity }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black via-zinc-950 to-zinc-950 dark:from-black dark:via-zinc-950 dark:to-zinc-950" />
      </div>
      {/* Blue gradient on left side - consistent across all sections */}
      <div
        className="fixed left-0 top-0 bottom-0 w-1/3 pointer-events-none z-0 transition-opacity duration-700"
        style={{ opacity: blueGradientOpacity }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-blue-500/10 to-transparent dark:from-blue-500/30 dark:via-blue-500/15 dark:to-transparent" />
      </div>
    </>
  );
}
