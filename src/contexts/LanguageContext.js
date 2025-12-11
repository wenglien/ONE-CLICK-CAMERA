import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations, languages } from '../locales';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    // Check localStorage first
    const saved = localStorage.getItem('foodCamera_language');
    if (saved && translations[saved]) {
      return saved;
    }
    // Check browser language
    const browserLang = navigator.language;
    if (browserLang.startsWith('zh')) {
      return 'zh-TW';
    }
    return 'en';
  });

  // Save language preference
  useEffect(() => {
    localStorage.setItem('foodCamera_language', currentLanguage);
  }, [currentLanguage]);

  // Change language
  const changeLanguage = useCallback((langCode) => {
    if (translations[langCode]) {
      setCurrentLanguage(langCode);
      localStorage.setItem('foodCamera_language', langCode);
    }
  }, []);

  // Translation function
  const t = useCallback((key, fallback = '') => {
    const keys = key.split('.');
    let value = translations[currentLanguage];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Try English as fallback
        let enValue = translations['en'];
        for (const enk of keys) {
          if (enValue && typeof enValue === 'object' && enk in enValue) {
            enValue = enValue[enk];
          } else {
            return fallback || key;
          }
        }
        return enValue || fallback || key;
      }
    }
    
    return value || fallback || key;
  }, [currentLanguage]);

  const value = {
    currentLanguage,
    languages,
    changeLanguage,
    t,
    isEnglish: currentLanguage === 'en',
    isChinese: currentLanguage === 'zh-TW'
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageContext;

