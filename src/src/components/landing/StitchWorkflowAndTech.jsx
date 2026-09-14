import React from 'react';

export const StitchWorkflowAndTech = ({ t }) => {
  const pipeline = t.technology?.pipeline || [];
  const performance = t.technology?.performance || [];

  return (
    <>
      {/* SECTION: HOW IT WORKS */}
      <section
        aria-label="How It Works"
        className="w-full bg-white border-b border-stone-200/70 py-14 sm:py-20"
        id="how-it-works"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-lg mx-auto mb-10 sm:mb-12">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-[#2e6a47] bg-[#ecfef3] px-3.5 py-1 rounded-full border border-[#baeed9]">
              {t.howItWorks?.badge || 'Simple 4-Step Process'}
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif text-stone-900 mt-3 font-normal">
              {t.howItWorks?.title || 'How AgriSmart'}{' '}
              <span className="italic text-[#1b4d3e] font-normal">
                {t.howItWorks?.titleAccent || 'Works'}
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-2 leading-relaxed">
              {t.howItWorks?.subtitle ||
                'Streamlined for immediate field usage without requiring agronomic laboratory setups.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 relative">
            {(t.howItWorks?.steps || []).map((step, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-6 sm:p-7 border border-stone-200 shadow-xs relative hover:border-[#9ed1bd] hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className={`text-3xl sm:text-4xl font-serif font-bold mb-3 ${idx === 3 ? 'text-[#1b4d3e]' : 'text-[#9ed1bd]'}`}>
                    {step.num}
                  </div>
                  <h3 className="font-serif font-bold text-stone-900 text-base sm:text-lg mb-2">
                    {step.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION: TECHNOLOGY & MODEL PERFORMANCE */}
      <section
        aria-label="Technology & Model Performance"
        className="w-full bg-[#fbfdfb] border-b border-stone-200/70 py-14 sm:py-20"
        id="technology"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-10 sm:mb-12">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-[#2e6a47] bg-[#ecfef3] px-3.5 py-1 rounded-full border border-[#baeed9]">
              {t.technology?.badge || 'Architecture & Rigor'}
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif text-stone-900 mt-3 font-normal">
              {t.technology?.title || 'Built with'}{' '}
              <span className="italic text-[#1b4d3e] font-normal">
                {t.technology?.titleAccent || 'Computer Vision'}
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-2 leading-relaxed">
              {t.technology?.subtitle ||
                'Combining state-of-the-art vision backbones with practical field agronomy calibrations.'}
            </p>
          </div>

          {/* Architectural Pipeline Diagram */}
          <div className="bg-white rounded-2xl border border-stone-200/90 p-5 md:p-7 mb-8 overflow-x-auto shadow-xs">
            <div className="min-w-[640px] flex items-center justify-between gap-2.5 text-center text-xs">
              {pipeline.map((stage, sIdx) => (
                <React.Fragment key={sIdx}>
                  <div
                    className={`p-3.5 rounded-xl border flex-1 shadow-xs ${
                      stage.label === 'Deep Learning' || stage.label === 'डीप लर्निंग' || stage.label === 'ડીપ લર્નિંગ'
                        ? 'bg-[#ecfef3]/40 border-[#2e6a47]/60'
                        : stage.label === 'Output' || stage.label === 'आउटपुट' || stage.label === 'આઉટપુટ'
                        ? 'bg-emerald-50/50 border-emerald-300'
                        : 'bg-white border-stone-200'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase text-[#2e6a47] block mb-0.5">
                      {stage.label}
                    </span>
                    <span className="font-serif font-semibold text-stone-900 text-xs sm:text-sm">
                      {stage.title}
                    </span>
                  </div>
                  {sIdx < pipeline.length - 1 && (
                    <span className="text-stone-400 font-bold text-base">→</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Model Performance Held-Out Benchmark Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5 text-center">
            {performance.map((p, pIdx) => (
              <div
                key={pIdx}
                className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs hover:shadow-md transition"
              >
                <div className="text-3xl sm:text-4xl font-serif font-bold text-[#003629]">
                  {p.stat}
                </div>
                <div className="text-xs font-bold uppercase tracking-wider text-stone-700 mt-1.5">
                  {p.label}
                </div>
                <div className="text-[11px] text-stone-400 mt-0.5">{p.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default StitchWorkflowAndTech;
