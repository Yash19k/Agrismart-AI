import React from 'react';
import { TrendingUp, Info } from 'lucide-react';

/**
 * DiseaseForecast Component
 *
 * Matching the exact visual layout from the mockup:
 * - Title: 7-Day Disease Progression Forecast with red trend icon
 * - Subtitle: Estimated disease progression if no action is taken.
 * - Y-axis: Risk Level (High, Medium, Low) with light grid lines
 * - Line chart with dots and labels (Low, Medium, High)
 * - X-axis: Day 1 through Day 7
 * - Bottom note callout: "This forecast is an estimate based on current disease patterns and weather conditions."
 */
export default function DiseaseForecast() {
  const points = [
    { day: 'Day 1', label: 'Low', x: 60, y: 110, dotColor: '#3b82f6' },
    { day: 'Day 2', label: 'Low', x: 120, y: 110, dotColor: '#3b82f6' },
    { day: 'Day 3', label: 'Medium', x: 180, y: 70, dotColor: '#f59e0b' },
    { day: 'Day 4', label: 'Medium', x: 240, y: 70, dotColor: '#f59e0b' },
    { day: 'Day 5', label: 'High', x: 300, y: 28, dotColor: '#ef4444' },
    { day: 'Day 6', label: 'High', x: 360, y: 25, dotColor: '#ef4444' },
    { day: 'Day 7', label: 'High', x: 420, y: 25, dotColor: '#ef4444' },
  ];

  // Path generation
  const pathD = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x} 140 L ${points[0].x} 140 Z`;

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between h-full">
      {/* Title */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-red-500 flex-shrink-0" />
          <h3 className="text-sm font-extrabold text-gray-900">
            7-Day Disease Progression Forecast
          </h3>
        </div>
        <p className="text-xs text-gray-400 font-normal mt-0.5">
          Estimated disease progression if no action is taken.
        </p>
      </div>

      {/* Line Chart Area */}
      <div className="w-full relative overflow-x-auto py-2">
        <svg viewBox="0 0 460 160" className="w-full min-w-[380px] h-40">
          <defs>
            <linearGradient id="forecastAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
              <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="forecastLineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="40%" stopColor="#f59e0b" />
              <stop offset="70%" stopColor="#ef4444" />
            </linearGradient>
          </defs>

          {/* Grid lines & Y-axis labels */}
          <text x="5" y="65" fill="#94a3b8" fontSize="9" fontWeight="600" transform="rotate(-90 8 65)">
            Risk Level
          </text>

          <text x="32" y="32" fill="#64748b" fontSize="9" textAnchor="end">High</text>
          <line x1="40" y1="28" x2="445" y2="28" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />

          <text x="32" y="74" fill="#64748b" fontSize="9" textAnchor="end">Medium</text>
          <line x1="40" y1="70" x2="445" y2="70" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />

          <text x="32" y="114" fill="#64748b" fontSize="9" textAnchor="end">Low</text>
          <line x1="40" y1="110" x2="445" y2="110" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />

          {/* Filled gradient area */}
          <path d={areaD} fill="url(#forecastAreaGrad)" />

          {/* Line curve */}
          <path d={pathD} fill="none" stroke="url(#forecastLineGrad)" strokeWidth="2.5" strokeLinecap="round" />

          {/* Points, Day labels, Risk labels */}
          {points.map((p, i) => (
            <g key={i}>
              {/* Risk text above dot */}
              <text
                x={p.x}
                y={p.y - 8}
                fill="#475569"
                fontSize="8.5"
                fontWeight="700"
                textAnchor="middle"
              >
                {p.label}
              </text>

              {/* Point dot */}
              <circle cx={p.x} cy={p.y} r="4" fill="#ffffff" stroke={p.dotColor} strokeWidth="2" />

              {/* X-axis day text */}
              <text
                x={p.x}
                y="152"
                fill="#64748b"
                fontSize="9"
                fontWeight="500"
                textAnchor="middle"
              >
                {p.day}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Bottom disclaimer note */}
      <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-2 pt-2 border-t border-gray-50">
        <Info className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        <span>This forecast is an estimate based on current disease patterns and weather conditions.</span>
      </div>
    </div>
  );
}
