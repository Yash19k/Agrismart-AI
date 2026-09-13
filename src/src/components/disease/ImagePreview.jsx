import React, { useRef, useState } from 'react';
import { Trash2, RefreshCw, Sparkles, FileText, CheckCircle2, Shuffle, FolderOpen, Loader2 } from 'lucide-react';
import { SAMPLE_LEAVES, loadSampleAsFile } from '../../data/sampleLeaves';
import SampleLeafModal from './SampleLeafModal';

/**
 * ImagePreview Component
 *
 * Displays the selected leaf image preview, metadata, sample tags,
 * and options to Remove, Replace, Try Another Sample, or Analyze.
 */
export default function ImagePreview({ file, onRemove, onReplace, onAnalyze, analyzing = false }) {
  const replaceInputRef = useRef(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingRandom, setLoadingRandom] = useState(false);
  const [loadingSampleId, setLoadingSampleId] = useState(null);

  if (!file) return null;

  const previewUrl = URL.createObjectURL(file);
  const sampleMeta = file.sampleMeta;

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleReplaceChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onReplace(e.target.files[0]);
    }
  };

  const handleRandomSample = async () => {
    if (analyzing || loadingRandom) return;
    setLoadingRandom(true);
    try {
      const otherSamples = SAMPLE_LEAVES.filter((s) => s.id !== sampleMeta?.id);
      const chosen = otherSamples[Math.floor(Math.random() * otherSamples.length)] || SAMPLE_LEAVES[0];
      const newFile = await loadSampleAsFile(chosen);
      onReplace(newFile);
    } catch (err) {
      console.error('Failed to load random sample:', err);
    } finally {
      setLoadingRandom(false);
    }
  };

  const handleSelectSample = async (sample) => {
    setLoadingSampleId(sample.id);
    try {
      const newFile = await loadSampleAsFile(sample);
      setModalOpen(false);
      onReplace(newFile);
    } catch (err) {
      console.error('Failed to load sample:', err);
    } finally {
      setLoadingSampleId(null);
    }
  };

  return (
    <div className="w-full bg-white rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-sm">
      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* Image Preview Container */}
        <div className="relative w-full md:w-64 h-64 rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0 group">
          <img
            src={previewUrl}
            alt="Uploaded crop leaf preview"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-[11px] font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{sampleMeta ? 'Sample Specimen' : 'Ready for Analysis'}</span>
          </div>

          {sampleMeta && (
            <div className="absolute bottom-2.5 left-2.5 right-2.5 px-2 py-1 rounded-lg bg-emerald-950/80 backdrop-blur-xs text-emerald-200 text-[10px] font-bold truncate">
              {sampleMeta.crop}: {sampleMeta.condition}
            </div>
          )}
        </div>

        {/* Details & Action Buttons */}
        <div className="flex-1 flex flex-col justify-between w-full h-full py-1">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-800 text-xs font-bold uppercase tracking-wider">
                {sampleMeta ? '🌿 Provided Diagnostic Sample' : 'Leaf Image Selected'}
              </span>
              {sampleMeta && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                  {sampleMeta.isHealthy ? 'Healthy Control' : `${sampleMeta.severity} Severity`}
                </span>
              )}
            </div>

            <h4 className="text-lg font-extrabold text-gray-900 mt-1 truncate" title={file.name}>
              {sampleMeta ? `${sampleMeta.crop} — ${sampleMeta.condition}` : file.name}
            </h4>

            {/* File specs */}
            <div className="mt-2.5 flex flex-wrap items-center gap-2.5 text-xs text-gray-600">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gray-100 font-semibold">
                <FileText className="w-3.5 h-3.5 text-gray-500" />
                {formatFileSize(file.size)}
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 font-semibold">
                Format: {file.type ? file.type.replace('image/', '').toUpperCase() : 'JPG'}
              </span>
              {sampleMeta && (
                <span className="px-2.5 py-1 rounded-xl bg-teal-50 text-teal-800 font-semibold">
                  Pathogen: {sampleMeta.pathogen}
                </span>
              )}
            </div>

            <p className="text-xs text-gray-500 mt-2.5 leading-relaxed">
              {sampleMeta
                ? sampleMeta.description
                : 'AgriSmart AI will scan this crop specimen for necrotic lesions, fungal spores, bacterial spots, and chlorosis patterns to generate comprehensive agronomic recommendations.'}
            </p>
          </div>

          {/* Action Row */}
          <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Replace hidden input */}
            <input
              ref={replaceInputRef}
              type="file"
              accept=".jpg,.jpeg,.png"
              className="hidden"
              onChange={handleReplaceChange}
            />

            {/* Remove */}
            <button
              type="button"
              disabled={analyzing}
              onClick={onRemove}
              className="px-3 py-2 rounded-xl border border-gray-200 hover:border-red-200 hover:bg-red-50 text-gray-700 hover:text-red-700 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove</span>
            </button>

            {/* Random sample swap */}
            <button
              type="button"
              disabled={analyzing || loadingRandom}
              onClick={handleRandomSample}
              className="px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
              title="Try a different random sample leaf"
            >
              {loadingRandom ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Shuffle className="w-3.5 h-3.5" />
              )}
              <span>Random Sample</span>
            </button>

            {/* Browse samples modal */}
            <button
              type="button"
              disabled={analyzing}
              onClick={() => setModalOpen(true)}
              className="px-3 py-2 rounded-xl border border-gray-200 hover:border-emerald-200 hover:bg-gray-50 text-gray-700 hover:text-emerald-800 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
              title="Select another sample from our library"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Browse Samples</span>
            </button>

            {/* Primary Analyze button */}
            <button
              type="button"
              disabled={analyzing}
              onClick={onAnalyze}
              className="ml-auto w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-extrabold shadow-md shadow-emerald-700/25 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-200" />
              <span>Analyze Image Now</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal for browsing all sample leaves */}
      <SampleLeafModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelectSample={handleSelectSample}
        loadingSampleId={loadingSampleId}
      />
    </div>
  );
}

