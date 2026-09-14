import React, { useState } from 'react';

const SOLUTION_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCXrJAKqSln9Vexen6wChQo25vWpDTt0GHY7wDkktjxXFtawSERz8wFSOHmEuInR7gb6I5c77fOWXZgvsg_OXfCLebPdKdIjGH2R5GwWeB86OKeNJqWtfxSTkL15faTp-c3WLQvUrykA8dMlm-3qVresLT9nVmw0n8cHLY_aSmablr6CDq0wgiIoavmHRWBmel5UMQXQUNyPNGmfKBdkj3MJ6LdFjfxN5uEButY9q6CsxJOqRLPtzT16OWIAuSkb6Nh8ak";

export const SolutionsSection = ({ t }) => {
  const tabs = t.solutions?.tabs || [];
  const [activeTabIdx, setActiveTabIdx] = useState(0);

  const currentTab = tabs[activeTabIdx] || tabs[0] || {};
  const impactStats = t.solutions?.impactStats || [
    { stat: "2.8M", label: "CO₂ tons saved", sub: "Through optimized farm energy" },
    { stat: "3.2M", label: "Supported acres", sub: "Protected by AgriSmart intelligence" },
    { stat: "$75M", label: "Crop loss saved", sub: "From early pathogen detection" },
    { stat: "30+", label: "Field testbeds", sub: "Continuous agronomic validation" },
  ];

  return (
    <section
      aria-label="Solutions for Agriculture"
      className="w-full border-b border-stone-200/70 bg-gradient-to-b from-white via-[#f0fdf4]/50 to-white py-14 sm:py-20"
      id="solutions"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#2e6a47] bg-[#afeec2]/40 px-3.5 py-1 rounded-full border border-[#afeec2]">
          {t.solutions?.badge || 'Integrated Agriculture Modules'}
        </span>
        <h2 className="text-3xl md:text-4xl font-serif text-[#101e18] mt-3 font-normal">
          {t.solutions?.title || 'Solutions for'}{' '}
          <span className="text-[#2e6a47] font-semibold">
            {t.solutions?.titleAccent || 'Agriculture'}
          </span>
        </h2>
        <p className="text-xs sm:text-sm text-[#707974] mt-2 font-normal leading-relaxed">
          {t.solutions?.subtitle || 'End-to-end crop intelligence and field modules'}
        </p>
      </div>

      {/* Two-Column Solutions Showcase */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm p-6 sm:p-8 md:p-10 mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left: Category Navigation List */}
          <div className="lg:col-span-4 flex flex-col justify-between space-y-3">
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block px-1 mb-2">
                Field Intelligence Modules
              </span>
              {tabs.map((tab, idx) => (
                <button
                  key={tab.id || idx}
                  onClick={() => setActiveTabIdx(idx)}
                  className={`w-full text-left py-3 px-4 rounded-2xl transition cursor-pointer flex items-center justify-between text-xs sm:text-sm ${
                    activeTabIdx === idx
                      ? 'bg-[#ecfef3] text-[#1b4d3e] font-bold border-l-4 border-[#2e6a47] shadow-xs'
                      : 'text-stone-700 hover:bg-stone-50 font-medium'
                  }`}
                >
                  <span>{tab.label}</span>
                  {activeTabIdx === idx && (
                    <span className="text-xs text-[#2e6a47] font-bold">→</span>
                  )}
                </button>
              ))}
            </div>

            {/* Active Highlight Metric */}
            <div className="p-4 rounded-2xl bg-[#ecfef3]/60 border border-[#baeed9]/70 mt-4">
              <div className="text-3xl sm:text-4xl font-serif text-[#1b4d3e] font-normal">
                {currentTab.metric || '40%'}
              </div>
              <div className="text-xs text-[#2e6a47] font-semibold mt-1">
                {currentTab.metricLabel || 'Crop yields improved'}
              </div>
            </div>
          </div>

          {/* Right: Featured Solution Card */}
          <div className="lg:col-span-8 bg-stone-50/70 rounded-2xl p-6 sm:p-8 border border-stone-200/80 flex flex-col justify-between">
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white text-[#1b4d3e] border border-stone-200 mb-2">
                Active Module: {currentTab.label}
              </div>
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#101e18] mb-2">
                {currentTab.title}
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-2xl">
                {currentTab.desc}
              </p>
            </div>

            {/* Field Image Showcase */}
            <div className="relative rounded-2xl overflow-hidden shadow-xs aspect-[16/9] sm:aspect-[21/9] border border-stone-200">
              <img
                alt="Agricultural field rover inspection"
                className="w-full h-full object-cover object-bottom"
                src={SOLUTION_IMAGE}
                loading="lazy"
              />
              <span className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2.5 py-1 rounded-md font-mono">
                {t.solutions?.fieldRoverLink || 'Field Rover Link'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Supporting Website Impact Statistics (4-Column Grid) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        {impactStats.map((item, idx) => (
          <div
            key={idx}
            className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200/80 shadow-xs hover:border-[#9ed1bd] hover:shadow-sm transition text-center"
          >
            <div className="text-3xl sm:text-4xl font-serif text-[#101e18] font-normal tracking-tight text-[#1b4d3e]">
              {item.stat}
            </div>
            <div className="text-xs sm:text-sm font-semibold text-stone-800 mt-1">
              {item.label}
            </div>
            <div className="text-[11px] text-stone-400 mt-0.5">
              {item.sub}
            </div>
          </div>
        ))}
      </div>
      </div>
    </section>
  );
};

export default SolutionsSection;
