import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';

interface LanguageContextType {
  language: string;
  changeLanguage: (lang: string) => Promise<void>;
  isChangingLanguage: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: React.ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const { i18n } = useTranslation();
  const { state: { user } } = useAuth();
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);

  // Initialize language from user preference or browser default
  useEffect(() => {
    const initializeLanguage = async () => {
      let targetLanguage = 'en'; // fallback

      if (user?.language) {
        // User has a saved language preference
        targetLanguage = user.language;
      } else {
        // Try to detect browser language
        const browserLang = navigator.language.split('-')[0];
        if (['en', 'pt', 'es'].includes(browserLang)) {
          targetLanguage = browserLang;
        }
      }

      if (i18n.language !== targetLanguage) {
        await i18n.changeLanguage(targetLanguage);
      }
    };

    initializeLanguage();
  }, [user, i18n]);

  const changeLanguage = async (lang: string): Promise<void> => {
    if (lang === i18n.language) return;

    setIsChangingLanguage(true);
    try {
      await i18n.changeLanguage(lang);
      // Note: The actual user preference update should be handled by the component
      // that calls this function (like onboarding or settings) via the auth API
    } finally {
      setIsChangingLanguage(false);
    }
  };

  const contextValue: LanguageContextType = {
    language: i18n.language,
    changeLanguage,
    isChangingLanguage,
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};