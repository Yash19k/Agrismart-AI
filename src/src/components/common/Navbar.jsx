import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sprout, Menu, X, User, LogOut, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { GoogleTranslateDropdown } from './GoogleTranslate';
import Button from './Button';

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
                className="px-3.5 py-2 rounded-xl text-base font-bold text-stone-700 hover:text-agri-800 hover:bg-agri-50 transition-colors cursor-pointer"
              >
                Home
              </button>
              <button
                onClick={() => handleNavClick('#how-it-works')}
                className="px-3.5 py-2 rounded-xl text-base font-bold text-stone-700 hover:text-agri-800 hover:bg-agri-50 transition-colors cursor-pointer"
              >
                How It Works
              </button>
              <button
                onClick={() => handleNavClick('#features')}
                className="px-3.5 py-2 rounded-xl text-base font-bold text-stone-700 hover:text-agri-800 hover:bg-agri-50 transition-colors cursor-pointer"
              >
                Features
              </button>
              <button
                onClick={() => handleNavClick('#about')}
                className="px-3.5 py-2 rounded-xl text-base font-bold text-stone-700 hover:text-agri-800 hover:bg-agri-50 transition-colors cursor-pointer"
              >
                About
              </button>
            </nav>

            {/* Right Actions (Desktop) */}
            <div className="hidden md:flex items-center gap-3">
              {/* Google Translate Website Translator Selector */}
              <GoogleTranslateDropdown variant="navbar" />

              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-agri-50 text-agri-900 border border-agri-200 text-sm font-bold">
                    <User className="w-4 h-4 text-agri-700" />
                    <span>{user?.name?.split(' ')[0] || 'Farmer Friend'}</span>
                  </div>
                  <button
                    onClick={logout}
                    className="p-2.5 rounded-xl border border-stone-300 text-stone-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors cursor-pointer"
                    title="Logout"
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
                    Login
                  </Link>
                  <Link to="/signup">
                    <Button variant="primary" size="md">
                      Get Started
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu & Language Button */}
            <div className="flex items-center gap-2 md:hidden">
              <GoogleTranslateDropdown variant="appHeader" />

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2.5 rounded-xl bg-agri-50 text-agri-900 hover:bg-agri-100 border border-agri-200 transition-colors farmer-touch-target flex items-center justify-center cursor-pointer"
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
                className="w-full flex items-center justify-between p-3.5 rounded-xl text-lg font-bold text-stone-800 hover:bg-agri-50 hover:text-agri-900 farmer-touch-target cursor-pointer"
              >
                <span>Home</span>
                <ChevronRight className="w-5 h-5 text-stone-400" />
              </button>
              <button
                onClick={() => handleNavClick('#how-it-works')}
                className="w-full flex items-center justify-between p-3.5 rounded-xl text-lg font-bold text-stone-800 hover:bg-agri-50 hover:text-agri-900 farmer-touch-target cursor-pointer"
              >
                <span>How It Works</span>
                <ChevronRight className="w-5 h-5 text-stone-400" />
              </button>
              <button
                onClick={() => handleNavClick('#features')}
                className="w-full flex items-center justify-between p-3.5 rounded-xl text-lg font-bold text-stone-800 hover:bg-agri-50 hover:text-agri-900 farmer-touch-target cursor-pointer"
              >
                <span>Features</span>
                <ChevronRight className="w-5 h-5 text-stone-400" />
              </button>
              <button
                onClick={() => handleNavClick('#about')}
                className="w-full flex items-center justify-between p-3.5 rounded-xl text-lg font-bold text-stone-800 hover:bg-agri-50 hover:text-agri-900 farmer-touch-target cursor-pointer"
              >
                <span>About</span>
                <ChevronRight className="w-5 h-5 text-stone-400" />
              </button>
            </div>

            <div className="pt-2 border-t border-stone-200 space-y-3">
              {/* Google Translate Picker in Mobile Drawer */}
              <GoogleTranslateDropdown variant="mobile" />

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
                      Login
                    </Button>
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full"
                  >
                    <Button variant="primary" size="lg" fullWidth>
                      Get Started
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
};

export default Navbar;
