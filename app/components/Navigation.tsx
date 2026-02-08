'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Logo from './Logo';

export default function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    if (pathname !== '/') {
      router.push(`/#${id}`);
      return;
    }
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleNavClick = (path: string) => {
    router.push(path);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md shadow-sm border-b border-zinc-200 dark:border-zinc-800'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto pl-4 pr-6 py-4">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <a
                href="/"
                className="text-base font-semibold text-black dark:text-zinc-50 tracking-tight hover:opacity-80 transition-opacity cursor-pointer"
              >
                Primate Research
              </a>
              <button
                onClick={() => {
                  if (pathname !== '/') {
                    router.push('/');
                  } else {
                    scrollToSection('home');
                  }
                }}
                className="hover:opacity-80 transition-opacity"
                suppressHydrationWarning
              >
                <Logo />
              </button>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <button
                onClick={() => scrollToSection('about')}
                className="nav-link text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                suppressHydrationWarning
              >
                About
              </button>
              <button
                onClick={() => handleNavClick('/research')}
                className="nav-link text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                suppressHydrationWarning
              >
                Research
              </button>
              <button
                onClick={() => handleNavClick('/videos')}
                className="nav-link text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                suppressHydrationWarning
              >
                Videos
              </button>
              <button
                onClick={() => handleNavClick('/trades')}
                className="nav-link text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                suppressHydrationWarning
              >
                Trades (Performance)
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
