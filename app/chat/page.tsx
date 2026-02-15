'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const ChatRoomComponent = dynamic(() => import('../components/ChatRoom'), {
  ssr: false,
});
const DMRoomComponent = dynamic(() => import('../components/DMRoom'), {
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

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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
    const email = getCookie('user_email');
    const username = getCookie('user_username');

    if (!email) {
      router.push('/signup?redirect=/chat');
      return;
    }

    setIsAuthenticated(true);
    setCurrentUserEmail(email);
    setCurrentUsername(username || '');

    const roomParam = searchParams.get('room');
    const dmParam = searchParams.get('dm');
    const roomIdFromUrl = roomParam ? parseInt(roomParam, 10) : null;
    const dmIdFromUrl = dmParam ? parseInt(dmParam, 10) : null;

    const loadRooms = async () => {
      try {
        const response = await fetch('/api/chat/rooms');
        if (response.ok) {
          const data = await response.json();
          setRooms(data.rooms || []);
          if (data.rooms && data.rooms.length > 0 && selectedRoomId === null && !dmIdFromUrl) {
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

    if (dmIdFromUrl) {
      setViewMode('dms');
      setSelectedDmId(dmIdFromUrl);
      setDmListLoading(true);
      Promise.all([
        fetch('/api/chat/dms'),
        fetch(`/api/chat/dms/${dmIdFromUrl}`),
      ]).then(async ([dmsRes, infoRes]) => {
        if (dmsRes.ok) {
          const data = await dmsRes.json();
          setDmConversations(data.conversations || []);
          const conv = (data.conversations || []).find((c: DMConversation) => c.dmId === dmIdFromUrl);
          if (conv) setSelectedDmOtherUser(conv.otherUser);
        }
        if (infoRes.ok) {
          const info = await infoRes.json();
          if (info.otherUser) setSelectedDmOtherUser(info.otherUser);
        }
        setDmListLoading(false);
      }).catch(() => setDmListLoading(false));
    }
  }, [router, searchParams]);

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

  useEffect(() => {
    if (!isAuthenticated || viewMode !== 'dms') return;
    setDmListLoading(true);
    fetchDmConversations();
  }, [isAuthenticated, viewMode, fetchDmConversations]);

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
          {/* Sidebar with Channels / DMs tabs */}
          <div className="lg:col-span-1 bg-zinc-900 rounded-lg overflow-hidden flex flex-col">
            <div className="flex border-b border-zinc-700">
              <button
                type="button"
                onClick={() => setViewMode('channels')}
                className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
                  viewMode === 'channels' ? 'bg-zinc-800 text-white border-b-2 border-blue-500' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Channels
              </button>
              <button
                type="button"
                onClick={() => setViewMode('dms')}
                className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
                  viewMode === 'dms' ? 'bg-zinc-800 text-white border-b-2 border-teal-500' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                DMs
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {viewMode === 'channels' ? (
                <>
                  <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Public</h2>
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
                              selectedRoomId === room.id ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold truncate">#{room.name}</div>
                              {room.description && (
                                <div className="text-sm opacity-75 mt-1 truncate">{room.description}</div>
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
                </>
              ) : (
                <>
                  <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Direct messages</h2>
                  {dmListLoading ? (
                    <p className="text-zinc-400 text-sm">Loading...</p>
                  ) : dmConversations.length === 0 ? (
                    <p className="text-zinc-400 text-sm">No DMs yet. Click a username in a channel and choose DM.</p>
                  ) : (
                    <div className="space-y-2">
                      {dmConversations.map((conv) => (
                        <button
                          key={conv.dmId}
                          onClick={() => {
                            setSelectedDmId(conv.dmId);
                            setSelectedDmOtherUser(conv.otherUser);
                          }}
                          className={`w-full text-left px-4 py-3 rounded-lg transition-colors truncate ${
                            selectedDmId === conv.dmId ? 'bg-teal-600/80 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
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

          {/* Chat Area */}
          <div className="lg:col-span-3">
            {viewMode === 'channels' ? (
              selectedRoom ? (
                <div className="h-full">
                  <ChatRoomComponent
                    roomId={selectedRoom.id}
                    roomName={selectedRoom.name}
                    currentUserEmail={currentUserEmail}
                    currentUsername={currentUsername}
                    onRequestDM={handleRequestDM}
                  />
                </div>
              ) : (
                <div className="h-full bg-zinc-900 rounded-lg flex items-center justify-center">
                  <div className="text-center text-zinc-400">
                    <p className="text-lg mb-2">Select a room to start chatting</p>
                    <p className="text-sm">Choose a room from the sidebar</p>
                  </div>
                </div>
              )
            ) : selectedDmId && selectedDmOtherUser ? (
              <div className="h-full">
                <DMRoomComponent
                  dmId={selectedDmId}
                  otherUser={selectedDmOtherUser}
                  currentUserEmail={currentUserEmail}
                  currentUsername={currentUsername}
                />
              </div>
            ) : (
              <div className="h-full bg-zinc-900 rounded-lg flex items-center justify-center">
                <div className="text-center text-zinc-400">
                  <p className="text-lg mb-2">Select a DM or start one from a channel</p>
                  <p className="text-sm">Click a username in a channel and choose DM</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

