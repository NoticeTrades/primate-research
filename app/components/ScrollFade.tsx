'use client';

import { useEffect, useState } from 'react';

export default function ScrollFade() {
  const [blueGradientOpacity, setBlueGradientOpacity] = useState(0.6);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const windowHeight = window.innerHeight;
      
      // Keep blue gradient visible throughout, with smooth transition
      // Start at 0.6 opacity, gradually increase to 0.8 as you scroll, then maintain
      const baseOpacity = 0.6;
      const maxOpacity = 0.8;
      const scrollIntensity = Math.min(scrollPosition / (windowHeight * 1.5), 1);
      const newBlueOpacity = baseOpacity + (scrollIntensity * (maxOpacity - baseOpacity));
      setBlueGradientOpacity(Math.max(0.6, Math.min(0.8, newBlueOpacity)));
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial call
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* Full-screen blue gradient overlay - persistent and smooth */}
      <div
        className="fixed inset-0 pointer-events-none z-[-1] transition-opacity duration-1000 ease-out"
        style={{ opacity: blueGradientOpacity }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/40 via-blue-900/30 to-blue-950/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-blue-500/15 to-transparent" />
      </div>
    </>
  );
}
