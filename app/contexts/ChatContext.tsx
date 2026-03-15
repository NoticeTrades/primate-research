'use client';

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';

export type OpenChatOptions = { dmId?: number; roomId?: number };

type ChatContextType = {
  isChatOpen: boolean;
  openChat: (options?: OpenChatOptions) => void;
  closeChat: () => void;
  consumePendingOpen: () => OpenChatOptions | null;
};

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const pendingOpenRef = useRef<OpenChatOptions | null>(null);

  const openChat = useCallback((options?: OpenChatOptions) => {
    pendingOpenRef.current = options ?? null;
    setIsChatOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsChatOpen(false);
    pendingOpenRef.current = null;
  }, []);

  const consumePendingOpen = useCallback(() => {
    const next = pendingOpenRef.current;
    pendingOpenRef.current = null;
    return next;
  }, []);

  return (
    <ChatContext.Provider value={{ isChatOpen, openChat, closeChat, consumePendingOpen }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return ctx;
}
