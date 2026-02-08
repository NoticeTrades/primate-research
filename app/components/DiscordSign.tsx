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
        className="block cursor-pointer"
      >
        <div 
          className="relative sign-swing-container"
          style={{
            transformOrigin: 'top center',
            animation: 'swing 1.5s ease-in-out infinite'
          }}
        >
          {/* Hanging vine */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
            <svg width="8" height="20" viewBox="0 0 8 20" className="text-green-700 dark:text-green-600">
              <path
                d="M 4 0 Q 2 5 4 10 Q 6 15 4 20"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M 4 0 Q 6 5 4 10 Q 2 15 4 20"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                opacity="0.6"
              />
            </svg>
          </div>

          {/* Jungle Sign Box with Blue */}
          <div className="relative bg-gradient-to-br from-blue-600 via-blue-500 to-blue-700 dark:from-blue-500 dark:via-blue-400 dark:to-blue-600 rounded-sm shadow-2xl border border-blue-400 dark:border-blue-300 px-2.5 py-1.5 overflow-visible transition-all duration-300 hover:scale-110 hover:shadow-[0_4px_20px_rgba(59,130,246,0.5)]" 
               style={{
                 boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.4)',
               }}>
            {/* Vintage weathered texture overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/5 to-black/10 rounded-sm pointer-events-none"></div>
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)',
            }}></div>
            
            {/* Decorative vines on the sign */}
            <div className="absolute -left-2 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg width="16" height="20" viewBox="0 0 16 20" className="text-green-600 dark:text-green-500 opacity-60">
                <path
                  d="M 0 10 Q 4 5 8 10 Q 12 15 16 10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="round"
                />
                {/* Small leaves */}
                <circle cx="4" cy="8" r="1.5" fill="currentColor" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
              </svg>
            </div>
            <div className="absolute -right-2 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg width="16" height="20" viewBox="0 0 16 20" className="text-green-600 dark:text-green-500 opacity-60">
                <path
                  d="M 16 10 Q 12 5 8 10 Q 4 15 0 10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="round"
                />
                {/* Small leaves */}
                <circle cx="12" cy="8" r="1.5" fill="currentColor" />
                <circle cx="4" cy="12" r="1.5" fill="currentColor" />
              </svg>
            </div>
            
            {/* Subtle glow effect */}
            <div className="absolute -inset-1 bg-blue-400/20 rounded-sm blur-sm animate-pulse opacity-30"></div>
            
            {/* Text with vintage style */}
            <div className="relative z-10">
              <div className="text-white font-bold text-[10px] tracking-widest flex flex-col items-center gap-0.5 drop-shadow-md" style={{ fontFamily: 'serif' }}>
                <div className="flex items-center gap-1">
                  {/* Small leaf decorations */}
                  <svg width="6" height="6" viewBox="0 0 6 6" className="text-green-400 dark:text-green-300 opacity-80">
                    <path d="M 3 1 Q 1 2 2 4 Q 3 5 3 3 Q 3 5 4 4 Q 5 2 3 1" fill="currentColor" />
                  </svg>
                  <span className="relative text-[11px] uppercase" style={{ 
                    textShadow: '1px 1px 2px rgba(0,0,0,0.8), 0 0 4px rgba(59, 130, 246, 0.4)',
                    letterSpacing: '0.1em'
                  }}>
                    FREE DISCORD
                  </span>
                  <svg width="6" height="6" viewBox="0 0 6 6" className="text-green-400 dark:text-green-300 opacity-80">
                    <path d="M 3 1 Q 1 2 2 4 Q 3 5 3 3 Q 3 5 4 4 Q 5 2 3 1" fill="currentColor" />
                  </svg>
                </div>
                <div className="text-[8px] text-blue-100/90 font-medium opacity-80" style={{ letterSpacing: '0.05em' }}>
                  Click to Join
                </div>
              </div>
            </div>

            {/* Jungle corner decorations (leaves instead of rivets) */}
            <div className="absolute top-0.5 left-0.5 pointer-events-none">
              <svg width="4" height="4" viewBox="0 0 4 4" className="text-green-500 dark:text-green-400 opacity-70">
                <path d="M 2 1 Q 1 1.5 1.5 2.5 Q 2 3 2 2 Q 2 3 2.5 2.5 Q 3 1.5 2 1" fill="currentColor" />
              </svg>
            </div>
            <div className="absolute top-0.5 right-0.5 pointer-events-none">
              <svg width="4" height="4" viewBox="0 0 4 4" className="text-green-500 dark:text-green-400 opacity-70">
                <path d="M 2 1 Q 1 1.5 1.5 2.5 Q 2 3 2 2 Q 2 3 2.5 2.5 Q 3 1.5 2 1" fill="currentColor" />
              </svg>
            </div>
            <div className="absolute bottom-0.5 left-0.5 pointer-events-none">
              <svg width="4" height="4" viewBox="0 0 4 4" className="text-green-500 dark:text-green-400 opacity-70">
                <path d="M 2 1 Q 1 1.5 1.5 2.5 Q 2 3 2 2 Q 2 3 2.5 2.5 Q 3 1.5 2 1" fill="currentColor" />
              </svg>
            </div>
            <div className="absolute bottom-0.5 right-0.5 pointer-events-none">
              <svg width="4" height="4" viewBox="0 0 4 4" className="text-green-500 dark:text-green-400 opacity-70">
                <path d="M 2 1 Q 1 1.5 1.5 2.5 Q 2 3 2 2 Q 2 3 2.5 2.5 Q 3 1.5 2 1" fill="currentColor" />
              </svg>
            </div>
          </div>
        </div>
      </a>
    </div>
  );
}
