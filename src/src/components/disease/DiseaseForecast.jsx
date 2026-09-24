import React from 'react';
import { TrendingUp, Info } from 'lucide-react';

/**
 * DiseaseForecast Component
 *
 * Renders 7-Day Disease Progression Forecast:
 * - When forecast is provided: displays dynamic SVG curve with Day 1–7 points.
 * - When forecast is empty/missing: displays an honest empty state (NO fake fallback curves).
 */
export default function DiseaseForecast({ forecast }) {
  if (!forecast || forecast.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between h-full">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <h3 className="text-sm font-extrabold text-gray-900">
              7-Day Disease Progression Forecast
            </h3>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
              Decision Support
            </span>
          </div>
          <p className="text-xs text-gray-400 font-normal mt-0.5">
            Weather-based risk forecast requires an active scan or farm weather data.
          </p>
        </div>

        <div className="my-8 text-center py-6 px-4 bg-gray-50/60 rounded-xl border border-dashed border-gray-200">
          <Info className="w-6 h-6 text-gray-400 mx-auto mb-2" />
          <p className="text-xs font-semibold text-gray-600">No progression forecast generated</p>
          <p className="text-[11px] text-gray-400 mt-1 max-w-sm mx-auto">
            Run a leaf diagnosis or configure farm weather inputs to compute 7-day disease risk projection.
          </p>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-gray-500 pt-2 border-t border-gray-50">
          <Info className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <span>Decision-support estimate only. Generated dynamically from Open-Meteo weather parameters.</span>
        </div>
      </div>
    );
  }

  const points = forecast.slice(0, 7).map((item, i) => {
    const val = typeof item.value === 'number' ? item.value : 30;
    // Y mapping: val 0 -> y=125, val 100 -> y=25
    const y = Math.round(125 - (val / 100) * 100);
    const x = 55 + i * 60;
    let dotColor = '#10b981';
    let label = item.risk || 'Low';
    if (val >= 70 || label.toLowerCase() === 'high' || label.toLowerCase() === 'critical') {
      dotColor = '#ef4444';
      label = 'High';
    } else if (val >= 35 || label.toLowerCase() === 'moderate' || label.toLowerCase() === 'medium') {
      dotColor = '#f59e0b';
      label = 'Medium';
    } else {
      label = 'Low';
    }

    return {
      day: item.weekday || item.day || `Day ${i + 1}`,
      label,
      value: Math.round(val),
      x,
      y,
      dotColor,
    };
  });

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
          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
            Decision Support
          </span>
        </div>
        <p className="text-xs text-gray-400 font-normal mt-0.5">
          Estimated disease progression if no protective action is taken.
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
              <circle cx={p.x} cy={p.y} r="4" fill="#ffffff" stroke={p.dotColor} strokeWidth="2" />
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
        <span>Decision-support estimate only. Generated dynamically from Open-Meteo weather parameters.</span>
      </div>
    </div>
  );
}
