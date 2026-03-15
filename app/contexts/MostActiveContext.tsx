'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type MostActiveContextType = {
  isMostActiveOpen: boolean;
  openMostActive: () => void;
  closeMostActive: () => void;
};

const MostActiveContext = createContext<MostActiveContextType | null>(null);

export function MostActiveProvider({ children }: { children: ReactNode }) {
  const [isMostActiveOpen, setIsMostActiveOpen] = useState(false);

  const openMostActive = useCallback(() => {
    setIsMostActiveOpen(true);
  }, []);

  const closeMostActive = useCallback(() => {
    setIsMostActiveOpen(false);
  }, []);

  return (
    <MostActiveContext.Provider value={{ isMostActiveOpen, openMostActive, closeMostActive }}>
      {children}
    </MostActiveContext.Provider>
  );
}

export function useMostActive() {
  const ctx = useContext(MostActiveContext);
  if (!ctx) throw new Error('useMostActive must be used within MostActiveProvider');
  return ctx;
}
