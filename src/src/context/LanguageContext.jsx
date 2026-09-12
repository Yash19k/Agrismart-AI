import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../i18n/config';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const { i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState(() => {
    return localStorage.getItem('agrishield_language') || 'en';
  });

  const changeLanguage = (code) => {
    i18n.changeLanguage(code);
    setCurrentLang(code);
    localStorage.setItem('agrishield_language', code);
    document.documentElement.lang = code;
  };

  useEffect(() => {
    document.documentElement.lang = currentLang;
  }, [currentLang]);

  const activeLanguageObj = SUPPORTED_LANGUAGES.find((l) => l.code === currentLang) || SUPPORTED_LANGUAGES[0];

  return (
    <LanguageContext.Provider
      value={{
        currentLang,
        changeLanguage,
        languages: SUPPORTED_LANGUAGES,
        activeLanguageObj,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
