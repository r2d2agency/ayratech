import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../api/client';
import { getImageUrl } from '../utils/image';

export interface BrandingSettings {
  companyName: string;
  primaryColor: string;
  logoUrl: string;
  faviconUrl?: string;
  pwaIconUrl?: string;
  siteIconUrl?: string;
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

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get('/settings');
        if (response.data) {
            setSettings(prev => ({ ...prev, ...response.data }));
        }
      } catch (error) {
        console.error('Failed to fetch branding settings:', error);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    // Update Title
    if (settings.companyName) {
        document.title = settings.companyName;
    }

    // Update Favicon
    if (settings.faviconUrl) {
        const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'shortcut icon';
        link.href = getImageUrl(settings.faviconUrl);
        document.getElementsByTagName('head')[0].appendChild(link);
    }
  }, [settings]);

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
