'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useChat } from '../contexts/ChatContext';

const ChatRoomComponent = dynamic(() => import('./ChatRoom'), { ssr: false });

interface ChatRoomData {
  id: number;
  name: string;
  description: string | null;
  topic: string | null;
  is_active: boolean;
  created_at: string;
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

const POPUP_WIDTH = 520;
const POPUP_HEIGHT = 640;
const DEFAULT_X = typeof window !== 'undefined' ? window.innerWidth - POPUP_WIDTH - 24 : 100;
const DEFAULT_Y = 80;

export default function ChatPopup() {
  const { isChatOpen, closeChat } = useChat();
  const [position, setPosition] = useState({ x: DEFAULT_X, y: DEFAULT_Y });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, left: 0, top: 0 });

  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [currentUsername, setCurrentUsername] = useState('');
  const [rooms, setRooms] = useState<ChatRoomData[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadByRoom, setUnreadByRoom] = useState<Record<string, number>>({});

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

  if (!isChatOpen) return null;

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
  const isAuthenticated = !!currentUserEmail;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20"
        aria-hidden
        onClick={closeChat}
      />
      <div
        className="fixed z-50 flex flex-col rounded-xl overflow-hidden border border-zinc-700 bg-zinc-900 shadow-2xl"
        style={{
          width: POPUP_WIDTH,
          height: POPUP_HEIGHT,
          left: position.x,
          top: position.y,
          cursor: isDragging ? 'grabbing' : 'default',
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
              {/* Room list */}
              <div className="w-36 flex-shrink-0 border-r border-zinc-700 overflow-y-auto bg-zinc-900/50 p-2">
                <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-2">
                  Channels
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
                            selectedRoomId === room.id
                              ? 'bg-blue-600 text-white'
                              : 'text-zinc-300 hover:bg-zinc-800'
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
              </div>
              {/* Chat area */}
              <div className="flex-1 min-w-0 flex flex-col">
                {selectedRoom ? (
                  <ChatRoomComponent
                    roomId={selectedRoom.id}
                    roomName={selectedRoom.name}
                    currentUserEmail={currentUserEmail}
                    currentUsername={currentUsername}
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
                    Select a channel
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
