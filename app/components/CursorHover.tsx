'use client';

import { useState, useEffect } from 'react';

export default function CursorHover() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      
      // Check if hovering over navigation link
      const target = e.target as HTMLElement;
      const navLink = target.closest('.nav-link');
      setIsHovering(!!navLink);
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const navLink = target.closest('.nav-link');
      setIsHovering(!!navLink);
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const relatedTarget = e.relatedTarget as HTMLElement;
      const navLink = target.closest('.nav-link');
      const relatedNavLink = relatedTarget?.closest('.nav-link');
      
      if (!navLink || !relatedNavLink) {
        setIsHovering(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
    };
  }, []);

  if (!isHovering) return null;

  return (
    <div
      className="pointer-events-none fixed z-[10000] transition-opacity duration-150"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div className="w-6 h-6 rounded-full bg-blue-500/20 dark:bg-blue-400/20 border border-blue-500 dark:border-blue-400 flex items-center justify-center backdrop-blur-sm">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400"></div>
      </div>
    </div>
  );
}
