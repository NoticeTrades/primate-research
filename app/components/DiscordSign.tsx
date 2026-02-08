'use client';

import { useState, useEffect } from 'react';

export default function DiscordSign() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed top-4 right-4 z-[60]">
      <a
        href="https://discord.com/invite/QGnUGdAt"
        target="_blank"
        rel="noopener noreferrer"
        className="block cursor-pointer group"
      >
        <div 
          className="relative"
          style={{
            transformOrigin: 'top center',
            animation: 'swing 2s ease-in-out infinite'
          }}
        >
          {/* Neon "Open" Sign with beaming effect */}
          <div className="relative bg-black dark:bg-zinc-900 rounded-md border-2 border-blue-500 px-3 py-2 shadow-2xl transition-all duration-300 hover:scale-105">
            {/* Outer glow layers for beaming effect */}
            <div className="absolute -inset-1 bg-blue-500 rounded-md blur-sm opacity-60 animate-pulse"></div>
            <div className="absolute -inset-0.5 bg-blue-400 rounded-md blur-xs opacity-40 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            
            {/* Inner glow */}
            <div className="absolute inset-0 bg-blue-500/20 rounded-md"></div>
            
            {/* Text with neon glow effect */}
            <div className="relative z-10">
              <div className="text-blue-400 font-bold text-xs tracking-wider uppercase text-center" 
                   style={{
                     textShadow: '0 0 10px rgba(59, 130, 246, 0.8), 0 0 20px rgba(59, 130, 246, 0.6), 0 0 30px rgba(59, 130, 246, 0.4)',
                     animation: 'neon-flicker 2s ease-in-out infinite alternate'
                   }}>
                Open
              </div>
              <div className="text-blue-300 text-[9px] font-medium text-center mt-0.5 opacity-80"
                   style={{
                     textShadow: '0 0 5px rgba(59, 130, 246, 0.5)'
                   }}>
                Join Discord
              </div>
            </div>
          </div>
        </div>
      </a>
    </div>
  );
}
