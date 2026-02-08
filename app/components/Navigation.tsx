'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Logo from './Logo';

export default function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [username, setUsername] = useState('');

  useEffect(() => {
    setMounted(true);
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/check');
      const data = await response.json();
      if (data.authenticated) {
        setIsAuthenticated(true);
        // Get user email and username from cookie (client-side)
        const email = document.cookie
          .split('; ')
          .find(row => row.startsWith('user_email='))
          ?.split('=')[1];
        const user = document.cookie
          .split('; ')
          .find(row => row.startsWith('user_username='))
          ?.split('=')[1];
        if (email) setUserEmail(decodeURIComponent(email));
        if (user) setUsername(decodeURIComponent(user));
      } else {
        setIsAuthenticated(false);
        setUserEmail('');
        setUsername('');
      }
    } catch (error) {
      setIsAuthenticated(false);
      setUserEmail('');
    }
  };

  // Refresh auth status when pathname changes (after login/signup)
  useEffect(() => {
    checkAuth();
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setIsAuthenticated(false);
      setUserEmail('');
      setUsername('');
      if (pathname === '/research' || pathname === '/videos') {
        router.push('/');
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

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
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {username || userEmail}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                  suppressHydrationWarning
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleNavClick('/login')}
                  className="nav-link text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                  suppressHydrationWarning
                >
                  Login
                </button>
                <button
                  onClick={() => handleNavClick('/signup')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-colors"
                  suppressHydrationWarning
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
