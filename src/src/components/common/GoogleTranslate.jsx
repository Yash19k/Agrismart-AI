import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';

/**
 * Supported Languages for Google Translate Website Translator Widget.
 * Standard language codes as defined by Google Translate.
 */
export const GOOGLE_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'zh-CN', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
];

const GoogleTranslateContext = createContext({
  activeLang: 'en',
  activeLangObj: GOOGLE_LANGUAGES[0],
  changeLanguage: () => {},
  languages: GOOGLE_LANGUAGES,
  isScriptLoaded: false,
});

/**
 * Cookie Helpers for Google Translate Persistence.
 * Google Translate reads the cookie 'googtrans=/en/${targetLang}'.
 */
function getGoogleTranslateCookie() {
  const match = document.cookie.match(/(^|;\s*)googtrans=([^;]+)/);
  if (!match) return null;
  // Format is typically '/en/hi' or '/auto/hi'
  const parts = decodeURIComponent(match[2]).split('/');
  return parts[2] || parts[parts.length - 1] || null;
}

function setGoogleTranslateCookie(langCode) {
  const value = `/en/${langCode}`;
  const host = window.location.hostname;
  const domainParts = host.split('.');

  clearGoogleTranslateCookie();

  document.cookie = `googtrans=${value}; path=/;`;
  document.cookie = `googtrans=${value}; path=;`;

  if (host && host !== 'localhost' && host !== '127.0.0.1' && !/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    document.cookie = `googtrans=${value}; path=/; domain=.${host};`;
    if (domainParts.length > 2) {
      const rootDomain = domainParts.slice(-2).join('.');
      document.cookie = `googtrans=${value}; path=/; domain=.${rootDomain};`;
    }
  }
}

function clearGoogleTranslateCookie() {
  const host = window.location.hostname;
  const domainParts = host.split('.');
  const domains = ['', host, `.${host}`];
  if (domainParts.length > 2) {
    domains.push(`.${domainParts.slice(-2).join('.')}`);
  }
  const paths = ['/', ''];

  domains.forEach((d) => {
    paths.forEach((p) => {
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${p}; ${d ? `domain=${d};` : ''}`;
    });
  });
}

/**
 * GoogleTranslateProvider
 * Manages Google Translate script injection, widget initialization, and language switching state.
 */
export const GoogleTranslateProvider = ({ children }) => {
  const [activeLang, setActiveLang] = useState(() => {
    // 1. Check existing cookie
    const cookieLang = getGoogleTranslateCookie();
    if (cookieLang && GOOGLE_LANGUAGES.some((l) => l.code === cookieLang)) {
      return cookieLang;
    }
    // 2. Check localStorage
    const saved = localStorage.getItem('agrishield_google_lang');
    if (saved && GOOGLE_LANGUAGES.some((l) => l.code === saved)) {
      return saved;
    }
    return 'en';
  });

  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  // Initialize or connect to the official Google Translate Website Translator Script
  useEffect(() => {
    const checkInit = () => {
      if (window.google && window.google.translate && window.google.translate.TranslateElement) {
        setIsScriptLoaded(true);
        return true;
      }
      return false;
    };

    if (checkInit()) return;

    // Define or hook into the global callback expected by translate.google.com
    const prevInit = window.googleTranslateElementInit;
    window.googleTranslateElementInit = () => {
      if (typeof prevInit === 'function') {
        try {
          prevInit();
        } catch (e) {
          console.warn(e);
        }
      } else if (!window.__googleTranslateInitialized) {
        try {
          if (window.google && window.google.translate && window.google.translate.TranslateElement) {
            new window.google.translate.TranslateElement(
              {
                pageLanguage: 'en',
                includedLanguages: GOOGLE_LANGUAGES.filter((l) => l.code !== 'en').map((l) => l.code).join(','),
                autoDisplay: false,
              },
              'google_translate_element'
            );
            window.__googleTranslateInitialized = true;
          }
        } catch (err) {
          console.warn('Google Translate initialization warning:', err);
        }
      }
      setIsScriptLoaded(true);
    };

    const script =
      document.getElementById('google-translate-element-script') ||
      document.querySelector('script[src*="translate_a/element.js"]');

    if (!script) {
      const newScript = document.createElement('script');
      newScript.id = 'google-translate-element-script';
      newScript.type = 'text/javascript';
      newScript.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      newScript.async = true;
      document.body.appendChild(newScript);
    }
  }, []);

  // Programmatically trigger Google Translate dropdown
  const triggerGoogleTranslateWidget = (targetCode) => {
    const isEnglish = targetCode === 'en';

    if (isEnglish) {
      clearGoogleTranslateCookie();
    } else {
      setGoogleTranslateCookie(targetCode);
    }

    const targetVal = isEnglish ? '' : targetCode;

    const fireChange = (select) => {
      select.value = targetVal;
      for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].value === targetVal) {
          select.selectedIndex = i;
          break;
        }
      }

      select.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      if (typeof select.onchange === 'function') {
        select.onchange();
      }
    };

    const immediateSelect = document.querySelector('.goog-te-combo');
    if (immediateSelect) {
      fireChange(immediateSelect);
      return;
    }

    // Try finding the native combo select generated by Google Translate
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const select = document.querySelector('.goog-te-combo');
      if (select) {
        fireChange(select);
        clearInterval(interval);
      } else if (attempts >= 25) {
        clearInterval(interval);
        // Fallback: If combo wasn't ready, reload so browser reads the googtrans cookie on load
        window.location.reload();
      }
    }, 100);
  };

  const changeLanguage = (langCode) => {
    const valid = GOOGLE_LANGUAGES.find((l) => l.code === langCode);
    if (!valid) return;

    setActiveLang(langCode);
    localStorage.setItem('agrishield_google_lang', langCode);

    triggerGoogleTranslateWidget(langCode);
  };

  // Keep cookie in sync on load
  useEffect(() => {
    if (activeLang && activeLang !== 'en') {
      setGoogleTranslateCookie(activeLang);
    } else {
      clearGoogleTranslateCookie();
    }
  }, [activeLang]);

  const activeLangObj = GOOGLE_LANGUAGES.find((l) => l.code === activeLang) || GOOGLE_LANGUAGES[0];

  return (
    <GoogleTranslateContext.Provider
      value={{
        activeLang,
        activeLangObj,
        changeLanguage,
        languages: GOOGLE_LANGUAGES,
        isScriptLoaded,
      }}
    >
      {children}
    </GoogleTranslateContext.Provider>
  );
};

export const useGoogleTranslate = () => useContext(GoogleTranslateContext);

/**
 * Reusable Custom Language Dropdown Selector
 *
 * Can be placed in Navbar, AppHeader, or mobile menus.
 * Matches AgriSmart AI design theme (emerald/green aesthetic, smooth animations, touch targets).
 */
export function GoogleTranslateDropdown({
  variant = 'navbar', // 'navbar' | 'appHeader' | 'mobile'
  className = '',
}) {
  const { activeLang, activeLangObj, changeLanguage, languages } = useGoogleTranslate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSelectLanguage = (code) => {
    changeLanguage(code);
    setIsOpen(false);
  };

  // Styling variants
  const isAppHeader = variant === 'appHeader';
  const isMobile = variant === 'mobile';

  if (isMobile) {
    return (
      <div className={`space-y-2 notranslate ${className}`} translate="no">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider px-1">
          <Globe className="w-4 h-4 text-emerald-700" />
          <span>Language / भाषा</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto p-1 bg-gray-50 rounded-2xl border border-gray-200">
          {languages.map((lang) => {
            const isSelected = activeLang === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelectLanguage(lang.code)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                  isSelected
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-white text-gray-700 border border-gray-100 hover:bg-emerald-50'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="truncate">{lang.nativeName}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={dropdownRef}
      className={`relative inline-block notranslate ${className}`}
      translate="no"
    >
      {/* Selector Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select Language"
        className={`flex items-center gap-2 rounded-xl font-bold transition-all cursor-pointer select-none ${
          isAppHeader
            ? 'px-2.5 sm:px-3 py-1.5 text-xs bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200 hover:border-gray-300'
            : 'px-3.5 py-2 text-sm bg-agri-50/90 hover:bg-agri-100 text-agri-950 border-2 border-agri-200 hover:border-agri-300 shadow-2xs'
        }`}
      >
        <Globe
          className={`flex-shrink-0 ${
            isAppHeader ? 'w-3.5 h-3.5 text-emerald-600' : 'w-4 h-4 sm:w-5 sm:h-5 text-agri-700'
          }`}
        />
        <span className="font-extrabold tracking-tight">
          {activeLangObj.nativeName}
        </span>
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
            isAppHeader
              ? 'bg-emerald-100/80 text-emerald-900 hidden md:inline-block'
              : 'bg-agri-200/80 text-agri-900'
          }`}
        >
          {activeLangObj.code}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-emerald-700' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute right-0 mt-2 w-64 max-h-80 overflow-y-auto bg-white rounded-2xl shadow-xl border border-gray-100 p-1.5 z-50 animate-fadeIn"
          style={{
            boxShadow: '0 12px 36px -4px rgba(27, 67, 50, 0.18), 0 4px 12px -2px rgba(0, 0, 0, 0.08)',
          }}
        >
          <div className="px-3 py-2 text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100 flex items-center justify-between">
            <span>Choose Language</span>
            <span className="text-emerald-700 font-bold">Google Translate</span>
          </div>

          <div className="py-1 space-y-0.5">
            {languages.map((lang) => {
              const isSelected = activeLang === lang.code;
              return (
                <button
                  key={lang.code}
                  role="option"
                  aria-selected={isSelected}
                  type="button"
                  onClick={() => handleSelectLanguage(lang.code)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-left ${
                    isSelected
                      ? 'bg-emerald-50 text-emerald-900 font-extrabold'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-emerald-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-sm leading-none">{lang.flag}</span>
                    <span className="truncate">{lang.nativeName}</span>
                    <span className="text-[11px] text-gray-400 font-normal truncate">
                      ({lang.name})
                    </span>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default GoogleTranslateDropdown;
