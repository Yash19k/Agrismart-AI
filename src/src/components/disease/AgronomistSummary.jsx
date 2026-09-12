import React from 'react';
import { Lightbulb, CheckCircle2, Check } from 'lucide-react';

/**
 * AgronomistSummary Component
 *
 * Matching the exact visual layout from the mockup:
 * - Orange lightbulb icon + "AI Agronomist Summary"
 * - Soft green banner with green checkmark circle, bold headline, and diagnosis summary
 * - "Key Recommendations" with green circular checkmarks
 */
export default function AgronomistSummary({ summary }) {
  const headline =
    summary?.headline || 'Your tomato crop needs early attention.';
  const text =
    summary?.summary ||
    'The leaf shows signs of Early Blight with moderate severity. Current weather conditions are favorable for disease spread. Take immediate actions to prevent further infection and monitor the crop closely over the next few days.';

  const recommendations = summary?.keyRecommendations || [
    'Remove infected leaves',
    'Avoid overhead irrigation',
    'Monitor weather and humidity',
    'Follow preventive fungicide application (consult local expert)',
  ];

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between h-full">
      {/* Title */}
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <h3 className="text-sm font-extrabold text-gray-900">AI Agronomist Summary</h3>
      </div>

      {/* Soft Green Callout Banner */}
      <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-start gap-2.5 mb-3.5">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-extrabold text-emerald-950">{headline}</h4>
          <p className="text-[11px] text-gray-600 mt-1 leading-relaxed font-normal">{text}</p>
        </div>
      </div>

      {/* Key Recommendations */}
      <div>
        <p className="text-xs font-bold text-gray-800 mb-2">Key Recommendations</p>
        <ul className="space-y-1.5">
          {recommendations.map((rec, idx) => (
            <li key={idx} className="flex items-start gap-2 text-xs text-gray-700 font-medium">
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-2 h-2 text-white stroke-[3]" />
              </div>
              <span className="leading-tight">{rec}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
