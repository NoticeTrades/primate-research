'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const ChatRoomComponent = dynamic(() => import('../components/ChatRoom'), {
  ssr: false,
});

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

export default function ChatPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [currentUsername, setCurrentUsername] = useState('');
  const [rooms, setRooms] = useState<ChatRoomData[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadByRoom, setUnreadByRoom] = useState<Record<string, number>>({});

  // Fetch unread mention counts per room (for red badge beside channel name)
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
    const email = getCookie('user_email');
    const username = getCookie('user_username');
    
    if (!email) {
      router.push('/signup?redirect=/chat');
      return;
    }

    setIsAuthenticated(true);
    setCurrentUserEmail(email);
    setCurrentUsername(username || '');

    // Check for room query parameter (from notifications)
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    const roomIdFromUrl = roomParam ? parseInt(roomParam, 10) : null;

    // Load chat rooms
    const loadRooms = async () => {
      try {
        const response = await fetch('/api/chat/rooms');
        if (response.ok) {
          const data = await response.json();
          setRooms(data.rooms || []);
          // Auto-select room from URL param, or first room if available
          if (data.rooms && data.rooms.length > 0 && !selectedRoomId) {
            if (roomIdFromUrl && data.rooms.some((r: ChatRoomData) => r.id === roomIdFromUrl)) {
              setSelectedRoomId(roomIdFromUrl);
            } else {
              setSelectedRoomId(data.rooms[0].id);
            }
          }
        }
      } catch (error) {
        console.error('Error loading rooms:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRooms();
  }, [router, selectedRoomId]);

  // Fetch unread mentions when authenticated, and poll every 10s
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchUnreadMentions();
    const interval = setInterval(fetchUnreadMentions, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchUnreadMentions]);

  // When user selects a room, mark that room as read (clears red badge)
  useEffect(() => {
    if (!selectedRoomId || !isAuthenticated) return;
    fetch(`/api/chat/rooms/${selectedRoomId}/read`, { method: 'POST' }).then(() => {
      fetchUnreadMentions();
    }).catch((e) => console.error('Error marking room read:', e));
  }, [selectedRoomId, isAuthenticated, fetchUnreadMentions]);

  if (!isAuthenticated || isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Trading Chat</h1>
          <p className="text-zinc-400">
            Connect with traders and discuss market insights
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
          {/* Room Sidebar */}
          <div className="lg:col-span-1 bg-zinc-900 rounded-lg p-4 overflow-y-auto">
            <h2 className="text-lg font-semibold text-white mb-4">Rooms</h2>
            {rooms.length === 0 ? (
              <div className="text-zinc-400 text-sm">
                <p className="mb-2">No rooms available.</p>
                <p className="text-xs">Run database setup in /admin to create chat rooms.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {rooms.map((room) => {
                  const unreadCount = unreadByRoom[String(room.id)] || 0;
                  return (
                    <button
                      key={room.id}
                      onClick={() => setSelectedRoomId(room.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center justify-between gap-2 ${
                        selectedRoomId === room.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate">#{room.name}</div>
                        {room.description && (
                          <div className="text-sm opacity-75 mt-1 truncate">
                            {room.description}
                          </div>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <span className="flex-shrink-0 min-w-[20px] h-5 flex items-center justify-center px-1.5 text-xs font-bold text-white bg-red-500 rounded-full animate-pulse">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3">
            {selectedRoom ? (
              <div className="h-full">
                <ChatRoomComponent
                  roomId={selectedRoom.id}
                  roomName={selectedRoom.name}
                  currentUserEmail={currentUserEmail}
                  currentUsername={currentUsername}
                />
              </div>
            ) : (
              <div className="h-full bg-zinc-900 rounded-lg flex items-center justify-center">
                <div className="text-center text-zinc-400">
                  <p className="text-lg mb-2">Select a room to start chatting</p>
                  <p className="text-sm">Choose a room from the sidebar</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

