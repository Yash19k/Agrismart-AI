import React from 'react';
import { Globe, X, Check } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const LanguageModal = ({ isOpen, onClose }) => {
  const { currentLang, changeLanguage, languages } = useLanguage();

  if (!isOpen) return null;

  const handleSelect = (code) => {
    changeLanguage(code);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border-2 border-agri-200 overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lang-modal-title"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-agri-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Globe className="w-6 h-6 text-agri-300" />
            <h2 id="lang-modal-title" className="text-xl font-bold tracking-tight">
              Select Your Language / अपनी भाषा चुनें
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors farmer-touch-target flex items-center justify-center"
            aria-label="Close language selector"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Description */}
        <div className="px-6 py-3 bg-agri-50 border-b border-agri-100 text-sm text-agri-900 font-medium">
          🌱 AgriSmart supports 12 Indian regional languages natively. Your choice is saved automatically.
        </div>

        {/* Language Grid */}
        <div className="p-5 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
          {languages.map((lang) => {
            const isSelected = currentLang === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang.code)}
                className={`flex items-center justify-between p-4 rounded-xl text-left border-2 transition-all farmer-touch-target ${
                  isSelected
                    ? 'border-agri-600 bg-agri-100/70 text-agri-950 font-bold shadow-sm'
                    : 'border-stone-200 hover:border-agri-400 hover:bg-agri-50/50 text-stone-800'
                }`}
              >
                <div className="notranslate" translate="no">
                  <div className="text-lg font-bold text-agri-900">
                    {lang.nativeName}
                  </div>
                  <div className="text-xs font-semibold text-stone-500">
                    {lang.name}
                  </div>
                </div>
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-agri-600 text-white flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-stone-50 border-t border-stone-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg font-bold text-stone-700 hover:bg-stone-200/70 transition-colors"
          >
            Cancel / रद्द करें
          </button>
        </div>
      </div>
    </div>
  );
};

export default LanguageModal;
