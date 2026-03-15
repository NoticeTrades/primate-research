'use client';

import { useState, useEffect, useRef, useCallback, useMemo, Fragment, ReactNode } from 'react';
import Link from 'next/link';
import { isChatTicker, getTickerHref } from '@/lib/chatTickers';

const tickerDataCache: Record<string, { price: number; changePercent: number } | null> = {};

const CHAT_TICKER_POLL_MS = 5000; // refresh ticker price and % in chat every 5 seconds
const SCROLL_STORAGE_PREFIX = 'chatScroll:';

/** Match words that could be tickers (2–6 letters, or $TICKER). */
const TICKER_WORD_REGEX = /\$[A-Za-z]{1,6}\b|\b[A-Za-z]{2,6}\b/g;

function formatTickerPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return price.toFixed(2);
}

function TickerPill({ symbol }: { symbol: string }) {
  const sym = symbol.toUpperCase().replace(/^\$/, '');
  const [data, setData] = useState<{ price: number; changePercent: number } | null | undefined>(tickerDataCache[sym] ?? undefined);
  const [flash, setFlash] = useState(false);
  const prevDataRef = useRef<{ price: number; changePercent: number } | null>(null);

  useEffect(() => {
    const fetchTicker = () => {
      fetch(`/api/market-data?symbol=${encodeURIComponent(sym)}&t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.price != null && !d.error) {
            const out = { price: Number(d.price), changePercent: Number(d.changePercent) || 0 };
            const prev = prevDataRef.current;
            const changed = prev != null && (prev.price !== out.price || prev.changePercent !== out.changePercent);
            prevDataRef.current = out;
            tickerDataCache[sym] = out;
            setData(out);
            if (changed) setFlash(true);
          } else {
            prevDataRef.current = null;
            tickerDataCache[sym] = null;
            setData(null);
          }
        })
        .catch(() => {
          tickerDataCache[sym] = null;
          setData(null);
        });
    };

    fetchTicker();
    const interval = setInterval(fetchTicker, CHAT_TICKER_POLL_MS);
    return () => clearInterval(interval);
  }, [sym]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(false), 500);
    return () => clearTimeout(t);
  }, [flash]);

  const isPositive = data != null && data.changePercent >= 0;
  const pillClass =
    data == null
      ? 'bg-zinc-700/80 hover:bg-zinc-600/80 border border-zinc-600 text-zinc-200'
      : isPositive
        ? 'bg-emerald-900/70 hover:bg-emerald-800/80 border border-emerald-800 text-emerald-200'
        : 'bg-red-900/70 hover:bg-red-800/80 border border-red-800 text-red-200';
  return (
    <Link
      href={getTickerHref(sym)}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-sm font-medium no-underline transition-all duration-200 ${pillClass} ${flash ? 'ring-2 ring-white/60 shadow-lg shadow-white/20' : ''}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
    >
      <span>{sym}</span>
      {data != null ? (
        <>
          <span className="tabular-nums">{formatTickerPrice(data.price)}</span>
          <span className="tabular-nums font-semibold">
            {isPositive ? '+' : ''}{data.changePercent.toFixed(2)}%
          </span>
        </>
      ) : (
        <span className="text-zinc-500">…</span>
      )}
    </Link>
  );
}

interface ChatFile {
  id: number;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size?: number;
}

export const REACTION_EMOJIS = ['👍', '❤️', '😂', '🔥', '👎'] as const;

interface MessageReaction {
  emoji: string;
  count: number;
  reacted: boolean;
}

interface ChatMessage {
  id: number;
  room_id: number;
  user_email: string;
  username: string;
  message_text: string;
  created_at: string;
  profile_picture_url?: string | null;
  user_role?: string;
  files?: ChatFile[];
  reactions?: MessageReaction[];
  reply_to_id?: number | null;
  reply_to_username?: string | null;
  reply_to_text?: string | null;
}

interface ChatRoomProps {
  roomId: number;
  roomName: string;
  currentUserEmail: string;
  currentUsername: string;
  onRequestDM?: (userEmail: string, username: string) => void;
}

export default function ChatRoom({ roomId, roomName, currentUserEmail, currentUsername, onRequestDM }: ChatRoomProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<ChatFile[]>([]);
  const [isModerator, setIsModerator] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionSuggestions, setMentionSuggestions] = useState<{ username: string; email: string; profile_picture_url?: string | null }[]>([]);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [openReactionPickerMessageId, setOpenReactionPickerMessageId] = useState<number | null>(null);
  const [dmPopoverMessageId, setDmPopoverMessageId] = useState<number | null>(null);
  const [userBio, setUserBio] = useState<string | null>(null);
  const [userBioLoading, setUserBioLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: number; username: string; text: string } | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; name: string } | null>(null);
  const messageRefsMap = useRef<Record<number, HTMLDivElement | null>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const lastMessageIdRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const isAtBottomRef = useRef(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const scrollThreshold = 80;
  const initialScrollFromStorageRef = useRef(false);

  // Keep input focused when chat loads / room changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.setTimeout(() => {
      if (messageInputRef.current) {
        messageInputRef.current.focus();
      }
    }, 0);
  }, [roomId]);

  // Scroll to bottom of messages (instant for initial load, smooth for new messages)
  const scrollToBottom = useCallback((instant = false) => {
    const container = messagesContainerRef.current;
    const end = messagesEndRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
    if (end) {
      end.scrollIntoView({ behavior: instant ? 'auto' : 'smooth' });
    }
    isAtBottomRef.current = true;
    setIsAtBottom(true);
  }, []);

  // Track whether user is scrolled to bottom and persist scroll position per room
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const nearBottom = scrollHeight - scrollTop - clientHeight < scrollThreshold;
      if (nearBottom !== isAtBottomRef.current) {
        isAtBottomRef.current = nearBottom;
        setIsAtBottom(nearBottom);
      }

      if (typeof window !== 'undefined') {
        try {
          const key = `${SCROLL_STORAGE_PREFIX}${roomId}`;
          window.localStorage.setItem(key, JSON.stringify({ scrollTop }));
        } catch {
          // ignore storage errors
        }
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [roomId, scrollThreshold]);

  // Check if user is moderator
  useEffect(() => {
    setIsModerator(currentUsername === 'noticetrades');
  }, [currentUsername]);

  // Load messages when room changes — reset state first so we don't show another room's messages
  useEffect(() => {
    setIsLoading(true);
    setMessages([]);
    lastMessageIdRef.current = 0;
    isAtBottomRef.current = true;
    setIsAtBottom(true);

    const loadMessages = async () => {
      let savedScrollTop: number | null = null;
      if (typeof window !== 'undefined') {
        try {
          const key = `${SCROLL_STORAGE_PREFIX}${roomId}`;
          const raw = window.localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (typeof parsed.scrollTop === 'number') {
              savedScrollTop = parsed.scrollTop;
            }
          }
        } catch {
          // ignore storage errors
        }
      }

      try {
        const response = await fetch(`/api/chat/rooms/${roomId}/messages`, {
          cache: 'no-store',
          credentials: 'include',
          headers: { 'Cache-Control': 'no-cache' },
        });
        if (response.ok) {
          const data = await response.json();
          const list = data.messages || [];
          setMessages(list);
          if (list.length > 0) {
            lastMessageIdRef.current = Math.max(...list.map((m: ChatMessage) => m.id));
          }

          // After messages render, restore previous scroll position if we have one, otherwise go to bottom.
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              const container = messagesContainerRef.current;
              if (!container) return;

              if (savedScrollTop != null && savedScrollTop > 0 && savedScrollTop < container.scrollHeight) {
                container.scrollTop = savedScrollTop;
                initialScrollFromStorageRef.current = true;
                isAtBottomRef.current = false;
                setIsAtBottom(false);
              } else {
                scrollToBottom(true);
              }
            });
          });
        } else {
          const err = await response.json().catch(() => ({}));
          console.error('Chat load failed', response.status, err);
        }
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [roomId, scrollToBottom]);

  // Set up Server-Sent Events for instant real-time updates (like RocketChat)
  useEffect(() => {
    if (isLoading) return;

    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Create new SSE connection
    const eventSource = new EventSource(`/api/chat/rooms/${roomId}/messages/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'connected') {
          console.log('SSE connected');
        } else if (data.type === 'message') {
          const newMessage = data.message;
          // Only add if it's a new message
          if (newMessage.id > lastMessageIdRef.current) {
            setMessages((prev) => {
              // Check if message already exists (avoid duplicates)
              const exists = prev.some((m) => m.id === newMessage.id);
              if (exists) return prev;
              return [...prev, newMessage];
            });
            lastMessageIdRef.current = Math.max(lastMessageIdRef.current, newMessage.id);
            if (isAtBottomRef.current) scrollToBottom();
          }
        } else if (data.type === 'error') {
          console.error('SSE error:', data.error);
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      // Reconnect after 3 seconds
      setTimeout(() => {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = new EventSource(`/api/chat/rooms/${roomId}/messages/stream`);
        }
      }, 3000);
    };

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [roomId, isLoading, scrollToBottom]);

  // Scroll to bottom on initial load only; when new messages arrive, only scroll if user was already at bottom
  const prevMessagesLengthRef = useRef(0);
  useEffect(() => {
    const prevLen = prevMessagesLengthRef.current;
    prevMessagesLengthRef.current = messages.length;
    if (messages.length === 0) return;
    if (prevLen === 0 && messages.length > 0) {
      // Initial load is handled in loadMessages (which may restore previous scroll).
      if (initialScrollFromStorageRef.current) {
        // Clear the flag so subsequent room loads can use it again.
        initialScrollFromStorageRef.current = false;
        return;
      }
      requestAnimationFrame(() => {
        requestAnimationFrame(() => scrollToBottom(true));
      });
    } else if (prevLen > 0 && isAtBottomRef.current) {
      scrollToBottom(false);
    }
  }, [messages, scrollToBottom]);

  // Fetch user bio when popover opens (click on username)
  useEffect(() => {
    if (!dmPopoverMessageId) {
      setUserBio(null);
      return;
    }
    const msg = messages.find((m) => m.id === dmPopoverMessageId);
    if (!msg || msg.user_email === currentUserEmail) {
      setUserBio(null);
      return;
    }
    setUserBioLoading(true);
    setUserBio(null);
    fetch(`/api/chat/users/bio?email=${encodeURIComponent(msg.user_email)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        setUserBio(typeof data.bio === 'string' ? data.bio : null);
      })
      .catch(() => setUserBio(null))
      .finally(() => setUserBioLoading(false));
  }, [dmPopoverMessageId, messages, currentUserEmail]);

  // Handle paste event for images (charts)
  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter((item) => item.type.startsWith('image/'));

    if (imageItems.length === 0) return;

    e.preventDefault(); // Prevent default paste behavior

    const files: File[] = [];
    for (const item of imageItems) {
      const file = item.getAsFile();
      if (file) {
        // Create a proper File object with a name
        const timestamp = Date.now();
        const extension = file.type.split('/')[1] || 'png';
        const namedFile = new File([file], `pasted-image-${timestamp}.${extension}`, {
          type: file.type,
        });
        files.push(namedFile);
      }
    }

    if (files.length > 0) {
      await uploadFiles(files);
    }
  };

  // Upload files helper function
  const uploadFiles = async (files: File[]) => {
    // Validate file sizes (max 50MB each)
    const maxSize = 50 * 1024 * 1024;
    const oversizedFiles = files.filter((f) => f.size > maxSize);
    if (oversizedFiles.length > 0) {
      alert(`Some files exceed 50MB limit: ${oversizedFiles.map((f) => f.name).join(', ')}`);
      return;
    }

    setUploadingFiles((prev) => [...prev, ...files]);

    // Upload each file
    const uploaded: ChatFile[] = [];
    for (const file of files) {
      try {
        // Get presigned URL
        const uploadResponse = await fetch('/api/chat/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            fileSize: file.size,
          }),
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to get upload URL');
        }

        const { presignedUrl, publicUrl, filename } = await uploadResponse.json();

        // Upload file to R2
        const uploadResult = await fetch(presignedUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (!uploadResult.ok) {
          throw new Error('Failed to upload file');
        }

        uploaded.push({
          id: 0,
          file_url: publicUrl,
          file_name: filename,
          file_type: file.type,
          file_size: file.size,
        });
      } catch (error) {
        console.error('Error uploading file:', error);
        alert(`Failed to upload ${file.name}`);
      }
    }

    // Remove uploaded files from uploading list
    setUploadingFiles((prev) => prev.filter((f) => !files.includes(f)));
    setUploadedFiles((prev) => [...prev, ...uploaded]);

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    await uploadFiles(files);
  };

  // Core send logic used by both Enter key and Send button
  const sendMessage = async () => {
    if ((!newMessage.trim() && uploadedFiles.length === 0) || isSending) return;

    setIsSending(true);
    const messageToSend = newMessage.trim();
    const filesToSend = [...uploadedFiles];
    
    setNewMessage('');
    setUploadedFiles([]);

    try {
      const response = await fetch(`/api/chat/rooms/${roomId}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message_text: messageToSend,
          files: filesToSend.length > 0 ? filesToSend : undefined,
          reply_to_id: replyingTo?.id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setReplyingTo(null);
        // Message will appear via SSE, but add immediately for instant feedback
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === data.message.id);
          if (exists) return prev;
          return [...prev, data.message];
        });
        lastMessageIdRef.current = Math.max(lastMessageIdRef.current, data.message.id);
        scrollToBottom();
      } else {
        const errBody = await response.json().catch(() => ({}));
        const msg = errBody.detail ? `${errBody.error ?? 'Error'}: ${errBody.detail}` : (errBody.error || 'Failed to send message');
        alert(msg);
        setNewMessage(messageToSend); // Restore message on error
        setUploadedFiles(filesToSend); // Restore files on error
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
      setNewMessage(messageToSend); // Restore message on error
      setUploadedFiles(filesToSend); // Restore files on error
    } finally {
      setIsSending(false);
      // Keep focus in the input so user can type the next message immediately
      if (typeof window !== 'undefined') {
        window.setTimeout(() => {
          if (messageInputRef.current) {
            messageInputRef.current.focus();
          }
        }, 0);
      }
    }
  };

  // Handle sending a message from form submit
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage();
  };

  // Handle deleting a message
  const handleDeleteMessage = async (messageId: number) => {
    if (!confirm('Are you sure you want to delete this message?')) {
      return;
    }

    try {
      const response = await fetch(`/api/chat/rooms/${roomId}/messages/${messageId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove message from local state
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete message');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Failed to delete message. Please try again.');
    }
  };

  const handleToggleReaction = async (messageId: number, emoji: string) => {
    try {
      const res = await fetch(`/api/chat/rooms/${roomId}/messages/${messageId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, reactions: data.reactions || [] } : m
        )
      );
    } catch (e) {
      console.error('Error toggling reaction:', e);
    }
  };

  // Fetch user suggestions for @mentions
  useEffect(() => {
    if (!mentionQuery.trim() || mentionStartIndex === -1) {
      setMentionSuggestions([]);
      setShowMentionSuggestions(false);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        const response = await fetch(`/api/chat/users?q=${encodeURIComponent(mentionQuery)}`);
        if (response.ok) {
          const data = await response.json();
          setMentionSuggestions(data.users || []);
          setShowMentionSuggestions(data.users && data.users.length > 0);
        }
      } catch (error) {
        console.error('Error fetching mention suggestions:', error);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 200);
    return () => clearTimeout(debounceTimer);
  }, [mentionQuery, mentionStartIndex]);

  // Handle @mention input
  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursorPosition = e.target.selectionStart || 0;
    
    // Find @mention pattern
    const textBeforeCursor = value.substring(0, cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      setMentionStartIndex(cursorPosition - mentionMatch[0].length);
      setMentionQuery(mentionMatch[1]);
      setShowMentionSuggestions(true);
    } else {
      setShowMentionSuggestions(false);
      setMentionStartIndex(-1);
      setMentionQuery('');
    }
    
    setNewMessage(value);
  };

  // Insert mention into message
  const insertMention = (username: string) => {
    if (mentionStartIndex === -1 || !messageInputRef.current) return;
    
    const beforeMention = newMessage.substring(0, mentionStartIndex);
    const afterMention = newMessage.substring(mentionStartIndex + 1 + mentionQuery.length);
    const newText = `${beforeMention}@${username} ${afterMention}`;
    
    setNewMessage(newText);
    setShowMentionSuggestions(false);
    setMentionStartIndex(-1);
    setMentionQuery('');
    
    // Focus back on input and set cursor position
    setTimeout(() => {
      if (messageInputRef.current) {
        messageInputRef.current.focus();
        const newCursorPos = mentionStartIndex + username.length + 2; // +2 for @ and space
        messageInputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  // Convert URLs in text to clickable links and highlight @mentions
  const linkifyText = (text: string): ReactNode => {
    const parts: ReactNode[] = [];
    let keyCounter = 0;
    let lastIndex = 0;
    
    // Combined regex for URLs and @mentions
    const combinedRegex = /(@\w+)|(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/g;
    let match;
    
    while ((match = combinedRegex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      
      if (match[1]) {
        // @mention
        parts.push(
          <span
            key={`mention-${keyCounter++}`}
            className="text-zinc-200 font-semibold"
          >
            {match[1]}
          </span>
        );
      } else if (match[2]) {
        // URL
        let url = match[2];
        let displayUrl = url;
        
        // Add protocol if missing
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url;
        }
        
        // Truncate display URL if too long
        if (displayUrl.length > 50) {
          displayUrl = displayUrl.substring(0, 47) + '...';
        }
        
        parts.push(
          <a
            key={`link-${keyCounter++}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-300 hover:text-white underline break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {displayUrl}
          </a>
        );
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text after last match
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    // If no matches found, return original text
    return parts.length > 0 ? <>{parts}</> : text;
  };

  const parseMessageWithTickers = (text: string): ReactNode => {
    type Segment = { type: 'text'; value: string } | { type: 'ticker'; value: string };
    const segments: Segment[] = [];
    let lastEnd = 0;
    let m: RegExpExecArray | null;
    const re = new RegExp(TICKER_WORD_REGEX.source, 'g');
    while ((m = re.exec(text)) !== null) {
      const raw = m[0];
      const ticker = raw.replace(/^\$/, '').toUpperCase();
      if (isChatTicker(ticker)) {
        if (m.index > lastEnd) {
          segments.push({ type: 'text', value: text.slice(lastEnd, m.index) });
        }
        segments.push({ type: 'ticker', value: ticker });
        lastEnd = m.index + raw.length;
      }
    }
    if (lastEnd < text.length) {
      segments.push({ type: 'text', value: text.slice(lastEnd) });
    }
    if (segments.length === 0) return linkifyText(text);
    return (
      <>
        {segments.map((seg, i) => {
          if (seg.type === 'text') return <Fragment key={i}>{linkifyText(seg.value)}</Fragment>;
          return <TickerPill key={i} symbol={seg.value} />;
        })}
      </>
    );
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
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
  };

  const formatTimeFull = (timestamp: string) =>
    new Date(timestamp).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

  const formatTimeClock = (timestamp: string) =>
    new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  // Group consecutive messages from same user within the same minute (Discord-style)
  const messageGroups = useMemo(() => {
    const groups: { messages: ChatMessage[] }[] = [];
    const MINUTE_MS = 60 * 1000;
    for (const msg of messages) {
      const t = new Date(msg.created_at).getTime();
      const minuteKey = Math.floor(t / MINUTE_MS) * MINUTE_MS;
      const last = groups[groups.length - 1];
      if (
        last &&
        last.messages[0].user_email === msg.user_email &&
        Math.floor(new Date(last.messages[0].created_at).getTime() / MINUTE_MS) === Math.floor(t / MINUTE_MS)
      ) {
        last.messages.push(msg);
      } else {
        groups.push({ messages: [msg] });
      }
    }
    return groups;
  }, [messages]);

  // Get user badge
  const getUserBadge = (userRole?: string, username?: string) => {
    if (username === 'noticetrades' || userRole === 'owner') {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 text-yellow-400 border border-yellow-500/30 founder-badge">
          Founder
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/40 verified-badge">
        PREMIUM
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full bg-black/75 overflow-hidden">
      {/* Room Header */}
      <div className="shrink-0 bg-zinc-900/95 border-b border-zinc-900/80 px-4 py-2 flex items-center gap-2">
        <h2 className="text-sm font-semibold text-zinc-50 truncate">#{roomName}</h2>
        {messages.length > 0 && (
          <span className="text-xs text-zinc-600">{messages.length}</span>
        )}
      </div>

      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0"
        style={{ scrollBehavior: 'smooth' }}
      >
        {/* Jump to latest – minimal pill at top when user is scrolled up (no shaded bar) */}
        {!isAtBottom && messages.length > 0 && (
          <div className="sticky top-2 z-10 flex justify-center pointer-events-none">
            <button
              type="button"
              onClick={() => scrollToBottom(false)}
              className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-zinc-100 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 shadow-sm transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              Jump to latest
            </button>
          </div>
        )}
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-zinc-500 text-sm">Loading…</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-zinc-400">
              <p className="text-lg mb-2">No messages yet</p>
              <p className="text-sm">Be the first to start the conversation!</p>
            </div>
          </div>
        ) : (
          messageGroups.map((group) => {
            const first = group.messages[0];
            const isOwnMessage = first.user_email === currentUserEmail;
            const isFounder = first.username === 'noticetrades' || first.user_role === 'owner';
            const usernameColorClass = isFounder ? 'text-yellow-400 font-semibold' : 'text-zinc-200 font-semibold';
            const anyMentioned = group.messages.some(
              (m) => m.message_text && new RegExp(`@${currentUsername}\\b`, 'i').test(m.message_text)
            );
            return (
              <div
                key={first.id}
                className={`flex gap-3 mt-3 first:mt-0 ${
                  anyMentioned && !isOwnMessage ? 'rounded-lg bg-orange-500/5 ring-1 ring-orange-500/40 px-2 py-1.5 -mx-2' : ''
                }`}
              >
                <div className="flex-shrink-0 w-9">
                  {first.profile_picture_url ? (
                    <img
                      src={first.profile_picture_url}
                      alt={first.username}
                      className="w-9 h-9 rounded-full object-cover border border-zinc-700"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                      <span className="text-zinc-300 text-sm font-semibold">
                        {first.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  {group.messages.map((message, idx) => {
                    const isFirstInGroup = idx === 0;
                    const isMentioned =
                      message.message_text && new RegExp(`@${currentUsername}\\b`, 'i').test(message.message_text);
                    return (
                      <div
                        key={message.id}
                        ref={(el) => {
                          messageRefsMap.current[message.id] = el;
                        }}
                      >
                        {isFirstInGroup && (
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <div className="relative inline-block">
                              <button
                                type="button"
                                onClick={() => {
                                  if (message.user_email === currentUserEmail) return;
                                  setDmPopoverMessageId((prev) => (prev === message.id ? null : message.id));
                                }}
                                className={`text-sm ${usernameColorClass} ${message.user_email !== currentUserEmail ? 'hover:underline cursor-pointer' : 'cursor-default'}`}
                              >
                                {message.username}
                              </button>
                      {dmPopoverMessageId === message.id && message.user_email !== currentUserEmail && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            aria-hidden
                            onClick={() => setDmPopoverMessageId(null)}
                          />
                          <div className="absolute left-0 top-full mt-1 py-1 bg-zinc-800 border border-zinc-600 rounded-lg shadow-xl z-20 min-w-[180px] max-w-[280px]">
                            <div className="px-3 py-2 border-b border-zinc-600">
                              {userBioLoading ? (
                                <p className="text-xs text-zinc-500">Loading…</p>
                              ) : userBio !== null && userBio !== '' ? (
                                <p className="text-xs text-zinc-300 whitespace-pre-wrap break-words">{userBio}</p>
                              ) : (
                                <p className="text-xs text-zinc-500 italic">User has no bio</p>
                              )}
                            </div>
                            {onRequestDM && (
                              <button
                                type="button"
                                onClick={() => {
                                  onRequestDM(message.user_email, message.username);
                                  setDmPopoverMessageId(null);
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700 flex items-center gap-2"
                              >
                                <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                DM
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                    {getUserBadge(message.user_role, message.username)}
                    {isMentioned && !isOwnMessage && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-500/15 text-orange-400 border border-orange-500/30">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Mentioned you
                      </span>
                    )}
                    <span
                      className="text-xs text-zinc-500 cursor-default"
                      title={formatTimeFull(message.created_at)}
                    >
                      {formatTimeClock(message.created_at)}
                    </span>
                            <button
                              type="button"
                              onClick={() => {
                                setReplyingTo({
                                  id: message.id,
                                  username: message.username,
                                  text: (message.message_text ?? '').slice(0, 100),
                                });
                                messageInputRef.current?.focus();
                              }}
                              className="ml-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                              title="Reply"
                            >
                              <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                              </svg>
                            </button>
                            {(isOwnMessage || isModerator) && (
                              <button
                                onClick={() => handleDeleteMessage(message.id)}
                                className="ml-auto text-xs text-red-500 hover:text-red-400 transition-colors"
                                title={isModerator && !isOwnMessage ? 'Moderator: Delete message' : 'Delete your message'}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        )}
                        <div
                          className={`inline-block px-3 py-1.5 rounded-md max-w-[92%] text-sm ${
                            isOwnMessage
                              ? 'bg-zinc-800/90 text-zinc-50'
                              : 'bg-zinc-900/80 text-zinc-100 border border-zinc-800'
                          }`}
                        >
                          {message.reply_to_id != null && (
                            <button
                              type="button"
                              onClick={() => {
                                const el = messageRefsMap.current[message.reply_to_id!];
                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }}
                              className="flex flex-col items-start w-full text-left mb-2 pl-2 py-1.5 rounded border-l-2 border-zinc-500/60 bg-black/20 hover:bg-black/30 transition-colors"
                            >
                              <span className="text-xs font-medium text-zinc-400">
                                Replying to <span className="text-zinc-300">@{message.reply_to_username ?? 'unknown'}</span>
                              </span>
                              {(message.reply_to_text ?? '').trim() ? (
                                <span className="text-xs text-zinc-500 truncate max-w-full block">
                                  {message.reply_to_text!.length > 80 ? message.reply_to_text!.slice(0, 80) + '…' : message.reply_to_text}
                                </span>
                              ) : (
                                <span className="text-xs text-zinc-500 italic">(message or attachment)</span>
                              )}
                            </button>
                          )}
                          {message.message_text && (
                            <p className="text-sm whitespace-pre-wrap break-words mb-2">
                              {parseMessageWithTickers(message.message_text)}
                            </p>
                          )}
                          {message.files && message.files.length > 0 && (
                      <div className="space-y-2 mt-2">
                        {message.files.map((file) => (
                          <div key={file.id} className="flex items-center gap-2 p-1.5 bg-black/15 rounded-lg">
                            {file.file_type.startsWith('image/') ? (
                              <button
                                type="button"
                                onClick={() => setLightboxImage({ url: file.file_url, name: file.file_name })}
                                className="block text-left outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-transparent rounded-lg"
                              >
                                <img
                                  src={file.file_url}
                                  alt={file.file_name}
                                  className="max-w-2xl max-h-96 rounded-lg cursor-pointer hover:opacity-95 transition-opacity object-contain"
                                />
                              </button>
                            ) : (
                              <a
                                href={file.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm hover:underline"
                              >
                                <svg
                                  className="w-5 h-5"
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
                                <span>{file.file_name}</span>
                                {file.file_size && (
                                  <span className="text-xs opacity-75">
                                    ({(file.file_size / 1024 / 1024).toFixed(2)} MB)
                                  </span>
                                )}
                              </a>
                            )}
                          </div>
                        ))}
                          </div>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1 mt-1.5 relative">
                    {(message.reactions || [])
                      .filter((r) => r.count > 0)
                      .map((r) => (
                        <button
                          key={r.emoji}
                          type="button"
                          onClick={() => handleToggleReaction(message.id, r.emoji)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-sm transition-colors ${
                            r.reacted
                              ? 'bg-zinc-600/30 text-zinc-200 border border-zinc-500/40'
                              : 'bg-zinc-800 text-zinc-400 border border-zinc-600 hover:bg-zinc-700 hover:text-zinc-300'
                          }`}
                          title={`${r.emoji} ${r.count}`}
                        >
                          <span>{r.emoji}</span>
                          <span className="text-xs">{r.count}</span>
                        </button>
                      ))}
                    <div className="relative inline-block">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenReactionPickerMessageId((prev) =>
                            prev === message.id ? null : message.id
                          )
                        }
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-sm text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 border border-transparent hover:border-zinc-600 transition-colors"
                        title="Add reaction"
                      >
                        <svg className="w-4 h-4 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <circle cx="12" cy="12" r="10" />
                          <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                          <line x1="9" y1="9" x2="9.01" y2="9" />
                          <line x1="15" y1="9" x2="15.01" y2="9" />
                        </svg>
                        <span className="text-xs font-medium">+</span>
                      </button>
                      {openReactionPickerMessageId === message.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            aria-hidden
                            onClick={() => setOpenReactionPickerMessageId(null)}
                          />
                          <div className="absolute left-0 bottom-full mb-1 flex items-center gap-0.5 p-1.5 bg-zinc-800 border border-zinc-600 rounded-lg shadow-xl z-20">
                            {REACTION_EMOJIS.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => {
                                  handleToggleReaction(message.id, emoji);
                                  setOpenReactionPickerMessageId(null);
                                }}
                                className="p-1.5 rounded hover:bg-zinc-700 text-lg leading-none"
                                title={emoji}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="shrink-0 border-t border-zinc-900/80 px-4 py-3 bg-zinc-900/85">
        {/* Replying to preview */}
        {replyingTo && (
          <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-zinc-700/80 rounded-lg border border-zinc-600 text-sm">
            <span className="text-zinc-400 shrink-0">Replying to</span>
            <span className="font-medium text-zinc-200">@{replyingTo.username}</span>
            <span className="text-zinc-500 truncate flex-1 min-w-0">— {replyingTo.text}{replyingTo.text.length >= 100 ? '…' : ''}</span>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="shrink-0 p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-600 transition-colors"
              aria-label="Cancel reply"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        {/* Uploaded Files Preview */}
        {uploadedFiles.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-2 bg-zinc-700 rounded-lg text-sm"
              >
                <span className="text-zinc-300">{file.file_name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
                  }}
                  className="text-zinc-400 hover:text-white"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
        {/* Uploading Files Indicator */}
        {uploadingFiles.length > 0 && (
          <div className="mb-3 text-sm text-zinc-400">
            Uploading {uploadingFiles.length} file(s)...
          </div>
        )}
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 hover:text-white transition-colors"
            title="Attach file"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <div className="flex-1 relative">
            <input
              ref={messageInputRef}
              type="text"
              value={newMessage}
              onChange={handleMessageChange}
              onPaste={handlePaste}
              placeholder="Type a message, @mention someone, or paste an image..."
              maxLength={2000}
              className="w-full px-4 py-2.5 bg-zinc-800/80 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-transparent"
              onKeyDown={(e) => {
                if (showMentionSuggestions && mentionSuggestions.length > 0) {
                  // Handle arrow keys for mention selection
                  if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
                    e.preventDefault();
                    // For now, just select first suggestion on Enter
                    if (e.key === 'Enter' && mentionSuggestions[0]) {
                      insertMention(mentionSuggestions[0].username);
                    }
                    return;
                  }
                }
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage();
                }
              }}
            />
            {/* Mention Suggestions Dropdown */}
            {showMentionSuggestions && mentionSuggestions.length > 0 && (
              <div className="absolute bottom-full left-0 mb-2 w-full max-w-md bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl overflow-hidden z-50">
                <div className="max-h-48 overflow-y-auto">
                  {mentionSuggestions.map((user) => (
                    <button
                      key={user.email}
                      type="button"
                      onClick={() => insertMention(user.username)}
                      className="w-full text-left px-4 py-2 hover:bg-zinc-700 transition-colors flex items-center gap-3"
                    >
                      {user.profile_picture_url ? (
                        <img
                          src={user.profile_picture_url}
                          alt={user.username}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
                          <span className="text-zinc-300 text-sm font-semibold">
                            {user.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="text-sm text-white font-medium">@{user.username}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={(!newMessage.trim() && uploadedFiles.length === 0) || isSending || uploadingFiles.length > 0}
            className="px-5 py-2.5 bg-zinc-600 text-white rounded-lg font-medium hover:bg-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSending ? 'Sending...' : 'Send'}
          </button>
        </div>
        <p className="text-xs text-zinc-500 mt-1.5">
          {newMessage.length}/2000 characters
          {uploadedFiles.length > 0 && ` • ${uploadedFiles.length} file(s) attached`}
        </p>
      </form>

      {/* Image lightbox - click image to open, click backdrop to close */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
          onClick={() => setLightboxImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
        >
          <button
            type="button"
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-zinc-800/90 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={lightboxImage.url}
            alt={lightboxImage.name}
            className="max-w-[90vw] max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />
        </div>
      )}
    </div>
  );
}

