'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Logo from './Logo';
import { researchArticles, generateSlug } from '../../data/research';
import { useChat } from '../contexts/ChatContext';
import { useTicker } from '../contexts/TickerContext';
import { useEquityIndex } from '../contexts/EquityIndexContext';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

export default function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { openChat } = useChat();
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchPlaceholder, setSearchPlaceholder] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const { openTicker } = useTicker();
  const { openEquityIndex } = useEquityIndex();

  const TERMINAL_PLACEHOLDER = 'Search Terminal... (Press ` to open)';
  const SEARCH_TERMINAL_TICKERS = ['NQ', 'ES', 'YM', 'BTC'];

  useEffect(() => {
    let i = 0;
    let timeoutId: ReturnType<typeof setTimeout>;
    const run = () => {
      setSearchPlaceholder(TERMINAL_PLACEHOLDER.slice(0, i));
      if (i < TERMINAL_PLACEHOLDER.length) {
        i++;
        timeoutId = setTimeout(run, 80);
      } else {
        i = 0;
        timeoutId = setTimeout(run, 2000);
      }
    };
    timeoutId = setTimeout(run, 0);
    return () => clearTimeout(timeoutId);
  }, []);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [notifications, setNotifications] = useState<{ id: number; title: string; description: string; link: string; type: string; created_at: string; is_read: boolean }[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showToolsDropdown, setShowToolsDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(false);
  const [soundNotificationsEnabled, setSoundNotificationsEnabled] = useState(true);
  const [previousUnreadCount, setPreviousUnreadCount] = useState(0);
  const playedSoundForIdsRef = useRef<Set<number>>(new Set());
  const [hasInitializedRef, setHasInitializedRef] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const toolsDropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [selectedPriceTickerIndex, setSelectedPriceTickerIndex] = useState(0);
  const [selectedSearchResultIndex, setSelectedSearchResultIndex] = useState(0);

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

  // Fetch notification preferences and load played sound IDs
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const fetchPreferences = async () => {
      try {
        const res = await fetch('/api/notifications/preferences');
        if (res.ok) {
          const data = await res.json();
          setBrowserNotificationsEnabled(data.browserNotificationsEnabled || false);
          setSoundNotificationsEnabled(data.soundNotificationsEnabled !== false); // Default to true
        }
      } catch {
        // silently fail
      }
    };
    
    // Load played sound IDs from sessionStorage to persist across page navigations
    if (!hasInitializedRef && typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('playedSoundNotificationIds');
        if (stored) {
          const ids = JSON.parse(stored);
          playedSoundForIdsRef.current = new Set(ids);
        }
        setHasInitializedRef(true);
      } catch (error) {
        console.error('Failed to load played sound IDs:', error);
        setHasInitializedRef(true);
      }
    }
    
    fetchPreferences();
  }, [isAuthenticated, hasInitializedRef]);

  // Fetch notifications when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      setPreviousUnreadCount(0);
      playedSoundForIdsRef.current.clear();
      return;
    }
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          const newNotifications = data.notifications || [];
          const newUnreadCount = data.unreadCount || 0;
          
          // Get IDs of previous notifications
          const previousNotificationIds = new Set(notifications.map((n: { id: number }) => n.id));
          
          // Find truly new notifications (not in previous list, unread, and not already played sound for)
          const newUnreadNotifications = newNotifications.filter(
            (n: { id: number; is_read: boolean }) => !n.is_read && !previousNotificationIds.has(n.id) && !playedSoundForIdsRef.current.has(n.id)
          );
          
          // Check if new notifications arrived that we haven't played sound for
          if (newUnreadNotifications.length > 0) {
            console.log('New notifications detected:', newUnreadNotifications.length, 'Sound enabled:', soundNotificationsEnabled);
            // Play sound notification if enabled (only once per new notification)
            if (soundNotificationsEnabled && typeof window !== 'undefined') {
              try {
                const { playNotificationSound } = await import('../utils/sound');
                console.log('Playing notification sound...');
                playNotificationSound();
                // Mark these notification IDs as having played sound (using ref to avoid stale closure)
                newUnreadNotifications.forEach((n: { id: number }) => {
                  playedSoundForIdsRef.current.add(n.id);
                });
                // Persist to sessionStorage so it survives page navigation
                try {
                  if (typeof window !== 'undefined') {
                    sessionStorage.setItem('playedSoundNotificationIds', JSON.stringify(Array.from(playedSoundForIdsRef.current)));
                  }
                } catch (error) {
                  console.error('Failed to save played sound IDs:', error);
                }
              } catch (error) {
                console.error('Failed to play notification sound:', error);
              }
            }
            
            // Show browser notification if enabled
            if (browserNotificationsEnabled && typeof window !== 'undefined' && 'Notification' in window) {
              if (Notification.permission === 'granted') {
                newUnreadNotifications.forEach((notification: { id: number; title: string; description: string; link: string }) => {
                  try {
                    const browserNotification = new Notification(notification.title, {
                      body: notification.description || '',
                      icon: '/favicon.ico',
                      badge: '/favicon.ico',
                      tag: `notification-${notification.id}`,
                      requireInteraction: false,
                    });
                    
                    // Open the notification link when clicked
                    if (notification.link) {
                      browserNotification.onclick = () => {
                        window.focus();
                        window.location.href = notification.link;
                        browserNotification.close();
                      };
                    }
                  } catch (error) {
                    console.error('Failed to create browser notification:', error);
                  }
                });
              } else {
                console.log('Browser notification permission not granted:', Notification.permission);
              }
            }
          }
          
          setNotifications(newNotifications);
          setUnreadCount(newUnreadCount);
          setPreviousUnreadCount(newUnreadCount);
        }
      } catch {
        // silently fail
      }
    };
    fetchNotifications();
    // Poll every 5 seconds for new notifications (more frequent for real-time feel)
    const interval = setInterval(fetchNotifications, 5000);
    // Also refetch when the user focuses the tab (instant feel)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications();
      }
    };
    // Listen for notifications being cleared/updated from other pages
    const handleNotificationsCleared = () => {
      fetchNotifications();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', fetchNotifications);
    window.addEventListener('notificationsCleared', handleNotificationsCleared);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', fetchNotifications);
      window.removeEventListener('notificationsCleared', handleNotificationsCleared);
    };
  }, [isAuthenticated, pathname, browserNotificationsEnabled, previousUnreadCount]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle backtick key to open search terminal
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if backtick is pressed
      if (e.key === '`' || e.key === 'Backquote') {
        // Don't trigger if user is typing in an input, textarea, or contenteditable
        const target = e.target as HTMLElement;
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable
        ) {
          return;
        }

        // Prevent default and focus search
        e.preventDefault();
        if (searchRef.current) {
          searchRef.current.focus();
          setIsSearchFocused(true);
          setIsDropdownOpen(true);
          setSelectedCommandIndex(0);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated]);

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
        toolsDropdownRef.current &&
        !toolsDropdownRef.current.contains(e.target as Node)
      ) {
        setShowToolsDropdown(false);
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
    setIsDropdownOpen(value.trim().length > 0 || isSearchFocused);
  };

  const handleResultClick = (article: typeof researchArticles[0]) => {
    setIsDropdownOpen(false);
    setSearchQuery('');
    searchRef.current?.blur();
    const slug = article.slug || generateSlug(article.title);
    router.push(`/research/${slug}`);
  };

  // Crypto name to symbol mapping
  const cryptoNameToSymbol: Record<string, string> = {
    bitcoin: 'BTC',
    ethereum: 'ETH',
    solana: 'SOL',
    cardano: 'ADA',
    polkadot: 'DOT',
    polygon: 'MATIC',
    avalanche: 'AVAX',
    chainlink: 'LINK',
    uniswap: 'UNI',
    cosmos: 'ATOM',
    ripple: 'XRP',
    dogecoin: 'DOGE',
    shiba: 'SHIB',
    shibainu: 'SHIB',
    litecoin: 'LTC',
    'bitcoin cash': 'BCH',
    stellar: 'XLM',
    algorand: 'ALGO',
    near: 'NEAR',
    fantom: 'FTM',
    'the sandbox': 'SAND',
    sandbox: 'SAND',
    decentraland: 'MANA',
    apecoin: 'APE',
    arbitrum: 'ARB',
    optimism: 'OP',
    sui: 'SUI',
    aptos: 'APT',
  };

  // Index autocomplete options (futures indices)
  const indexAutocompleteOptions = [
    { name: 'E-mini S&P 500', ticker: 'ES' },
    { name: 'E-mini NASDAQ-100', ticker: 'NQ' },
    { name: 'E-mini Dow Jones', ticker: 'YM' },
    { name: 'E-mini Russell 2000', ticker: 'RTY' },
  ];

  // Crypto autocomplete options (name + ticker pairs)
  const cryptoAutocompleteOptions = [
    { name: 'Bitcoin', ticker: 'BTC' },
    { name: 'Ethereum', ticker: 'ETH' },
    { name: 'Solana', ticker: 'SOL' },
    { name: 'Cardano', ticker: 'ADA' },
    { name: 'Polkadot', ticker: 'DOT' },
    { name: 'Polygon', ticker: 'MATIC' },
    { name: 'Avalanche', ticker: 'AVAX' },
    { name: 'Chainlink', ticker: 'LINK' },
    { name: 'Uniswap', ticker: 'UNI' },
    { name: 'Cosmos', ticker: 'ATOM' },
    { name: 'Ripple', ticker: 'XRP' },
    { name: 'Dogecoin', ticker: 'DOGE' },
    { name: 'Shiba Inu', ticker: 'SHIB' },
    { name: 'Litecoin', ticker: 'LTC' },
    { name: 'Bitcoin Cash', ticker: 'BCH' },
    { name: 'Stellar', ticker: 'XLM' },
    { name: 'Algorand', ticker: 'ALGO' },
    { name: 'NEAR Protocol', ticker: 'NEAR' },
    { name: 'Fantom', ticker: 'FTM' },
    { name: 'The Sandbox', ticker: 'SAND' },
    { name: 'Decentraland', ticker: 'MANA' },
    { name: 'ApeCoin', ticker: 'APE' },
    { name: 'Arbitrum', ticker: 'ARB' },
    { name: 'Optimism', ticker: 'OP' },
    { name: 'Sui', ticker: 'SUI' },
    { name: 'Aptos', ticker: 'APT' },
  ];

  // Filter index autocomplete options based on search query
  const indexAutocomplete = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return indexAutocompleteOptions.filter((index) => {
      const nameMatch = index.name.toLowerCase().includes(q);
      const tickerMatch = index.ticker.toLowerCase().includes(q);
      return nameMatch || tickerMatch;
    }).slice(0, 5); // Limit to 5 suggestions
  }, [searchQuery]);

  // Filter crypto autocomplete options based on search query
  const cryptoAutocomplete = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return cryptoAutocompleteOptions.filter((crypto) => {
      const nameMatch = crypto.name.toLowerCase().includes(q);
      const tickerMatch = crypto.ticker.toLowerCase().includes(q);
      return nameMatch || tickerMatch;
    }).slice(0, 5); // Limit to 5 suggestions
  }, [searchQuery]);

  // Get crypto symbol from name or ticker
  const getCryptoSymbol = (query: string): string | null => {
    const trimmed = query.trim().toLowerCase();
    const upperTrimmed = query.trim().toUpperCase();
    
    // Check if it's already a known ticker
    const knownTickers = ['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'MATIC', 'AVAX', 'LINK', 'UNI', 'ATOM', 'XRP', 'DOGE', 'SHIB', 'LTC', 'BCH', 'XLM', 'ALGO', 'NEAR', 'FTM', 'SAND', 'MANA', 'APE', 'ARB', 'OP', 'SUI', 'APT'];
    if (knownTickers.includes(upperTrimmed)) {
      return upperTrimmed;
    }
    
    // Check if it's a crypto name
    if (cryptoNameToSymbol[trimmed]) {
      return cryptoNameToSymbol[trimmed];
    }
    
    // Check partial matches (e.g., "bitcoin" matches "bitcoin")
    for (const [name, symbol] of Object.entries(cryptoNameToSymbol)) {
      if (name.includes(trimmed) || trimmed.includes(name)) {
        return symbol;
      }
    }
    
    return null;
  };

  // Check if search query is an index (ticker)
  const isIndexTicker = (query: string): boolean => {
    const trimmed = query.trim().toUpperCase();
    return ['ES', 'NQ', 'YM', 'RTY'].includes(trimmed);
  };

  // Check if search query is a crypto (ticker or name)
  const isCryptoTicker = (query: string): boolean => {
    return getCryptoSymbol(query) !== null;
  };

  const handleIndexClick = (ticker: string) => {
    setIsDropdownOpen(false);
    setSearchQuery('');
    searchRef.current?.blur();
    router.push(`/indices/${ticker}`);
  };

  const handleTickerClick = (query: string) => {
    const symbol = getCryptoSymbol(query);
    if (symbol) {
      setIsDropdownOpen(false);
      setSearchQuery('');
      searchRef.current?.blur();
      router.push(`/ticker/${symbol}`);
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
    const raw = searchQuery.trim();
    if (!raw) return;
    setIsDropdownOpen(false);
    const q = raw.toUpperCase();
    if (q === 'CHAT') {
      openChat();
      setSearchQuery('');
      searchRef.current?.blur();
      return;
    }
    if (q === 'EI') {
      openEquityIndex();
      setSearchQuery('');
      searchRef.current?.blur();
      return;
    }
    if (q === 'R') {
      router.push('/research');
      setSearchQuery('');
      searchRef.current?.blur();
      return;
    }
    if (q === 'V') {
      router.push('/videos');
      setSearchQuery('');
      searchRef.current?.blur();
      return;
    }
    const parts = raw.split(/\s+/);
    if (parts[0].toUpperCase() === 'P' && parts[1]) {
      const ticker = parts[1].toUpperCase();
      if (SEARCH_TERMINAL_TICKERS.includes(ticker)) {
        openTicker(ticker);
        setSearchQuery('');
        searchRef.current?.blur();
        return;
      }
    }
    // Check if it's an index ticker
    if (isIndexTicker(raw)) {
      handleIndexClick(raw.toUpperCase());
      return;
    }
    router.push(`/research?q=${encodeURIComponent(raw)}`);
    setSearchQuery('');
    searchRef.current?.blur();
  };

  const handleBellClick = () => {
    router.push('/notifications');
  };


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
        {/* X (Twitter) Link */}
        <a
          href="https://x.com/primatetrading"
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg hover:bg-zinc-800/50 dark:hover:bg-zinc-800/50 transition-colors group"
          aria-label="Follow Primate Trading on X"
          title="Follow us on X"
        >
          <svg className="w-5 h-5 text-zinc-400 group-hover:text-[#1DA1F2] transition-colors" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </a>

        {/* Search Bar — only visible when logged in */}
        {isAuthenticated && <form onSubmit={handleSearchSubmit} className="relative">
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              handleSearchChange(e.target.value);
              const raw = e.target.value.trim();
              if (raw === 'P' || raw.toUpperCase().startsWith('P ')) {
                setSelectedPriceTickerIndex(0);
              } else {
                setSelectedSearchResultIndex(0); // Reset selection when query changes
              }
            }}
            onKeyDown={(e) => {
              const raw = searchQuery.trim();
              const showCommands = isDropdownOpen && isSearchFocused && !raw;
              const isPrice = raw === 'P' || raw.toUpperCase().startsWith('P ');
              const priceTickerPart = isPrice && raw.toUpperCase().startsWith('P ') ? raw.slice(1).trim().toUpperCase() : '';
              const priceTickers = isPrice
                ? (priceTickerPart ? SEARCH_TERMINAL_TICKERS.filter((t: string) => t.startsWith(priceTickerPart) || priceTickerPart.startsWith(t)) : SEARCH_TERMINAL_TICKERS)
                : [];
              if (showCommands) {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSelectedCommandIndex((i) => (i + 1) % 5);
                  return;
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSelectedCommandIndex((i) => (i - 1 + 5) % 5);
                  return;
                }
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (selectedCommandIndex === 0) {
                    setSearchQuery('P ');
                    setSelectedPriceTickerIndex(0);
                    setTimeout(() => searchRef.current?.focus(), 0);
                  } else if (selectedCommandIndex === 1) {
                    openChat();
                    setIsDropdownOpen(false);
                    setSearchQuery('');
                    searchRef.current?.blur();
                  } else if (selectedCommandIndex === 2) {
                    openEquityIndex();
                    setIsDropdownOpen(false);
                    setSearchQuery('');
                    searchRef.current?.blur();
                  } else if (selectedCommandIndex === 3) {
                    router.push('/research');
                    setIsDropdownOpen(false);
                    setSearchQuery('');
                    searchRef.current?.blur();
                  } else {
                    router.push('/videos');
                    setIsDropdownOpen(false);
                    setSearchQuery('');
                    searchRef.current?.blur();
                  }
                  return;
                }
              }
              if (isPrice && priceTickers.length > 0) {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSelectedPriceTickerIndex((i) => (i + 1) % priceTickers.length);
                  return;
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSelectedPriceTickerIndex((i) => (i - 1 + priceTickers.length) % priceTickers.length);
                  return;
                }
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const safeIdx = Math.min(selectedPriceTickerIndex, Math.max(0, priceTickers.length - 1));
                  const ticker = priceTickers[safeIdx];
                  if (ticker) {
                    openTicker(ticker);
                    setSearchQuery('');
                    setIsDropdownOpen(false);
                    searchRef.current?.blur();
                  }
                  return;
                }
              }
              
              // Handle arrow keys for search results (indices, crypto, articles)
              if (!showCommands && !isPrice && totalSearchItems > 0) {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSelectedSearchResultIndex((i) => (i + 1) % totalSearchItems);
                  return;
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSelectedSearchResultIndex((i) => (i - 1 + totalSearchItems) % totalSearchItems);
                  return;
                }
                if (e.key === 'Enter') {
                  e.preventDefault();
                  let currentIndex = 0;
                  
                  // Check if selected item is in index autocomplete
                  if (selectedSearchResultIndex < totalIndexItems) {
                    if (selectedSearchResultIndex < indexAutocomplete.length) {
                      handleIndexClick(indexAutocomplete[selectedSearchResultIndex].ticker);
                    } else if (hasIndexMatch) {
                      handleIndexClick(searchQuery.trim().toUpperCase());
                    }
                    return;
                  }
                  currentIndex += totalIndexItems;
                  
                  // Check if selected item is in crypto autocomplete
                  if (selectedSearchResultIndex < currentIndex + totalCryptoItems) {
                    const cryptoIdx = selectedSearchResultIndex - currentIndex;
                    if (cryptoIdx < cryptoAutocomplete.length) {
                      handleTickerClick(cryptoAutocomplete[cryptoIdx].ticker);
                    } else if (hasCryptoMatch) {
                      handleTickerClick(searchQuery.trim());
                    }
                    return;
                  }
                  currentIndex += totalCryptoItems;
                  
                  // Check if selected item is in article results
                  if (selectedSearchResultIndex < currentIndex + totalArticleItems) {
                    const articleIdx = selectedSearchResultIndex - currentIndex;
                    if (articleIdx < searchResults.length) {
                      handleResultClick(searchResults[articleIdx]);
                    }
                    return;
                  }
                }
              }
            }}
            onFocus={() => {
              setIsSearchFocused(true);
              setIsDropdownOpen(true);
              const q = searchQuery.trim();
              if (!q) setSelectedCommandIndex(0);
              if (q === 'P' || q.toUpperCase().startsWith('P ')) {
                setSelectedPriceTickerIndex(0);
              }
              if (q === 'P' || q.toUpperCase().startsWith('P ')) setIsDropdownOpen(true);
              else if (q) {
                const qLower = q.toLowerCase();
                const hasIndexMatch = indexAutocompleteOptions.some(i =>
                  i.name.toLowerCase().includes(qLower) || i.ticker.toLowerCase().includes(qLower)
                ) || isIndexTicker(searchQuery);
                const hasCryptoMatch = cryptoAutocompleteOptions.some(c =>
                  c.name.toLowerCase().includes(qLower) || c.ticker.toLowerCase().includes(qLower)
                ) || isCryptoTicker(searchQuery);
                const hasArticleMatch = researchArticles.some(article => {
                  const searchText = `${article.title} ${article.description} ${article.content || ''}`.toLowerCase();
                  return searchText.includes(qLower);
                });
                if (hasIndexMatch || hasCryptoMatch || hasArticleMatch) setIsDropdownOpen(true);
              }
            }}
            onBlur={() => setIsSearchFocused(false)}
            placeholder={searchPlaceholder || 'Search Terminal... (Press ` to open)'}
            className={`w-56 lg:w-80 px-3 py-1.5 pl-9 bg-white/80 dark:bg-zinc-800/80 border rounded-lg text-sm text-black dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
              isSearchFocused
                ? 'border-blue-500 w-64 lg:w-96'
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
          {isDropdownOpen && (searchQuery.trim() || isSearchFocused) ? (() => {
              const raw = searchQuery.trim();
              const showCommandsList = !raw && isSearchFocused;
              if (showCommandsList) {
                return (
                  <div
                    ref={dropdownRef}
                    className="absolute top-full mt-1.5 right-0 w-64 lg:w-96 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl overflow-hidden"
                  >
                    <div className="px-2 py-1 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                      <span className="text-[9px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Commands</span>
                    </div>
                    <div className="py-0.5">
                      {[
                        { cmd: 'P', label: 'Live Price', onSelect: () => { setSearchQuery('P '); setSelectedPriceTickerIndex(0); searchRef.current?.focus(); } },
                        { cmd: 'CHAT', label: 'Live Chat', onSelect: () => { openChat(); setIsDropdownOpen(false); setSearchQuery(''); searchRef.current?.blur(); } },
                        { cmd: 'EI', label: 'US Equity Index Futures (ES, YM, NQ)', onSelect: () => { openEquityIndex(); setIsDropdownOpen(false); setSearchQuery(''); searchRef.current?.blur(); } },
                        { cmd: 'R', label: 'Research', onSelect: () => { router.push('/research'); setIsDropdownOpen(false); setSearchQuery(''); searchRef.current?.blur(); } },
                        { cmd: 'V', label: 'The Vault / Videos', onSelect: () => { router.push('/videos'); setIsDropdownOpen(false); setSearchQuery(''); searchRef.current?.blur(); } },
                      ].map((item, idx) => (
                        <button
                          key={item.cmd}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSelectedCommandIndex(idx);
                            item.onSelect();
                          }}
                          className={`w-full text-left px-2 py-1 transition-colors flex items-center gap-2 text-[11px] font-medium text-zinc-800 dark:text-zinc-200 ${idx === selectedCommandIndex ? 'bg-blue-500/15 dark:bg-blue-500/20' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
                        >
                          <span className="inline-flex items-center justify-center rounded px-1 py-0.5 text-[9px] font-bold text-blue-400 bg-blue-500/15 dark:bg-blue-500/20 border border-blue-500/50">{item.cmd}</span>
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }
              const isPriceCommand = raw === 'P' || raw.toUpperCase().startsWith('P ');
              const priceTickerPart = isPriceCommand && raw.toUpperCase().startsWith('P ') ? raw.slice(1).trim().toUpperCase() : '';
              const priceTickers = priceTickerPart
                ? SEARCH_TERMINAL_TICKERS.filter(t => t.startsWith(priceTickerPart) || priceTickerPart.startsWith(t))
                : SEARCH_TERMINAL_TICKERS;
              const showPriceDropdown = isPriceCommand;
              const showEIDropdown = raw.toUpperCase() === 'EI';
              const showRDropdown = raw.toUpperCase() === 'R';
              const showVDropdown = raw.toUpperCase() === 'V';
              const showOther = !showPriceDropdown && !showEIDropdown && !showRDropdown && !showVDropdown && (indexAutocomplete.length > 0 || isIndexTicker(searchQuery) || cryptoAutocomplete.length > 0 || isCryptoTicker(searchQuery) || searchResults.length > 0);
              if (showRDropdown) {
                return (
                  <div
                    ref={dropdownRef}
                    className="absolute top-full mt-1.5 right-0 w-64 lg:w-96 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl overflow-hidden"
                  >
                    <div className="px-2 py-1.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex items-center gap-2">
                      <span className="inline-flex items-center justify-center rounded px-1 py-0.5 text-[9px] font-bold text-blue-400 bg-blue-500/15 dark:bg-blue-500/20 border border-blue-500/50">R</span>
                      <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-200">Research</span>
                    </div>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        router.push('/research');
                        setSearchQuery('');
                        setIsDropdownOpen(false);
                        searchRef.current?.blur();
                      }}
                      className="w-full text-left px-2 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-[11px] font-medium text-zinc-800 dark:text-zinc-200"
                    >
                      Go to Research page
                    </button>
                  </div>
                );
              }
              if (showVDropdown) {
                return (
                  <div
                    ref={dropdownRef}
                    className="absolute top-full mt-1.5 right-0 w-64 lg:w-96 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl overflow-hidden"
                  >
                    <div className="px-2 py-1.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex items-center gap-2">
                      <span className="inline-flex items-center justify-center rounded px-1 py-0.5 text-[9px] font-bold text-blue-400 bg-blue-500/15 dark:bg-blue-500/20 border border-blue-500/50">V</span>
                      <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-200">The Vault / Videos</span>
                    </div>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        router.push('/videos');
                        setSearchQuery('');
                        setIsDropdownOpen(false);
                        searchRef.current?.blur();
                      }}
                      className="w-full text-left px-2 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-[11px] font-medium text-zinc-800 dark:text-zinc-200"
                    >
                      Go to The Vault (Videos)
                    </button>
                  </div>
                );
              }
              if (showEIDropdown) {
                return (
                  <div
                    ref={dropdownRef}
                    className="absolute top-full mt-1.5 right-0 w-64 lg:w-96 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl overflow-hidden"
                  >
                    <div className="px-2 py-1.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex items-center gap-2">
                      <span className="inline-flex items-center justify-center rounded px-1 py-0.5 text-[9px] font-bold text-blue-400 bg-blue-500/15 dark:bg-blue-500/20 border border-blue-500/50">EI</span>
                      <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-200">US Equity Index Futures</span>
                    </div>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        openEquityIndex();
                        setSearchQuery('');
                        setIsDropdownOpen(false);
                        searchRef.current?.blur();
                      }}
                      className="w-full text-left px-2 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2 text-[11px] font-medium text-zinc-800 dark:text-zinc-200"
                    >
                      <span className="inline-flex items-center justify-center rounded px-1 py-0.5 text-[9px] font-bold bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">ES, YM, NQ</span>
                      Open comparison
                    </button>
                  </div>
                );
              }
              if (!showPriceDropdown && !showOther) return null;
              return (
            <div
              ref={dropdownRef}
              className="absolute top-full mt-2 right-0 w-80 lg:w-96 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl overflow-hidden"
            >
              {/* P = Price Quote / Live Price */}
              {showPriceDropdown && (
                <>
                  <div className="px-2.5 py-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex items-center gap-2">
                    <span className="inline-flex items-center justify-center rounded px-1 py-0.5 text-[9px] font-bold text-blue-400 bg-blue-500/15 dark:bg-blue-500/20 border border-blue-500/50">P</span>
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">Live Price</span>
                  </div>
                  <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">Type a ticker: NQ, ES, YM, BTC</span>
                  </div>
                  {priceTickers.length > 0 ? (
                    <div className="max-h-40 overflow-y-auto">
                      {priceTickers.map((ticker, idx) => {
                        const effectiveIdx = Math.min(selectedPriceTickerIndex, Math.max(0, priceTickers.length - 1));
                        return (
                        <button
                          key={ticker}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSelectedPriceTickerIndex(idx);
                            openTicker(ticker);
                            setSearchQuery('');
                            setIsDropdownOpen(false);
                            searchRef.current?.blur();
                          }}
                          className={`w-full text-left px-4 py-2.5 transition-colors flex items-center gap-3 text-sm font-medium text-zinc-800 dark:text-zinc-200 ${idx === effectiveIdx ? 'bg-blue-500/15 dark:bg-blue-500/20' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
                        >
                          <span className="w-8 h-6 rounded bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-bold">{ticker}</span>
                          Open live price
                        </button>
                      );})}
                    </div>
                  ) : (
                    <div className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">No matching ticker. Try NQ, ES, YM, BTC.</div>
                  )}
                </>
              )}
              {showOther && (
              <>
              {/* Index Autocomplete Suggestions */}
              {indexAutocomplete.length > 0 && (
                <>
                  <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                    <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                      Futures Indices
                    </span>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {indexAutocomplete.map((index, idx) => {
                      const isSelected = selectedSearchResultIndex === idx;
                      return (
                      <button
                        key={idx}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSelectedSearchResultIndex(idx);
                          handleIndexClick(index.ticker);
                        }}
                        className={`w-full text-left px-4 py-3 transition-colors border-b border-zinc-100 dark:border-zinc-800 last:border-b-0 ${
                          isSelected 
                            ? 'bg-blue-500/15 dark:bg-blue-500/20' 
                            : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <svg
                            className="w-5 h-5 text-purple-500 shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm text-black dark:text-zinc-50">
                              {index.name}
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                              {index.ticker}
                            </div>
                          </div>
                        </div>
                      </button>
                      );
                    })}
                  </div>
                  {(isIndexTicker(searchQuery) || cryptoAutocomplete.length > 0 || isCryptoTicker(searchQuery) || searchResults.length > 0) && (
                    <div className="border-t border-zinc-100 dark:border-zinc-800" />
                  )}
                </>
              )}

              {/* Index ticker option */}
              {isIndexTicker(searchQuery) && !indexAutocomplete.some(i => i.ticker === searchQuery.trim().toUpperCase()) && (
                <>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setSelectedSearchResultIndex(indexAutocomplete.length);
                      handleIndexClick(searchQuery.trim().toUpperCase());
                    }}
                    className={`w-full text-left px-4 py-3 transition-colors border-b border-zinc-100 dark:border-zinc-800 ${
                      selectedSearchResultIndex === indexAutocomplete.length
                        ? 'bg-blue-500/15 dark:bg-blue-500/20'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <svg
                        className="w-5 h-5 text-purple-500 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <div>
                        <div className="font-medium text-sm text-black dark:text-zinc-50">
                          View {searchQuery.trim().toUpperCase()} Analysis
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          Market structure, HOLC, seasonality & more
                        </div>
                      </div>
                    </div>
                  </button>
                  {(cryptoAutocomplete.length > 0 || isCryptoTicker(searchQuery) || searchResults.length > 0) && (
                    <div className="border-t border-zinc-100 dark:border-zinc-800" />
                  )}
                </>
              )}

              {/* Crypto Autocomplete Suggestions */}
              {cryptoAutocomplete.length > 0 && (
                <>
                  <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                    <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                      Cryptocurrencies
                    </span>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {cryptoAutocomplete.map((crypto, index) => {
                      const totalIndexItems = indexAutocomplete.length + (isIndexTicker(searchQuery) && !indexAutocomplete.some(i => i.ticker === searchQuery.trim().toUpperCase()) ? 1 : 0);
                      const cryptoIdx = totalIndexItems + index;
                      const isSelected = selectedSearchResultIndex === cryptoIdx;
                      return (
                      <button
                        key={index}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSelectedSearchResultIndex(cryptoIdx);
                          handleTickerClick(crypto.ticker);
                        }}
                        className={`w-full text-left px-4 py-3 transition-colors border-b border-zinc-100 dark:border-zinc-800 last:border-b-0 ${
                          isSelected
                            ? 'bg-blue-500/15 dark:bg-blue-500/20'
                            : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <svg
                            className="w-5 h-5 text-blue-500 shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm text-black dark:text-zinc-50">
                              {crypto.name}
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                              {crypto.ticker}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  {(isCryptoTicker(searchQuery) || searchResults.length > 0) && (
                    <div className="border-t border-zinc-100 dark:border-zinc-800" />
                  )}
                </>
              )}

              {/* Crypto ticker option */}
              {isCryptoTicker(searchQuery) && !cryptoAutocomplete.some(c => c.ticker === getCryptoSymbol(searchQuery)) && (
                <>
                  {(() => {
                    const totalIndexItems = indexAutocomplete.length + (isIndexTicker(searchQuery) && !indexAutocomplete.some(i => i.ticker === searchQuery.trim().toUpperCase()) ? 1 : 0);
                    const cryptoIdx = totalIndexItems + cryptoAutocomplete.length;
                    const isSelected = selectedSearchResultIndex === cryptoIdx;
                    return (
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setSelectedSearchResultIndex(cryptoIdx);
                      handleTickerClick(searchQuery.trim());
                    }}
                    className={`w-full text-left px-4 py-3 transition-colors border-b border-zinc-100 dark:border-zinc-800 ${
                      isSelected
                        ? 'bg-blue-500/15 dark:bg-blue-500/20'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <svg
                        className="w-5 h-5 text-blue-500 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <div>
                        <div className="font-medium text-sm text-black dark:text-zinc-50">
                          View {searchQuery.trim().toUpperCase()} Details
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          Crypto statistics, charts & analysis
                        </div>
                      </div>
                    </div>
                  </button>
                  {searchResults.length > 0 && (
                    <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                      <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                        Related Articles ({searchResults.length})
                      </span>
                    </div>
                  )}
                </>
              )}

              {searchResults.length > 0 ? (
                <>
                  {!isCryptoTicker(searchQuery) && (
                    <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
                      <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                        {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                  <div className="max-h-80 overflow-y-auto">
                    {searchResults.map((article, index) => {
                      const totalIndexItems = indexAutocomplete.length + (isIndexTicker(searchQuery) && !indexAutocomplete.some(i => i.ticker === searchQuery.trim().toUpperCase()) ? 1 : 0);
                      const hasCryptoMatch = isCryptoTicker(searchQuery) && !cryptoAutocomplete.some(c => c.ticker === getCryptoSymbol(searchQuery));
                      const totalCryptoItems = cryptoAutocomplete.length + (hasCryptoMatch ? 1 : 0);
                      const articleIdx = totalIndexItems + totalCryptoItems + index;
                      const isSelected = selectedSearchResultIndex === articleIdx;
                      return (
                      <button
                        key={index}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSelectedSearchResultIndex(articleIdx);
                          handleResultClick(article);
                        }}
                        className={`w-full text-left px-4 py-3 transition-colors border-b border-zinc-100 dark:border-zinc-800 last:border-b-0 ${
                          isSelected
                            ? 'bg-blue-500/15 dark:bg-blue-500/20'
                            : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'
                        }`}
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
                    );
                    })}
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
            </>
              )}
            </div>
          );
        })() : null}
        </form>}

        {/* Auth buttons */}
        {isAuthenticated ? (
          <div className="flex items-center gap-2">
            <div
              className="relative"
              ref={profileDropdownRef}
              onMouseEnter={() => setShowProfileDropdown(true)}
              onMouseLeave={() => setShowProfileDropdown(false)}
            >
              <button
                onClick={() => {
                  router.push('/profile');
                  setShowProfileDropdown(false);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors group"
              >
                <span className={`relative group/badge cursor-default flex items-center verified-badge ${username === 'noticetrades' ? 'founder-badge' : ''}`} title={username === 'noticetrades' ? 'Founder' : 'Premium'}>
                  <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    {/* Three rotated rounded rectangles form the seal/flower shape */}
                    <rect x="3.5" y="3.5" width="17" height="17" rx="4" fill={username === 'noticetrades' ? '#FFD700' : '#1DA1F2'} />
                    <rect x="3.5" y="3.5" width="17" height="17" rx="4" fill={username === 'noticetrades' ? '#FFD700' : '#1DA1F2'} transform="rotate(30 12 12)" />
                    <rect x="3.5" y="3.5" width="17" height="17" rx="4" fill={username === 'noticetrades' ? '#FFD700' : '#1DA1F2'} transform="rotate(60 12 12)" />
                    {/* White checkmark */}
                    <path d="M7.5 12.5l3 3 6-6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                  <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white bg-zinc-800 border border-zinc-700 rounded-md opacity-0 group-hover/badge:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50 shadow-lg">
                    {username === 'noticetrades' ? 'Founder' : 'Premium'}
                  </span>
                </span>
                <span className="text-sm font-medium text-zinc-300 max-w-[120px] truncate">
                  {username}
                </span>
                <svg
                  className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${showProfileDropdown ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showProfileDropdown && (
                <div className="absolute top-full right-0 pt-2 w-56 z-50">
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          router.push('/profile');
                          setShowProfileDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-3"
                      >
                        <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Profile & Settings
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chat and Notification Buttons */}
            <div className="flex items-center gap-0.5">
              {/* Chat Button - opens popup */}
              <button
                onClick={() => openChat()}
                className="relative p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
                title="Chat (popup)"
                suppressHydrationWarning
              >
                <svg className="w-5 h-5 text-zinc-400 hover:text-zinc-100 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>

              {/* Notification Bell */}
              <div className="relative">
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
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="shake-on-hover text-xs font-bold text-red-500 border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ml-2"
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
            <a
              href="/"
              onClick={(e) => {
                if (pathname === '/') {
                  e.preventDefault();
                  scrollToSection('home');
                }
              }}
              className="nav-logo-float flex items-center justify-center rounded-md bg-white dark:bg-zinc-100 p-0.5 shadow-sm border border-zinc-200 dark:border-zinc-300 shrink-0 cursor-pointer select-none"
              style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}
            >
              <span className="[&>div]:!w-10 [&>div]:!h-10">
                <Logo />
              </span>
            </a>
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
              
              {/* Tools Dropdown */}
              <div 
                className="relative" 
                ref={toolsDropdownRef}
                onMouseEnter={() => setShowToolsDropdown(true)}
                onMouseLeave={() => setShowToolsDropdown(false)}
              >
                <button
                  onClick={() => setShowToolsDropdown(!showToolsDropdown)}
                  className="nav-link text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer flex items-center gap-1.5"
                  suppressHydrationWarning
                >
                  The Jungle
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${showToolsDropdown ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showToolsDropdown && (
                  <div className="absolute top-full left-0 pt-2 w-56 z-50">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
                      <div className="py-1">
                        <button
                          onClick={() => {
                            handleNavClick('/videos');
                            setShowToolsDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-3"
                        >
                          <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Videos (The Vault)
                        </button>
                        <button
                          onClick={() => {
                            handleNavClick('/trades');
                            setShowToolsDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-3"
                        >
                          <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          Live Trades
                        </button>
                        <button
                          onClick={() => {
                            handleNavClick('/calendar');
                            setShowToolsDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-3"
                        >
                          <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Calendar
                        </button>
                        <button
                          onClick={() => {
                            openChat();
                            setShowToolsDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-3"
                        >
                          <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          Chat
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
