import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation resources
import enCommon from './locales/en/common.json';
import enOnboarding from './locales/en/onboarding.json';
import enNavigation from './locales/en/navigation.json';
import enSettings from './locales/en/settings.json';
import enDashboard from './locales/en/dashboard.json';
import enAuth from './locales/en/auth.json';
import enTransactions from './locales/en/transactions.json';

import ptCommon from './locales/pt/common.json';
import ptOnboarding from './locales/pt/onboarding.json';
import ptNavigation from './locales/pt/navigation.json';
import ptSettings from './locales/pt/settings.json';
import ptDashboard from './locales/pt/dashboard.json';
import ptAuth from './locales/pt/auth.json';
import ptTransactions from './locales/pt/transactions.json';

const resources = {
  en: {
    common: enCommon,
    onboarding: enOnboarding,
    navigation: enNavigation,
    settings: enSettings,
    dashboard: enDashboard,
    auth: enAuth,
    transactions: enTransactions,
  },
  pt: {
    common: ptCommon,
    onboarding: ptOnboarding,
    navigation: ptNavigation,
    settings: ptSettings,
    dashboard: ptDashboard,
    auth: ptAuth,
    transactions: ptTransactions,
  },
};

// Smart language detection function
const detectInitialLanguage = (): string => {
  // Try to detect browser language
  const browserLang = navigator.language.split('-')[0];
  
  // Support Portuguese (pt), English (en), and Spanish (es)
  if (['pt', 'en', 'es'].includes(browserLang)) {
    return browserLang;
  }
  
  // Fallback to English
  return 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: detectInitialLanguage(), // Use browser detection as initial language
    fallbackLng: 'en',
    
    // Language detection options
    detection: {
      order: ['navigator'], // Use browser language
      caches: [], // Don't cache in localStorage (we handle this in LanguageContext)
    },
    
    interpolation: {
      escapeValue: false, // React already does escaping
    },

    // Namespace configuration
    defaultNS: 'common',
    ns: ['common', 'onboarding', 'navigation', 'settings', 'dashboard', 'auth', 'transactions'],

    // Debug mode for development
    debug: process.env.NODE_ENV === 'development',
  });

export default i18n;