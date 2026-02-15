'use client';

import { useState, useEffect, useRef, useCallback, ReactNode } from 'react';

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
}

interface ChatRoomProps {
  roomId: number;
  roomName: string;
  currentUserEmail: string;
  currentUsername: string;
}

export default function ChatRoom({ roomId, roomName, currentUserEmail, currentUsername }: ChatRoomProps) {
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const lastMessageIdRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Check if user is moderator
  useEffect(() => {
    setIsModerator(currentUsername === 'noticetrades');
  }, [currentUsername]);

  // Load initial messages
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const response = await fetch(`/api/chat/rooms/${roomId}/messages`);
        if (response.ok) {
          const data = await response.json();
          setMessages(data.messages || []);
          if (data.messages && data.messages.length > 0) {
            lastMessageIdRef.current = Math.max(
              ...data.messages.map((m: ChatMessage) => m.id)
            );
          }
        }
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [roomId]);

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
            scrollToBottom();
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

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

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

  // Handle sending a message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if ((!newMessage.trim() && uploadedFiles.length === 0) || isSending) return;

    setIsSending(true);
    const messageToSend = newMessage.trim();
    const filesToSend = [...uploadedFiles];
    
    setNewMessage('');
    setUploadedFiles([]);

    try {
      const response = await fetch(`/api/chat/rooms/${roomId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message_text: messageToSend,
          files: filesToSend.length > 0 ? filesToSend : undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Message will appear via SSE, but add immediately for instant feedback
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === data.message.id);
          if (exists) return prev;
          return [...prev, data.message];
        });
        lastMessageIdRef.current = Math.max(lastMessageIdRef.current, data.message.id);
        scrollToBottom();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to send message');
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
    }
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
            className="text-blue-400 font-semibold"
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
            className="text-blue-400 hover:text-blue-300 underline break-all"
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
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30 verified-badge">
        PREMIUM
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 rounded-lg overflow-hidden">
      {/* Room Header */}
      <div className="bg-zinc-800 border-b border-zinc-700 px-4 py-3">
        <h2 className="text-lg font-semibold text-white">{roomName}</h2>
        <p className="text-sm text-zinc-400">{messages.length} messages</p>
      </div>

      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
        style={{ scrollBehavior: 'smooth' }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-zinc-400">Loading messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-zinc-400">
              <p className="text-lg mb-2">No messages yet</p>
              <p className="text-sm">Be the first to start the conversation!</p>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.user_email === currentUserEmail;
            // Check if current user is mentioned in this message
            const isMentioned = message.message_text && 
              new RegExp(`@${currentUsername}\\b`, 'i').test(message.message_text);
            // Username color: gold for noticetrades (Founder), blue for everyone else (Premium)
            const isFounder = message.username === 'noticetrades' || message.user_role === 'owner';
            const usernameColorClass = isFounder
              ? 'text-yellow-400 font-semibold'
              : 'text-blue-400 font-semibold';
            return (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  isMentioned && !isOwnMessage ? 'ring-2 ring-orange-500/50 rounded-lg p-2 -m-2 bg-orange-500/5' : ''
                }`}
              >
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {message.profile_picture_url ? (
                    <img
                      src={message.profile_picture_url}
                      alt={message.username}
                      className="w-10 h-10 rounded-full object-cover border border-zinc-700"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center border border-zinc-600">
                      <span className="text-zinc-300 text-sm font-semibold">
                        {message.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Message Content - always left-aligned */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-sm ${usernameColorClass}`}>
                      {message.username}
                    </span>
                    {getUserBadge(message.user_role, message.username)}
                    {isMentioned && !isOwnMessage && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-500/15 text-orange-400 border border-orange-500/30">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Mentioned you
                      </span>
                    )}
                    <span className="text-xs text-zinc-500">
                      {formatTime(message.created_at)}
                    </span>
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
                  <div
                    className={`inline-block px-4 py-2 rounded-lg max-w-[85%] ${
                      isOwnMessage
                        ? 'bg-blue-600/80 text-white'
                        : 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                    }`}
                  >
                    {message.message_text && (
                      <p className="text-sm whitespace-pre-wrap break-words mb-2">
                        {linkifyText(message.message_text)}
                      </p>
                    )}
                    {/* File Attachments */}
                    {message.files && message.files.length > 0 && (
                      <div className="space-y-2 mt-2">
                        {message.files.map((file) => (
                          <div key={file.id} className="flex items-center gap-2 p-2 bg-black/20 rounded">
                            {file.file_type.startsWith('image/') ? (
                              <a
                                href={file.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                              >
                                <img
                                  src={file.file_url}
                                  alt={file.file_name}
                                  className="max-w-xs max-h-64 rounded cursor-pointer hover:opacity-80 transition-opacity"
                                />
                              </a>
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
                  {/* Reactions */}
                  <div className="flex flex-wrap items-center gap-1 mt-1.5">
                    {REACTION_EMOJIS.map((emoji) => {
                      const r = (message.reactions || []).find((x) => x.emoji === emoji);
                      const count = r?.count ?? 0;
                      const reacted = r?.reacted ?? false;
                      return (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleToggleReaction(message.id, emoji)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-sm transition-colors ${
                            reacted
                              ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                              : 'bg-zinc-800 text-zinc-400 border border-zinc-600 hover:bg-zinc-700 hover:text-zinc-300'
                          }`}
                          title={`${emoji} ${count > 0 ? count : 'Add reaction'}`}
                        >
                          <span>{emoji}</span>
                          {count > 0 && <span className="text-xs">{count}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="border-t border-zinc-700 p-4 bg-zinc-800">
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
            className="px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition-colors flex items-center gap-2"
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
              disabled={isSending}
              className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
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
                  handleSendMessage(e);
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
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSending ? 'Sending...' : 'Send'}
          </button>
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          {newMessage.length}/2000 characters
          {uploadedFiles.length > 0 && ` • ${uploadedFiles.length} file(s) attached`}
        </p>
      </form>
    </div>
  );
}

