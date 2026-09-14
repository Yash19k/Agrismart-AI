import React from 'react';
import { Link } from 'react-router-dom';
import heroImage from '../../assets/hero_highres.jpg';

export const StitchHero = ({ t }) => {
  const flowBadge = t.hero?.flowBadge || ['IMAGE', 'AI ANALYSIS', 'DISEASE DETECTION'];

  const scrollToTech = (e) => {
    e.preventDefault();
    const el = document.getElementById('technology');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      id="home"
      className="relative w-full overflow-hidden border-b border-stone-200/70 min-h-[580px] sm:min-h-[660px] md:min-h-[740px] lg:min-h-[800px] flex flex-col justify-between"
      style={{
        background: 'linear-gradient(180deg, #ffffff 0%, #f4faf6 20%, #e2f4ea 45%, #caeee2 70%)',
      }}
    >
      {/* Background High-Quality Agricultural Landscape Artwork */}
      <div className="absolute inset-0 z-0 flex items-end justify-center pointer-events-none">
        <img
          src={heroImage}
          alt="AgriSmart AI high quality agriculture landscape showing modern tractors, farming equipment, rolling crop fields, grazing cattle, and mountain horizons"
          className="w-full h-full object-cover object-bottom block"
          loading="eager"
          decoding="async"
        />
        {/* Subtle top gradient veil to ensure text readability and seamless transition from header */}
        <div className="absolute inset-0 bg-gradient-to-b from-white via-white/75 to-transparent h-3/5 sm:h-1/2 pointer-events-none" />
      </div>

      {/* Hero Content Layer (Positioned directly in the upper sky region above the landscape) */}
      <div className="relative z-10 pt-10 sm:pt-14 md:pt-16 pb-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto flex flex-col items-center text-center">
        {/* Value Flow Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#ecfef3]/95 border border-[#baeed9] text-[11px] sm:text-xs font-semibold tracking-wider text-[#1b4d3e] uppercase mb-4 sm:mb-5 shadow-xs backdrop-blur-xs">
          <span>{flowBadge[0]}</span>
          <span className="text-[#2e6a47] font-bold">→</span>
          <span>{flowBadge[1]}</span>
          <span className="text-[#2e6a47] font-bold">→</span>
          <span>{flowBadge[2]}</span>
        </div>

        {/* Editorial Serif Display Headline */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[54px] font-serif text-[#002117] leading-[1.12] tracking-tight mb-3.5 sm:mb-4 text-balance">
          {t.hero?.titleLine1 || 'Where Intelligence Meets'} <br />
          <span className="italic font-normal text-[#1b4d3e]">
            {t.hero?.titleLine2 || 'Resilient Harvests'}
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base md:text-lg text-stone-700 leading-relaxed max-w-xl text-center font-normal mb-7 sm:mb-8 text-balance">
          {t.hero?.subtitle ||
            'AI-powered crop health intelligence that helps farmers and agronomists detect crop diseases early, understand plant health, and make faster field decisions.'}
        </p>

        {/* Action CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 sm:gap-4">
          {/* Primary CTA -> Existing Disease Detection */}
          <Link
            to="/disease"
            className="px-7 py-3 rounded-full bg-[#1b4d3e] hover:bg-[#003629] text-white text-xs sm:text-sm font-semibold shadow-md hover:shadow-lg transition inline-flex items-center gap-2 group"
          >
            <span>{t.hero?.analyzeCrop || 'Analyze a Crop'}</span>
            <span className="text-emerald-300 group-hover:translate-x-1 transition-transform font-bold">→</span>
          </Link>

          {/* Secondary CTA -> Technology pipeline */}
          <a
            href="#technology"
            onClick={scrollToTech}
            className="px-7 py-3 rounded-full bg-white/95 hover:bg-white text-stone-800 border border-stone-300 hover:border-stone-400 text-xs sm:text-sm font-medium shadow-xs transition"
          >
            {t.hero?.exploreTech || 'Explore Technology'}
          </a>
        </div>
      </div>

      {/* Bottom breathing space to showcase the red farmhouses, rolling hills, cattle, and tractors */}
      <div className="relative z-10 h-32 sm:h-44 md:h-56 lg:h-64 pointer-events-none" />
    </section>
  );
};

export default StitchHero;
