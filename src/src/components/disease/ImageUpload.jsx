import React, { useState, useRef } from 'react';
import { UploadCloud, Image, AlertCircle, FileCheck, Check } from 'lucide-react';

/**
 * ImageUpload Component
 *
 * Provides a large, farmer-friendly drag-and-drop file upload zone.
 * Handles validation: file types (JPG, JPEG, PNG), max size (10MB), and drag states.
 */
export default function ImageUpload({ onImageSelected, disabled = false }) {
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
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

  return (
    <div className="w-full">
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

      {/* Drag & Drop Boundary Box */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center p-8 sm:p-12 rounded-3xl border-2 border-dashed cursor-pointer transition-all ${
          dragActive
            ? 'border-emerald-500 bg-emerald-50/70 scale-[1.01]'
            : 'border-emerald-200 bg-emerald-50/20 hover:border-emerald-400 hover:bg-emerald-50/40'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        {/* Upload Icon with subtle badge */}
        <div className="w-20 h-20 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 mb-4 shadow-sm">
          <UploadCloud className="w-10 h-10 stroke-[2]" />
        </div>

        {/* Headings */}
        <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 text-center">
          Upload Crop Leaf Image
        </h3>
        <p className="text-sm font-medium text-gray-600 text-center mt-1.5 max-w-md">
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
          className="mt-5 px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold shadow-md shadow-emerald-700/20 transition-all active:scale-95 flex items-center gap-2"
        >
          <Image className="w-4 h-4" />
          <span>Browse Image</span>
        </button>

        {/* Requirements Pill */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1 font-semibold">
            <Check className="w-3.5 h-3.5 text-emerald-600" /> JPG, JPEG, PNG
          </span>
          <span className="w-1 h-1 rounded-full bg-gray-300" />
          <span className="font-semibold">Max file size: 10 MB</span>
          <span className="w-1 h-1 rounded-full bg-gray-300" />
          <span className="font-semibold">Clear natural light recommended</span>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="mt-4 p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-800 text-sm animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorMessage}</div>
        </div>
      )}
    </div>
  );
}
