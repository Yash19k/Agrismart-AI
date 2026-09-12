import React, { useRef } from 'react';
import { Trash2, RefreshCw, Sparkles, FileText, CheckCircle2 } from 'lucide-react';

/**
 * ImagePreview Component
 *
 * Displays the selected leaf image preview using URL.createObjectURL(file),
 * metadata (name, formatted size), and options to Remove, Replace, or Analyze.
 */
export default function ImagePreview({ file, onRemove, onReplace, onAnalyze, analyzing = false }) {
  const replaceInputRef = useRef(null);

  if (!file) return null;

  const previewUrl = URL.createObjectURL(file);

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
            <span>Ready for Analysis</span>
          </div>
        </div>

        {/* Details & Action Buttons */}
        <div className="flex-1 flex flex-col justify-between w-full h-full py-1">
          <div>
            <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold uppercase tracking-wider">
              <span>Leaf Image Selected</span>
            </div>
            <h4 className="text-lg font-extrabold text-gray-900 mt-1 truncate" title={file.name}>
              {file.name}
            </h4>

            {/* File specs */}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-600">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 font-semibold">
                <FileText className="w-3.5 h-3.5 text-gray-500" />
                {formatFileSize(file.size)}
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 font-semibold">
                Format: {file.type ? file.type.replace('image/', '').toUpperCase() : 'JPG'}
              </span>
            </div>

            <p className="text-xs text-gray-500 mt-3 leading-relaxed">
              AgriSmart AI will scan this crop specimen for necrotic lesions, fungal spores, bacterial spots, and chlorosis patterns to generate comprehensive agronomic recommendations.
            </p>
          </div>

          {/* Action Row */}
          <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-3">
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
              className="px-4 py-2.5 rounded-xl border border-gray-200 hover:border-red-200 hover:bg-red-50 text-gray-700 hover:text-red-700 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove</span>
            </button>

            {/* Replace */}
            <button
              type="button"
              disabled={analyzing}
              onClick={() => replaceInputRef.current?.click()}
              className="px-4 py-2.5 rounded-xl border border-gray-200 hover:border-emerald-200 hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Replace Image</span>
            </button>

            {/* Primary Analyze button */}
            <button
              type="button"
              disabled={analyzing}
              onClick={onAnalyze}
              className="ml-auto w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-extrabold shadow-lg shadow-emerald-700/25 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-emerald-200" />
              <span>Analyze Image Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
