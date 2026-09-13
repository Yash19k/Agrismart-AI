import React, { useState, useRef } from 'react';
import { UploadCloud, Image, AlertCircle, Check, Shuffle, Sparkles, FolderOpen, ArrowRight, Loader2 } from 'lucide-react';
import { SAMPLE_LEAVES, loadSampleAsFile } from '../../data/sampleLeaves';
import SampleLeafModal from './SampleLeafModal';

/**
 * ImageUpload Component
 *
 * Provides a large, farmer-friendly drag-and-drop file upload zone.
 * Also includes options for users without photos to test the system:
 * 1. "Random Select Image" — instant random test leaf
 * 2. "Choose Sample Leaf" — modal to browse all provided specimens
 * 3. Quick sample chips for 1-click testing
 */
export default function ImageUpload({ onImageSelected, disabled = false }) {
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingSampleId, setLoadingSampleId] = useState(null);
  const [loadingRandom, setLoadingRandom] = useState(false);
  const fileInputRef = useRef(null);

  const MAX_SIZE_MB = 10;
  const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

  const validateAndPassFile = (file) => {
    setErrorMessage(null);

    if (!file) {
      setErrorMessage('Please choose a crop leaf image.');
      return;
    }

    if (!ACCEPTED_TYPES.includes(file.type.toLowerCase())) {
      setErrorMessage('Invalid file format. Please upload a JPG, JPEG, or PNG image.');
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

  // 1. Pick a random sample image from our verified collection
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
    <div className="w-full space-y-6">
      {/* Hidden native input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png"
        disabled={disabled}
        onChange={handleChange}
        className="hidden"
        id="crop-leaf-file-input"
      />

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-800 text-sm animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorMessage}</div>
        </div>
      )}

      {/* ── Side-by-Side Containers (Upload Card & Sample Test Card) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Left Side: Drag & Drop Boundary Box */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`relative flex flex-col items-center justify-between p-7 sm:p-8 rounded-3xl border-2 border-dashed cursor-pointer transition-all bg-white ${
            dragActive
              ? 'border-emerald-500 bg-emerald-50/70 scale-[1.01]'
              : 'border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/30'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : ''} shadow-xs h-full min-h-[380px]`}
        >
          <div className="flex flex-col items-center text-center my-auto">
            {/* Upload Icon with subtle badge */}
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 mb-3.5 shadow-xs">
              <UploadCloud className="w-8 h-8 stroke-[2]" />
            </div>

            {/* Headings */}
            <h3 className="text-lg sm:text-xl font-extrabold text-gray-900">
              Upload Crop Leaf Image
            </h3>
            <p className="text-xs sm:text-sm font-medium text-gray-600 mt-1 max-w-sm">
              Drag and drop your crop leaf photo here, or click to browse from your device.
            </p>

            {/* Action Button */}
            <button
              type="button"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="mt-5 px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-700/20 transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <Image className="w-4 h-4" />
              <span>Browse Image from Device</span>
            </button>
          </div>

          {/* Requirements Pill */}
          <div className="mt-4 pt-4 border-t border-gray-100 w-full flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1 font-semibold">
              <Check className="w-3.5 h-3.5 text-emerald-600" /> JPG, JPEG, PNG
            </span>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <span className="font-semibold">Max size: 10 MB</span>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <span className="font-semibold">Natural light</span>
          </div>
        </div>

        {/* Right Side: Test with Provided Sample Leaves Section */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-emerald-100 shadow-sm flex flex-col justify-between h-full min-h-[380px]">
          <div>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-emerald-100 text-emerald-800">
                    <Sparkles className="w-4 h-4 text-emerald-700" />
                  </span>
                  <h4 className="text-base font-extrabold text-gray-900">
                    Don't have a leaf image right now?
                  </h4>
                </div>
                <p className="text-xs text-gray-500 pl-8 leading-relaxed">
                  Test our AI detector using real specimen leaves provided by our agronomy lab.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5">
              {/* 1. Random Select Image Button */}
              <button
                type="button"
                disabled={disabled || loadingRandom}
                onClick={handleRandomSelect}
                className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white text-xs font-extrabold shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                title="Pick a random sample leaf"
              >
                {loadingRandom ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Shuffle className="w-3.5 h-3.5" />
                )}
                <span>{loadingRandom ? 'Loading...' : 'Random Select Image'}</span>
              </button>

              {/* 2. Choose Sample Leaf Button (Opens Modal) */}
              <button
                type="button"
                disabled={disabled}
                onClick={() => setModalOpen(true)}
                className="w-full px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                title="Browse all provided sample images"
              >
                <FolderOpen className="w-3.5 h-3.5 text-emerald-700" />
                <span>Choose Sample Leaf...</span>
              </button>
            </div>
          </div>

          {/* Quick Sample Leaf Strip */}
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Quick Test Specimens (Click any to test):
              </span>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
              >
                View all 5 <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {SAMPLE_LEAVES.map((sample) => {
                const isLoading = loadingSampleId === sample.id;
                return (
                  <div
                    key={sample.id}
                    onClick={() => !isLoading && handleSelectSample(sample)}
                    className={`group p-1.5 sm:p-2 rounded-2xl border transition-all cursor-pointer flex flex-col items-center text-center ${
                      sample.isHealthy
                        ? 'border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50 hover:border-emerald-400'
                        : 'border-gray-200 bg-gray-50/50 hover:bg-emerald-50/40 hover:border-emerald-400'
                    } hover:shadow-sm`}
                  >
                    <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-gray-200 mb-1.5">
                      <img
                        src={sample.imageUrl}
                        alt={sample.crop}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      {isLoading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white">
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                      )}
                      <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded bg-black/70 text-white text-[8px] sm:text-[9px] font-bold">
                        {sample.isHealthy ? 'Healthy' : sample.severity}
                      </span>
                    </div>
                    <span className="text-[10px] sm:text-xs font-extrabold text-gray-900 truncate w-full">
                      {sample.crop}
                    </span>
                    <span className="text-[8px] sm:text-[10px] font-semibold text-gray-500 truncate w-full">
                      {sample.condition}
                    </span>
                  </div>
                );
              })}
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
    </div>
  );
}

