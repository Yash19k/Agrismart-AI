import React, { useState } from 'react';
import { Maximize2, X, Leaf, BarChart2, AlertCircle } from 'lucide-react';

/**
 * PredictionCard Component
 *
 * Matching the exact visual layout from the mockup:
 * - Left side: Leaf specimen preview with file details & "View Full Image" button + expand modal
 * - Right side:
 *   - Crop: Tomato (with red tomato icon)
 *   - Detected Disease: Early Blight (Alternaria solani) (with green leaf icon)
 *   - Model Confidence: 91.4% (with signal/chart icon)
 *   - Disease Detected callout: soft pink/red box with alert icon and diagnostic note
 */
const getCropEmoji = (crop) => {
  const c = (crop || '').toLowerCase();
  if (c.includes('tomato')) return '🍅';
  if (c.includes('corn') || c.includes('maize')) return '🌽';
  if (c.includes('potato')) return '🥔';
  if (c.includes('grape')) return '🍇';
  if (c.includes('apple')) return '🍎';
  if (c.includes('pepper') || c.includes('bell')) return '🫑';
  if (c.includes('cherry')) return '🍒';
  if (c.includes('peach')) return '🍑';
  if (c.includes('strawberry')) return '🍓';
  if (c.includes('orange') || c.includes('citrus')) return '🍊';
  if (c.includes('soybean')) return '🌱';
  if (c.includes('squash')) return '🎃';
  if (c.includes('blueberry') || c.includes('raspberry')) return '🫐';
  return '🌿';
};

export default function PredictionCard({ prediction, uploadedImage, fileName = "tomato_leaf.jpg", fileSize = "2.4 MB" }) {
  const [showLightbox, setShowLightbox] = useState(false);

  const cropName = prediction?.cropName || 'Tomato';
  const diseaseName = prediction?.diseaseName || 'Early Blight';
  const pathogen = prediction?.pathogen || 'Alternaria solani';
  const confidence = prediction?.confidencePercent
    ? prediction.confidencePercent
    : (prediction?.confidence != null
        ? (typeof prediction.confidence === 'number' && prediction.confidence <= 1
            ? `${(prediction.confidence * 100).toFixed(1)}%`
            : `${prediction.confidence}%`)
        : '87.3%');
  const message = prediction?.message || 'The uploaded leaf shows clear symptoms of Early Blight.';

  // Default fallback leaf image if none provided yet
  const displayImage =
    uploadedImage ||
    'https://images.unsplash.com/photo-1592417817098-8f3d6910985c?auto=format&fit=crop&w=800&q=80';

  return (
    <>
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          {/* Left inner: Image Specimen container (approx 6 cols) */}
          <div className="md:col-span-6 flex flex-col">
            <div className="relative w-full h-52 sm:h-56 rounded-xl overflow-hidden bg-gray-100 border border-gray-100 group">
              <img
                src={displayImage}
                alt="Uploaded leaf specimen"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <button
                type="button"
                onClick={() => setShowLightbox(true)}
                className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm transition-all"
                title="Expand image"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Bottom file metadata row */}
            <div className="flex items-center justify-between mt-3 text-xs">
              <div>
                <p className="font-bold text-gray-800">{fileName}</p>
                <p className="text-[11px] text-gray-400">{fileSize}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowLightbox(true)}
                className="px-3 py-1 rounded-lg border border-gray-200 hover:border-emerald-500 hover:text-emerald-700 text-xs font-semibold text-gray-700 transition-colors"
              >
                View Full Image
              </button>
            </div>
          </div>

          {/* Right inner: Diagnostic Details (approx 6 cols) */}
          <div className="md:col-span-6 flex flex-col justify-between space-y-3.5">
            {/* Crop */}
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center text-lg flex-shrink-0">
                {getCropEmoji(cropName)}
              </div>
              <div>
                <p className="text-[11px] text-gray-400 font-medium leading-none">Crop</p>
                <p className="text-base font-extrabold text-gray-900 mt-0.5">{cropName}</p>
              </div>
            </div>

            {/* Detected Disease */}
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <Leaf className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] text-gray-400 font-medium leading-none">Detected Disease</p>
                <p className="text-base font-extrabold text-gray-900 mt-0.5">{diseaseName}</p>
                {pathogen && <p className="text-xs text-gray-400 font-medium">({pathogen})</p>}
              </div>
            </div>

            {/* Model Confidence */}
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <BarChart2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] text-gray-400 font-medium leading-none">Model Confidence</p>
                <p className="text-base font-extrabold text-gray-900 mt-0.5">{confidence}</p>
              </div>
            </div>

            {/* Disease Detected Callout Box */}
            <div className="p-3 rounded-xl bg-red-50/60 border border-red-100 flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertCircle className="w-3 h-3" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-red-700 leading-tight">Disease Detected</p>
                <p className="text-[11px] text-gray-600 mt-0.5 leading-snug">{message}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full Lightbox */}
      {showLightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowLightbox(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setShowLightbox(false)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 p-1"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={displayImage}
              alt="Full specimen preview"
              className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  );
}
