import React from 'react';

const DOMAINS = [
  {
    num: '01',
    title: 'Crop Health',
    desc: 'Vigor, canopy structure, and leaf discoloration telemetry',
    query: 'Crop health assessment and foliage condition',
  },
  {
    num: '02',
    title: 'Irrigation & Moisture',
    desc: 'Drip schedules, evapotranspiration, and root-zone tensiometry',
    query: 'Drip irrigation schedule and soil moisture balance',
  },
  {
    num: '03',
    title: 'Weather & Advisory',
    desc: 'Hyperlocal forecasting, frost alert, and humidity trends',
    query: 'Regional weather telemetry and advisory',
  },
  {
    num: '04',
    title: 'Soil Chemistry',
    desc: 'N-P-K balance, organic carbon replenishment, and soil pH',
    query: 'Optimal N-P-K soil ratio and pH management',
  },
  {
    num: '05',
    title: 'Disease Prevention',
    desc: 'Foliar blight, mildew, and early pathogen containment',
    query: 'Prevent fungal diseases during high humidity',
  },
  {
    num: '06',
    title: 'Pest Management',
    desc: 'Targeted bio-controls, ETL thresholds, and IPM regimes',
    query: 'Pest management and bio-control options',
  },
];

export default function AdvisoryDomains({ onSelectDomain }) {
  return (
    <section className="space-y-3 pt-2" data-purpose="agri-topics">
      <div className="border-t border-[#E2E8E0] pt-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] font-semibold tracking-wider uppercase text-[#718479]">
            Agricultural Advisory Domains
          </p>
          <span className="text-[11px] text-[#718479]">Select topic or inquire below</span>
        </div>

        {/* Top 3 Domains */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#E2E8E0] border border-[#E2E8E0] bg-white rounded-t-lg overflow-hidden">
          {DOMAINS.slice(0, 3).map((domain) => (
            <button
              key={domain.num}
              type="button"
              onClick={() => onSelectDomain(domain.query)}
              className="p-4 text-left hover:bg-[#F7FAF7] transition cursor-pointer group focus:outline-none focus:bg-[#F7FAF7]"
            >
              <div className="flex items-baseline justify-between mb-1">
                <h4 className="text-xs font-semibold text-[#123F32] group-hover:text-[#0c2b22] transition-colors">
                  {domain.title}
                </h4>
                <span className="text-[10px] text-[#718479] uppercase tracking-wider font-mono">
                  {domain.num}
                </span>
              </div>
              <p className="text-xs text-[#4D6357] leading-relaxed">
                {domain.desc}
              </p>
            </button>
          ))}
        </div>

        {/* Bottom 3 Domains */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#E2E8E0] border-x border-b border-[#E2E8E0] bg-white rounded-b-lg overflow-hidden -mt-px">
          {DOMAINS.slice(3, 6).map((domain) => (
            <button
              key={domain.num}
              type="button"
              onClick={() => onSelectDomain(domain.query)}
              className="p-4 text-left hover:bg-[#F7FAF7] transition cursor-pointer group focus:outline-none focus:bg-[#F7FAF7]"
            >
              <div className="flex items-baseline justify-between mb-1">
                <h4 className="text-xs font-semibold text-[#123F32] group-hover:text-[#0c2b22] transition-colors">
                  {domain.title}
                </h4>
                <span className="text-[10px] text-[#718479] uppercase tracking-wider font-mono">
                  {domain.num}
                </span>
              </div>
              <p className="text-xs text-[#4D6357] leading-relaxed">
                {domain.desc}
              </p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
