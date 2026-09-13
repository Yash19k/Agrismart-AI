import React, { createContext, useContext } from 'react';
import { useGoogleTranslate, GOOGLE_LANGUAGES } from '../components/common/GoogleTranslate';

const LanguageContext = createContext({
  currentLang: 'en',
  changeLanguage: () => {},
  languages: GOOGLE_LANGUAGES,
  activeLanguageObj: GOOGLE_LANGUAGES[0],
});

/**
 * LanguageProvider
 * Bridges to the Google Translate Website Translator widget context.
 * Eliminates react-i18next and uses dynamic Google Translate DOM translation.
 */
export const LanguageProvider = ({ children }) => {
  const { activeLang, activeLangObj, changeLanguage, languages } = useGoogleTranslate();

  return (
    <LanguageContext.Provider
      value={{
        currentLang: activeLang || 'en',
        changeLanguage,
        languages: languages || GOOGLE_LANGUAGES,
        activeLanguageObj: activeLangObj || GOOGLE_LANGUAGES[0],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
export default LanguageContext;
