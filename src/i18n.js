import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 1. Import your separate translation files (adjust the paths based on your folder structure)
import enTranslations from './locales/en.json';
import tlTranslations from './locales/tl.json';
import mrwTranslations from './locales/mrw.json';

i18n
  .use(LanguageDetector) 
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      tl: { translation: tlTranslations },
      mrw: { translation: mrwTranslations },
    },
    fallbackLng: 'en', // If a translation is missing, it falls back to English
    detection: {
      order: ['localStorage', 'cookie', 'navigator'],
      caches: ['localStorage'], // 🌟 THIS is the magic line that remembers the language across pages!
    },
    interpolation: {
      escapeValue: false, // React already protects from XSS
    },
  });

export default i18n;