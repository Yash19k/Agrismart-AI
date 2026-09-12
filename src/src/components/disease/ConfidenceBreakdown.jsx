import React, { useState } from 'react';
import { BarChart2, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * ConfidenceBreakdown Component
 *
 * Matching the exact visual layout from the mockup:
 * - Green chart icon + "Prediction Confidence Breakdown"
 * - Chevron up / down toggle
 * - Horizontal rounded progress bars:
 *   - Early Blight (Alternaria solani): 91.4% (green)
 *   - Leaf Mold (Passalora fulva): 5.2% (gray)
 *   - Healthy: 3.4% (gray)
 */
export default function ConfidenceBreakdown({ breakdown }) {
  const [isOpen, setIsOpen] = useState(true);

  const items = Array.isArray(breakdown) && breakdown.length > 0
    ? breakdown
    : [
        { disease: 'Early Blight (Alternaria solani)', probability: 91.4, isTarget: true },
        { disease: 'Leaf Mold (Passalora fulva)', probability: 5.2, isTarget: false },
        { disease: 'Healthy', probability: 3.4, isTarget: false },
      ];

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      {/* Header */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <h3 className="text-sm font-extrabold text-gray-900">
            Prediction Confidence Breakdown
          </h3>
        </div>

        <button
          type="button"
          className="text-gray-400 hover:text-gray-600 p-1 transition-colors"
        >
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Collapsible content */}
      {isOpen && (
        <div className="mt-4 space-y-3 pt-2">
          {items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 items-center gap-3 text-xs">
              <span className="col-span-4 sm:col-span-3 font-semibold text-gray-700 truncate">
                {item.disease}
              </span>

              <div className="col-span-6 sm:col-span-8 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    item.isTarget ? 'bg-emerald-600' : 'bg-slate-400'
                  }`}
                  style={{ width: `${Math.min(item.probability, 100)}%` }}
                />
              </div>

              <span className="col-span-2 sm:col-span-1 text-right font-black text-gray-900 text-xs">
                {item.probability}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
