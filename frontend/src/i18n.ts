import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation resources
import enCommon from './locales/en/common.json';
import enOnboarding from './locales/en/onboarding.json';
import enNavigation from './locales/en/navigation.json';
import enSettings from './locales/en/settings.json';
import enDashboard from './locales/en/dashboard.json';

import ptCommon from './locales/pt/common.json';
import ptOnboarding from './locales/pt/onboarding.json';
import ptNavigation from './locales/pt/navigation.json';
import ptSettings from './locales/pt/settings.json';
import ptDashboard from './locales/pt/dashboard.json';

const resources = {
  en: {
    common: enCommon,
    onboarding: enOnboarding,
    navigation: enNavigation,
    settings: enSettings,
    dashboard: enDashboard,
  },
  pt: {
    common: ptCommon,
    onboarding: ptOnboarding,
    navigation: ptNavigation,
    settings: ptSettings,
    dashboard: ptDashboard,
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',
    
    interpolation: {
      escapeValue: false, // React already does escaping
    },

    // Namespace configuration
    defaultNS: 'common',
    ns: ['common', 'onboarding', 'navigation', 'settings', 'dashboard'],

    // Debug mode for development
    debug: process.env.NODE_ENV === 'development',
  });

export default i18n;