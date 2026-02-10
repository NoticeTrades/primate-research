'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Logo from './Logo';
import { researchArticles } from '../../data/research';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

export default function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [notifications, setNotifications] = useState<{ id: number; title: string; description: string; link: string; type: string; created_at: string; is_read: boolean }[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  // Check auth state on mount and when pathname changes (login/signup redirect)
  // Note: session_token is httpOnly so JS can't read it — use user_email instead
  useEffect(() => {
    const checkAuth = () => {
      const email = getCookie('user_email');
      const user = getCookie('user_username');
      setIsAuthenticated(!!email);
      setUsername(user || '');
    };
    checkAuth();
  }, [pathname]);

  // Fetch notifications when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      } catch {
        // silently fail
      }
    };
    fetchNotifications();
    // Poll every 15 seconds for new notifications
    const interval = setInterval(fetchNotifications, 15000);
    // Also refetch when the user focuses the tab (instant feel)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', fetchNotifications);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', fetchNotifications);
    };
  }, [isAuthenticated, pathname]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        searchRef.current &&
        !searchRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
      if (
        bellRef.current &&
        !bellRef.current.contains(e.target as Node)
      ) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter articles based on search query
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return researchArticles.filter((article) => {
      const inTitle = article.title.toLowerCase().includes(q);
      const inDesc = article.description.toLowerCase().includes(q);
      const inCategory = article.category.toLowerCase().includes(q);
      const inContent = article.content?.toLowerCase().includes(q) ?? false;
      const inTags = article.tags?.some((t) => t.toLowerCase().includes(q)) ?? false;
      return inTitle || inDesc || inCategory || inContent || inTags;
    }).slice(0, 6); // Limit to 6 results in dropdown
  }, [searchQuery]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setIsDropdownOpen(value.trim().length > 0);
  };

  const handleResultClick = (article: typeof researchArticles[0]) => {
    setIsDropdownOpen(false);
    setSearchQuery('');
    searchRef.current?.blur();
    if (article.pdfUrl) {
      window.open(article.pdfUrl, '_blank');
    } else {
      router.push(`/research?q=${encodeURIComponent(article.title)}`);
    }
  };

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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsDropdownOpen(false);
      router.push(`/research?q=${encodeURIComponent(searchQuery.trim())}`);
      searchRef.current?.blur();
    }
  };

  const handleBellClick = () => {
    setShowNotifications((prev) => !prev);
  };

  const handleMarkAllRead = async () => {
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await fetch('/api/notifications/read', { method: 'POST' });
    } catch {
      // silently fail
    }
  };

  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      const res = await fetch('/api/notifications/clear', { method: 'POST' });
      if (res.ok) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch {
      // silently fail
    } finally {
      setIsClearing(false);
    }
  };

  // Filtered notifications based on unread toggle
  const filteredNotifications = showUnreadOnly
    ? notifications.filter((n) => !n.is_read)
    : notifications;

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Clear cookies manually if API fails
    }
    document.cookie = 'session_token=; path=/; max-age=0';
    document.cookie = 'user_email=; path=/; max-age=0';
    document.cookie = 'user_username=; path=/; max-age=0';
    setIsAuthenticated(false);
    setUsername('');
    router.push('/');
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md shadow-sm border-b border-zinc-200 dark:border-zinc-800'
          : 'bg-transparent'
      }`}
    >
      {/* Search bar + Auth — fixed row to the left of the Discord sign */}
      <div className="hidden md:flex items-center gap-3 fixed top-5 right-28 z-[55]">
        {/* Search Bar — only visible when logged in */}
        {isAuthenticated && <form onSubmit={handleSearchSubmit} className="relative">
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => {
              setIsSearchFocused(true);
              if (searchQuery.trim()) setIsDropdownOpen(true);
            }}
            onBlur={() => setIsSearchFocused(false)}
            placeholder="Search research..."
            className={`w-48 lg:w-64 px-3 py-1.5 pl-9 bg-white/80 dark:bg-zinc-800/80 border rounded-lg text-sm text-black dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
              isSearchFocused
                ? 'border-blue-500 w-56 lg:w-72'
                : 'border-zinc-300 dark:border-zinc-700'
            }`}
            suppressHydrationWarning
          />
          <svg
            className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>

          {/* Dropdown results */}
          {isDropdownOpen && searchQuery.trim() && (
            <div
              ref={dropdownRef}
              className="absolute top-full mt-2 right-0 w-80 lg:w-96 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl overflow-hidden"
            >
              {searchResults.length > 0 ? (
                <>
                  <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                      {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {searchResults.map((article, index) => (
                      <button
                        key={index}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleResultClick(article);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors border-b border-zinc-100 dark:border-zinc-800 last:border-b-0"
                      >
                        <div className="flex items-start gap-3">
                          <svg
                            className="w-4 h-4 text-blue-500 mt-0.5 shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          <div className="min-w-0">
                            <div className="font-medium text-sm text-black dark:text-zinc-50 truncate">
                              {article.title}
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-2">
                              <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 font-medium">
                                {article.category}
                              </span>
                              {article.date && <span>{article.date}</span>}
                            </div>
                            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 line-clamp-2">
                              {article.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setIsDropdownOpen(false);
                      router.push(`/research?q=${encodeURIComponent(searchQuery.trim())}`);
                      setSearchQuery('');
                      searchRef.current?.blur();
                    }}
                    className="w-full px-4 py-2.5 text-center text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors border-t border-zinc-100 dark:border-zinc-800"
                  >
                    View all results on Research page →
                  </button>
                </>
              ) : (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    No articles found for &ldquo;{searchQuery}&rdquo;
                  </p>
                </div>
              )}
            </div>
          )}
        </form>}

        {/* Auth buttons */}
        {isAuthenticated ? (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-300 max-w-[120px] truncate">
              {username}
            </span>
            <span className="relative group/badge cursor-default flex items-center" title="Premium">
              <svg className="w-5 h-5 transition-all duration-300 group-hover/badge:drop-shadow-[0_0_8px_rgba(59,130,246,0.7)] drop-shadow-[0_0_3px_rgba(59,130,246,0.4)]" viewBox="0 0 22 22" fill="none">
                <path d="M20.396 11c.746-.868.782-1.957.086-2.782a2.19 2.19 0 00-.123-.147c.487-.93.394-2.038-.3-2.858a2.154 2.154 0 00-.14-.143c.193-.976-.098-1.99-.84-2.693-.143-.137-.299-.258-.466-.363-.03-1.003-.637-1.897-1.573-2.382a2.257 2.257 0 00-.498-.2C15.836-.477 14.737-.11 14.02.539a2.184 2.184 0 00-.346.393C12.806.454 11.708.326 10.727.804a2.2 2.2 0 00-.393.26C9.563.356 8.412.293 7.454.782a2.18 2.18 0 00-.346.26C6.31.488 5.166.524 4.253 1.088a2.192 2.192 0 00-.308.258c-.862-.36-1.907-.24-2.65.388a2.181 2.181 0 00-.243.268C.25 2.476-.173 3.532.104 4.5a2.2 2.2 0 00.108.349C-.47 5.63-.575 6.75.044 7.65a2.2 2.2 0 00.203.292C-.34 8.813-.32 9.947.312 10.79a2.2 2.2 0 00.15.186c-.53.93-.458 2.07.21 2.907.064.08.133.155.206.225-.32.962-.103 2.06.613 2.8.087.09.18.174.278.252-.074.99.387 1.936 1.256 2.47.105.064.215.12.328.171.09.994.744 1.864 1.712 2.303.117.053.238.098.362.134.337.94 1.12 1.647 2.11 1.886.12.028.242.049.366.06.565.865 1.48 1.41 2.5 1.43.123.002.247-.006.37-.024.786.745 1.796 1.085 2.786.868.12-.027.238-.062.354-.105.974.576 2.12.653 3.103.17.12-.06.235-.128.343-.204 1.09.333 2.29.12 3.16-.592.105-.087.204-.182.296-.283 1.095.053 2.16-.497 2.817-1.45.079-.116.151-.238.214-.365.93-.241 1.696-.923 2.056-1.85.044-.113.08-.23.11-.35.738-.44 1.28-1.16 1.456-2.01.021-.104.035-.21.042-.318.525-.6.822-1.39.802-2.21a2.233 2.233 0 00-.048-.343c.357-.73.434-1.588.18-2.39z" fill="#1D9BF0"/>
                <path d="M9.585 14.929l-3.28-3.28a.667.667 0 01.942-.943l2.338 2.337 5.378-5.378a.667.667 0 01.943.943l-6.321 6.321z" fill="white"/>
              </svg>
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white bg-zinc-800 border border-zinc-700 rounded-md opacity-0 group-hover/badge:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50 shadow-lg">
                Premium
              </span>
            </span>

            {/* Notification Bell */}
            <div className="relative" ref={bellRef}>
              <button
                onClick={handleBellClick}
                className="relative p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
                suppressHydrationWarning
              >
                <svg className="w-5 h-5 text-zinc-400 hover:text-zinc-100 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-red-500 rounded-full animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden z-[60]">
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-zinc-800">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-zinc-100">Notifications</h3>
                      {notifications.length > 0 && (
                        <div className="flex items-center gap-3">
                          {unreadCount > 0 && (
                            <button
                              onClick={handleMarkAllRead}
                              className="text-[11px] font-medium text-zinc-400 hover:text-blue-400 transition-colors cursor-pointer"
                            >
                              Mark read
                            </button>
                          )}
                          <button
                            onClick={handleClearAll}
                            disabled={isClearing}
                            className="text-[11px] font-medium text-zinc-400 hover:text-red-400 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                          >
                            {isClearing ? 'Clearing...' : 'Clear all'}
                          </button>
                        </div>
                      )}
                    </div>
                    {/* Unread / All toggle */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => setShowUnreadOnly(false)}
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-md transition-colors ${
                          !showUnreadOnly
                            ? 'bg-zinc-700 text-zinc-100'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setShowUnreadOnly(true)}
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-md transition-colors ${
                          showUnreadOnly
                            ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        Unread{unreadCount > 0 ? ` (${unreadCount})` : ''}
                      </button>
                    </div>
                  </div>
                  {/* Notification list */}
                  {filteredNotifications.length > 0 ? (
                    <div className="max-h-80 overflow-y-auto">
                      {filteredNotifications.map((notif) => (
                        <button
                          key={notif.id}
                          onClick={() => {
                            setShowNotifications(false);
                            if (notif.link) {
                              router.push(notif.link);
                            }
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-zinc-800 transition-colors border-b border-zinc-800/50 last:border-b-0 ${
                            !notif.is_read ? 'bg-zinc-800/40' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                              !notif.is_read
                                ? 'bg-blue-500 ring-2 ring-blue-500/30'
                                : notif.type === 'article' ? 'bg-blue-500/40' :
                                  notif.type === 'update' ? 'bg-green-500/40' :
                                  'bg-zinc-600'
                            }`} />
                            <div className="min-w-0">
                              <p className={`text-sm leading-snug ${
                                !notif.is_read
                                  ? 'font-semibold text-zinc-50'
                                  : 'font-medium text-zinc-300'
                              }`}>
                                {notif.title}
                              </p>
                              {notif.description && (
                                <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">
                                  {notif.description}
                                </p>
                              )}
                              <p className="text-[10px] text-zinc-600 mt-1">
                                {new Date(notif.created_at).toLocaleDateString('en-US', {
                                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                                })}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-8 text-center">
                      <svg className="w-8 h-8 text-zinc-700 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      <p className="text-sm text-zinc-500">
                        {showUnreadOnly ? 'No unread notifications' : 'No notifications yet'}
                      </p>
                      <p className="text-xs text-zinc-600 mt-0.5">
                        {showUnreadOnly
                          ? 'Switch to "All" to see previous notifications'
                          : 'You\u0027ll see new reports and updates here'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="shake-on-hover text-xs font-bold text-red-500 border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              suppressHydrationWarning
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/login')}
              className="text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors px-2 py-1.5"
              suppressHydrationWarning
            >
              Log in
            </button>
            <button
              onClick={() => router.push('/signup')}
              className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-1.5 rounded-lg transition-colors"
              suppressHydrationWarning
            >
              Sign Up
            </button>
          </div>
        )}
      </div>

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
