/**
 * Lightweight string helper replacing react-i18next.
 * Returns default English UI strings so Google Translate Website Translator widget
 * dynamically translates visible DOM elements without requiring JSON translation files or i18next runtime.
 */
export const useTranslation = () => {
  return {
    t: (key, fallback) => fallback || key,
    i18n: {
      language: 'en',
      changeLanguage: () => {},
    },
  };
};

export default useTranslation;
