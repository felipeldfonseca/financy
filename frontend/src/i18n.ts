import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation resources
import enCommon from './locales/en/common.json';
import enOnboarding from './locales/en/onboarding.json';
import enNavigation from './locales/en/navigation.json';

import ptCommon from './locales/pt/common.json';
import ptOnboarding from './locales/pt/onboarding.json';
import ptNavigation from './locales/pt/navigation.json';

const resources = {
  en: {
    common: enCommon,
    onboarding: enOnboarding,
    navigation: enNavigation,
  },
  pt: {
    common: ptCommon,
    onboarding: ptOnboarding,
    navigation: ptNavigation,
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
    ns: ['common', 'onboarding', 'navigation'],

    // Debug mode for development
    debug: process.env.NODE_ENV === 'development',
  });

export default i18n;