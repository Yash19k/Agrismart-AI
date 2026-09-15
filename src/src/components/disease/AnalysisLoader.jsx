import React from 'react';
import { X, Check, Leaf } from 'lucide-react';

/**
 * AnalysisLoader Component (Stitch State 2: Analyzing Screen)
 *
 * Provides the precision agronomy scanner interface:
 * - Specimen scanner preview frame with reticle corners and animated laser scanline.
 * - Real uploaded image preview inside the scanner.
 * - Indeterminate progress pulse (zero fake ML progress numbers).
 * - Structured 4-step diagnostic checklist.
 * - Cancel Analysis action button.
 */
export default function AnalysisLoader({ onCancel, file = null }) {
  const previewUrl = file ? URL.createObjectURL(file) : null;

  return (
    <section
      className="w-full bg-white rounded-2xl border border-[#d3ebd9] shadow-editorial p-8 md:p-12 relative overflow-hidden"
      data-purpose="analysis-inspection-workspace"
    >
      <div className="max-w-xl mx-auto flex flex-col items-center text-center space-y-6">
        {/* Specimen Leaf Scanner Preview Frame */}
        <div className="relative group">
          <div className="w-32 h-32 rounded-2xl border border-[#a6e7c4] bg-[#f2fbf5] p-3 flex flex-col items-center justify-center shadow-xs relative overflow-hidden">
            {/* Specimen Image Background */}
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Specimen foliage under analysis"
                className="absolute inset-0 w-full h-full object-cover select-none"
              />
            ) : (
              <div className="absolute inset-0 bg-[#eaf4ee] flex items-center justify-center text-[#2fa874]">
                <Leaf className="w-12 h-12 stroke-[1.5]" />
              </div>
            )}

            {/* Dark Vignette Overlay for reticle readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#113329]/90 via-[#113329]/30 to-transparent pointer-events-none" />

            {/* Macro Grid Reticle Overlay */}
            <div className="absolute inset-0 p-2.5 pointer-events-none flex flex-col justify-between">
              <div className="flex items-center justify-between text-[9px] font-mono text-white/90 tracking-wider">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6ed1a2] animate-ping" />
                  [SCAN]
                </span>
                <span className="bg-[#113329]/80 px-1 py-0.5 rounded text-[8px] font-semibold border border-white/20">
                  MACRO
                </span>
              </div>

              <div className="space-y-0.5 text-left">
                <div className="flex items-center gap-1.5 text-white text-[10px] font-semibold tracking-tight">
                  <Leaf className="w-3 h-3 text-[#6ed1a2] shrink-0" />
                  <span className="truncate">{file?.name || 'Crop Leaf'}</span>
                </div>
                <p className="text-[8px] font-mono font-medium text-[#b2ebd0] uppercase tracking-wider">
                  Specimen Ingest
                </p>
              </div>
            </div>

            {/* Animated Precision Laser Scan Line */}
            <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#6ed1a2] to-transparent animate-scanline pointer-events-none shadow-[0_0_8px_rgba(110,231,183,0.9)]" />
          </div>

          {/* Reticle Corner Brackets */}
          <span className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-[#2fa874]" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-[#2fa874]" />
          <span className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-[#2fa874]" />
          <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-[#2fa874]" />
        </div>

        {/* Main Status Headline and Description */}
        <div className="space-y-1.5">
          <h2 className="text-2xl md:text-3xl font-editorial font-semibold text-[#113329] tracking-tight">
            Analyzing your crop...
          </h2>
          <p className="text-xs md:text-sm text-[#527d6a] max-w-md mx-auto leading-relaxed">
            Checking disease patterns, pathogen markers, and crop canopy health against agronomic standards...
          </p>
        </div>

        {/* Editorial Progress Track */}
        <div className="w-full max-w-md space-y-2.5">
          <div className="w-full bg-[#e2efe7] h-2 rounded-full overflow-hidden relative">
            <div className="bg-[#1b4d3e] h-full rounded-full animate-progress-pulse w-full" />
          </div>

          {/* Inference Micro-badge */}
          <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-[#ecfef3] border border-[#bfe7cf] text-[#1b4d3e] text-xs font-semibold tracking-wide shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2fa874] animate-ping" />
            <span>Deep Vision Classifier Running Inference</span>
          </div>
        </div>

        {/* Structured Agronomic Inspection Checklist */}
        <div className="w-full bg-[#fafdfb] border border-[#e2efe7] rounded-xl p-4 text-left space-y-3">
          <div className="flex items-center justify-between border-b border-[#e2efe7] pb-2">
            <span className="text-xs font-semibold text-[#113329] tracking-wide uppercase">
              Diagnostic Progress
            </span>
            <span className="text-[11px] text-[#2fa874] font-medium">Step 2 of 4</span>
          </div>

          <div className="space-y-2.5">
            {/* Step 1 */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <span className="w-4 h-4 rounded-full bg-[#1b4d3e] text-white flex items-center justify-center text-[10px]">
                  <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                </span>
                <span className="font-medium text-[#113329]">
                  Leaf specimen &amp; lesion segmentation
                </span>
              </div>
              <span className="text-[11px] font-medium text-[#2fa874]">Completed</span>
            </div>

            {/* Step 2 */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <span className="w-4 h-4 rounded-full border-2 border-[#1b4d3e] border-t-transparent animate-spin inline-block" />
                <span className="font-semibold text-[#113329]">
                  Botanical taxonomy &amp; pathogen matching
                </span>
              </div>
              <span className="text-[11px] font-semibold text-[#1b4d3e] bg-[#ecfef3] px-2 py-0.5 rounded-full border border-[#d2f4e0]">
                Inference active
              </span>
            </div>

            {/* Step 3 */}
            <div className="flex items-center justify-between text-xs text-[#6c7d76]">
              <div className="flex items-center gap-2.5">
                <span className="w-4 h-4 rounded-full border border-[#9DA8A0] flex items-center justify-center text-[9px] text-[#9DA8A0]">
                  3
                </span>
                <span className="font-normal">Weather &amp; microclimate correlation</span>
              </div>
              <span className="text-[11px] text-[#9DA8A0]">Queued</span>
            </div>

            {/* Step 4 */}
            <div className="flex items-center justify-between text-xs text-[#6c7d76]">
              <div className="flex items-center gap-2.5">
                <span className="w-4 h-4 rounded-full border border-[#9DA8A0] flex items-center justify-center text-[9px] text-[#9DA8A0]">
                  4
                </span>
                <span className="font-normal">Treatment &amp; intervention protocol</span>
              </div>
              <span className="text-[11px] text-[#9DA8A0]">Queued</span>
            </div>
          </div>
        </div>

        {/* Cancel Action Link */}
        {onCancel && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 text-xs text-[#527d6a] hover:text-[#1b4d3e] transition-colors font-medium cursor-pointer"
            >
              <X className="w-3.5 h-3.5 stroke-[2]" />
              <span>Cancel Analysis</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
