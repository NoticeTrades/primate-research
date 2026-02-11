'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '../components/Navigation';
import CursorGlow from '../components/CursorGlow';
import CursorHover from '../components/CursorHover';
import DiscordSign from '../components/DiscordSign';
import ScrollFade from '../components/ScrollFade';
import MarketTicker from '../components/MarketTicker';

interface Notification {
  id: number;
  title: string;
  description: string;
  link: string;
  type: string;
  created_at: string;
  is_read: boolean;
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(false);
  const [isUpdatingPreferences, setIsUpdatingPreferences] = useState(false);
  const [previousNotificationCount, setPreviousNotificationCount] = useState(0);

  // Check authentication and fetch preferences
  useEffect(() => {
    const email = getCookie('user_email');
    if (!email) {
      router.push('/signup?redirect=/notifications');
      return;
    }
    
    // Fetch browser notification preference
    const fetchPreferences = async () => {
      try {
        const res = await fetch('/api/notifications/preferences');
        if (res.ok) {
          const data = await res.json();
          setBrowserNotificationsEnabled(data.browserNotificationsEnabled || false);
        }
      } catch (err) {
        console.error('Failed to fetch preferences:', err);
      }
    };
    
    fetchPreferences();
  }, [router]);

  // Fetch notifications (silent background refresh after initial load)
  const fetchNotifications = async (isInitial = false) => {
    if (isInitial) {
      setLoading(true);
    }
    setError(null);
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/signup?redirect=/notifications');
          return;
        }
        throw new Error('Failed to fetch notifications');
      }
      const data = await res.json();
      const newNotifications = data.notifications || [];
      
      // Check for new notifications and show browser notification if enabled
      if (!isInitial && browserNotificationsEnabled && 'Notification' in window) {
        const unreadCount = newNotifications.filter((n: Notification) => !n.is_read).length;
        const previousUnreadCount = notifications.filter((n) => !n.is_read).length;
        
        if (unreadCount > previousUnreadCount) {
          // New unread notifications arrived
          const newUnread = newNotifications
            .filter((n: Notification) => !n.is_read)
            .slice(0, unreadCount - previousUnreadCount);
          
          newUnread.forEach((notification: Notification) => {
            if (Notification.permission === 'granted') {
              new Notification(notification.title, {
                body: notification.description || '',
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: `notification-${notification.id}`,
                requireInteraction: false,
              });
            }
          });
        }
      }
      
      setNotifications(newNotifications);
    } catch (err) {
      // Only show error on initial load, not on background refreshes
      if (isInitial) {
        setError(err instanceof Error ? err.message : 'Failed to load notifications');
      }
    } finally {
      if (isInitial) {
        setLoading(false);
        setInitialLoad(false);
      }
    }
  };

  useEffect(() => {
    // Initial load with loading state
    fetchNotifications(true);
    // Background refresh every 5 seconds (silent, no loading state)
    const interval = setInterval(() => fetchNotifications(false), 5000);
    // Also refetch when the user focuses the tab or window becomes visible (silent)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', () => fetchNotifications(false));
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', () => fetchNotifications(false));
    };
  }, []);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(e.target as Node)
      ) {
        setShowFilterDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Delete single notification
  const handleDelete = async (id: number) => {
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete notification');
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete notification');
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    setIsMarkingAllRead(true);
    try {
      const res = await fetch('/api/notifications/read', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to mark as read');
      await fetchNotifications();
    } catch (err) {
      console.error('Mark all read error:', err);
      alert('Failed to mark all as read');
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  // Clear all notifications
  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all notifications? This cannot be undone.')) {
      return;
    }
    setIsClearingAll(true);
    try {
      const res = await fetch('/api/notifications/clear', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to clear notifications');
      setNotifications([]);
      // Trigger a refetch to update the unread count in Navigation
      await fetchNotifications();
      // Also trigger a custom event that Navigation can listen to
      window.dispatchEvent(new CustomEvent('notificationsCleared'));
    } catch (err) {
      console.error('Clear all error:', err);
      alert('Failed to clear notifications');
    } finally {
      setIsClearingAll(false);
    }
  };

  // Get unique notification types
  const notificationTypes = Array.from(new Set(notifications.map((n) => n.type))).sort();

  // Filter notifications
  const filteredNotifications = notifications.filter((n) => {
    if (typeFilter === 'all') return true;
    if (typeFilter === 'unread') return !n.is_read;
    return n.type === typeFilter;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Handle browser notification toggle
  const handleToggleBrowserNotifications = async () => {
    if (!('Notification' in window)) {
      alert('Your browser does not support notifications');
      return;
    }

    const newValue = !browserNotificationsEnabled;

    // If enabling, request permission first
    if (newValue) {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          alert('Notification permission denied. Please enable it in your browser settings.');
          return;
        }
      } else if (Notification.permission === 'denied') {
        alert('Notification permission is denied. Please enable it in your browser settings.');
        return;
      }
    }

    setIsUpdatingPreferences(true);
    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newValue }),
      });

      if (!res.ok) {
        throw new Error('Failed to update preferences');
      }

      setBrowserNotificationsEnabled(newValue);
    } catch (err) {
      console.error('Failed to update preferences:', err);
      alert('Failed to update notification preferences');
    } finally {
      setIsUpdatingPreferences(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'article':
      case 'research':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'update':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case 'video':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        );
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'article':
      case 'research':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'update':
        return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
      case 'video':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      default:
        return 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-black dark:bg-zinc-950 relative">
      <CursorGlow />
      <CursorHover />
      <DiscordSign />
      <ScrollFade />
      <Navigation />
      <div className="fixed top-[72px] left-0 right-0 z-40">
        <MarketTicker />
      </div>

      <div className="pt-44 pb-24 px-4 md:px-6 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-blue-600/20 rounded-xl">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Notifications</h1>
                <p className="text-zinc-500 text-sm mt-0.5">
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                </p>
              </div>
            </div>
          </div>

          {/* Browser Notifications Toggle */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl px-5 py-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600/20 rounded-lg">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">Browser Notifications</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Get notified in your browser when new notifications arrive
                  </p>
                </div>
              </div>
              <button
                onClick={handleToggleBrowserNotifications}
                disabled={isUpdatingPreferences || !('Notification' in window)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed ${
                  browserNotificationsEnabled ? 'bg-blue-600' : 'bg-zinc-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    browserNotificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            {!('Notification' in window) && (
              <p className="text-xs text-yellow-400 mt-2">
                Your browser does not support notifications
              </p>
            )}
            {Notification.permission === 'denied' && (
              <p className="text-xs text-yellow-400 mt-2">
                Notifications are blocked. Please enable them in your browser settings.
              </p>
            )}
          </div>

          {/* Actions Bar */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl px-5 py-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Filter Dropdown */}
            <div 
              className="relative" 
              ref={filterDropdownRef}
              onMouseEnter={() => setShowFilterDropdown(true)}
              onMouseLeave={() => setShowFilterDropdown(false)}
            >
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Filter by Type:</label>
                <button
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm font-medium text-zinc-200 hover:bg-zinc-800 hover:border-zinc-600 transition-colors"
                >
                  <span>
                    {typeFilter === 'all'
                      ? 'All Notifications'
                      : typeFilter === 'unread'
                        ? 'Unread Only'
                        : typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1)}
                  </span>
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${showFilterDropdown ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {showFilterDropdown && (
                <div className="absolute top-full left-0 pt-2 w-56 z-50">
                  <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setTypeFilter('all');
                        setShowFilterDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors flex items-center gap-3 ${
                        typeFilter === 'all'
                          ? 'bg-blue-500/15 text-blue-400 border-l-2 border-blue-500'
                          : 'text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      All Notifications
                    </button>
                    <button
                      onClick={() => {
                        setTypeFilter('unread');
                        setShowFilterDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors flex items-center gap-3 ${
                        typeFilter === 'unread'
                          ? 'bg-blue-500/15 text-blue-400 border-l-2 border-blue-500'
                          : 'text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      Unread Only
                    </button>
                    {notificationTypes.length > 0 && (
                      <>
                        <div className="h-px bg-zinc-800 my-1" />
                        {notificationTypes.map((type) => (
                          <button
                            key={type}
                            onClick={() => {
                              setTypeFilter(type);
                              setShowFilterDropdown(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors flex items-center gap-3 ${
                              typeFilter === type
                                ? 'bg-blue-500/15 text-blue-400 border-l-2 border-blue-500'
                                : 'text-zinc-300 hover:bg-zinc-800'
                            }`}
                          >
                            <div className={`p-1 rounded ${getTypeColor(type)}`}>
                              {getTypeIcon(type)}
                            </div>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </button>
                        ))}
                      </>
                    )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={isMarkingAllRead}
                  className="px-4 py-1.5 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isMarkingAllRead ? 'Marking...' : 'Mark All Read'}
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  disabled={isClearingAll}
                  className="px-4 py-1.5 text-sm font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isClearingAll ? 'Clearing...' : 'Clear All'}
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-zinc-400">Loading notifications...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
              <p className="text-red-400 text-sm font-medium">{error}</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-12 text-center">
              <svg className="w-12 h-12 text-zinc-700 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <p className="text-zinc-400 text-sm font-medium mb-1">No notifications</p>
              <p className="text-zinc-600 text-xs">
                {typeFilter === 'all' ? "You're all caught up!" : `No ${typeFilter} notifications`}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`bg-zinc-900/80 border rounded-xl overflow-hidden transition-all hover:border-zinc-600 ${
                    notification.is_read
                      ? 'border-zinc-800/60 opacity-75'
                      : 'border-zinc-800 shadow-[0_0_15px_rgba(59,130,246,0.08)]'
                  }`}
                >
                  <div className="flex items-start gap-4 p-4">
                    {/* Type Icon */}
                    <div className={`p-2 rounded-lg ${getTypeColor(notification.type)} shrink-0`}>
                      {getTypeIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <div className="flex-1 min-w-0">
                          <h3 className={`text-sm font-semibold mb-0.5 ${notification.is_read ? 'text-zinc-400' : 'text-zinc-100'}`}>
                            {notification.title}
                          </h3>
                          <p className="text-xs text-zinc-500 mb-2">{notification.description}</p>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-zinc-600">{formatDate(notification.created_at)}</span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${getTypeColor(notification.type)}`}>
                              {notification.type}
                            </span>
                            {!notification.is_read && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                                New
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDelete(notification.id)}
                          disabled={deletingIds.has(notification.id)}
                          className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete notification"
                        >
                          {deletingIds.has(notification.id) ? (
                            <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>

                      {/* Link Button */}
                      {notification.link && (
                        <a
                          href={notification.link}
                          className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg transition-colors"
                        >
                          View
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

