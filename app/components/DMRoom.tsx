'use client';

import { useState, useEffect, useRef, useCallback, ReactNode } from 'react';

interface DMMessage {
  id: number;
  dm_id: number;
  sender_email: string;
  username: string;
  message_text: string;
  created_at: string;
}

interface DMRoomProps {
  dmId: number;
  otherUser: { email: string; username: string };
  currentUserEmail: string;
  currentUsername: string;
}

function linkifyText(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let keyCounter = 0;
  let lastIndex = 0;
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/g;
  let match;
  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    let url = match[1];
    const displayUrl = url.length > 50 ? url.substring(0, 47) + '...' : url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
    parts.push(
      <a
        key={`link-${keyCounter++}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 hover:text-blue-300 underline break-all"
        onClick={(e) => e.stopPropagation()}
      >
        {displayUrl}
      </a>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.substring(lastIndex));
  return parts.length > 0 ? <>{parts}</> : text;
}

function formatTime(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function DMRoom({ dmId, otherUser, currentUserEmail, currentUsername }: DMRoomProps) {
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    setIsLoading(true);
    setMessages([]);
    const load = async () => {
      try {
        const res = await fetch(`/api/chat/dms/${dmId}/messages`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
        }
      } catch (e) {
        console.error('Error loading DM messages:', e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [dmId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newMessage.trim();
    if (!text || isSending) return;
    setIsSending(true);
    setNewMessage('');
    try {
      const res = await fetch(`/api/chat/dms/${dmId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_text: text }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message?.id)) return prev;
          return [...prev, data.message];
        });
        scrollToBottom();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to send');
        setNewMessage(text);
      }
    } catch (e) {
      console.error('Send DM error:', e);
      setNewMessage(text);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden">
      <div className="flex items-center gap-2 shrink-0 px-3 py-2 border-b border-zinc-700/80">
        <h2 className="text-sm font-semibold text-white truncate">{otherUser.username}</h2>
        {messages.length > 0 && (
          <span className="text-xs text-zinc-500">· {messages.length}</span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-zinc-500 text-sm">Loading...</div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center text-zinc-500 text-sm">
            <p>No messages yet.</p>
            <p className="mt-1 text-xs">Send a message to start.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.sender_email === currentUserEmail;
            return (
              <div key={msg.id} className="flex gap-2">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-700/80 flex items-center justify-center">
                  <span className="text-zinc-300 text-xs font-medium">
                    {msg.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs font-medium text-blue-400">{msg.username}</span>
                    <span className="text-[10px] text-zinc-500">{formatTime(msg.created_at)}</span>
                  </div>
                  <div
                    className={`inline-block px-3 py-1.5 rounded-md max-w-[90%] text-sm ${
                      isOwn ? 'bg-blue-600/80 text-white' : 'bg-zinc-800/90 text-zinc-100 border border-zinc-700/50'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words text-[13px]">{linkifyText(msg.message_text)}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSend} className="shrink-0 border-t border-zinc-700/80 px-3 py-2 bg-zinc-800/50">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Message..."
            maxLength={2000}
            disabled={isSending}
            className="flex-1 px-3 py-1.5 text-sm bg-zinc-900/80 border border-zinc-700/80 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md font-medium hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSending ? '…' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}
