'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

export default function FeedbackWidget() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleOpen = () => {
    const isAuthenticated = !!getCookie('user_email');
    if (!isAuthenticated) {
      router.push('/signup?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    setIsOpen(true);
    setStatus('idle');
    setStatusMessage('');
  };

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSending(true);
    setStatus('idle');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, message: message.trim() }),
      });
      if (res.ok) {
        setStatus('success');
        setStatusMessage('Thanks for your feedback!');
        setMessage('');
        setCategory('general');
        setTimeout(() => {
          setIsOpen(false);
          setStatus('idle');
        }, 2000);
      } else {
        const data = await res.json();
        setStatus('error');
        setStatusMessage(data.error || 'Something went wrong');
      }
    } catch {
      setStatus('error');
      setStatusMessage('Failed to send. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50" ref={panelRef}>
      {/* Feedback Form Panel */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-[340px] bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Send Feedback</h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">Help us improve Primate Research</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {/* Category */}
            <div>
              <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">Category</label>
              <div className="flex gap-2">
                {[
                  { value: 'general', label: 'General' },
                  { value: 'feature', label: 'Feature Request' },
                  { value: 'bug', label: 'Bug Report' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setCategory(opt.value)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                      category === opt.value
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-zinc-300 hover:border-zinc-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Share your feedback, suggestions, or feature ideas..."
                rows={4}
                className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Status */}
            {status !== 'idle' && (
              <div className={`text-xs font-medium px-3 py-2 rounded-lg ${
                status === 'success'
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {statusMessage}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={sending || !message.trim()}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {sending ? 'Sending...' : 'Submit Feedback'}
            </button>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={handleOpen}
        className="w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 transition-all duration-200 flex items-center justify-center hover:scale-105 active:scale-95"
        title="Send Feedback"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>
    </div>
  );
}


