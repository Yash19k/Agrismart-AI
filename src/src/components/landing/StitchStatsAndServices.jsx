import React from 'react';
import { AlertCircle, Cpu, CheckCircle2, Zap } from 'lucide-react';

export const StitchStatsAndServices = ({ t }) => {
  return (
    <>
      {/* Editorial Intro & Verified Project Statistics Bar */}
      <section
        aria-label="Key Project Statistics"
        className="w-full bg-white border-b border-stone-200/70 py-10 sm:py-14"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center justify-between gap-8 sm:gap-10">
          <div className="max-w-md text-center lg:text-left">
            <p className="text-base sm:text-lg md:text-xl font-serif text-[#101e18] leading-snug font-normal">
              {t.stats?.editorialStatement ||
                'We are committed to transforming agriculture with honest computer vision and practical field intelligence.'}
            </p>
          </div>

          {/* Real Grounded Statistics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 w-full lg:w-auto text-center lg:text-left">
            <div>
              <div className="text-3xl sm:text-4xl md:text-[42px] font-serif text-[#101e18] font-normal tracking-tight">
                {t.stats?.statClasses || '38'}
              </div>
              <div className="text-xs text-[#707974] tracking-wide mt-1 leading-tight">
                {t.stats?.statClassesLabel || 'Disease Classes'}
              </div>
            </div>

            <div>
              <div className="text-3xl sm:text-4xl md:text-[42px] font-serif text-[#101e18] font-normal tracking-tight text-[#2e6a47]">
                {t.stats?.statAccuracy || '98.6%'}
              </div>
              <div className="text-xs text-[#707974] tracking-wide mt-1 leading-tight">
                {t.stats?.statAccuracyLabel || 'Lab Accuracy'}
              </div>
            </div>

            <div>
              <div className="text-3xl sm:text-4xl md:text-[42px] font-serif text-[#101e18] font-normal tracking-tight">
                {t.stats?.statCrops || '14'}
              </div>
              <div className="text-xs text-[#707974] tracking-wide mt-1 leading-tight">
                {t.stats?.statCropsLabel || 'Crops Covered'}
              </div>
            </div>

            <div>
              <div className="text-3xl sm:text-4xl md:text-[42px] font-serif text-[#101e18] font-normal tracking-tight">
                {t.stats?.statLatency || '~90ms'}
              </div>
              <div className="text-xs text-[#707974] tracking-wide mt-1 leading-tight">
                {t.stats?.statLatencyLabel || 'Inference Speed'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Capabilities / Services Section */}
      <section
        aria-label="Core Capabilities"
        className="w-full bg-[#fbfdfb] border-b border-stone-200/70 py-14 sm:py-20"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-lg mx-auto mb-10 sm:mb-12">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#2e6a47] bg-[#afeec2]/40 px-3.5 py-1 rounded-full border border-[#afeec2]">
              {t.services?.badge || 'Core Capabilities'}
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif text-[#101e18] mt-3 font-normal">
              {t.services?.title || 'Our Services'}
            </h2>
            <p className="text-xs sm:text-sm text-[#707974] mt-2 font-normal leading-relaxed">
              {t.services?.subtitle ||
                'Dedicated to automated crop detection, agronomic computer vision, and sustainable field management.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {/* Card 1: Early Detection */}
            <div className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-lg hover:border-[#9ed1bd] transition group">
              <div className="w-11 h-11 rounded-xl bg-[#ecfef3] text-[#2e6a47] flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-[#101e18] text-base sm:text-lg mb-2 group-hover:text-[#2e6a47] transition-colors">
                {t.services?.card1Title || 'Early Detection'}
              </h3>
              <p className="text-xs sm:text-sm text-[#707974] leading-relaxed">
                {t.services?.card1Desc ||
                  'Identify visible crop diseases before they spread across the field canopy.'}
              </p>
            </div>

            {/* Card 2: AI-Powered Analysis */}
            <div className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-lg hover:border-[#9ed1bd] transition group">
              <div className="w-11 h-11 rounded-xl bg-[#ecfef3] text-[#2e6a47] flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-[#101e18] text-base sm:text-lg mb-2 group-hover:text-[#2e6a47] transition-colors">
                {t.services?.card2Title || 'AI-Powered Analysis'}
              </h3>
              <p className="text-xs sm:text-sm text-[#707974] leading-relaxed">
                {t.services?.card2Desc ||
                  'Use computer vision to analyze crop and leaf images automatically and accurately.'}
              </p>
            </div>

            {/* Card 3: Confidence Results */}
            <div className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-lg hover:border-[#9ed1bd] transition group">
              <div className="w-11 h-11 rounded-xl bg-[#ecfef3] text-[#2e6a47] flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-[#101e18] text-base sm:text-lg mb-2 group-hover:text-[#2e6a47] transition-colors">
                {t.services?.card3Title || 'Confidence Results'}
              </h3>
              <p className="text-xs sm:text-sm text-[#707974] leading-relaxed">
                {t.services?.card3Desc ||
                  'Receive a predicted disease together with the model’s calibrated confidence score.'}
              </p>
            </div>

            {/* Card 4: Actionable Insights */}
            <div className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-lg hover:border-[#9ed1bd] transition group">
              <div className="w-11 h-11 rounded-xl bg-[#ecfef3] text-[#2e6a47] flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-[#101e18] text-base sm:text-lg mb-2 group-hover:text-[#2e6a47] transition-colors">
                {t.services?.card4Title || 'Actionable Insights'}
              </h3>
              <p className="text-xs sm:text-sm text-[#707974] leading-relaxed">
                {t.services?.card4Desc ||
                  'Turn disease detection into practical, chemical-conscious next steps for management.'}
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default StitchStatsAndServices;
