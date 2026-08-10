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
import enTelegram from './locales/en/telegram.json';
import enPlanning from './locales/en/planning.json';
import enContexts from './locales/en/contexts.json';
import enLanding from './locales/en/landing.json';

import ptCommon from './locales/pt/common.json';
import ptOnboarding from './locales/pt/onboarding.json';
import ptNavigation from './locales/pt/navigation.json';
import ptSettings from './locales/pt/settings.json';
import ptDashboard from './locales/pt/dashboard.json';
import ptAuth from './locales/pt/auth.json';
import ptTransactions from './locales/pt/transactions.json';
import ptTelegram from './locales/pt/telegram.json';
import ptPlanning from './locales/pt/planning.json';
import ptContexts from './locales/pt/contexts.json';
import ptLanding from './locales/pt/landing.json';

import esCommon from './locales/es/common.json';
import esOnboarding from './locales/es/onboarding.json';
import esNavigation from './locales/es/navigation.json';
import esSettings from './locales/es/settings.json';
import esDashboard from './locales/es/dashboard.json';
import esAuth from './locales/es/auth.json';
import esTransactions from './locales/es/transactions.json';
import esTelegram from './locales/es/telegram.json';
import esPlanning from './locales/es/planning.json';
import esContexts from './locales/es/contexts.json';
import esLanding from './locales/es/landing.json';

const resources = {
  en: {
    common: enCommon,
    onboarding: enOnboarding,
    navigation: enNavigation,
    settings: enSettings,
    dashboard: enDashboard,
    auth: enAuth,
    transactions: enTransactions,
    telegram: enTelegram,
    planning: enPlanning,
    contexts: enContexts,
    landing: enLanding,
  },
  pt: {
    common: ptCommon,
    onboarding: ptOnboarding,
    navigation: ptNavigation,
    settings: ptSettings,
    dashboard: ptDashboard,
    auth: ptAuth,
    transactions: ptTransactions,
    telegram: ptTelegram,
    planning: ptPlanning,
    contexts: ptContexts,
    landing: ptLanding,
  },
  es: {
    common: esCommon,
    onboarding: esOnboarding,
    navigation: esNavigation,
    settings: esSettings,
    dashboard: esDashboard,
    auth: esAuth,
    transactions: esTransactions,
    telegram: esTelegram,
    planning: esPlanning,
    contexts: esContexts,
    landing: esLanding,
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
    ns: ['common', 'onboarding', 'navigation', 'settings', 'dashboard', 'auth', 'transactions', 'telegram', 'planning', 'landing', 'contexts'],

    // Debug mode for development
    debug: process.env.NODE_ENV === 'development',
  });

export default i18n;