import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sprout, Globe, Menu, X, User, LogOut, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import LanguageModal from './LanguageModal';
import Button from './Button';

export const Navbar = () => {
  const { t } = useTranslation();
  const { activeLanguageObj } = useLanguage();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langModalOpen, setLangModalOpen] = useState(false);

  const handleNavClick = (anchor) => {
    setMobileMenuOpen(false);
    if (window.location.pathname !== '/') {
      navigate('/' + anchor);
    } else {
      const element = document.querySelector(anchor);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-agri-100 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Brand Logo */}
            <Link
              to="/"
              className="flex items-center gap-3 group farmer-touch-target focus:outline-none"
              aria-label="AgriSmart Home"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-agri-600 to-agri-800 text-white flex items-center justify-center shadow-farmer group-hover:scale-105 transition-transform">
                <Sprout className="w-7 h-7 text-agri-200 stroke-[2.5]" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-extrabold text-agri-950 tracking-tight flex items-center gap-1.5">
                  AgriSmart
                  <span className="text-xs px-2 py-0.5 rounded-full bg-agri-100 text-agri-800 font-bold border border-agri-200">
                    किसान
                  </span>
                </span>
                <span className="text-xs font-semibold text-agri-700 tracking-wide">
                  Farmer-First AI Agriculture
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
              <button
                onClick={() => handleNavClick('#home')}
                className="px-3.5 py-2 rounded-xl text-base font-bold text-stone-700 hover:text-agri-800 hover:bg-agri-50 transition-colors"
              >
                {t('nav.home', 'Home')}
              </button>
              <button
                onClick={() => handleNavClick('#how-it-works')}
                className="px-3.5 py-2 rounded-xl text-base font-bold text-stone-700 hover:text-agri-800 hover:bg-agri-50 transition-colors"
              >
                {t('nav.howItWorks', 'How It Works')}
              </button>
              <button
                onClick={() => handleNavClick('#features')}
                className="px-3.5 py-2 rounded-xl text-base font-bold text-stone-700 hover:text-agri-800 hover:bg-agri-50 transition-colors"
              >
                {t('nav.features', 'Features')}
              </button>
              <button
                onClick={() => handleNavClick('#about')}
                className="px-3.5 py-2 rounded-xl text-base font-bold text-stone-700 hover:text-agri-800 hover:bg-agri-50 transition-colors"
              >
                {t('nav.about', 'About')}
              </button>
            </nav>

            {/* Right Actions (Desktop) */}
            <div className="hidden md:flex items-center gap-3">
              {/* Language Selector Trigger */}
              <button
                onClick={() => setLangModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl border-2 border-agri-200 bg-agri-50/80 hover:bg-agri-100 text-agri-900 font-bold text-sm transition-all shadow-xs farmer-touch-target"
                title="Change Regional Language"
                aria-label="Change Language"
              >
                <Globe className="w-5 h-5 text-agri-700" />
                <span>{activeLanguageObj.nativeName}</span>
                <span className="text-xs px-1.5 py-0.2 bg-agri-200/80 rounded text-agri-800 font-semibold uppercase">
                  {activeLanguageObj.code}
                </span>
              </button>

              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-agri-50 text-agri-900 border border-agri-200 text-sm font-bold">
                    <User className="w-4 h-4 text-agri-700" />
                    <span>{user?.name?.split(' ')[0] || 'Farmer Friend'}</span>
                  </div>
                  <button
                    onClick={logout}
                    className="p-2.5 rounded-xl border border-stone-300 text-stone-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                    title={t('nav.logout', 'Logout')}
                    aria-label="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    to="/login"
                    className="px-4 py-2.5 rounded-xl text-base font-bold text-agri-900 hover:bg-agri-50 transition-colors farmer-touch-target flex items-center justify-center"
                  >
                    {t('nav.login', 'Login')}
                  </Link>
                  <Link to="/signup">
                    <Button variant="primary" size="md">
                      {t('nav.getStarted', 'Get Started')}
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="flex items-center gap-2 md:hidden">
              <button
                onClick={() => setLangModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-agri-50 border border-agri-200 text-agri-900 font-bold text-xs farmer-touch-target"
                aria-label="Select Language"
              >
                <Globe className="w-4 h-4 text-agri-700" />
                <span>{activeLanguageObj.nativeName}</span>
              </button>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2.5 rounded-xl bg-agri-50 text-agri-900 hover:bg-agri-100 border border-agri-200 transition-colors farmer-touch-target flex items-center justify-center"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b-2 border-agri-200 shadow-xl px-5 py-6 space-y-4 animate-in slide-in-from-top-4 duration-200">
            <div className="space-y-1">
              <button
                onClick={() => handleNavClick('#home')}
                className="w-full flex items-center justify-between p-3.5 rounded-xl text-lg font-bold text-stone-800 hover:bg-agri-50 hover:text-agri-900 farmer-touch-target"
              >
                <span>{t('nav.home', 'Home')}</span>
                <ChevronRight className="w-5 h-5 text-stone-400" />
              </button>
              <button
                onClick={() => handleNavClick('#how-it-works')}
                className="w-full flex items-center justify-between p-3.5 rounded-xl text-lg font-bold text-stone-800 hover:bg-agri-50 hover:text-agri-900 farmer-touch-target"
              >
                <span>{t('nav.howItWorks', 'How It Works')}</span>
                <ChevronRight className="w-5 h-5 text-stone-400" />
              </button>
              <button
                onClick={() => handleNavClick('#features')}
                className="w-full flex items-center justify-between p-3.5 rounded-xl text-lg font-bold text-stone-800 hover:bg-agri-50 hover:text-agri-900 farmer-touch-target"
              >
                <span>{t('nav.features', 'Features')}</span>
                <ChevronRight className="w-5 h-5 text-stone-400" />
              </button>
              <button
                onClick={() => handleNavClick('#about')}
                className="w-full flex items-center justify-between p-3.5 rounded-xl text-lg font-bold text-stone-800 hover:bg-agri-50 hover:text-agri-900 farmer-touch-target"
              >
                <span>{t('nav.about', 'About')}</span>
                <ChevronRight className="w-5 h-5 text-stone-400" />
              </button>
            </div>

            <div className="pt-2 border-t border-stone-200 space-y-3">
              {/* Language Picker in Mobile Drawer */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setLangModalOpen(true);
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-agri-50 border border-agri-200 text-agri-950 font-bold farmer-touch-target"
              >
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-agri-700" />
                  <span>Language / भाषा: {activeLanguageObj.nativeName}</span>
                </div>
                <span className="text-xs bg-agri-200 px-2 py-1 rounded text-agri-800 font-bold">
                  Change
                </span>
              </button>

              {isAuthenticated ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-3.5 rounded-xl bg-agri-50 border border-agri-200 text-agri-950 font-bold">
                    <User className="w-5 h-5 text-agri-700" />
                    <span>{user?.name || 'Farmer Friend'}</span>
                  </div>
                  <Button
                    variant="danger"
                    size="md"
                    fullWidth
                    icon={LogOut}
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                  >
                    {t('nav.logout', 'Logout')}
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full"
                  >
                    <Button variant="outline" size="lg" fullWidth>
                      {t('nav.login', 'Login')}
                    </Button>
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full"
                  >
                    <Button variant="primary" size="lg" fullWidth>
                      {t('nav.getStarted', 'Get Started')}
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Language Selection Modal */}
      <LanguageModal
        isOpen={langModalOpen}
        onClose={() => setLangModalOpen(false)}
      />
    </>
  );
};

export default Navbar;
