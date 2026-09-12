import React from 'react';
import { Share2 } from 'lucide-react';

/**
 * SpreadRiskCard Component
 *
 * Matching the exact visual layout from the mockup:
 * - Orange/red node network icon + "Disease Spread Risk"
 * - "High" badge (soft red/pink pill)
 * - 6 segmented rounded bars (4 filled red, 2 gray)
 * - "High humidity and favorable weather conditions may increase the risk of spread."
 */
export default function SpreadRiskCard({ spreadRisk }) {
  const level = spreadRisk?.level || 'High';
  const explanation =
    spreadRisk?.explanation ||
    'High humidity and favorable weather conditions may increase the risk of spread.';
  const activeSegments = spreadRisk?.activeSegments ?? 4;
  const totalSegments = spreadRisk?.totalSegments ?? 6;

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between h-full">
      {/* Title with Share/Network Icon */}
      <div className="flex items-center gap-2 mb-3">
        <Share2 className="w-4 h-4 text-orange-500 flex-shrink-0" />
        <h3 className="text-sm font-extrabold text-gray-900">Disease Spread Risk</h3>
      </div>

      {/* Badge */}
      <div className="mb-3">
        <span className="inline-block px-3 py-1 rounded-md text-xs font-bold bg-red-50 text-red-600 border border-red-100">
          {level}
        </span>
      </div>

      {/* 6-segment meter */}
      <div className="grid grid-cols-6 gap-1.5 my-1">
        {Array.from({ length: totalSegments }).map((_, i) => (
          <div
            key={i}
            className={`h-2.5 rounded-full ${
              i < activeSegments ? 'bg-red-500' : 'bg-slate-200'
            }`}
          />
        ))}
      </div>

      {/* Explanation */}
      <p className="text-xs text-gray-600 mt-3 leading-relaxed font-normal">
        {explanation}
      </p>
    </div>
  );
}
