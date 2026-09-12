import React from 'react';

/**
 * CropHealthCard Component
 *
 * Matching the exact visual layout from the mockup:
 * - Title: Crop Health Score
 * - Circular donut gauge displaying 72 / 100
 * - Moderate Risk pill badge & contextual explanation
 */
export default function CropHealthCard({ health }) {
  const score = health?.score ?? 72;
  const status = health?.status || 'Moderate Risk';
  const explanation =
    health?.explanation ||
    'Your crop shows some signs of disease. Early action can prevent further spread.';

  // SVG circular arc calculations
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between h-full">
      <h3 className="text-sm font-extrabold text-gray-900 mb-2">Crop Health Score</h3>

      <div className="flex items-center gap-5 my-auto py-2">
        {/* Donut gauge */}
        <div className="relative w-28 h-28 flex-shrink-0">
          <svg viewBox="0 0 100 100" className="w-28 h-28 -rotate-90">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="8"
            />
            {/* Progress arc with gradient */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="url(#cropHealthGrad)"
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id="cropHealthGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#059669" />
                <stop offset="60%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-black text-gray-900 leading-none">{score}</span>
            <span className="text-[11px] font-semibold text-gray-400 mt-0.5">/ 100</span>
          </div>
        </div>

        {/* Right side: Badge & Explanation */}
        <div className="flex-1 space-y-2">
          <span className="inline-block px-3 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-100">
            {status}
          </span>
          <p className="text-xs text-gray-600 leading-relaxed font-normal">
            {explanation}
          </p>
        </div>
      </div>
    </div>
  );
}
