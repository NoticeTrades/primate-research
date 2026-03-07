'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type VolatilityContextType = {
  isVolatilityOpen: boolean;
  openVolatility: () => void;
  closeVolatility: () => void;
};

const VolatilityContext = createContext<VolatilityContextType | null>(null);

export function VolatilityProvider({ children }: { children: ReactNode }) {
  const [isVolatilityOpen, setIsVolatilityOpen] = useState(false);

  const openVolatility = useCallback(() => {
    setIsVolatilityOpen(true);
  }, []);

  const closeVolatility = useCallback(() => {
    setIsVolatilityOpen(false);
  }, []);

  return (
    <VolatilityContext.Provider value={{ isVolatilityOpen, openVolatility, closeVolatility }}>
      {children}
    </VolatilityContext.Provider>
  );
}

export function useVolatility() {
  const ctx = useContext(VolatilityContext);
  if (!ctx) throw new Error('useVolatility must be used within VolatilityProvider');
  return ctx;
}
