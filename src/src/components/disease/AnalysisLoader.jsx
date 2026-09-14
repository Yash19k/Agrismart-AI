import React from 'react';
import { Sprout, X } from 'lucide-react';

/**
 * AnalysisLoader Component
 *
 * Professional agricultural scanning animation and progress bar displayed
 * while the crop disease detection algorithm is analyzing the uploaded image.
 */
export default function AnalysisLoader({ onCancel }) {
  return (
    <div className="w-full bg-white rounded-3xl p-10 sm:p-14 border border-emerald-100 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden">
      {/* Subtle top scanner line animation */}
      <div className="scanner-line top-0" />

      {/* Pulsing icon circle */}
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 pulse-circle">
          <Sprout className="w-12 h-12 stroke-[1.75] animate-bounce text-emerald-700" />
        </div>
      </div>

      {/* Primary messages */}
      <h3 className="text-xl sm:text-2xl font-extrabold text-gray-900">
        Analyzing your crop...
      </h3>
      <p className="text-sm text-gray-600 mt-2 max-w-md font-medium">
        Checking disease patterns, pathogen markers, and crop canopy health…
      </p>

      {/* Progress visual bar */}
      <div className="w-full max-w-md bg-gray-100 rounded-full h-2.5 mt-8 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-600 rounded-full animate-pulse w-3/4" />
      </div>

      {/* Status steps pill */}
      <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200/60">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
        <span>Deep vision model running inference…</span>
      </div>

      {/* Cancel button */}
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="mt-8 text-xs font-bold text-gray-500 hover:text-gray-800 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          <span>Cancel Analysis</span>
        </button>
      )}
    </div>
  );
}
