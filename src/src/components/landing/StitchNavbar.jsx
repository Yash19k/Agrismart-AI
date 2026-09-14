import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { User, LogOut, ChevronDown, Menu, X, Globe, Check, ArrowRight } from 'lucide-react';

const SUPPORTED_LANGS = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'hi', label: 'हिन्दी', short: 'HI' },
  { code: 'gu', label: 'ગુજરાતી', short: 'GU' },
];

export const StitchNavbar = ({ t, currentLang, onSelectLanguage }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { changeLanguage: changeGlobalLanguage } = useLanguage();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = (code) => {
    onSelectLanguage(code);
    try {
      if (changeGlobalLanguage) {
        changeGlobalLanguage(code);
      }
    } catch {
      // safe fallback
    }
    setLangDropdownOpen(false);
  };

  const handleNavScroll = (anchorId) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(anchorId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const currentLangObj = SUPPORTED_LANGS.find((l) => l.code === currentLang) || SUPPORTED_LANGS[0];

  return (
    <nav
      aria-label="Main Navigation"
      className="w-full border-b border-stone-200/80 bg-white/95 sticky top-0 z-40 backdrop-blur-md transition-all shadow-xs"
    >
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-12 py-3.5 md:py-4 flex items-center justify-between">
        {/* Brand & AI Core Badge */}
        <div className="flex items-center space-x-3">
        <Link
          to="/"
          className="text-2xl font-serif font-bold tracking-tight text-[#101e18] hover:text-[#2e6a47] transition-colors flex items-center gap-1"
        >
          <span>AgriSmart</span>
        </Link>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#afeec2]/30 text-[#1b4d3e] border border-[#afeec2] uppercase tracking-wider">
          {t.nav?.aiCore || 'AI CORE'}
        </span>
      </div>

      {/* Desktop Nav Links */}
      <div className="hidden lg:flex items-center space-x-6 text-xs font-medium text-stone-600">
        <button
          onClick={() => handleNavScroll('home')}
          className="text-[#1b4d3e] font-semibold underline underline-offset-4 decoration-[#2e6a47] cursor-pointer"
        >
          {t.nav?.home || 'Home'}
        </button>
        <button
          onClick={() => handleNavScroll('disease-detection')}
          className="hover:text-[#101e18] transition-colors cursor-pointer"
        >
          {t.nav?.diseaseDetection || 'Disease Detection'}
        </button>
        <button
          onClick={() => handleNavScroll('how-it-works')}
          className="hover:text-[#101e18] transition-colors cursor-pointer"
        >
          {t.nav?.howItWorks || 'How It Works'}
        </button>
        <button
          onClick={() => handleNavScroll('supported-crops')}
          className="hover:text-[#101e18] transition-colors cursor-pointer"
        >
          {t.nav?.supportedCrops || 'Supported Crops'}
        </button>
        <button
          onClick={() => handleNavScroll('technology')}
          className="hover:text-[#101e18] transition-colors cursor-pointer"
        >
          {t.nav?.technology || 'Technology'}
        </button>
        <button
          onClick={() => handleNavScroll('solutions')}
          className="hover:text-[#101e18] transition-colors cursor-pointer"
        >
          {t.nav?.solutions || 'Solutions'}
        </button>
      </div>

      {/* Right Controls: Language Selector, Auth & Scan CTA */}
      <div className="flex items-center space-x-2.5 sm:space-x-3">
        {/* Language Switcher Dropdown (Stitch style: EN ▼) */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setLangDropdownOpen(!langDropdownOpen)}
            className="px-2.5 py-1.5 rounded-full border border-stone-200 hover:border-[#2e6a47] bg-stone-50/80 hover:bg-white text-stone-700 text-xs font-semibold flex items-center gap-1 transition shadow-xs cursor-pointer"
            aria-label="Select Language"
          >
            <Globe className="w-3.5 h-3.5 text-[#2e6a47]" />
            <span className="font-mono">{currentLangObj.short}</span>
            <ChevronDown className={`w-3 h-3 text-stone-400 transition-transform ${langDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {langDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-36 bg-white rounded-2xl shadow-xl border border-stone-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-3 py-1 text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                Language
              </div>
              {SUPPORTED_LANGS.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition cursor-pointer ${
                    currentLang === lang.code
                      ? 'bg-[#ecfef3] text-[#1b4d3e] font-bold'
                      : 'text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <span>{lang.label}</span>
                  {currentLang === lang.code && (
                    <Check className="w-3.5 h-3.5 text-[#2e6a47]" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Existing Authentication Controls (Safely Preserved) */}
        {isAuthenticated ? (
          <div className="hidden sm:flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#ecfef3] border border-[#afeec2] text-[#1b4d3e] text-xs font-bold">
              <User className="w-3.5 h-3.5 text-[#2e6a47]" />
              <span className="max-w-[100px] truncate">{user?.name?.split(' ')[0] || 'Farmer'}</span>
            </div>
            <button
              onClick={logout}
              title={t.nav?.logout || 'Logout'}
              className="p-1.5 rounded-full border border-stone-200 text-stone-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="hidden sm:flex items-center space-x-1.5">
            <Link
              to="/login"
              className="px-3 py-1.5 text-xs font-semibold text-stone-700 hover:text-[#1b4d3e] hover:bg-stone-100/70 rounded-full transition"
            >
              {t.nav?.login || 'Login'}
            </Link>
            <Link
              to="/signup"
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1b4d3e] hover:bg-[#144c32] rounded-full shadow-xs transition"
            >
              {t.nav?.getStarted || 'Get Started'}
            </Link>
          </div>
        )}

        {/* Scan a Plant CTA Action (Primary Navigation Button) */}
        <Link
          to="/disease"
          className="px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold border border-stone-300 hover:border-[#1b4d3e] rounded-full text-stone-800 bg-white hover:bg-[#ecfef3] shadow-xs transition inline-flex items-center gap-1.5 group"
        >
          <span>{t.nav?.scanPlant || 'Scan a Plant'}</span>
          <span className="text-[#2e6a47] group-hover:translate-x-0.5 transition-transform font-bold">→</span>
        </Link>

        {/* Mobile Hamburger Menu Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-100 lg:hidden cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-stone-200 shadow-xl px-6 py-5 lg:hidden z-40 space-y-4 animate-in slide-in-from-top-2 duration-150">
          <div className="flex flex-col space-y-2 text-sm font-medium text-stone-700">
            <button
              onClick={() => handleNavScroll('home')}
              className="text-left py-2 px-3 rounded-xl hover:bg-stone-50 font-semibold text-[#1b4d3e]"
            >
              {t.nav?.home || 'Home'}
            </button>
            <button
              onClick={() => handleNavScroll('disease-detection')}
              className="text-left py-2 px-3 rounded-xl hover:bg-stone-50"
            >
              {t.nav?.diseaseDetection || 'Disease Detection'}
            </button>
            <button
              onClick={() => handleNavScroll('how-it-works')}
              className="text-left py-2 px-3 rounded-xl hover:bg-stone-50"
            >
              {t.nav?.howItWorks || 'How It Works'}
            </button>
            <button
              onClick={() => handleNavScroll('supported-crops')}
              className="text-left py-2 px-3 rounded-xl hover:bg-stone-50"
            >
              {t.nav?.supportedCrops || 'Supported Crops'}
            </button>
            <button
              onClick={() => handleNavScroll('technology')}
              className="text-left py-2 px-3 rounded-xl hover:bg-stone-50"
            >
              {t.nav?.technology || 'Technology'}
            </button>
            <button
              onClick={() => handleNavScroll('solutions')}
              className="text-left py-2 px-3 rounded-xl hover:bg-stone-50"
            >
              {t.nav?.solutions || 'Solutions'}
            </button>
          </div>

          <div className="pt-3 border-t border-stone-200 space-y-3">
            {/* Language Selector in Mobile */}
            <div className="flex items-center justify-between px-3 py-2 bg-stone-50 rounded-xl">
              <span className="text-xs font-semibold text-stone-600 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-[#2e6a47]" />
                Language
              </span>
              <div className="flex items-center gap-1">
                {SUPPORTED_LANGS.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      currentLang === lang.code
                        ? 'bg-[#1b4d3e] text-white'
                        : 'bg-white text-stone-600 border border-stone-200'
                    }`}
                  >
                    {lang.short}
                  </button>
                ))}
              </div>
            </div>

            {/* Auth Controls in Mobile */}
            {isAuthenticated ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#ecfef3] border border-[#afeec2]">
                <div className="flex items-center gap-2 text-xs font-bold text-[#1b4d3e]">
                  <User className="w-4 h-4 text-[#2e6a47]" />
                  <span>{user?.name || 'Farmer Friend'}</span>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
                >
                  {t.nav?.logout || 'Logout'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 text-center text-xs font-bold border border-stone-300 rounded-xl text-stone-800 hover:bg-stone-50 transition"
                >
                  {t.nav?.login || 'Login'}
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 text-center text-xs font-bold bg-[#1b4d3e] text-white rounded-xl hover:bg-[#144c32] shadow-sm transition"
                >
                  {t.nav?.getStarted || 'Get Started'}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default StitchNavbar;
