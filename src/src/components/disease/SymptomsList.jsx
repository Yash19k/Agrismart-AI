import React from 'react';
import { Leaf, Check } from 'lucide-react';

/**
 * SymptomsList Component
 *
 * Matching the exact visual layout from the mockup:
 * - Green leaf icon + "Common Symptoms"
 * - Vertical list of symptoms with green filled checkmark circles
 */
export default function SymptomsList({ symptoms }) {
  const list = Array.isArray(symptoms) && symptoms.length > 0
    ? symptoms
    : [
        'Dark brown circular spots on leaves',
        'Yellow halo around the spots',
        'Older leaves turn yellow and dry',
        'Spots may increase in size over time',
        'Can spread to stems and fruits',
      ];

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between h-full">
      <div className="flex items-center gap-2 mb-3">
        <Leaf className="w-4 h-4 text-emerald-600 flex-shrink-0" />
        <h3 className="text-sm font-extrabold text-gray-900">Common Symptoms</h3>
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
