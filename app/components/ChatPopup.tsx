'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useChat } from '../contexts/ChatContext';

const ChatRoomComponent = dynamic(() => import('./ChatRoom'), { ssr: false });
const DMRoomComponent = dynamic(() => import('./DMRoom'), { ssr: false });

interface ChatRoomData {
  id: number;
  name: string;
  description: string | null;
  topic: string | null;
  is_active: boolean;
  created_at: string;
}

type ViewMode = 'channels' | 'dms';

interface DMConversation {
  dmId: number;
  otherUser: { email: string; username: string };
  lastMessage: { id: number; sender_email: string; username: string; message_text: string; created_at: string };
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

const POPUP_WIDTH = 400;
const POPUP_HEIGHT = 480;
const MIN_WIDTH = 320;
const MIN_HEIGHT = 320;
const MAX_WIDTH = 900;
const MAX_HEIGHT = 800;

function getDefaultX() {
  if (typeof window === 'undefined') return 100;
  return window.innerWidth - POPUP_WIDTH - 24;
}
const DEFAULT_Y = 80;

export default function ChatPopup() {
  const { isChatOpen, closeChat } = useChat();
  const [position, setPosition] = useState({ x: getDefaultX(), y: DEFAULT_Y });
  const [size, setSize] = useState({ width: POPUP_WIDTH, height: POPUP_HEIGHT });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, left: 0, top: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: POPUP_WIDTH, height: POPUP_HEIGHT });

  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [currentUsername, setCurrentUsername] = useState('');
  const [rooms, setRooms] = useState<ChatRoomData[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadByRoom, setUnreadByRoom] = useState<Record<string, number>>({});
  const [viewMode, setViewMode] = useState<ViewMode>('channels');
  const [dmConversations, setDmConversations] = useState<DMConversation[]>([]);
  const [selectedDmId, setSelectedDmId] = useState<number | null>(null);
  const [selectedDmOtherUser, setSelectedDmOtherUser] = useState<{ email: string; username: string } | null>(null);
  const [dmListLoading, setDmListLoading] = useState(false);

  const fetchUnreadMentions = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/mentions/unread');
      if (res.ok) {
        const data = await res.json();
        setUnreadByRoom(data.byRoom || {});
      }
    } catch (e) {
      console.error('Error fetching chat unread mentions:', e);
    }
  }, []);

  const fetchDmConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/dms');
      if (res.ok) {
        const data = await res.json();
        setDmConversations(data.conversations || []);
      }
    } catch (e) {
      console.error('Error loading DMs:', e);
    } finally {
      setDmListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isChatOpen) return;
    const email = getCookie('user_email');
    const username = getCookie('user_username');
    if (!email) return;
    setCurrentUserEmail(email);
    setCurrentUsername(username || '');
    const loadRooms = async () => {
      try {
        const response = await fetch('/api/chat/rooms');
        if (response.ok) {
          const data = await response.json();
          setRooms(data.rooms || []);
          if (data.rooms?.length > 0 && selectedRoomId === null) {
            setSelectedRoomId(data.rooms[0].id);
          }
        }
      } catch (error) {
        console.error('Error loading rooms:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadRooms();
  }, [isChatOpen]);

  useEffect(() => {
    if (!isChatOpen || !currentUserEmail) return;
    if (viewMode === 'dms') {
      setDmListLoading(true);
      fetchDmConversations();
    }
  }, [isChatOpen, viewMode, currentUserEmail, fetchDmConversations]);

  useEffect(() => {
    if (!isChatOpen) return;
    fetchUnreadMentions();
    const interval = setInterval(fetchUnreadMentions, 10000);
    return () => clearInterval(interval);
  }, [isChatOpen, fetchUnreadMentions]);

  useEffect(() => {
    if (!selectedRoomId || !currentUserEmail) return;
    fetch(`/api/chat/rooms/${selectedRoomId}/read`, { method: 'POST' })
      .then(() => fetchUnreadMentions())
      .catch((e) => console.error('Error marking room read:', e));
  }, [selectedRoomId, currentUserEmail, fetchUnreadMentions]);

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      left: position.x,
      top: position.y,
    };
  };

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      setPosition({
        x: dragStartRef.current.left + e.clientX - dragStartRef.current.x,
        y: Math.max(0, dragStartRef.current.top + e.clientY - dragStartRef.current.y),
      });
    };
    const onUp = () => setIsDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDragging]);

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    };
  };

  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - resizeStartRef.current.x;
      const dy = e.clientY - resizeStartRef.current.y;
      const maxW = typeof window !== 'undefined' ? Math.min(MAX_WIDTH, window.innerWidth - position.x - 20) : MAX_WIDTH;
      const maxH = typeof window !== 'undefined' ? Math.min(MAX_HEIGHT, window.innerHeight - position.y - 20) : MAX_HEIGHT;
      setSize({
        width: Math.max(MIN_WIDTH, Math.min(maxW, resizeStartRef.current.width + dx)),
        height: Math.max(MIN_HEIGHT, Math.min(maxH, resizeStartRef.current.height + dy)),
      });
    };
    const onUp = () => setIsResizing(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isResizing, position.x, position.y]);

  const handleRequestDM = useCallback(
    async (userEmail: string, username: string) => {
      if (!currentUserEmail) return;
      setViewMode('dms');
      setDmListLoading(true);
      try {
        const res = await fetch(`/api/chat/dms/with/${encodeURIComponent(userEmail)}`);
        if (res.ok) {
          const data = await res.json();
          setSelectedDmId(data.dmId);
          setSelectedDmOtherUser(data.otherUser || { email: userEmail, username });
          setDmConversations((prev) => {
            const existing = prev.find((c) => c.dmId === data.dmId);
            if (existing) return prev;
            return [
              {
                dmId: data.dmId,
                otherUser: data.otherUser || { email: userEmail, username },
                lastMessage: { id: 0, sender_email: '', username: '', message_text: '', created_at: new Date().toISOString() },
              },
              ...prev,
            ];
          });
        }
      } catch (e) {
        console.error('Error opening DM:', e);
      } finally {
        setDmListLoading(false);
      }
    },
    [currentUserEmail]
  );

  if (!isChatOpen) return null;

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
  const isAuthenticated = !!currentUserEmail;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20 pointer-events-none"
        aria-hidden
      />
      <div
        className="fixed z-50 flex flex-col rounded-xl overflow-hidden border border-zinc-700 bg-zinc-900 shadow-2xl"
        style={{
          width: size.width,
          height: size.height,
          left: position.x,
          top: position.y,
          cursor: isDragging ? 'grabbing' : isResizing ? 'nwse-resize' : 'default',
        }}
      >
        {/* Draggable header */}
        <div
          onMouseDown={handleHeaderMouseDown}
          className="flex items-center justify-between px-4 py-2.5 bg-zinc-800 border-b border-zinc-700 cursor-grab active:cursor-grabbing select-none"
        >
          <span className="text-sm font-semibold text-white">Trading Chat</span>
          <button
            type="button"
            onClick={closeChat}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
            aria-label="Close chat"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex min-h-0">
          {!isAuthenticated ? (
            <div className="flex-1 flex items-center justify-center p-4 text-zinc-400 text-sm">
              Log in to use chat
            </div>
          ) : isLoading ? (
            <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm">
              Loading...
            </div>
          ) : (
            <>
              {/* Sidebar with Channels / DMs tabs */}
              <div className="w-40 flex-shrink-0 border-r border-zinc-700 overflow-hidden flex flex-col bg-zinc-900/50">
                <div className="flex border-b border-zinc-700">
                  <button
                    type="button"
                    onClick={() => setViewMode('channels')}
                    className={`flex-1 px-2 py-2.5 text-xs font-semibold transition-colors ${
                      viewMode === 'channels' ? 'bg-zinc-800 text-white border-b-2 border-blue-500' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Channels
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('dms')}
                    className={`flex-1 px-2 py-2.5 text-xs font-semibold transition-colors ${
                      viewMode === 'dms' ? 'bg-zinc-800 text-white border-b-2 border-teal-500' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    DMs
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {viewMode === 'channels' ? (
                    <>
                      <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-2">
                        Public
                      </div>
                      {rooms.length === 0 ? (
                        <p className="text-xs text-zinc-500 px-2">No rooms</p>
                      ) : (
                        <div className="space-y-1">
                          {rooms.map((room) => {
                            const unreadCount = unreadByRoom[String(room.id)] || 0;
                            return (
                              <button
                                key={room.id}
                                type="button"
                                onClick={() => setSelectedRoomId(room.id)}
                                className={`w-full text-left px-2 py-2 rounded-lg text-sm flex items-center justify-between gap-1 ${
                                  selectedRoomId === room.id ? 'bg-blue-600 text-white' : 'text-zinc-300 hover:bg-zinc-800'
                                }`}
                              >
                                <span className="truncate">#{room.name}</span>
                                {unreadCount > 0 && (
                                  <span className="flex-shrink-0 min-w-[18px] h-4 flex items-center justify-center px-1 text-[10px] font-bold text-white bg-red-500 rounded-full animate-pulse">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-2">
                        Direct messages
                      </div>
                      {dmListLoading ? (
                        <p className="text-xs text-zinc-500 px-2">Loading...</p>
                      ) : dmConversations.length === 0 ? (
                        <p className="text-xs text-zinc-500 px-2">No DMs yet. Click a username in a channel and choose DM.</p>
                      ) : (
                        <div className="space-y-1">
                          {dmConversations.map((conv) => (
                            <button
                              key={conv.dmId}
                              type="button"
                              onClick={() => {
                                setSelectedDmId(conv.dmId);
                                setSelectedDmOtherUser(conv.otherUser);
                              }}
                              className={`w-full text-left px-2 py-2 rounded-lg text-sm truncate ${
                                selectedDmId === conv.dmId ? 'bg-teal-600/80 text-white' : 'text-zinc-300 hover:bg-zinc-800'
                              }`}
                            >
                              {conv.otherUser.username}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              {/* Chat area */}
              <div className="flex-1 min-w-0 flex flex-col">
                {viewMode === 'channels' ? (
                  selectedRoom ? (
                    <ChatRoomComponent
                      roomId={selectedRoom.id}
                      roomName={selectedRoom.name}
                      currentUserEmail={currentUserEmail}
                      currentUsername={currentUsername}
                      onRequestDM={handleRequestDM}
                    />
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
                      Select a channel
                    </div>
                  )
                ) : selectedDmId && selectedDmOtherUser ? (
                  <DMRoomComponent
                    dmId={selectedDmId}
                    otherUser={selectedDmOtherUser}
                    currentUserEmail={currentUserEmail}
                    currentUsername={currentUsername}
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
                    Select a DM or click a username in a channel and choose DM
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        {/* Resize handle - drag from bottom-right corner */}
        <div
          onMouseDown={handleResizeMouseDown}
          className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize flex items-end justify-end p-1 group"
          aria-label="Resize chat"
        >
          <svg
            className="w-4 h-4 text-zinc-500 group-hover:text-zinc-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </div>
      </div>
    </>
  );
}
