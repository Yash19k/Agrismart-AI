import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  RefreshCw,
  Download,
  AlertTriangle,
  ShieldAlert,
  ArrowLeft,
  CloudSun,
  Droplets,
  Calendar,
  BarChart2,
  Check
} from 'lucide-react';

import '../styles/disease.css';

import AppSidebar from '../components/common/AppSidebar';
import AppHeader from '../components/common/AppHeader';
import { useAuth } from '../context/AuthContext';

// Service & PDF generator
import { analyzeDisease } from '../services/diseaseService';
import { generateDiseasePdfReport } from '../services/reportGenerator';

// Subcomponents for Workflow States
import ImageUpload from '../components/disease/ImageUpload';
import ImagePreview from '../components/disease/ImagePreview';
import AnalysisLoader from '../components/disease/AnalysisLoader';

// Botanical helper for scientific names
function getScientificCrop(crop) {
  const c = (crop || '').toLowerCase();
  if (c.includes('tomato')) return 'Solanum lycopersicum';
  if (c.includes('potato')) return 'Solanum tuberosum';
  if (c.includes('corn') || c.includes('maize')) return 'Zea mays';
  if (c.includes('grape')) return 'Vitis vinifera';
  if (c.includes('apple')) return 'Malus domestica';
  if (c.includes('cotton')) return 'Gossypium hirsutum';
  if (c.includes('strawberry')) return 'Fragaria × ananassa';
  if (c.includes('pepper') || c.includes('bell')) return 'Capsicum annuum';
  if (c.includes('rice')) return 'Oryza sativa';
  if (c.includes('wheat')) return 'Triticum aestivum';
  if (c.includes('soybean')) return 'Glycine max';
  return '';
}

// Helper for infection classification
function getInfectionType(disease, category) {
  if (category) return category;
  const d = (disease || '').toLowerCase();
  if (d.includes('bacterial') || (d.includes('spot') && !d.includes('leaf spot'))) {
    return 'Foliar Bacterial';
  }
  if (
    d.includes('blight') ||
    d.includes('rust') ||
    d.includes('mildew') ||
    d.includes('scab') ||
    d.includes('rot')
  ) {
    return 'Foliar Fungal';
  }
  if (d.includes('virus') || d.includes('mosaic') || d.includes('curl')) {
    return 'Viral Pathology';
  }
  if (d.includes('healthy')) return 'Normal Foliage';
  return 'Foliar Infection';
}

// Helper for causal agent
function getCausalAgent(pathogen, disease) {
  if (pathogen) return pathogen;
  const d = (disease || '').toLowerCase();
  if (d.includes('bacterial')) return 'Gram-negative bacterium';
  if (d.includes('blight') || d.includes('rust') || d.includes('rot')) return 'Fungal Pathogen';
  if (d.includes('virus')) return 'Plant Viral Agent';
  if (d.includes('healthy')) return 'None (Healthy Specimen)';
  return 'Identified Microorganism';
}

// Helper for urgency
function getActionRequired(severityLevel) {
  const s = (severityLevel || '').toLowerCase();
  if (s.includes('high') || s.includes('severe')) return 'Immediate';
  if (s.includes('mod')) return 'Targeted Action';
  if (s.includes('none') || s.includes('healthy')) return 'Routine Monitoring';
  return 'Preventive';
}

export default function DiseaseDetectionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Workflow states: 'upload' | 'preview' | 'loading' | 'error' | 'result'
  const [stage, setStage] = useState('upload');
  const [selectedFile, setSelectedFile] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Generate & download PDF report
  const handleDownloadReport = () => {
    if (!analysisResult) return;
    try {
      setDownloading(true);
      generateDiseasePdfReport(analysisResult);
    } catch (err) {
      console.error('Failed to generate PDF report:', err);
      alert('Could not generate PDF report. Please try again.');
    } finally {
      setTimeout(() => setDownloading(false), 600);
    }
  };

  // Upload handler
  const handleImageSelected = (file) => {
    setSelectedFile(file);
    setErrorMessage('');
    setStage('preview');
  };

  // Run deep learning inference via existing backend API
  const handleStartAnalysis = async () => {
    if (!selectedFile) return;
    setStage('loading');
    setErrorMessage('');
    try {
      const result = await analyzeDisease(selectedFile);
      setAnalysisResult(result);
      setStage('result');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Disease detection error:', err);
      setErrorMessage(
        err.message || "We couldn't analyze this image. Please try another clear leaf image."
      );
      setStage('error');
    }
  };

  // Reset to upload state
  const handleAnalyzeAnother = () => {
    setSelectedFile(null);
    setAnalysisResult(null);
    setErrorMessage('');
    setStage('upload');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Derived values for diagnostic report
  const prediction = analysisResult?.prediction || {};
  const cropName = prediction.cropName || 'Crop';
  const scientificCrop = prediction.scientificCrop || getScientificCrop(cropName);
  const diseaseName = prediction.diseaseName || 'Condition Detected';
  const confidence =
    typeof prediction.confidence === 'number'
      ? prediction.confidence.toFixed(1)
      : parseFloat(prediction.confidence) || 0;
  const pathogen = prediction.pathogen || '';
  const severity = analysisResult?.severity || {};
  const severityLevel = severity.level || (prediction.isHealthy ? 'None' : 'Moderate');
  const severityExplanation =
    severity.explanation ||
    (prediction.isHealthy
      ? 'No pathogenic foliar lesions detected. Leaf tissue structure is vigorous.'
      : 'Observed necrotic lesion coverage is present across the leaf blade surface area.');
  const spreadRisk = analysisResult?.spreadRisk || {};
  const spreadRiskLevel = spreadRisk.level || (prediction.isHealthy ? 'Low' : 'High');
  const spreadRiskExplanation =
    spreadRisk.explanation ||
    'Ambient humidity and temperature favor microbial development across the crop canopy.';
  const weather = analysisResult?.weather || {};
  const diseaseInfo = analysisResult?.diseaseInformation || {};
  const symptoms = analysisResult?.symptoms || [];
  const possibleCauses = analysisResult?.possibleCauses || [];
  const irrigation = analysisResult?.irrigationAdvice || {};
  const actionTimeline = analysisResult?.actionTimeline || {};
  const confidenceBreakdown = analysisResult?.confidenceBreakdown || [];

  const infectionType = getInfectionType(diseaseName, diseaseInfo.category);
  const causalAgent = getCausalAgent(pathogen, diseaseName);
  const actionRequired = getActionRequired(severityLevel);

  // Diagnostic assessment text
  const assessmentText =
    prediction.isHealthy
      ? `Foliar analysis confirmed healthy crop tissue with ${confidence}% model confidence. Continue standard preventive agronomic practices and maintain regular field scouting.`
      : `${diseaseName} confirmed in foliar tissue with ${confidence}% model confidence. ${
          prediction.message ||
          'Prompt sanitation and targeted foliar treatment advised to prevent secondary inoculum spread across the crop canopy.'
        }`;

  return (
    <div className="flex min-h-screen bg-[#f6fbf8] text-[#193229] font-sans antialiased selection:bg-[#b2ebd0] selection:text-[#0b231c]">
      {/* Unified AgriSmart Sidebar */}
      <AppSidebar
        activeItem="disease"
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Unified Top Navigation Header */}
        <AppHeader
          moduleId="disease"
          title="AI Crop Disease Detection"
          subtitle="Instant leaf pathology diagnosis & agronomic prescription"
          onMenuClick={() => setMobileSidebarOpen(true)}
          badgeText="Vision ML Active"
          badgeType="emerald"
          rightActions={
            stage === 'result' && analysisResult ? (
              <button
                type="button"
                onClick={handleDownloadReport}
                disabled={downloading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1b4d3e] hover:bg-[#133a2f] text-white text-xs font-semibold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                title="Download Agronomic PDF Report"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{downloading ? 'Exporting...' : 'Export PDF'}</span>
              </button>
            ) : null
          }
        />

        {/* Page Main Content */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-7">
          {/* Breadcrumb & Editorial Section Title (For States 1, 2, 3, Error) */}
          {stage !== 'result' && (
            <div className="space-y-2">
              <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-medium text-[#5c8573]">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="hover:text-[#113329] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Home</span>
                </button>
                <span className="text-[#9ec4b0]">›</span>
                <span className="text-[#1b4d3e] font-semibold">Disease Detection</span>
              </nav>

              <div className="pt-1 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                  <h1 className="font-editorial text-4xl sm:text-5xl text-[#113329] font-normal tracking-tight">
                    AI Crop Disease <span className="italic font-normal text-[#1b4d3e]">Detection</span>
                  </h1>
                  <p className="text-sm sm:text-base text-[#4d7362] max-w-2xl mt-1.5 font-sans leading-relaxed">
                    Upload a crop leaf image and receive an AI-assisted disease assessment with evidence-backed agronomic guidance.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════ */}
          {/* STATE 1: EMPTY UPLOAD SCREEN                                 */}
          {/* ═════════════════════════════════════════════════════════════ */}
          {stage === 'upload' && (
            <div className="w-full">
              <ImageUpload onImageSelected={handleImageSelected} />
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════ */}
          {/* STATE 3: IMAGE SELECTED & READY FOR ANALYSIS                */}
          {/* ═════════════════════════════════════════════════════════════ */}
          {stage === 'preview' && selectedFile && (
            <div className="w-full">
              <ImagePreview
                file={selectedFile}
                onRemove={() => {
                  setSelectedFile(null);
                  setStage('upload');
                }}
                onReplace={handleImageSelected}
                onAnalyze={handleStartAnalysis}
              />
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════ */}
          {/* STATE 2: ANALYZING SCREEN                                    */}
          {/* ═════════════════════════════════════════════════════════════ */}
          {stage === 'loading' && (
            <div className="w-full max-w-2xl mx-auto py-4">
              <AnalysisLoader
                file={selectedFile}
                onCancel={() => setStage('preview')}
              />
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════ */}
          {/* ERROR STATE                                                  */}
          {/* ═════════════════════════════════════════════════════════════ */}
          {stage === 'error' && (
            <div className="max-w-2xl mx-auto py-8">
              <div className="bg-white rounded-3xl p-8 sm:p-10 border border-red-200 shadow-editorial text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-50 text-[#c95a5a] flex items-center justify-center mx-auto mb-4 border border-red-100">
                  <ShieldAlert className="w-8 h-8 stroke-[1.8]" />
                </div>
                <h3 className="font-editorial text-2xl font-bold text-[#113329] mb-2">
                  Analysis Could Not Complete
                </h3>
                <p className="text-xs sm:text-sm text-[#527d6a] mb-6 max-w-md mx-auto leading-relaxed">
                  {errorMessage ||
                    "We couldn't analyze this image. Please try another clear leaf photograph with good lighting."}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleStartAnalysis}
                    className="px-5 py-2.5 rounded-xl bg-[#1b4d3e] hover:bg-[#133a2f] text-white text-xs font-semibold transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Analysis</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setErrorMessage('');
                      setStage('upload');
                    }}
                    className="px-5 py-2.5 rounded-xl border border-[#d3ebd9] hover:bg-[#f2fbf5] text-[#113329] text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Choose Another Image</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════ */}
          {/* STATE 4: COMPLETED DIAGNOSTIC REPORT (Stitch Analysis Design)*/}
          {/* ═════════════════════════════════════════════════════════════ */}
          {stage === 'result' && analysisResult && (
            <div className="space-y-6">
              {/* Report Header */}
              <div className="border-b border-[#DCE8DF] pb-5">
                <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-medium text-[#5c8573] mb-2">
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard')}
                    className="hover:text-[#113329] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Home className="w-3.5 h-3.5" />
                    <span>Home</span>
                  </button>
                  <span className="text-[#9ec4b0]">›</span>
                  <span className="text-[#1b4d3e] font-semibold">Disease Detection</span>
                </nav>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6C7D76] mb-1">
                  Crop Health Report
                </p>
                <h1 className="font-editorial text-3xl md:text-4xl font-bold text-[#16352D] tracking-tight">
                  AI Crop Disease Detection
                </h1>
                <p className="text-xs md:text-sm text-[#6C7D76] mt-1">
                  Comprehensive pathology analysis and evidence-backed agronomic guidance for your crop specimen.
                </p>
              </div>

              {/* ── MAIN DIAGNOSIS CARD (Two Columns) ── */}
              <div className="bg-white border border-[#DCE8DF] rounded-2xl p-6 md:p-8 shadow-editorial">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Left: Specimen Preview & Actions */}
                  <div className="lg:col-span-5 space-y-3.5">
                    <div className="relative rounded-xl overflow-hidden border border-[#DCE8DF] bg-[#F7FAF8] aspect-[4/3] flex items-center justify-center">
                      <img
                        src={analysisResult.uploadedImage || (selectedFile ? URL.createObjectURL(selectedFile) : '')}
                        alt={`Analyzed ${cropName} specimen`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2.5 left-2.5 bg-black/70 text-white text-[10px] px-2.5 py-0.5 rounded-md font-mono backdrop-blur-xs">
                        {analysisResult.fileName || 'Specimen'} · {analysisResult.fileSize || 'Standard'}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={handleAnalyzeAnother}
                        className="inline-flex items-center justify-center gap-2 flex-1 px-4 py-2.5 bg-[#1b4d3e] hover:bg-[#133a2f] active:bg-[#0c261e] text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Analyze Another Crop</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadReport}
                        disabled={downloading}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-[#1b4d3e] text-[#1b4d3e] hover:bg-[#ecfef3] rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Download className="w-3.5 h-3.5 text-[#1b4d3e]" />
                        <span>{downloading ? 'Exporting...' : 'Download Report'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Right: Editorial Pathology Details */}
                  <div className="lg:col-span-7 space-y-4">
                    {/* CROP */}
                    <div>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-[#6C7D76]">
                        Crop
                      </span>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-base font-semibold text-[#16352D]">{cropName}</span>
                        {scientificCrop && (
                          <span className="text-xs text-[#6C7D76] italic font-serif">
                            ({scientificCrop})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-[#DCE8DF]" />

                    {/* DISEASE */}
                    <div>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-[#6C7D76]">
                        Disease
                      </span>
                      <h2 className="font-editorial text-3xl md:text-4xl font-bold text-[#16352D] leading-none mt-1">
                        {diseaseName}
                      </h2>

                      {/* Model Confidence Bar */}
                      <div className="mt-3 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C7D76]">
                            Model Confidence
                          </span>
                          <span className="font-mono text-xs font-bold text-[#1b4d3e]">
                            {confidence}%
                          </span>
                        </div>
                        <div className="w-full bg-[#EAF5EE] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-[#1b4d3e] h-1.5 rounded-full transition-all duration-700"
                            style={{ width: `${Math.min(100, Math.max(0, confidence))}%` }}
                          />
                        </div>
                      </div>

                      {/* Pathogen */}
                      {pathogen && (
                        <p className="text-xs text-[#6C7D76] mt-2 font-serif">
                          Pathogen:{' '}
                          <span className="italic font-semibold text-[#16352D]">
                            {pathogen}
                          </span>
                        </p>
                      )}
                    </div>

                    {/* Diagnostic Assessment Note */}
                    <div className="p-3.5 rounded-xl bg-[#EAF5EE] border border-[#DCE8DF] text-xs text-[#16352D] leading-relaxed">
                      <strong className="font-semibold text-[#1b4d3e]">Diagnostic Assessment:</strong>{' '}
                      {assessmentText}
                    </div>

                    {/* Metadata Row */}
                    <div className="pt-2 border-t border-[#DCE8DF] flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-[#6C7D76]">
                      <div>
                        <strong className="font-medium text-[#16352D]">Infection Type:</strong>{' '}
                        {infectionType}
                      </div>
                      <span className="text-[#DCE8DF]">|</span>
                      <div>
                        <strong className="font-medium text-[#16352D]">Causal Agent:</strong>{' '}
                        {causalAgent}
                      </div>
                      <span className="text-[#DCE8DF]">|</span>
                      <div>
                        <strong className="font-medium text-[#16352D]">Action Required:</strong>{' '}
                        <span
                          className={`font-semibold ${
                            actionRequired === 'Immediate'
                              ? 'text-[#C95A5A]'
                              : actionRequired === 'Targeted Action'
                              ? 'text-[#C48A20]'
                              : 'text-[#1b4d3e]'
                          }`}
                        >
                          {actionRequired}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Severity & Spread Risk Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-5 mt-5 border-t border-[#DCE8DF]">
                  <div className="p-4 rounded-xl border border-[#DCE8DF] bg-[#F7F8F3]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-[#16352D] uppercase tracking-wider text-[11px]">
                        Disease Severity
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                          severityLevel.toLowerCase().includes('high') ||
                          severityLevel.toLowerCase().includes('severe')
                            ? 'text-[#C95A5A] bg-[#FDF2F2] border-[#F8D7D7]'
                            : severityLevel.toLowerCase().includes('mod')
                            ? 'text-[#C48A20] bg-[#FDF8EC] border-[#F4E3BF]'
                            : 'text-[#1b4d3e] bg-[#EAF5EE] border-[#DCE8DF]'
                        }`}
                      >
                        {severityLevel}
                      </span>
                    </div>
                    <p className="text-xs text-[#6C7D76] leading-relaxed">
                      {severityExplanation}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-[#DCE8DF] bg-[#F7F8F3]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-[#16352D] uppercase tracking-wider text-[11px]">
                        Disease Spread Risk
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                          spreadRiskLevel.toLowerCase().includes('high')
                            ? 'text-[#C95A5A] bg-[#FDF2F2] border-[#F8D7D7]'
                            : spreadRiskLevel.toLowerCase().includes('med')
                            ? 'text-[#C48A20] bg-[#FDF8EC] border-[#F4E3BF]'
                            : 'text-[#1b4d3e] bg-[#EAF5EE] border-[#DCE8DF]'
                        }`}
                      >
                        {spreadRiskLevel}
                      </span>
                    </div>
                    <p className="text-xs text-[#6C7D76] leading-relaxed">
                      {spreadRiskExplanation}
                    </p>
                  </div>
                </div>
              </div>

              {/* ── FIELD MICROCLIMATE TELEMETRY ── */}
              <div className="bg-white border border-[#DCE8DF] rounded-2xl p-5 md:p-6 shadow-editorial">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#DCE8DF] gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <CloudSun className="w-4 h-4 text-[#1b4d3e]" />
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#16352D]">
                      Field Microclimate Telemetry
                    </h3>
                  </div>
                  <span className="text-[11px] text-[#6C7D76]">
                    Atmospheric Data: {weather.source || 'Open-Meteo API'} · Updated {weather.lastUpdated || 'Live'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 text-center">
                  {/* Temperature */}
                  <div className="p-3.5 rounded-xl bg-[#F7F8F3] border border-[#DCE8DF]/70">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6C7D76]">
                      Temperature
                    </span>
                    <p className="text-xl font-bold text-[#16352D] mt-1 font-mono">
                      {weather.temperature != null ? `${weather.temperature}°C` : '26.4°C'}
                    </p>
                    <span className="text-[10px] text-[#527d6a]">Ambient Field</span>
                  </div>

                  {/* Relative Humidity */}
                  <div className="p-3.5 rounded-xl bg-[#F7F8F3] border border-[#DCE8DF]/70">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6C7D76]">
                      Relative Humidity
                    </span>
                    <p className="text-xl font-bold text-[#16352D] mt-1 font-mono">
                      {weather.humidity != null ? `${weather.humidity}%` : '78%'}
                    </p>
                    <span className="text-[10px] text-[#527d6a]">Canopy moisture</span>
                  </div>

                  {/* Rain Probability */}
                  <div className="p-3.5 rounded-xl bg-[#F7F8F3] border border-[#DCE8DF]/70">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6C7D76]">
                      Rain Probability
                    </span>
                    <p className="text-xl font-bold text-[#16352D] mt-1 font-mono">
                      {weather.rainProbability != null ? `${weather.rainProbability}%` : '45%'}
                    </p>
                    <span className="text-[10px] text-[#527d6a]">Next 24 hours</span>
                  </div>

                  {/* Precipitation */}
                  <div className="p-3.5 rounded-xl bg-[#F7F8F3] border border-[#DCE8DF]/70">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6C7D76]">
                      Expected Rainfall
                    </span>
                    <p className="text-xl font-bold text-[#16352D] mt-1 font-mono">
                      {weather.rainfall != null ? `${weather.rainfall} mm` : '0.5 mm'}
                    </p>
                    <span className="text-[10px] text-[#527d6a]">Accumulated</span>
                  </div>
                </div>
              </div>

              {/* ── DISEASE INFORMATION & DIAGNOSTIC MARKERS ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: About Disease */}
                <div className="bg-white border border-[#DCE8DF] rounded-2xl p-6 shadow-editorial flex flex-col justify-between">
                  <div>
                    <h3 className="font-editorial text-xl font-bold text-[#16352D] mb-2.5">
                      About {diseaseName}
                    </h3>
                    <p className="text-xs text-[#6C7D76] leading-relaxed">
                      {diseaseInfo.description ||
                        `${diseaseName} is a foliar pathology that penetrates crop tissue through stomata and surface abrasions, developing rapidly in high relative humidity. It can reduce photosynthetic efficiency and harvest yield if left unchecked.`}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-4 mt-4 border-t border-[#DCE8DF] text-[11px]">
                    <span className="px-2.5 py-1 rounded-md bg-[#F7F8F3] text-[#16352D] border border-[#DCE8DF]">
                      {diseaseInfo.category || 'Pathology Classification'}
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-[#F7F8F3] text-[#16352D] border border-[#DCE8DF]">
                      Humidity Vector
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-[#F7F8F3] text-[#16352D] border border-[#DCE8DF]">
                      Foliar Tissue
                    </span>
                  </div>
                </div>

                {/* Right: Diagnostic Markers & Etiology */}
                <div className="bg-white border border-[#DCE8DF] rounded-2xl p-6 shadow-editorial space-y-4">
                  <h3 className="font-editorial text-xl font-bold text-[#16352D]">
                    Diagnostic Markers &amp; Etiology
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    {/* Common Symptoms */}
                    <div className="space-y-2.5">
                      <h4 className="font-bold text-[#16352D] text-[10px] uppercase tracking-wider">
                        Common Symptoms
                      </h4>
                      <ul className="space-y-2 text-[#6C7D76]">
                        {(symptoms.length > 0
                          ? symptoms
                          : [
                              'Small water-soaked lesions turning dark brown or black',
                              'Yellow chlorotic halos surrounding irregular leaf spots',
                              'Foliar necrosis and premature leaf drop on lower canopy',
                            ]
                        ).map((symptom, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-[#1b4d3e] font-bold leading-tight">✓</span>
                            <span>{typeof symptom === 'string' ? symptom : symptom.title}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Possible Causes */}
                    <div className="space-y-2.5">
                      <h4 className="font-bold text-[#16352D] text-[10px] uppercase tracking-wider">
                        Possible Causes
                      </h4>
                      <ul className="space-y-2 text-[#6C7D76]">
                        {(possibleCauses.length > 0
                          ? possibleCauses
                          : [
                              'Driving rain and overhead splash dispersal from infected foliage',
                              'Pathogen survival in crop residues and host weeds',
                              'Prolonged leaf wetness exceeding 6–8 hours',
                            ]
                        ).map((cause, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-[#1b4d3e] font-bold leading-tight">✓</span>
                            <span>{typeof cause === 'string' ? cause : cause.title}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── IRRIGATION ADVISORY BOX ── */}
              <div className="bg-[#EAF5EE] border border-[#DCE8DF] rounded-2xl p-6 shadow-editorial">
                <div className="flex items-center gap-2 mb-2.5">
                  <Droplets className="w-4 h-4 text-[#1b4d3e]" />
                  <h3 className="font-editorial text-xl font-bold text-[#16352D]">
                    Irrigation Advisory
                  </h3>
                </div>

                <p className="text-xs text-[#16352D] mb-3.5 leading-relaxed">
                  <strong className="font-semibold text-[#1b4d3e]">
                    Primary Protocol: {irrigation.method || 'Root-Zone Drip Watering'}
                  </strong>{' '}
                  — {irrigation.recommendation || 'Avoid overhead sprinkler spray to keep foliage dry and suppress pathogen splash transmission.'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-[#6C7D76]">
                  <div className="flex items-start gap-2">
                    <span className="text-[#1b4d3e] font-bold">✓</span>
                    <span>Avoid overhead sprinkler irrigation entirely during active disease phase</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#1b4d3e] font-bold">✓</span>
                    <span>Use drip line delivery directly at the root zone in early morning</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#1b4d3e] font-bold">✓</span>
                    <span>Check tensiometer or soil moisture before irrigating</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#1b4d3e] font-bold">✓</span>
                    <span>Resume standard watering cycle once ambient humidity decreases</span>
                  </div>
                </div>
              </div>

              {/* ── RECOMMENDED ACTION PLAN (Agronomist Memo Style) ── */}
              <div className="bg-white border border-[#DCE8DF] rounded-2xl p-6 shadow-editorial space-y-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#1b4d3e]" />
                  <h3 className="font-editorial text-xl font-bold text-[#16352D]">
                    Recommended Action Plan
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  {/* Today */}
                  <div className="p-4 rounded-xl border border-[#DCE8DF] bg-[#F7F8F3] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-[#DCE8DF]">
                        <span className="font-bold text-[#16352D]">Today</span>
                        <span className="text-[10px] font-semibold text-[#C95A5A] bg-[#FDF2F2] border border-[#F8D7D7] px-2 py-0.5 rounded">
                          High Priority
                        </span>
                      </div>
                      <ul className="space-y-2 text-[#6C7D76] pt-3">
                        {(actionTimeline.today?.length > 0
                          ? actionTimeline.today
                          : [
                              'Remove infected leaves and sanitize cutting shears',
                              'Inspect adjacent rows for secondary symptoms',
                              'Halt overhead sprinkler watering',
                            ]
                        ).map((item, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-[#16352D] font-bold">•</span>
                            <span>{typeof item === 'string' ? item : item.task}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Next 24 Hours */}
                  <div className="p-4 rounded-xl border border-[#DCE8DF] bg-[#F7F8F3] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-[#DCE8DF]">
                        <span className="font-bold text-[#16352D]">Next 24 Hours</span>
                        <span className="text-[10px] font-semibold text-[#C48A20] bg-[#FDF8EC] border border-[#F4E3BF] px-2 py-0.5 rounded">
                          Medium Priority
                        </span>
                      </div>
                      <ul className="space-y-2 text-[#6C7D76] pt-3">
                        {(actionTimeline.next24Hours?.length > 0
                          ? actionTimeline.next24Hours
                          : [
                              'Monitor crop for new chlorotic leaf spots',
                              'Track canopy humidity and leaf wetness',
                              'Improve plant row air circulation',
                            ]
                        ).map((item, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-[#16352D] font-bold">•</span>
                            <span>{typeof item === 'string' ? item : item.task}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Next 3 Days */}
                  <div className="p-4 rounded-xl border border-[#DCE8DF] bg-[#F7F8F3] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-[#DCE8DF]">
                        <span className="font-bold text-[#16352D]">Next 3 Days</span>
                        <span className="text-[10px] font-semibold text-[#C48A20] bg-[#FDF8EC] border border-[#F4E3BF] px-2 py-0.5 rounded">
                          Medium Priority
                        </span>
                      </div>
                      <ul className="space-y-2 text-[#6C7D76] pt-3">
                        {(actionTimeline.next3Days?.length > 0
                          ? actionTimeline.next3Days
                          : [
                              'Apply copper hydroxide or authorized bio-fungicide',
                              'Track disease spread with daily visual checks',
                              'Review weather forecast for precipitation',
                            ]
                        ).map((item, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-[#16352D] font-bold">•</span>
                            <span>{typeof item === 'string' ? item : item.task}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Next Week */}
                  <div className="p-4 rounded-xl border border-[#DCE8DF] bg-[#F7F8F3] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-[#DCE8DF]">
                        <span className="font-bold text-[#16352D]">Next Week</span>
                        <span className="text-[10px] font-semibold text-[#1b4d3e] bg-[#EAF5EE] border border-[#DCE8DF] px-2 py-0.5 rounded">
                          Low Priority
                        </span>
                      </div>
                      <ul className="space-y-2 text-[#6C7D76] pt-3">
                        {(actionTimeline.nextWeek?.length > 0
                          ? actionTimeline.nextWeek
                          : [
                              'Reassess overall crop vigor & new foliar growth',
                              'Re-upload specimen photograph for model re-check',
                              'Maintain preventive sanitation schedule',
                            ]
                        ).map((item, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-[#16352D] font-bold">•</span>
                            <span>{typeof item === 'string' ? item : item.task}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── PREDICTION CONFIDENCE BREAKDOWN ── */}
              <div className="bg-white border border-[#DCE8DF] rounded-2xl p-6 shadow-editorial">
                <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-[#DCE8DF]">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-[#1b4d3e]" />
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#16352D]">
                      Prediction Confidence Breakdown
                    </h3>
                  </div>
                  <span className="text-[11px] text-[#6C7D76]">
                    Multi-class Vision Classifier
                  </span>
                </div>

                <div className="space-y-3 pt-1">
                  {(confidenceBreakdown.length > 0
                    ? confidenceBreakdown
                    : [
                        {
                          disease: `${cropName} — ${diseaseName}`,
                          probability: confidence,
                          isTarget: true,
                        },
                      ]
                  ).map((item, idx) => {
                    const prob =
                      typeof item.probability === 'number'
                        ? item.probability.toFixed(1)
                        : item.probability;
                    const isTarget = item.isTarget || idx === 0;

                    return (
                      <div
                        key={idx}
                        className="grid grid-cols-12 items-center gap-3 text-xs"
                      >
                        <span
                          className={`col-span-5 sm:col-span-4 truncate ${
                            isTarget ? 'font-semibold text-[#16352D]' : 'text-[#6C7D76]'
                          }`}
                        >
                          {item.disease}
                        </span>
                        <div className="col-span-5 sm:col-span-7 bg-[#EAF5EE] h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${
                              isTarget ? 'bg-[#1b4d3e]' : 'bg-[#6C7D76]/60'
                            }`}
                            style={{
                              width: `${Math.min(100, Math.max(0, parseFloat(prob) || 0))}%`,
                            }}
                          />
                        </div>
                        <span
                          className={`col-span-2 sm:col-span-1 text-right font-mono font-bold ${
                            isTarget ? 'text-[#16352D]' : 'text-[#6C7D76]'
                          }`}
                        >
                          {prob}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Actions Row */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="px-4 py-2.5 rounded-xl border border-[#DCE8DF] hover:bg-white text-[#527d6a] hover:text-[#113329] text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Dashboard</span>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleDownloadReport}
                    disabled={downloading}
                    className="px-4 py-2.5 rounded-xl border border-[#1b4d3e] text-[#1b4d3e] hover:bg-[#ecfef3] text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5 text-[#1b4d3e]" />
                    <span>{downloading ? 'Generating PDF...' : 'Download Report (PDF)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAnalyzeAnother}
                    className="px-5 py-2.5 rounded-xl bg-[#1b4d3e] hover:bg-[#133a2f] text-white text-xs font-semibold transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Analyze Another Crop</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
