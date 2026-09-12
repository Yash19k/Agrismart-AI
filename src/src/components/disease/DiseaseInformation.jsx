import React from 'react';
import { FileText } from 'lucide-react';

/**
 * DiseaseInformation Component
 *
 * Matching the exact visual layout from the mockup:
 * - Green document icon + "About This Disease"
 * - Informational overview paragraph
 * - 3 soft green pill badges
 */
export default function DiseaseInformation({ diseaseInfo }) {
  const description =
    diseaseInfo?.description ||
    'Early blight is a common fungal disease caused by Alternaria solani. It affects tomato plants and can reduce yield if not managed properly. The disease usually appears as dark, circular spots with yellow halos on older leaves and can spread to stems and fruits.';

  const tags = diseaseInfo?.tags || [
    'Fungal Disease',
    'Common in Warm & Humid Conditions',
    'Affects Leaves, Stems and Fruits',
  ];

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between h-full">
      {/* Title with Green Document Icon */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <h3 className="text-sm font-extrabold text-gray-900">About This Disease</h3>
        </div>

        <p className="text-xs text-gray-600 leading-relaxed font-normal">
          {description}
        </p>
      </div>

      {/* Tags Row */}
      <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t border-gray-50">
        {tags.map((tag, idx) => (
          <span
            key={idx}
            className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-100"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
