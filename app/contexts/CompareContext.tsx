'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type CompareContextType = {
  isCompareOpen: boolean;
  openCompare: () => void;
  closeCompare: () => void;
};

const CompareContext = createContext<CompareContextType | null>(null);

export function CompareProvider({ children }: { children: ReactNode }) {
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  const openCompare = useCallback(() => {
    setIsCompareOpen(true);
  }, []);

  const closeCompare = useCallback(() => {
    setIsCompareOpen(false);
  }, []);

  return (
    <CompareContext.Provider value={{ isCompareOpen, openCompare, closeCompare }}>
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error('useCompare must be used within CompareProvider');
  return ctx;
}
