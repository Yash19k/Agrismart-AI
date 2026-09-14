import React from 'react';
import { Link } from 'react-router-dom';

export const StitchSupportedCrops = ({ t }) => {
  const crops = t.supportedCrops?.crops || [];

  const getBadgeStyle = (type) => {
    switch (type) {
      case 'danger':
        return 'bg-red-50 text-red-900 border-red-200';
      case 'warning':
        return 'bg-amber-50 text-amber-900 border-amber-200';
      case 'success':
      default:
        return 'bg-emerald-50 text-emerald-900 border-emerald-200';
    }
  };

  return (
    <section
      aria-label="Supported Crops"
      className="w-full bg-white border-b border-stone-200/70 py-14 sm:py-20"
      id="supported-crops"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-lg mx-auto mb-10 sm:mb-12">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-[#2e6a47] bg-[#ecfef3] px-3.5 py-1 rounded-full border border-[#baeed9]">
            {t.supportedCrops?.badge || 'Field Coverage'}
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif text-stone-900 mt-3 font-normal">
            {t.supportedCrops?.title || 'What Can'}{' '}
            <span className="italic text-[#1b4d3e] font-normal">
              {t.supportedCrops?.titleAccent || 'AgriSmart Detect?'}
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-2 leading-relaxed">
            {t.supportedCrops?.subtitle ||
              'Authentic model classes organized by high-value commercial and staple crops.'}
          </p>
        </div>

        {/* Grid of Crops with authentic classes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {crops.map((crop, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200/80 shadow-xs hover:border-[#9ed1bd] hover:shadow-md transition"
            >
              <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-stone-100">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{crop.icon}</span>
                  <div>
                    <h3 className="font-serif font-bold text-stone-900 text-base leading-tight">
                      {crop.name}
                    </h3>
                    <span className="text-xs italic text-stone-400">
                      {crop.scientific}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-0.5 bg-stone-100 text-stone-600 rounded-full">
                  {crop.classesCount}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {crop.classes.map((cls, cIdx) => (
                  <span
                    key={cIdx}
                    className={`text-xs font-medium px-2.5 py-1 rounded-lg border ${getBadgeStyle(
                      cls.type
                    )}`}
                  >
                    {cls.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Total Coverage Footer Note */}
        <div className="mt-8 p-5 rounded-2xl bg-stone-50 border border-stone-200/70 text-center flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs sm:text-sm text-stone-600">
            Also trained for <span className="font-semibold text-stone-800">Peach, Orange, Cherry, Squash, Strawberry, Blueberry, Raspberry, and Soybean</span> (38 total classes).
          </p>
          <Link
            to="/disease"
            className="text-xs sm:text-sm font-bold text-[#1b4d3e] hover:text-[#003629] underline decoration-[#2e6a47] shrink-0"
          >
            Test with a sample photo →
          </Link>
        </div>
      </div>
    </section>
  );
};

export default StitchSupportedCrops;
