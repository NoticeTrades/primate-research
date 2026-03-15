'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type TickerContextType = {
  openTickers: string[];
  openTicker: (symbol: string) => void;
  closeTicker: (symbol: string) => void;
};

const TickerContext = createContext<TickerContextType | null>(null);

export function TickerProvider({ children }: { children: ReactNode }) {
  const [openTickers, setOpenTickers] = useState<string[]>([]);

  const openTicker = useCallback((symbol: string) => {
    const s = symbol.toUpperCase().trim();
    if (!s) return;
    setOpenTickers((prev) => (prev.includes(s) ? prev : [...prev, s]));
  }, []);

  const closeTicker = useCallback((symbol: string) => {
    setOpenTickers((prev) => prev.filter((t) => t !== symbol));
  }, []);

  return (
    <TickerContext.Provider value={{ openTickers, openTicker, closeTicker }}>
      {children}
    </TickerContext.Provider>
  );
}

export function useTicker() {
  const ctx = useContext(TickerContext);
  if (!ctx) throw new Error('useTicker must be used within TickerProvider');
  return ctx;
}
