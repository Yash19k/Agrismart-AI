import React from 'react';
import { Calendar, Scissors, Clock, CalendarDays, TrendingUp } from 'lucide-react';

/**
 * ActionTimeline Component
 *
 * Matching the exact visual layout from the mockup:
 * - Red calendar icon + "Recommended Action Plan"
 * - 4 columns: Today, Next 24 Hours, Next 3 Days, Next Week
 * - Each column with colored circular icon, title, bullet list, and bottom priority badge
 */
export default function ActionTimeline({ timeline }) {
  const stages = Array.isArray(timeline) && timeline.length > 0
    ? timeline
    : [
        {
          period: 'Today',
          iconType: 'scissors',
          iconBg: 'bg-emerald-500',
          items: [
            'Remove infected leaves',
            'Inspect nearby plants',
            'Avoid overhead watering',
          ],
          priority: 'High Priority',
          priorityColor: 'bg-red-50 text-red-600 border border-red-100',
        },
        {
          period: 'Next 24 Hours',
          iconType: 'clock',
          iconBg: 'bg-blue-500',
          items: [
            'Monitor for new symptoms',
            'Check humidity levels',
            'Air circulation',
          ],
          priority: 'Medium Priority',
          priorityColor: 'bg-blue-50 text-blue-600 border border-blue-100',
        },
        {
          period: 'Next 3 Days',
          iconType: 'calendar',
          iconBg: 'bg-amber-500',
          items: [
            'Apply recommended fungicide (consult expert)',
            'Monitor disease spread',
            'Check weather conditions',
          ],
          priority: 'Medium Priority',
          priorityColor: 'bg-amber-50 text-amber-600 border border-amber-100',
        },
        {
          period: 'Next Week',
          iconType: 'trend',
          iconBg: 'bg-purple-500',
          items: [
            'Reassess crop health',
            'Compare new leaf images',
            'Continue preventive care',
          ],
          priority: 'Low Priority',
          priorityColor: 'bg-purple-50 text-purple-600 border border-purple-100',
        },
      ];

  const renderIcon = (type) => {
    switch (type) {
      case 'scissors':
        return <Scissors className="w-3.5 h-3.5 text-white" />;
      case 'clock':
        return <Clock className="w-3.5 h-3.5 text-white" />;
      case 'calendar':
        return <CalendarDays className="w-3.5 h-3.5 text-white" />;
      case 'trend':
      default:
        return <TrendingUp className="w-3.5 h-3.5 text-white" />;
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between h-full">
      {/* Title */}
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-4 h-4 text-red-500 flex-shrink-0" />
        <h3 className="text-sm font-extrabold text-gray-900">Recommended Action Plan</h3>
      </div>

      {/* 4 Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-auto">
        {stages.map((stage, idx) => (
          <div
            key={idx}
            className="p-3 rounded-xl bg-gray-50/50 border border-gray-100 flex flex-col justify-between h-full space-y-3"
          >
            <div>
              {/* Icon & Title */}
              <div className="flex flex-col items-center text-center">
                <div className={`w-7 h-7 rounded-full ${stage.iconBg} flex items-center justify-center mb-1.5 shadow-sm`}>
                  {renderIcon(stage.iconType)}
                </div>
                <h4 className="text-xs font-black text-gray-900">{stage.period}</h4>
              </div>

              {/* Bullet list */}
              <ul className="mt-3 space-y-1.5 text-[11px] text-gray-600 font-normal">
                {stage.items.map((it, i) => (
                  <li key={i} className="flex items-start gap-1.5 leading-snug">
                    <span className="text-gray-400 font-bold">•</span>
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Bottom Priority Pill */}
            <div className="pt-2 text-center">
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${stage.priorityColor}`}>
                {stage.priority}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
