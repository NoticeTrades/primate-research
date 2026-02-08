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
          {/* Clean, minimal sign design */}
          <div className="relative bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 rounded-lg shadow-lg border border-blue-500/30 dark:border-blue-400/30 px-5 py-3 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/20 hover:border-blue-400 dark:hover:border-blue-300">
            {/* Subtle inner glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent rounded-lg pointer-events-none"></div>
            
            {/* Text content */}
            <div className="relative z-10 flex flex-col items-center gap-1">
              <div className="text-white font-semibold text-sm tracking-wide flex items-center justify-center gap-2.5">
                <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                  <svg 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-white"
                  >
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C2.601 6.7 2 9.175 2 11.639c0 2.23.479 4.403 1.409 6.456a.076.076 0 0 0 .08.051c1.577-.233 3.096-.835 4.5-1.73a.076.076 0 0 0 .041-.069 12.58 12.58 0 0 1-.632-1.104.077.077 0 0 0-.061-.051.078.078 0 0 0-.052.018c-1.134.513-2.36.876-3.667 1.105a.05.05 0 0 0-.03.03 19.9 19.9 0 0 0 5.619 0 .05.05 0 0 0-.021-.018 12.096 12.096 0 0 0-3.645-1.13.078.078 0 0 1-.061-.076c0-.114.003-.23.009-.345a12.285 12.285 0 0 0 3.644 1.116.076.076 0 0 0 .079-.04c.297-.57.651-1.103 1.062-1.59a.076.076 0 0 0-.041-.12 10.733 10.733 0 0 1-3.12-1.03.077.077 0 0 1-.008-.128 10.717 10.717 0 0 1 3.12-1.03.076.076 0 0 0 .05-.078c-.186-1.184-.47-2.31-.85-3.368a.077.077 0 0 0-.079-.05c-2.02.24-3.992.72-5.87 1.404a.07.07 0 0 1-.031-.028z"/>
                  </svg>
                </div>
                <span className="text-xs whitespace-nowrap">Join Discord</span>
              </div>
              <div className="text-blue-100 dark:text-blue-200 text-[10px] font-medium opacity-75">
                Free Community
              </div>
            </div>
          </div>
        </div>
      </a>
    </div>
  );
}
