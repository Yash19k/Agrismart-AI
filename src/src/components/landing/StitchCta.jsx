import React from 'react';
import { Link } from 'react-router-dom';

export const StitchCta = ({ t }) => {
  return (
    <section className="w-full bg-gradient-to-b from-white to-[#ecfef3]/40 py-16 sm:py-24 text-center">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif text-stone-900 mb-4 font-normal">
          {t.cta?.title || 'Technology for'}{' '}
          <span className="italic text-[#1b4d3e] font-normal">
            {t.cta?.titleAccent || 'More Resilient Agriculture'}
          </span>
        </h2>
        <p className="text-xs sm:text-sm text-stone-600 leading-relaxed mb-10 max-w-xl mx-auto">
          {t.cta?.subtitle ||
            'Fast foliar diagnostics, accessible image-based evaluation, and transparent guidance engineered to reduce over-spraying and protect seasonal yields.'}
        </p>

        {/* Final CTA Box */}
        <div className="bg-[#003629] text-white rounded-3xl p-7 sm:p-8 md:p-10 shadow-xl relative overflow-hidden text-left sm:flex sm:items-center sm:justify-between gap-6">
          <div className="relative z-10 mb-6 sm:mb-0">
            <h3 className="text-xl sm:text-2xl font-serif font-medium text-white mb-2 leading-snug">
              {t.cta?.boxTitle || 'Is Your Crop Showing Signs of Disease?'}
            </h3>
            <p className="text-xs sm:text-sm text-emerald-100/80">
              {t.cta?.boxSubtitle ||
                'Upload a leaf image and let AgriSmart analyze it in seconds.'}
            </p>
          </div>

          <Link
            to="/disease"
            className="relative z-10 px-7 py-3 rounded-full bg-[#afeec2] hover:bg-[#96d4aa] text-[#002110] text-xs sm:text-sm font-bold shadow-lg transition whitespace-nowrap inline-flex items-center gap-2 group"
          >
            <span>{t.cta?.buttonText || 'Analyze a Crop'}</span>
            <span className="group-hover:translate-x-1 transition-transform font-bold">→</span>
          </Link>

          {/* Decorative subtle ring in card */}
          <div className="absolute -right-10 -bottom-10 w-52 h-52 rounded-full bg-white/5 pointer-events-none" />
        </div>
      </div>
    </section>
  );
};

export default StitchCta;
