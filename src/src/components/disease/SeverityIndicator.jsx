import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * SeverityIndicator Component
 *
 * Matching the exact visual layout from the mockup:
 * - Red warning icon + "Disease Severity"
 * - "Moderate" badge
 * - 6 segmented rounded bars (3 filled orange, 3 gray)
 * - "The infection appears to affect a noticeable portion of the leaf."
 */
export default function SeverityIndicator({ severity }) {
  const level = severity?.level || 'Moderate';
  const explanation =
    severity?.explanation ||
    'The infection appears to affect a noticeable portion of the leaf.';
  const activeSegments = severity?.activeSegments ?? 3;
  const totalSegments = severity?.totalSegments ?? 6;

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between h-full">
      {/* Title with Red Warning Icon */}
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
        <h3 className="text-sm font-extrabold text-gray-900">Disease Severity</h3>
      </div>

      {/* Badge */}
      <div className="mb-3">
        <span className="inline-block px-3 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">
          {level}
        </span>
      </div>

      {/* 6-segment meter */}
      <div className="grid grid-cols-6 gap-1.5 my-1">
        {Array.from({ length: totalSegments }).map((_, i) => (
          <div
            key={i}
            className={`h-2.5 rounded-full ${
              i < activeSegments ? 'bg-amber-500' : 'bg-slate-200'
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
