import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../i18n/useTranslation';
import { Sprout, Globe, ShieldCheck, Heart, PhoneCall, Mail } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import LanguageModal from './LanguageModal';

export const Footer = () => {
  const { t } = useTranslation();
  const { activeLanguageObj } = useLanguage();
  const [langModalOpen, setLangModalOpen] = useState(false);

  return (
    <>
      <footer className="bg-agri-950 text-white pt-16 pb-12 border-t-4 border-agri-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-agri-800">
            {/* Brand Column */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-agri-600 text-white flex items-center justify-center shadow-lg">
                  <Sprout className="w-7 h-7 text-white stroke-[2.5]" />
                </div>
                <div>
                  <span className="text-2xl font-extrabold tracking-tight">AgriSmart</span>
                  <div className="text-xs text-agri-300 font-semibold">
                    भारतीय किसानों का डिजिटल साथी
                  </div>
                </div>
              </div>

              <p className="text-stone-300 text-base max-w-sm font-normal leading-relaxed">
                {t('footer.desc', 'AI-powered assistance for smarter farming across India. Simple photo diagnosis and actionable crop advisory.')}
              </p>

              {/* Language Switcher Pill in Footer */}
              <div className="pt-2">
                <button
                  onClick={() => setLangModalOpen(true)}
                  className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-agri-900 border border-agri-700 hover:border-agri-500 text-agri-200 text-sm font-bold transition-all farmer-touch-target"
                >
                  <Globe className="w-5 h-5 text-agri-400" />
                  <span>Language / भाषा: <strong className="text-white">{activeLanguageObj.nativeName}</strong></span>
                  <span className="text-xs bg-agri-800 px-2 py-0.5 rounded text-agri-300">Change</span>
                </button>
              </div>

              <div className="pt-1 flex items-center gap-2 text-xs text-agri-400 font-medium">
                <ShieldCheck className="w-4 h-4 text-agri-400" />
                <span>Empowering 12+ Indian Regional Languages</span>
              </div>
            </div>

            {/* Product Links */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-white tracking-wide border-b border-agri-800 pb-2">
                {t('footer.product', 'Product')}
              </h3>
              <ul className="space-y-2.5 text-sm text-stone-300 font-medium">
                <li>
                  <a href="#features" className="hover:text-agri-300 transition-colors">
                    {t('footer.cropDetection', 'Crop Protection')}
                  </a>
                </li>
                <li>
                  <Link to="/dashboard" className="hover:text-agri-300 transition-colors">
                    {t('footer.cropAdvisory', 'Crop Advisory')}
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard" className="hover:text-agri-300 transition-colors">
                    {t('footer.weather', 'Weather Alerts')}
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard" className="hover:text-agri-300 transition-colors">
                    {t('footer.dashboard', 'Farm Dashboard')}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Resources Links */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-white tracking-wide border-b border-agri-800 pb-2">
                {t('footer.resources', 'Resources')}
              </h3>
              <ul className="space-y-2.5 text-sm text-stone-300 font-medium">
                <li>
                  <a href="#how-it-works" className="hover:text-agri-300 transition-colors">
                    {t('footer.howItWorks', 'How It Works')}
                  </a>
                </li>
                <li>
                  <a href="#features" className="hover:text-agri-300 transition-colors">
                    {t('footer.help', 'Farmer Help Center')}
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-agri-300 transition-colors">
                    {t('footer.faqs', 'Common Questions')}
                  </a>
                </li>
                <li>
                  <span className="text-xs text-agri-400 block pt-1">
                    Free for all smallholder farmers
                  </span>
                </li>
              </ul>
            </div>

            {/* Company & Support */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-white tracking-wide border-b border-agri-800 pb-2">
                {t('footer.company', 'Company')}
              </h3>
              <ul className="space-y-2.5 text-sm text-stone-300 font-medium">
                <li>
                  <a href="#about" className="hover:text-agri-300 transition-colors">
                    {t('footer.about', 'About AgriSmart')}
                  </a>
                </li>
                <li>
                  <a href="#contact" className="hover:text-agri-300 transition-colors">
                    {t('footer.contact', 'Contact Support')}
                  </a>
                </li>
                <li className="pt-2 text-xs text-stone-400 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <PhoneCall className="w-3.5 h-3.5 text-agri-400" />
                    <span>Toll-Free Kisan Help: 1800-180-1551</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-agri-400" />
                    <span>support@agrismart.in</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-400">
            <div className="flex items-center gap-1.5 text-center sm:text-left">
              <span>{t('footer.copyright', '© 2026 AgriSmart. All rights reserved.')}</span>
              <span className="inline-flex items-center gap-1 text-agri-400 font-semibold">
                Made with <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" /> for Indian Farmers
              </span>
            </div>

            <div className="flex items-center gap-6">
              <a href="#privacy" className="hover:text-stone-200 transition-colors">
                {t('footer.privacy', 'Privacy Policy')}
              </a>
              <span>•</span>
              <a href="#terms" className="hover:text-stone-200 transition-colors">
                {t('footer.terms', 'Terms of Use')}
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Language Modal */}
      <LanguageModal
        isOpen={langModalOpen}
        onClose={() => setLangModalOpen(false)}
      />
    </>
  );
};

export default Footer;
