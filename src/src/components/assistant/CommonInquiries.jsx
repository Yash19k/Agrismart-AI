import React from 'react';

const DEFAULT_INQUIRIES = [
  'How often should tomatoes generally be watered in flowering stage?',
  'What should I check in the soil before scheduling drip irrigation?',
  'How can I prevent fungal disease spread during high humidity?',
  'What should I do immediately after unexpected heavy rainfall?',
];

export default function CommonInquiries({ onSelectInquiry, cropContext }) {
  const inquiries = cropContext?.has_disease
    ? [
        `What should I do today for ${cropContext.crop}?`,
        `Should I irrigate my ${cropContext.crop} field today?`,
        `Why is the ${cropContext.disease} spread risk ${cropContext.risk?.level || 'high'}?`,
        'What should I do immediately to prevent pathogen spread?',
      ]
    : DEFAULT_INQUIRIES;

  return (
    <section className="space-y-3 pt-2" data-purpose="common-inquiries">
      <div className="border-t border-[#E2E8E0] pt-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold tracking-wider uppercase text-[#718479]">
            Common Agricultural Inquiries
          </p>
          <span className="text-[11px] text-[#718479]">
            {cropContext?.has_disease ? 'Curated for active diagnosis' : 'Curated for current crop season'}
          </span>
        </div>

        <div className="divide-y divide-[#E2E8E0] border-y border-[#E2E8E0] bg-white rounded-lg overflow-hidden">
          {inquiries.map((query, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectInquiry(query)}
              className="inquiry-row w-full flex items-center justify-between text-left py-3.5 px-4 hover:bg-[#F7FAF7] transition cursor-pointer group focus:outline-none focus:bg-[#F7FAF7]"
            >
              <span className="text-sm font-medium text-[#1E3A2E] group-hover:text-[#123F32] transition-colors">
                {query}
              </span>
              <span className="text-base text-[#718479] group-hover:text-[#123F32] transition-transform group-hover:translate-x-0.5 ml-4">
                →
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
