import React, { createContext, useState, useContext } from 'react';

export interface BrandingSettings {
  companyName: string;
  primaryColor: string;
  logoUrl: string;
}

interface BrandingContextType {
  settings: BrandingSettings;
  updateSettings: (newSettings: Partial<BrandingSettings>) => void;
}

const defaultSettings: BrandingSettings = {
  companyName: 'Ayratech',
  primaryColor: '#196ee6',
  logoUrl: 'https://cdn-icons-png.flaticon.com/512/3050/3050253.png', // Placeholder
};

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<BrandingSettings>(defaultSettings);

  const updateSettings = (newSettings: Partial<BrandingSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <BrandingContext.Provider value={{ settings, updateSettings }}>
      <style>{`
        :root {
          --primary-color: ${settings.primaryColor};
        }
      `}</style>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (!context) throw new Error('useBranding must be used within a BrandingProvider');
  return context;
};
