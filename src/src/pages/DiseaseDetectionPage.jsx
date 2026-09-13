import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  MapPin,
  Sprout,
  ShieldAlert,
  Settings,
  Bell,
  ChevronDown,
  ArrowLeft,
  RefreshCw,
  Home,
  CheckCircle2,
  Calendar,
  Leaf,
  Menu,
  X,
  Download
} from 'lucide-react';

import '../styles/disease.css';

import AppSidebar from '../components/common/AppSidebar';
import AppHeader from '../components/common/AppHeader';
import { useAuth } from '../context/AuthContext';

// Demo data, service & PDF generator
import { diseaseDemoResult } from '../data/diseaseDemoData';
import { analyzeDisease } from '../services/diseaseService';
import { generateDiseasePdfReport } from '../services/reportGenerator';

// Result components
import ImageUpload from '../components/disease/ImageUpload';
import ImagePreview from '../components/disease/ImagePreview';
import AnalysisLoader from '../components/disease/AnalysisLoader';
import PredictionCard from '../components/disease/PredictionCard';
import SeverityIndicator from '../components/disease/SeverityIndicator';
import SpreadRiskCard from '../components/disease/SpreadRiskCard';
import WeatherIntelligence from '../components/disease/WeatherIntelligence';
import DiseaseInformation from '../components/disease/DiseaseInformation';
import SymptomsList from '../components/disease/SymptomsList';
import CausesList from '../components/disease/CausesList';
import DiseaseForecast from '../components/disease/DiseaseForecast';
import IrrigationAdvice from '../components/disease/IrrigationAdvice';
import ActionTimeline from '../components/disease/ActionTimeline';
import AgronomistSummary from '../components/disease/AgronomistSummary';
import ConfidenceBreakdown from '../components/disease/ConfidenceBreakdown';
import AgriSmartAgronomistCard from '../components/assistant/AgriSmartAgronomistCard';

export default function DiseaseDetectionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const farmerName = user?.name || 'Farmer';
  const initial = farmerName.charAt(0).toUpperCase();

  // Always show upload image first as requested
  const [stage, setStage] = useState('upload');
  const [selectedFile, setSelectedFile] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const handleOpenAssistant = (query = null) => {
    navigate('/assistant', {
      state: {
        assessmentContext: analysisResult,
        initialQuery: query,
      },
    });
  };

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
    setStage('preview');
  };

  // Run analysis simulation
  const handleStartAnalysis = async () => {
    if (!selectedFile) return;
    setStage('loading');
    try {
      const result = await analyzeDisease(selectedFile);
      setAnalysisResult(result || diseaseDemoResult);
      setStage('result');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      // Fallback to sample analysis so the farmer always sees actionable results
      setAnalysisResult(diseaseDemoResult);
      setStage('result');
    }
  };

  // Reset to upload state
  const handleAnalyzeAnother = () => {
    setSelectedFile(null);
    setAnalysisResult(null);
    setStage('upload');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex min-h-screen bg-[#f8faf8] text-[#17231B] font-sans antialiased">
      {/* Unified Sidebar */}
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                title="Download Agronomic PDF Report"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{downloading ? 'Exporting...' : 'Export PDF'}</span>
              </button>
            ) : null
          }
        />

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-7 max-w-7xl w-full mx-auto space-y-5">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400 font-semibold">
            <Home
              onClick={() => navigate('/dashboard')}
              className="w-3.5 h-3.5 hover:text-emerald-700 cursor-pointer"
            />
            <span>›</span>
            <span className="text-emerald-800 font-bold">Disease Detection</span>
          </div>

          {/* Page Title & Top CTA Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                AI Crop Disease Detection
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5 font-normal">
                Upload a leaf image and get instant AI-powered analysis with personalized recommendations.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              {stage === 'result' && (
                <>
                  <button
                    type="button"
                    onClick={handleDownloadReport}
                    disabled={downloading}
                    className="px-4 py-2.5 rounded-xl border border-emerald-200 bg-white hover:bg-emerald-50 text-emerald-800 text-xs font-bold transition-all shadow-xs active:scale-95 flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{downloading ? 'Generating PDF...' : 'Download Report'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAnalyzeAnother}
                    className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-2 w-fit cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Analyze Another Image</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 3-Step Indicator Bar */}
          <div className="flex items-center justify-center py-2 max-w-md mx-auto">
            {/* Step 1 */}
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center shadow-xs transition-colors ${
                  stage === 'upload'
                    ? 'bg-emerald-800 text-white ring-2 ring-emerald-300'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                1
              </div>
              <span className={`text-xs font-bold ${stage === 'upload' ? 'text-emerald-900 font-extrabold' : 'text-gray-700'}`}>
                Upload Image
              </span>
            </div>

            <div
              className={`w-12 sm:w-20 h-0.5 mx-2 sm:mx-3 transition-colors ${
                stage !== 'upload' ? 'bg-emerald-500' : 'bg-gray-200'
              }`}
            />

            {/* Step 2 */}
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center shadow-xs transition-colors ${
                  stage === 'preview' || stage === 'loading'
                    ? 'bg-emerald-800 text-white ring-2 ring-emerald-300'
                    : stage === 'result'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                2
              </div>
              <span
                className={`text-xs font-bold ${
                  stage === 'preview' || stage === 'loading'
                    ? 'text-emerald-900 font-extrabold'
                    : 'text-gray-600'
                }`}
              >
                Analyze
              </span>
            </div>

            <div
              className={`w-12 sm:w-20 h-0.5 mx-2 sm:mx-3 transition-colors ${
                stage === 'result' ? 'bg-emerald-500' : 'bg-gray-200'
              }`}
            />

            {/* Step 3 */}
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center shadow-xs transition-colors ${
                  stage === 'result'
                    ? 'bg-emerald-800 text-white ring-2 ring-emerald-300'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                3
              </div>
              <span
                className={`text-xs font-extrabold ${
                  stage === 'result' ? 'text-emerald-900' : 'text-gray-500'
                }`}
              >
                View Results
              </span>
            </div>
          </div>

          {/* ── FLOW CONTROLLER ── */}
          {stage === 'upload' && (
            <div className="max-w-6xl mx-auto py-4 sm:py-6">
              <ImageUpload onImageSelected={handleImageSelected} />
            </div>
          )}

          {stage === 'preview' && selectedFile && (
            <div className="max-w-2xl mx-auto py-6">
              <ImagePreview
                file={selectedFile}
                onRemove={() => { setSelectedFile(null); setStage('upload'); }}
                onReplace={handleImageSelected}
                onAnalyze={handleStartAnalysis}
              />
            </div>
          )}

          {stage === 'loading' && (
            <div className="max-w-2xl mx-auto py-10">
              <AnalysisLoader onCancel={() => setStage('upload')} />
            </div>
          )}

          {/* ── RESULT VIEW (Matches user mockup image precisely) ── */}
          {stage === 'result' && analysisResult && (
            <div className="space-y-4">
              {/* Green Banner: Analysis Complete */}
              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                    <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-gray-900">Analysis Complete</h3>
                    <p className="text-xs text-gray-500 mt-0.5 font-normal">
                      Here is the detailed analysis of your crop leaf.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-gray-600 font-semibold pl-11 sm:pl-0">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span>Analyzed on {analysisResult.analyzedAt}</span>
                </div>
              </div>

              {/* Grounded AI Agronomist Feature Card */}
              <AgriSmartAgronomistCard
                prediction={analysisResult.prediction}
                cropHealth={analysisResult.cropHealth}
                severity={analysisResult.severity}
                spreadRisk={analysisResult.spreadRisk}
                weather={analysisResult.weather}
                onOpenAssistant={() => handleOpenAssistant()}
                onQuickQuery={(query) => handleOpenAssistant(query)}
              />

              {/* Row 1: Top Specimen Diagnosis (8 cols) & Threat Assessment Stack (Severity + Spread Risk, 4 cols) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                <div className="lg:col-span-8">
                  <PredictionCard
                    prediction={analysisResult.prediction}
                    uploadedImage={analysisResult.uploadedImage}
                    fileName={analysisResult.fileName}
                    fileSize={analysisResult.fileSize}
                  />
                </div>
                <div className="lg:col-span-4 flex flex-col gap-3.5">
                  <SeverityIndicator severity={analysisResult.severity} />
                  <SpreadRiskCard spreadRisk={analysisResult.spreadRisk} />
                </div>
              </div>

              {/* Row 2: 4 In-Depth Clinical & Environmental Cards (Weather, Disease Biology, Symptoms, Causes) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <WeatherIntelligence weather={analysisResult.weather} />
                <DiseaseInformation diseaseInfo={analysisResult.diseaseInformation} />
                <SymptomsList symptoms={analysisResult.symptoms} />
                <CausesList causes={analysisResult.possibleCauses} />
              </div>

              {/* Row 3: 2 Cards (7-Day Disease Progression Forecast & Smart Irrigation Advice) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-8">
                  <DiseaseForecast />
                </div>
                <div className="lg:col-span-4">
                  <IrrigationAdvice irrigation={analysisResult.irrigationAdvice} />
                </div>
              </div>

              {/* Row 4: 2 Cards (Recommended Action Plan & AI Agronomist Summary) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-8">
                  <ActionTimeline timeline={analysisResult.actionTimeline} />
                </div>
                <div className="lg:col-span-4">
                  <AgronomistSummary summary={analysisResult.agronomistSummary} />
                </div>
              </div>

              {/* Row 6: Prediction Confidence Breakdown (Collapsible) */}
              <ConfidenceBreakdown breakdown={analysisResult.confidenceBreakdown} />

              {/* Row 7: Bottom Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Dashboard</span>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleDownloadReport}
                    disabled={downloading}
                    className="px-4 py-2.5 rounded-xl border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-800 text-xs font-extrabold transition-all shadow-xs active:scale-95 flex items-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{downloading ? 'Generating PDF...' : 'Download Report (PDF)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAnalyzeAnother}
                    className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Analyze Another Image</span>
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
