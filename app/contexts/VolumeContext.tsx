'use client';

import { createContext, useCallback, useContext, useState, ReactNode } from 'react';

type VolumeContextType = {
  isVolumeOpen: boolean;
  openVolume: () => void;
  closeVolume: () => void;
};

const VolumeContext = createContext<VolumeContextType | null>(null);

export function VolumeProvider({ children }: { children: ReactNode }) {
  const [isVolumeOpen, setIsVolumeOpen] = useState(false);

  const openVolume = useCallback(() => {
    setIsVolumeOpen(true);
  }, []);

  const closeVolume = useCallback(() => {
    setIsVolumeOpen(false);
  }, []);

  return (
    <VolumeContext.Provider value={{ isVolumeOpen, openVolume, closeVolume }}>
      {children}
    </VolumeContext.Provider>
  );
}

export function useVolume() {
  const ctx = useContext(VolumeContext);
  if (!ctx) throw new Error('useVolume must be used within VolumeProvider');
  return ctx;
}

