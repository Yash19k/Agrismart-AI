import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  Check,
  Shuffle,
  Sparkles,
  FolderOpen,
  Sun,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { SAMPLE_LEAVES, loadSampleAsFile } from '../../data/sampleLeaves';
import SampleLeafModal from './SampleLeafModal';

/**
 * ImageUpload Component (Stitch State 1: Empty Upload Screen)
 *
 * Provides the editorial AgroVerdant dropzone and agronomy lab specimen library.
 * Preserves all functional upload handling, drag-and-drop, validation, and sample leaf loading.
 */
export default function ImageUpload({ onImageSelected, disabled = false }) {
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingSampleId, setLoadingSampleId] = useState(null);
  const [loadingRandom, setLoadingRandom] = useState(false);
  const fileInputRef = useRef(null);

  const MAX_SIZE_MB = 10;
  const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  const validateAndPassFile = (file) => {
    setErrorMessage(null);

    if (!file) {
      setErrorMessage('Please choose a crop leaf image.');
      return;
    }

    if (!ACCEPTED_TYPES.includes(file.type.toLowerCase())) {
      setErrorMessage('Invalid file format. Please upload a JPG, JPEG, PNG, or WEBP image.');
      return;
    }

    const fileSizeMb = file.size / (1024 * 1024);
    if (fileSizeMb > MAX_SIZE_MB) {
      setErrorMessage(`Image is too large (${fileSizeMb.toFixed(1)} MB). Maximum allowed size is ${MAX_SIZE_MB} MB.`);
      return;
    }

    onImageSelected(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndPassFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndPassFile(e.target.files[0]);
    }
  };

  // 1. Pick a random sample leaf from our verified collection
  const handleRandomSelect = async () => {
    if (disabled || loadingRandom) return;
    setErrorMessage(null);
    setLoadingRandom(true);
    try {
      const randomIndex = Math.floor(Math.random() * SAMPLE_LEAVES.length);
      const chosenSample = SAMPLE_LEAVES[randomIndex];
      const file = await loadSampleAsFile(chosenSample);
      onImageSelected(file);
    } catch (err) {
      console.error('Failed to load random sample:', err);
      setErrorMessage('Could not load random sample image. Please try again.');
    } finally {
      setLoadingRandom(false);
    }
  };

  // 2. Select a specific sample leaf
  const handleSelectSample = async (sample) => {
    setErrorMessage(null);
    setLoadingSampleId(sample.id);
    try {
      const file = await loadSampleAsFile(sample);
      setModalOpen(false);
      onImageSelected(file);
    } catch (err) {
      console.error('Failed to load sample:', err);
      setErrorMessage(`Could not load ${sample.crop} sample. Please try again.`);
    } finally {
      setLoadingSampleId(null);
    }
  };

  return (
    <div className="w-full flex flex-col gap-7">
      {/* Hidden native input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        disabled={disabled}
        onChange={handleChange}
        className="hidden"
        id="crop-leaf-file-input"
      />

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-[#fdf2f2] border border-[#f8d7d7] flex items-start gap-3 text-[#c95a5a] text-xs font-semibold animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-[#c95a5a] shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">{errorMessage}</div>
        </div>
      )}

      {/* ── CARD 1: Upload Dropzone Area ── */}
      <section
        className="w-full bg-white rounded-3xl p-7 border border-[#d3ebd9] shadow-editorial flex flex-col justify-between relative overflow-hidden group"
        data-purpose="upload-card"
      >
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-[#ecfef3] rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-5 relative z-10">
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => !disabled && fileInputRef.current?.click()}
            className={`relative rounded-2xl p-8 sm:p-10 text-center transition-all bg-[#fafdfb] hover:bg-[#f4faf6] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer ${
              dragActive
                ? 'border-[#1b4d3e] bg-[#ecfef3]'
                : 'border-[#57b98d] group-hover:border-[#1b4d3e]'
            } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <div className="w-16 h-16 rounded-2xl bg-[#ecfef3] border border-[#a6e7c4] flex items-center justify-center text-[#1b4d3e] mb-4 shadow-xs group-hover:scale-105 transition-transform duration-300">
              <UploadCloud className="w-8 h-8 stroke-[1.8]" />
            </div>

            <h2 className="font-editorial text-2xl font-normal text-[#1a2421] tracking-normal">
              Upload Crop Leaf Photograph
            </h2>

            <p className="text-xs sm:text-sm text-[#4d7362] mt-1 max-w-sm leading-relaxed">
              Drop your specimen image here or select one from your computer.
            </p>

            <button
              type="button"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="mt-6 inline-flex items-center gap-2.5 px-6 py-3 bg-[#1b4d3e] hover:bg-[#133a2f] active:bg-[#0c261e] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md shadow-[#1b4d3e]/25 hover:shadow-lg transition-all duration-200 cursor-pointer"
            >
              Choose Image File
            </button>
          </div>
        </div>

        {/* Requirements Strip */}
        <div className="mt-6 pt-4 border-t border-[#edf6f0] flex flex-wrap items-center justify-center gap-y-2 gap-x-4 text-xs text-[#527d6a]">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <Check className="w-4 h-4 text-[#2fa874] stroke-[2.5]" />
            JPG, JPEG, PNG, WEBP
          </span>
          <span className="text-[#b2ebd0]">•</span>
          <span className="font-medium">Max file size: 10 MB</span>
          <span className="text-[#b2ebd0]">•</span>
          <span className="font-medium text-[#2f664e] flex items-center gap-1.5">
            <Sun className="w-3.5 h-3.5 text-[#e5a034]" />
            Natural sunlight recommended
          </span>
        </div>
      </section>

      {/* ── CARD 2: Specimen Library & Quick Test Specimens ── */}
      <section
        className="w-full bg-white rounded-3xl p-7 border border-[#d3ebd9] shadow-editorial flex flex-col justify-between"
        data-purpose="specimen-library-card"
      >
        <div className="space-y-5">
          {/* Top Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#ecfef3]/80 border border-[#bfe7cf]">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white border border-[#aee3c5] flex items-center justify-center text-[#1b4d3e] shrink-0 shadow-xs">
                <Sparkles className="w-5 h-5 text-[#2fa874]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#113329]">
                  Don't have a leaf image right now?
                </h4>
                <p className="text-xs text-[#4d7362] mt-0.5 leading-relaxed">
                  Test our Vision ML detector instantly using real-world field specimen leaves provided by our agronomy research lab.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                disabled={disabled || loadingRandom}
                onClick={handleRandomSelect}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1b4d3e] hover:bg-[#133a2f] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {loadingRandom ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Shuffle className="w-3.5 h-3.5" />
                )}
                <span>{loadingRandom ? 'Loading...' : 'Random Select Image'}</span>
              </button>

              <button
                type="button"
                disabled={disabled}
                onClick={() => setModalOpen(true)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#ecfef3] hover:bg-[#d8f5e4] text-[#153f33] border border-[#aae1c2] text-xs font-semibold transition-colors cursor-pointer"
              >
                <FolderOpen className="w-4 h-4 text-[#2fa874]" />
                <span>Choose Sample Leaf...</span>
              </button>
            </div>
          </div>

          {/* Quick Test Specimens */}
          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#577f6d]">
              Quick Test Specimens (Click any to test):
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {SAMPLE_LEAVES.slice(0, 5).map((sample) => {
              const isLoading = loadingSampleId === sample.id;
              return (
                <button
                  key={sample.id}
                  type="button"
                  disabled={disabled || isLoading}
                  onClick={() => handleSelectSample(sample)}
                  className={`group/specimen p-2.5 rounded-2xl bg-[#fafdfb] hover:bg-[#ecfef3] border transition-all text-left flex flex-col items-center cursor-pointer ${
                    sample.isHealthy
                      ? 'border-[#d6ecdf] hover:border-[#2fa874] ring-1 ring-[#2fa874]/30'
                      : 'border-[#d6ecdf] hover:border-[#2fa874]'
                  }`}
                >
                  <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-gray-100 mb-2">
                    <img
                      src={sample.imageUrl}
                      alt={`${sample.crop} ${sample.condition} specimen leaf`}
                      className="w-full h-full object-cover group-hover/specimen:scale-110 transition-transform duration-300"
                    />
                    {isLoading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white rounded-xl">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-bold text-[#113329] text-center w-full truncate">
                    {sample.crop}
                  </p>
                  <p
                    className={`text-[10px] text-center w-full truncate ${
                      sample.isHealthy ? 'text-[#2fa874] font-semibold' : 'text-[#55826f]'
                    }`}
                  >
                    {sample.condition}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

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
