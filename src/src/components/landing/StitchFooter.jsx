import React from 'react';
import { Link } from 'react-router-dom';
import { Sprout } from 'lucide-react';

export const StitchFooter = ({ t }) => {
  const handleScroll = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const fl = t.footer?.links || {};

  return (
    <footer className="w-full bg-[#101e18] text-stone-300 pt-16 pb-12 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 4-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-12 border-b border-stone-800">
          {/* Brand & Mission (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#2e6a47] flex items-center justify-center text-white">
                <Sprout className="w-5 h-5 text-emerald-300" />
              </div>
              <span className="font-serif font-bold text-white text-2xl tracking-tight">
                {t.footer?.brand || 'AgriSmart'}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#afeec2]/20 text-[#afeec2] border border-[#afeec2]/30 uppercase tracking-wider">
                AI CORE
              </span>
            </div>
            <p className="text-xs text-stone-400 max-w-sm leading-relaxed">
              {t.footer?.tagline ||
                'AI-powered crop intelligence for healthier, more resilient agriculture.'}
            </p>
          </div>

          {/* Column 2: Product */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              {t.footer?.productTitle || 'Product'}
            </h4>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>
                <Link to="/disease" className="hover:text-emerald-400 transition">
                  {fl.disease || 'Disease Detection'}
                </Link>
              </li>
              <li>
                <button
                  onClick={() => handleScroll('how-it-works')}
                  className="hover:text-emerald-400 transition cursor-pointer"
                >
                  {fl.howItWorks || 'How It Works'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleScroll('supported-crops')}
                  className="hover:text-emerald-400 transition cursor-pointer"
                >
                  {fl.crops || 'Supported Crops'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleScroll('technology')}
                  className="hover:text-emerald-400 transition cursor-pointer"
                >
                  {fl.tech || 'Technology'}
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Solutions */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              {t.footer?.solutionsTitle || 'Solutions'}
            </h4>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>
                <button
                  onClick={() => handleScroll('solutions')}
                  className="hover:text-emerald-400 transition cursor-pointer"
                >
                  {fl.methods || 'Farming Methods'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleScroll('solutions')}
                  className="hover:text-emerald-400 transition cursor-pointer"
                >
                  {fl.irrigation || 'Smart Irrigation'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleScroll('solutions')}
                  className="hover:text-emerald-400 transition cursor-pointer"
                >
                  {fl.cropRec || 'Crop Selection'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleScroll('solutions')}
                  className="hover:text-emerald-400 transition cursor-pointer"
                >
                  {fl.energy || 'Energy Solutions'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleScroll('solutions')}
                  className="hover:text-emerald-400 transition cursor-pointer"
                >
                  {fl.conservation || 'Water Conservation'}
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Company & Assistance */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              {t.footer?.companyTitle || 'Company'}
            </h4>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>
                <Link to="/assistant" className="hover:text-emerald-400 transition font-medium text-emerald-300">
                  {fl.assistant || 'AI Agronomist'}
                </Link>
              </li>
              <li>
                <button
                  onClick={() => handleScroll('home')}
                  className="hover:text-emerald-400 transition cursor-pointer"
                >
                  {fl.about || 'About AgriSmart'}
                </button>
              </li>
              <li>
                <span className="text-stone-500 cursor-default">
                  {fl.privacy || 'Privacy Policy'}
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="pt-6 flex flex-col sm:flex-row justify-between items-center text-[11px] text-stone-500 gap-3">
          <div>
            {t.footer?.copyright ||
              '© 2025 AgriSmart AI Technologies Inc. All rights reserved. Field intelligence dedicated to agricultural resilience.'}
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/disease" className="hover:text-stone-400 transition">
              {t.nav?.scanPlant || 'Scan a Plant'}
            </Link>
            <span>•</span>
            <Link to="/login" className="hover:text-stone-400 transition">
              {t.nav?.login || 'Login'}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default StitchFooter;
