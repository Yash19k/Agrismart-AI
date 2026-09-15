import React, { useRef, useState, useEffect } from 'react';
import {
  Trash2,
  Sparkles,
  FileText,
  Maximize2,
  Shuffle,
  FolderOpen,
  Loader2,
  Zap
} from 'lucide-react';
import { SAMPLE_LEAVES, loadSampleAsFile } from '../../data/sampleLeaves';
import SampleLeafModal from './SampleLeafModal';

/**
 * ImagePreview Component (Stitch State 3: Image Selected & Ready for Analysis)
 *
 * Provides the editorial 2-column layout from Stitch:
 * - Left: Large leaf specimen preview with optical reticle grid, inspect toggle, specimen tag.
 * - Right: Specimen filename, metadata chips (size, format, dimensions), Remove & Analyze Image Now CTA.
 */
export default function ImagePreview({
  file,
  onRemove,
  onReplace,
  onAnalyze,
  analyzing = false
}) {
  const replaceInputRef = useRef(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingRandom, setLoadingRandom] = useState(false);
  const [loadingSampleId, setLoadingSampleId] = useState(null);
  const [dimensions, setDimensions] = useState(null);

  if (!file) return null;

  const previewUrl = URL.createObjectURL(file);
  const sampleMeta = file.sampleMeta;

  // Read natural image dimensions
  useEffect(() => {
    const img = new window.Image();
    img.src = previewUrl;
    img.onload = () => {
      setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
  }, [file, previewUrl]);

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
      const chosen =
        otherSamples[Math.floor(Math.random() * otherSamples.length)] || SAMPLE_LEAVES[0];
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

  const fileFormat = file.type ? file.type.replace('image/', '').toUpperCase() : 'JPG';

  return (
    <section
      className="w-full bg-white rounded-2xl border border-[#E0E7DF] shadow-editorial overflow-hidden"
      data-purpose="analysis-card"
    >
      {/* Hidden file input for replacement */}
      <input
        ref={replaceInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={handleReplaceChange}
      />

      <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* LEFT COLUMN: Selected Leaf Image Preview */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="relative rounded-xl overflow-hidden border border-[#DCE4DD] bg-[#F7FAF8] flex-1 flex flex-col group">
            {/* Inspect / Fullscreen Hint Button */}
            <button
              type="button"
              onClick={() => window.open(previewUrl, '_blank')}
              className="absolute top-3.5 right-3.5 z-10 w-8 h-8 rounded-full bg-white/85 hover:bg-white text-[#193229] backdrop-blur-md flex items-center justify-center shadow-xs transition-colors cursor-pointer"
              title="Inspect Specimen Full Size"
            >
              <Maximize2 className="w-4 h-4 stroke-[2]" />
            </button>

            {/* Leaf Preview Image with framing */}
            <div className="w-full h-72 sm:h-80 lg:h-full min-h-[280px] overflow-hidden relative flex items-center justify-center bg-[#f4f7f5]">
              <img
                src={previewUrl}
                alt="Selected crop specimen preview"
                className="w-full h-full object-cover object-center group-hover:scale-[1.02] transition-transform duration-300 ease-out select-none"
              />
              {/* Optical Grid Overlay Hint */}
              <div
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                  backgroundSize: '32px 32px',
                  backgroundImage:
                    'linear-gradient(to right, #1b4d3e 1px, transparent 1px), linear-gradient(to bottom, #1b4d3e 1px, transparent 1px)',
                }}
              />
            </div>

            {/* Bottom Image Specimen Bar */}
            <div className="px-4 py-2.5 bg-white/95 backdrop-blur-xs border-t border-[#E5EBE6] flex items-center justify-between text-xs text-[#527d6a]">
              <div className="flex items-center gap-2 truncate">
                <span className="w-2 h-2 rounded-full bg-[#2fa874] shrink-0" />
                <span className="font-medium text-[#113329] truncate">
                  {sampleMeta
                    ? `Specimen Leaf: ${sampleMeta.crop}`
                    : `Specimen: ${file.name}`}
                </span>
              </div>
              <span className="text-[11px] font-semibold text-[#1b4d3e] shrink-0 ml-2">
                Ready
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: File Metadata & Action Panel */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
          <div>
            {/* Tag */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase font-bold tracking-wider text-[#577f6d]">
                {sampleMeta ? '🌿 Lab Specimen Ready' : 'Field Specimen Loaded'}
              </span>
              {sampleMeta && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ecfef3] text-[#1b4d3e] border border-[#d2f4e0]">
                  {sampleMeta.isHealthy ? 'Healthy Control' : `${sampleMeta.severity} Severity`}
                </span>
              )}
            </div>

            {/* Specimen File Title */}
            <h2 className="text-2xl font-bold text-[#113329] mt-2 font-sans tracking-tight truncate" title={file.name}>
              {sampleMeta ? `${sampleMeta.crop} — ${sampleMeta.condition}` : file.name}
            </h2>

            {/* Metadata Chips */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#F2F6F3] text-[#193229] text-xs font-medium border border-[#E0ECE2]">
                <FileText className="w-3.5 h-3.5 text-[#527d6a]" />
                {formatFileSize(file.size)}
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#F2F6F3] text-[#193229] text-xs font-medium border border-[#E0ECE2]">
                Format: <strong className="text-[#1b4d3e] font-semibold">{fileFormat}</strong>
              </span>

              {dimensions && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#F2F6F3] text-[#193229] text-xs font-medium border border-[#E0ECE2]">
                  Dimensions: <strong className="text-[#193229] font-semibold">{dimensions.width} × {dimensions.height}</strong>
                </span>
              )}

              {sampleMeta?.pathogen && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#ecfef3] text-[#1b4d3e] text-xs font-medium border border-[#d2f4e0]">
                  Pathogen: <strong className="italic">{sampleMeta.pathogen}</strong>
                </span>
              )}
            </div>

            {/* Description Briefing */}
            <p className="text-xs sm:text-sm text-[#4d7362] mt-4 leading-relaxed font-sans">
              {sampleMeta
                ? sampleMeta.description
                : 'AgriSmart AI will analyze this crop specimen for foliar lesions, fungal spores, bacterial spots, and chlorosis patterns to generate evidence-backed agronomic guidance.'}
            </p>

            {/* Sample swap actions if applicable */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={analyzing || loadingRandom}
                onClick={handleRandomSample}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#d2f4e0] bg-[#ecfef3] hover:bg-[#d8f5e4] text-[#153f33] text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                {loadingRandom ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Shuffle className="w-3 h-3 text-[#2fa874]" />
                )}
                <span>Swap Random Specimen</span>
              </button>

              <button
                type="button"
                disabled={analyzing}
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E0ECE2] bg-white hover:bg-[#F2F6F3] text-[#193229] text-xs font-medium transition-colors cursor-pointer"
              >
                <FolderOpen className="w-3 h-3 text-[#527d6a]" />
                <span>Browse Specimen Library</span>
              </button>

              <button
                type="button"
                disabled={analyzing}
                onClick={() => replaceInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E0ECE2] bg-white hover:bg-[#F2F6F3] text-[#193229] text-xs font-medium transition-colors cursor-pointer"
              >
                <span>Upload Different File</span>
              </button>
            </div>
          </div>

          {/* Action Row: Remove Image & Analyze Image Now */}
          <div className="pt-5 border-t border-[#EEF3EF]">
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              {/* Remove Image Button */}
              <button
                type="button"
                disabled={analyzing}
                onClick={onRemove}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-red-200 bg-red-50/60 hover:bg-red-100/80 text-red-600 font-semibold text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
                <span>Remove Image</span>
              </button>

              {/* Primary Analyze Image Now Button */}
              <button
                type="button"
                disabled={analyzing}
                onClick={onAnalyze}
                className="flex-1 inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#1b4d3e] hover:bg-[#133a2f] active:bg-[#0c261e] text-white font-semibold text-xs sm:text-sm shadow-md shadow-[#1b4d3e]/20 hover:shadow-lg transition-all cursor-pointer"
              >
                <Zap className="w-4 h-4 text-[#6ed1a2] fill-current" />
                <span>Analyze Image Now</span>
              </button>
            </div>
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
    </section>
  );
}
