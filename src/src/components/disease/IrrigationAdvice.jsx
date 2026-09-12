import React from 'react';
import { Droplets, Sprout, Check } from 'lucide-react';

/**
 * IrrigationAdvice Component
 *
 * Matching the exact visual layout from the mockup:
 * - Blue droplet icon + "Smart Irrigation Advice"
 * - Soft green banner with white leaf icon, bold "Delay irrigation", and explanation
 * - "Recommendations" checklist with green circle checkmarks
 */
export default function IrrigationAdvice({ irrigation }) {
  const recommendation = irrigation?.recommendation || 'Delay irrigation';
  const explanation =
    irrigation?.explanation ||
    'Rain probability is high and humidity is elevated. Avoid unnecessary watering and prevent leaf wetness.';

  const recommendationsList = irrigation?.recommendationsList || [
    'Avoid overhead irrigation',
    'Use drip irrigation if needed',
    'Monitor soil moisture',
    'Resume irrigation once weather improves',
  ];

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between h-full">
      {/* Title */}
      <div className="flex items-center gap-2 mb-3">
        <Droplets className="w-4 h-4 text-blue-500 flex-shrink-0" />
        <h3 className="text-sm font-extrabold text-gray-900">Smart Irrigation Advice</h3>
      </div>

      {/* Top Banner */}
      <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-emerald-600 shadow-sm flex-shrink-0">
          <Sprout className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-extrabold text-emerald-950 capitalize">{recommendation}</h4>
          <p className="text-xs text-gray-600 mt-0.5 leading-snug font-normal">{explanation}</p>
        </div>
      </div>

      {/* Recommendations Checklist */}
      <div>
        <p className="text-xs font-bold text-gray-800 mb-2.5">Recommendations</p>
        <ul className="space-y-2">
          {recommendationsList.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-xs text-gray-700 font-medium">
              <div className="w-4 h-4 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
              </div>
              <span className="leading-tight">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
