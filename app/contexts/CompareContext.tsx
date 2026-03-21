'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type CompareContextType = {
  isCompareOpen: boolean;
  initialSymbols: string[];
  openCompare: (initialSymbol?: string | string[]) => void;
  closeCompare: () => void;
};

const CompareContext = createContext<CompareContextType | null>(null);

export function CompareProvider({ children }: { children: ReactNode }) {
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [initialSymbols, setInitialSymbols] = useState<string[]>([]);

  const openCompare = useCallback((initialSymbol?: string | string[]) => {
    if (Array.isArray(initialSymbol)) {
      const normalized = initialSymbol
        .map((s) => String(s || '').trim().toUpperCase())
        .filter(Boolean);
      setInitialSymbols(normalized);
    } else if (typeof initialSymbol === 'string' && initialSymbol.trim()) {
      setInitialSymbols([initialSymbol.trim().toUpperCase()]);
    } else {
      setInitialSymbols([]);
    }
    setIsCompareOpen(true);
  }, []);

  const closeCompare = useCallback(() => {
    setIsCompareOpen(false);
    setInitialSymbols([]);
  }, []);

  return (
    <CompareContext.Provider value={{ isCompareOpen, initialSymbols, openCompare, closeCompare }}>
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error('useCompare must be used within CompareProvider');
  return ctx;
}
