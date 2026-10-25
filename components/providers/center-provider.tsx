'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { CenterPublicData, CenterFeatures, defaultCenterData } from '@/lib/types/center';
import { generateThemeCss } from '@/lib/theme';

interface CenterContextType {
  center: CenterPublicData;
  features: CenterFeatures;
  updateCenter: (data: Partial<CenterPublicData>) => void;
  refreshCenter: () => Promise<void>;
}

const CenterContext = createContext<CenterContextType>({
  center: defaultCenterData,
  features: defaultCenterData.features,
  updateCenter: () => {},
  refreshCenter: async () => {},
});

export function CenterProvider({
  children,
  initialData,
}: {
  children: React.ReactNode;
  initialData?: CenterPublicData;
}) {
  const [center, setCenter] = useState<CenterPublicData>(initialData || defaultCenterData);

  const [prevInitialData, setPrevInitialData] = useState(initialData);

  if (initialData !== prevInitialData) {
    setPrevInitialData(initialData);
    if (initialData) {
      setCenter(initialData);
    }
  }

  // Dynamically update document title & dynamic style when center or primaryColor changes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      let styleTag = document.getElementById('center-theme') as HTMLStyleElement | null;
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'center-theme';
        document.head.appendChild(styleTag);
      }
      styleTag.innerHTML = generateThemeCss(center.primaryColor);
    }
  }, [center.primaryColor]);

  const updateCenter = (partial: Partial<CenterPublicData>) => {
    setCenter((prev) => ({
      ...prev,
      ...partial,
      features: {
        ...prev.features,
        ...(partial.features || {}),
      },
    }));
  };

  const refreshCenter = async () => {
    try {
      const res = await fetch('/api/public/center', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          updateCenter(json.data);
        }
      }
    } catch {
      // Ignore network errors during refresh
    }
  };

  return (
    <CenterContext.Provider
      value={{
        center,
        features: center.features,
        updateCenter,
        refreshCenter,
      }}
    >
      {children}
    </CenterContext.Provider>
  );
}

export function useCenter() {
  const context = useContext(CenterContext);
  if (!context) {
    throw new Error('useCenter must be used within a CenterProvider');
  }
  return context;
}
