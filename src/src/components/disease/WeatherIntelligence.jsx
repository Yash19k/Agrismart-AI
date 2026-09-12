import React from 'react';
import { Cloud, Thermometer, Droplets, CloudRain } from 'lucide-react';

/**
 * WeatherIntelligence Component
 *
 * Matching the exact visual layout from the mockup:
 * - Title: Weather Intelligence (Live Data) with cloud icon
 * - 4 vertical columns:
 *   - 28.6 °C / Temperature
 *   - 68 % / Humidity
 *   - 32 % / Rain Probability
 *   - 0.5 mm / Rainfall
 * - Bottom row: "© Data source: Open-Meteo" and "Last updated: 24 Nov 2024, 10:42 AM"
 */
export default function WeatherIntelligence({ weather }) {
  const temperature = weather?.temperature != null ? `${weather.temperature} °C` : '28.6 °C';
  const humidity = weather?.humidity != null ? `${weather.humidity} %` : '68 %';
  const rainProb = weather?.rainProbability != null ? `${weather.rainProbability} %` : '32 %';
  const rainfall = weather?.rainfall != null ? `${weather.rainfall} mm` : '0.5 mm';
  const source = weather?.source || 'Open-Meteo';
  const lastUpdated = weather?.lastUpdated || '24 Nov 2024, 10:42 AM';

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Cloud className="w-4 h-4 text-blue-500 flex-shrink-0" />
        <h3 className="text-sm font-extrabold text-gray-900">
          Weather Intelligence <span className="text-xs font-normal text-gray-400">(Live Data)</span>
        </h3>
      </div>

      {/* 4 Columns */}
      <div className="grid grid-cols-4 gap-2 text-center my-2">
        {/* Temperature */}
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-1.5">
            <Thermometer className="w-4 h-4" />
          </div>
          <span className="text-xs font-black text-gray-900">{temperature}</span>
          <span className="text-[10px] text-gray-400 font-medium mt-0.5">Temperature</span>
        </div>

        {/* Humidity */}
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 mb-1.5">
            <Droplets className="w-4 h-4" />
          </div>
          <span className="text-xs font-black text-gray-900">{humidity}</span>
          <span className="text-[10px] text-gray-400 font-medium mt-0.5">Humidity</span>
        </div>

        {/* Rain Probability */}
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-sky-50 flex items-center justify-center text-sky-500 mb-1.5">
            <CloudRain className="w-4 h-4" />
          </div>
          <span className="text-xs font-black text-gray-900">{rainProb}</span>
          <span className="text-[10px] text-gray-400 font-medium mt-0.5">Rain Probability</span>
        </div>

        {/* Rainfall */}
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 mb-1.5">
            <CloudRain className="w-4 h-4" />
          </div>
          <span className="text-xs font-black text-gray-900">{rainfall}</span>
          <span className="text-[10px] text-gray-400 font-medium mt-0.5">Rainfall</span>
        </div>
      </div>

      {/* Footer Info Row */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-50 text-[10px] text-gray-400 mt-2">
        <span>© Data source: {source}</span>
        <span>Last updated: {lastUpdated}</span>
      </div>
    </div>
  );
}
