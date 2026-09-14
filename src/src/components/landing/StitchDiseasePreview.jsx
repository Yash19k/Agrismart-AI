import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Upload, Search, AlertTriangle, ArrowRight, ShieldCheck, Info } from 'lucide-react';

export const StitchDiseasePreview = ({ t }) => {
  const navigate = useNavigate();
  const [selectedCrop, setSelectedCrop] = useState('tomato');

  const handleActionClick = () => {
    navigate('/disease');
  };

  const crops = [
    { id: 'tomato', name: 'Tomato (Solanum lycopersicum)' },
    { id: 'potato', name: 'Potato (Solanum tuberosum)' },
    { id: 'corn', name: 'Corn / Maize (Zea mays)' },
    { id: 'apple', name: 'Apple (Malus domestica)' },
    { id: 'grape', name: 'Grape (Vitis vinifera)' },
    { id: 'pepper', name: 'Bell Pepper (Capsicum annuum)' },
  ];

  return (
    <section
      aria-label="Interactive Model Preview"
      className="w-full bg-[#f4fbf6] border-b border-stone-200/70 py-14 sm:py-20"
      id="disease-detection"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm p-6 sm:p-8 md:p-10">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#ecfef3] text-[#1b4d3e] rounded-full border border-[#baeed9]">
                {t.diseaseDetection?.badge || 'Primary Product'}
              </span>
              <h3 className="text-xl md:text-2xl font-serif font-bold text-stone-900">
                {t.diseaseDetection?.title || 'AI Crop Disease Detection'}
              </h3>
            </div>
            <p className="text-xs text-stone-500">
              {t.diseaseDetection?.subtitle ||
                'Upload a crop or leaf image and let AgriSmart analyze it using our trained computer-vision model.'}
            </p>
          </div>
          <span className="text-xs italic text-stone-400 font-serif self-start sm:self-auto">
            {t.diseaseDetection?.simulatedLabel || 'Direct Field Inference Engine'}
          </span>
        </div>

        {/* Diagnostic Interactive Workspace */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          {/* Left Inputs (Interactive Preview linking to /disease) */}
          <div className="md:col-span-6 space-y-4 flex flex-col justify-between">
            <div>
              {/* Crop Selector */}
              <div className="mb-4">
                <label
                  className="block text-xs font-semibold text-stone-700 mb-1.5"
                  htmlFor="crop-select"
                >
                  {t.diseaseDetection?.selectCrop || 'Select Target Crop'}
                </label>
                <div className="relative">
                  <select
                    id="crop-select"
                    value={selectedCrop}
                    onChange={(e) => setSelectedCrop(e.target.value)}
                    className="w-full text-xs rounded-xl border border-stone-300 bg-stone-50/60 py-2.5 pl-3 pr-8 focus:border-[#1b4d3e] focus:ring-[#1b4d3e] text-stone-800 font-medium"
                  >
                    {crops.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Upload Drag Area (Click navigates to /disease) */}
              <div
                onClick={handleActionClick}
                className="border-2 border-dashed border-[#9ed1bd] bg-[#ecfef3]/40 rounded-2xl p-6 text-center hover:bg-[#ecfef3]/70 hover:border-[#2e6a47] transition cursor-pointer group"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleActionClick()}
                title="Click to open disease detection scanner"
              >
                <div className="w-10 h-10 mx-auto rounded-full bg-[#baeed9]/70 flex items-center justify-center text-[#1b4d3e] mb-2 group-hover:scale-105 transition-transform">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-[#002117]">
                  {t.diseaseDetection?.uploadPrompt || 'Click to upload leaf photo or'}{' '}
                  <span className="underline decoration-[#2e6a47]">
                    {t.diseaseDetection?.dragDrop || 'drag & drop'}
                  </span>
                </p>
                <p className="text-[11px] text-stone-500 mt-1">
                  {t.diseaseDetection?.uploadFormats ||
                    'Supports JPG, PNG, WEBP (Smartphone & drone high-res samples)'}
                </p>
              </div>
            </div>

            {/* Diagnostic Button */}
            <button
              onClick={handleActionClick}
              className="w-full py-3 rounded-xl bg-[#1b4d3e] hover:bg-[#144c32] active:bg-[#002117] text-white text-xs font-semibold shadow transition flex items-center justify-center gap-2 cursor-pointer group"
            >
              <Search className="w-4 h-4 text-emerald-300 group-hover:scale-110 transition-transform" />
              <span>{t.diseaseDetection?.runAnalysis || 'Run Diagnostic Analysis'}</span>
            </button>
          </div>

          {/* Right Results Card Preview */}
          <div className="md:col-span-6 bg-[#fbfdfa] rounded-2xl p-5 border border-stone-200/90 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  {t.diseaseDetection?.diagnosisSummary || 'Diagnosis Summary'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {t.diseaseDetection?.needsAttention || 'Needs Attention'}
                </span>
              </div>

              {/* Pathogen Condition */}
              <div className="mt-3">
                <span className="text-[11px] text-stone-500 block">
                  {t.diseaseDetection?.pathogenLabel || 'Identified Pathogen Condition:'}
                </span>
                <div className="text-base font-serif font-bold text-stone-900 mt-0.5">
                  {t.diseaseDetection?.sampleDisease || 'Tomato Early Blight'}{' '}
                  <span className="font-normal italic text-stone-500 text-xs">
                    {t.diseaseDetection?.sampleScientific || '(Alternaria solani)'}
                  </span>
                </div>
              </div>

              {/* Confidence Bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-stone-600 font-medium mb-1">
                  <span>{t.diseaseDetection?.modelConfidence || 'Model Confidence'}</span>
                  <span className="font-semibold text-[#1b4d3e]">
                    {t.diseaseDetection?.confidenceVal || '91.4%'}
                  </span>
                </div>
                <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1b4d3e] rounded-full transition-all duration-700"
                    style={{ width: '91.4%' }}
                  />
                </div>
              </div>

              {/* Field Guidance Callout */}
              <div className="mt-4 p-3.5 bg-[#ecfef3]/60 rounded-xl border border-[#baeed9]/80 text-xs">
                <div className="font-semibold text-[#002117] flex items-center gap-1.5 mb-1 text-[11px] uppercase tracking-wide">
                  <Info className="w-3.5 h-3.5 text-[#2e6a47]" />
                  <span>{t.diseaseDetection?.fieldGuidanceTitle || 'Recommended Field Guidance'}</span>
                </div>
                <p className="text-stone-700 text-[11px] leading-relaxed">
                  {t.diseaseDetection?.fieldGuidanceText ||
                    'Prune lower affected foliage immediately to halt upward spread. Avoid overhead sprinkler irrigation during warm afternoons to keep leaves dry.'}
                </p>
              </div>
            </div>

            {/* Simulator Footer & Direct Action Link */}
            <div className="mt-4 pt-3 border-t border-stone-200 text-[10px] text-stone-400 flex items-center justify-between">
              <span>{t.diseaseDetection?.simulatorFooter || 'Direct field inference simulator'}</span>
              <span className="text-[#2e6a47] font-medium">
                {t.diseaseDetection?.modelFooter || 'Model: PyTorch ConvNeXt-Tiny'}
              </span>
            </div>
          </div>
        </div>
      </div>
      </div>
    </section>
  );
};

export default StitchDiseasePreview;
