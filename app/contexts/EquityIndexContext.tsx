'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type EquityIndexContextType = {
  isEquityIndexOpen: boolean;
  openEquityIndex: () => void;
  closeEquityIndex: () => void;
};

const EquityIndexContext = createContext<EquityIndexContextType | null>(null);

export function EquityIndexProvider({ children }: { children: ReactNode }) {
  const [isEquityIndexOpen, setIsEquityIndexOpen] = useState(false);

  const openEquityIndex = useCallback(() => {
    setIsEquityIndexOpen(true);
  }, []);

  const closeEquityIndex = useCallback(() => {
    setIsEquityIndexOpen(false);
  }, []);

  return (
    <EquityIndexContext.Provider value={{ isEquityIndexOpen, openEquityIndex, closeEquityIndex }}>
      {children}
    </EquityIndexContext.Provider>
  );
}

export function useEquityIndex() {
  const ctx = useContext(EquityIndexContext);
  if (!ctx) throw new Error('useEquityIndex must be used within EquityIndexProvider');
  return ctx;
}
