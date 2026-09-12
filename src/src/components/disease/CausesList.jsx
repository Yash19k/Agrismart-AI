import React from 'react';
import { Settings, Check } from 'lucide-react';

/**
 * CausesList Component
 *
 * Matching the exact visual layout from the mockup:
 * - Orange settings/cog icon + "Possible Causes"
 * - Vertical list with green filled checkmark circles
 */
export default function CausesList({ causes }) {
  const list = Array.isArray(causes) && causes.length > 0
    ? causes
    : [
        'High humidity',
        'Warm temperature (25–30°C)',
        'Poor air circulation',
        'Overhead irrigation',
        'Infected plant material',
        'Fungal spores in soil or nearby plants',
      ];

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between h-full">
      <div className="flex items-center gap-2 mb-3">
        <Settings className="w-4 h-4 text-orange-500 flex-shrink-0" />
        <h3 className="text-sm font-extrabold text-gray-900">Possible Causes</h3>
      </div>

      <ul className="space-y-2.5 my-auto">
        {list.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2.5 text-xs text-gray-700 font-medium">
            <div className="w-4 h-4 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
            </div>
            <span className="leading-tight">{typeof item === 'string' ? item : item.title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
