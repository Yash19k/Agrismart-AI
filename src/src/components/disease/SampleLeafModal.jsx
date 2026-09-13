import React, { useState } from 'react';
import { X, Sparkles, Check, Info, ShieldAlert, Heart, Dna, ArrowRight } from 'lucide-react';
import { SAMPLE_LEAVES } from '../../data/sampleLeaves';

/**
 * SampleLeafModal Component
 *
 * Allows users who don't have crop leaf photos to browse and select from
 * a verified library of high-resolution plant pathology specimens.
 */
export default function SampleLeafModal({ isOpen, onClose, onSelectSample, loadingSampleId }) {
  const [filter, setFilter] = useState('all');

  if (!isOpen) return null;

  const filteredSamples = SAMPLE_LEAVES.filter((sample) => {
    if (filter === 'all') return true;
    if (filter === 'healthy') return sample.isHealthy;
    if (filter === 'disease') return !sample.isHealthy;
    return sample.crop.toLowerCase().includes(filter.toLowerCase());
  });

  const getSeverityBadge = (sample) => {
    if (sample.isHealthy) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 flex items-center gap-1">
          <Heart className="w-3 h-3 text-emerald-600" />
          Healthy
        </span>
      );
    }
    if (sample.severity === 'Severe' || sample.severity === 'High') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-red-100 text-red-800 flex items-center gap-1">
          <ShieldAlert className="w-3 h-3 text-red-600" />
          {sample.severity} Risk
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-800 flex items-center gap-1">
        <ShieldAlert className="w-3 h-3 text-amber-600" />
        Moderate Risk
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-emerald-100 overflow-hidden my-6">
        {/* Header */}
        <div className="p-5 sm:p-7 border-b border-gray-100 bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4 text-emerald-300" />
              <span>Diagnostic Test Library</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight">
              Select a Verified Sample Crop Leaf
            </h3>
            <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-xl">
              Don't have a leaf image? Choose any specimen below to test AgriSmart AI's lesion recognition, severity calculation, and agronomic prescriptions.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer flex-shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="px-5 sm:px-7 py-3 bg-gray-50 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">Filter:</span>
            {[
              { id: 'all', label: 'All Samples (5)' },
              { id: 'disease', label: 'Infected / Diseases (4)' },
              { id: 'healthy', label: 'Healthy Specimens (1)' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filter === tab.id
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="text-xs text-gray-500 font-medium">
            Click any leaf card to load it for instant diagnosis
          </div>
        </div>

        {/* Sample Leaves Grid */}
        <div className="p-5 sm:p-7 max-h-[60vh] overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSamples.map((sample) => {
              const isLoading = loadingSampleId === sample.id;
              return (
                <div
                  key={sample.id}
                  onClick={() => !isLoading && onSelectSample(sample)}
                  className={`group relative flex flex-col justify-between p-3.5 rounded-2xl border-2 transition-all cursor-pointer bg-white hover:shadow-lg ${
                    sample.isHealthy
                      ? 'border-emerald-200 hover:border-emerald-500'
                      : 'border-gray-200 hover:border-emerald-500'
                  }`}
                >
                  <div>
                    {/* Image Preview Thumbnail */}
                    <div className="relative w-full h-44 rounded-xl overflow-hidden bg-gray-100 mb-3">
                      <img
                        src={sample.imageUrl}
                        alt={`${sample.crop} ${sample.condition}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      {/* Top Badges */}
                      <div className="absolute top-2 left-2 flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-xs text-white text-[11px] font-bold">
                          {sample.crop}
                        </span>
                      </div>
                      <div className="absolute top-2 right-2">
                        {getSeverityBadge(sample)}
                      </div>
                    </div>

                    {/* Condition Title */}
                    <h4 className="text-base font-extrabold text-gray-900 leading-snug group-hover:text-emerald-800 transition-colors">
                      {sample.condition}
                    </h4>

                    {/* Scientific info */}
                    <p className="text-xs text-emerald-800/80 font-medium italic mt-0.5">
                      {sample.pathogen !== 'None' ? sample.pathogen : sample.scientificCrop}
                    </p>

                    {/* Description */}
                    <p className="text-xs text-gray-600 mt-2 line-clamp-2 leading-relaxed">
                      {sample.description}
                    </p>
                  </div>

                  {/* Action CTA Button */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-400">
                      Category: {sample.category}
                    </span>

                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSample(sample);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 group-hover:scale-102"
                    >
                      {isLoading ? (
                        <span>Loading...</span>
                      ) : (
                        <>
                          <span>Select Leaf</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-1.5 font-medium text-gray-500">
            <Info className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Samples include healthy control and verified bacterial/fungal plant diseases.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-300 font-bold hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
