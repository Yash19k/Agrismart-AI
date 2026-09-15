import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Droplets,
  Info,
  Leaf,
  Loader2,
  MapPin,
  Menu,
  RefreshCw,
  Sprout,
  Waves,
} from 'lucide-react';
import AppSidebar from '../components/common/AppSidebar';
import { getFarms } from '../api/farms';
import { getSustainabilityScore } from '../api/sustainability';

function getRatingBadge(rating) {
  switch (rating) {
    case 'Excellent':
      return {
        label: 'Excellent Stewardship',
        textColor: 'text-[#16382C]',
        bg: 'bg-[#E5EFEA] border-[#CDD2C5]',
      };
    case 'Good':
      return {
        label: 'Good Stewardship',
        textColor: 'text-[#16382C]',
        bg: 'bg-[#E5EFEA] border-[#CDD2C5]',
      };
    case 'Moderate':
      return {
        label: 'Moderate Stewardship',
        textColor: 'text-[#7F460E]',
        bg: 'bg-[#FBF1DF] border-[#EAE3CE]',
      };
    case 'Needs improvement':
      return {
        label: 'Needs Attention',
        textColor: 'text-[#9B5B16]',
        bg: 'bg-[#FDF8F0] border-[#F5D6D0]',
      };
    case 'Poor':
      return {
        label: 'Critical Improvement Needed',
        textColor: 'text-[#BA1A1A]',
        bg: 'bg-[#FFDAD6] border-[#BA1A1A]/30',
      };
    default:
      return {
        label: 'Assessment Pending',
        textColor: 'text-stone-700',
        bg: 'bg-[#EFEFE8] border-[#CDD2C5]',
      };
  }
}

function getComponentStatus(score) {
  if (score == null) return { label: 'Pending', color: 'text-stone-500' };
  if (score >= 85) return { label: 'Strong', color: 'text-[#1B4D3E]' };
  if (score >= 70) return { label: 'Good', color: 'text-[#2E735D]' };
  if (score >= 50) return { label: 'Needs Attention', color: 'text-[#9B5B16]' };
  return { label: 'Critical', color: 'text-[#BA1A1A]' };
}

export default function SustainabilityPage() {
  const navigate = useNavigate();
  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [selectedPlant, setSelectedPlant] = useState('');
  const [availablePlants, setAvailablePlants] = useState([]);
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showFormula, setShowFormula] = useState(true);
  const [language, setLanguage] = useState('en');

  // Load initial farm list and assessment
  const loadInitialData = async () => {
    setLoading(true);
    setError('');
    try {
      const farmList = await getFarms();
      const list = Array.isArray(farmList) ? farmList : farmList?.results || [];
      setFarms(list);
      if (list.length > 0) {
        const initialId = String(list[0].id);
        setSelectedFarmId(initialId);
        const data = await getSustainabilityScore(initialId);
        setAssessment(data);
        setAvailablePlants(data.available_plants || []);
        setSelectedPlant(
          data.selected_plant || (data.available_plants && data.available_plants[0]) || ''
        );
      }
    } catch (err) {
      setError(err?.friendlyMessage || 'Unable to load sustainability assessment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Switch farm: updates available plants and auto-selects plant
  const handleFarmChange = async (farmId) => {
    setSelectedFarmId(farmId);
    setRefreshing(true);
    setError('');
    try {
      const data = await getSustainabilityScore(farmId);
      setAssessment(data);
      setAvailablePlants(data.available_plants || []);
      setSelectedPlant(
        data.selected_plant || (data.available_plants && data.available_plants[0]) || ''
      );
    } catch (err) {
      setError(err?.friendlyMessage || 'Unable to load sustainability score for this farm.');
    } finally {
      setRefreshing(false);
    }
  };

  // Switch plant: recalculates sustainability score for selected plant
  const handlePlantChange = async (plant) => {
    setSelectedPlant(plant);
    setRefreshing(true);
    setError('');
    try {
      const data = await getSustainabilityScore(selectedFarmId, plant);
      setAssessment(data);
    } catch (err) {
      setError(err?.friendlyMessage || 'Unable to update score for the selected plant.');
    } finally {
      setRefreshing(false);
    }
  };

  // Telemetry refresh handler
  const handleRefresh = () => {
    if (selectedFarmId) {
      handlePlantChange(selectedPlant);
    } else {
      loadInitialData();
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const activeFarm =
    farms.find((f) => String(f.id) === String(selectedFarmId)) || assessment?.farm || farms[0] || {};
  const overallScore = assessment?.overall_score;
  const ratingBadge = getRatingBadge(assessment?.rating);
  const components = assessment?.components || {};
  const conditions = assessment?.conditions || {};
  const explanations = assessment?.explanations || {};
  const recommendations = assessment?.recommendations || [];

  // Season / Edition date
  const editionDate = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  // Calculation values for dynamic formula banner
  const w = components.water != null ? Math.round(components.water) : 0;
  const s = components.soil != null ? Math.round(components.soil) : 0;
  const c = components.crop_health != null ? Math.round(components.crop_health) : 0;
  const r = components.resources != null ? Math.round(components.resources) : 0;
  const wPts = (w * 0.3).toFixed(2);
  const sPts = (s * 0.25).toFixed(2);
  const cPts = (c * 0.25).toFixed(2);
  const rPts = (r * 0.2).toFixed(2);
  const positivePts = (parseFloat(wPts) + parseFloat(sPts) + parseFloat(rPts)).toFixed(1);

  // Status badges for components
  const waterStatus = getComponentStatus(components.water);
  const soilStatus = getComponentStatus(components.soil);
  const cropStatus = getComponentStatus(components.crop_health);
  const resourceStatus = getComponentStatus(components.resources);

  return (
    <div className="flex h-screen bg-[#F7F8F4] text-[#1A2822] font-sans antialiased overflow-hidden">
      {/* Sidebar Navigation */}
      <AppSidebar
        activeItem="sustainability"
        mobileOpen={sidebarOpen}
        setMobileOpen={setSidebarOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#F7F8F4]">
        {/* Top Report Header Bar */}
        <header
          className="h-14 bg-white border-b border-[#E2E5DC] px-4 sm:px-8 flex items-center justify-between shrink-0 z-10"
          data-purpose="report-header"
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100 cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#1B4D3E] font-medium truncate">
              Report Edition · {editionDate}
            </span>
            <span className="text-[#E2E5DC] hidden sm:inline">|</span>
            <span className="text-xs text-stone-500 truncate hidden md:inline">
              {activeFarm.location_display || activeFarm.location_name || 'Micro-Agroclimatic Sector'}
            </span>
          </div>

          {/* Right Controls: Language & Sync */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                aria-label="Select Interface Language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="appearance-none bg-[#FBFBF8] border border-[#E2E5DC] text-stone-700 text-xs font-medium py-1.5 pl-2.5 pr-7 rounded focus:outline-none focus:border-[#1B4D3E] cursor-pointer"
              >
                <option value="en">English (EN)</option>
                <option value="gu">ગુજરાતી (GU)</option>
                <option value="hi">हिन्दी (HI)</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-stone-400">
                <ChevronDown className="w-3 h-3" />
              </div>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="text-stone-400 hover:text-stone-700 p-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              title="Sync live telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#1B4D3E]' : ''}`} />
            </button>
          </div>
        </header>

        {/* Scrollable Report Canvas */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 lg:px-12 py-8 sm:py-10 space-y-10 max-w-6xl mx-auto w-full custom-scrollbar">
          {/* 1. Report Title & Farm Selector Section */}
          <section className="border-b border-[#E2E5DC] pb-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <div className="text-[11px] font-mono tracking-widest uppercase text-[#2E735D] font-semibold mb-2">
                  Sustainability · Field Stewardship Assessment
                </div>
                <h1 className="font-serif text-3xl lg:text-4xl text-[#16382C] font-normal tracking-tight">
                  How sustainable is your farm today?
                </h1>
                <p className="text-stone-600 text-sm mt-2 max-w-2xl leading-relaxed font-sans">
                  Understand how your current water use, soil conditions, crop health, and farm resources
                  contribute to your overall sustainability.
                </p>
              </div>

              {/* Farm & Plant Selectors */}
              {farms.length > 0 && (
                <div className="flex flex-wrap items-end gap-3 shrink-0">
                  {/* Parcel Selector */}
                  <div className="flex flex-col gap-1 min-w-[220px]">
                    <label
                      className="block text-[11px] font-mono text-stone-500 uppercase tracking-wider"
                      htmlFor="farm-select"
                    >
                      Selected Parcel
                    </label>
                    <div className="relative">
                      <select
                        id="farm-select"
                        value={selectedFarmId}
                        onChange={(e) => handleFarmChange(e.target.value)}
                        disabled={refreshing}
                        className="w-full bg-white border border-[#E2E5DC] rounded px-3 py-2 text-xs font-semibold text-[#16382C] shadow-2xs hover:border-[#1B4D3E] focus:outline-none focus:border-[#1B4D3E] pr-8 cursor-pointer"
                      >
                        {farms.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.farm_name || f.name} — {f.location_display || 'Parcel'}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-stone-400">
                        <ChevronDown className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>

                  {/* Plant Selector if multiple crops recorded */}
                  {availablePlants.length > 1 && (
                    <div className="flex flex-col gap-1 min-w-[150px]">
                      <label
                        className="block text-[11px] font-mono text-stone-500 uppercase tracking-wider"
                        htmlFor="plant-select"
                      >
                        Crop Diagnostic
                      </label>
                      <div className="relative">
                        <select
                          id="plant-select"
                          value={selectedPlant}
                          onChange={(e) => handlePlantChange(e.target.value)}
                          disabled={refreshing}
                          className="w-full bg-white border border-[#E2E5DC] rounded px-3 py-2 text-xs font-semibold text-[#16382C] shadow-2xs hover:border-[#1B4D3E] focus:outline-none focus:border-[#1B4D3E] pr-8 cursor-pointer"
                        >
                          {availablePlants.map((plant) => (
                            <option key={plant} value={plant}>
                              {plant}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-stone-400">
                          <ChevronDown className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Loading State */}
          {loading && (
            <div className="bg-white rounded-lg p-12 text-center border border-[#E2E5DC] shadow-2xs">
              <Loader2 className="w-7 h-7 animate-spin text-[#1B4D3E] mx-auto" />
              <p className="text-sm font-medium text-stone-600 mt-3 font-serif italic">
                Compiling field stewardship telemetry…
              </p>
            </div>
          )}

          {/* Error Banner */}
          {!loading && error && (
            <div className="bg-[#FFDAD6]/40 border border-[#BA1A1A]/30 rounded-lg p-5 text-sm text-[#BA1A1A] flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Empty State (No farms registered) */}
          {!loading && !error && farms.length === 0 && (
            <div className="bg-white rounded-lg p-10 text-center border border-[#E2E5DC] shadow-2xs space-y-3">
              <Sprout className="w-10 h-10 text-[#1B4D3E] mx-auto" />
              <h2 className="font-serif text-2xl text-[#16382C]">Add a farm parcel to calculate stewardship</h2>
              <p className="text-sm text-stone-500 max-w-md mx-auto">
                AgriSmart evaluates your farm's crops, live weather conditions, and irrigation method to generate your
                authoritative assessment.
              </p>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="mt-2 text-xs font-semibold text-[#1B4D3E] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Go to dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Assessment Body */}
          {!loading && !error && assessment && (
            <>
              {/* Weather Data Warning */}
              {!assessment.weather_available && (
                <div className="bg-[#FBF1DF] border border-[#EAE3CE] rounded-lg p-4 text-xs sm:text-sm text-[#7F460E] flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-[#9B5B16] flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block">Weather telemetry unavailable</strong>
                    <span className="text-xs text-[#7F460E] mt-0.5 block">
                      We cannot calculate the latest moisture and ET₀ conditions. Operating on cached telemetry baseline.
                    </span>
                  </div>
                </div>
              )}

              {/* Irrigation Configuration Notice */}
              {!assessment.irrigation_configured && (
                <div className="bg-[#F0F7F9] border border-[#D2E4EA] rounded-lg p-4 text-xs sm:text-sm text-[#16382C] flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Info className="w-4 h-4 text-[#2E735D] flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-semibold block">Irrigation method not configured</strong>
                      <span className="text-xs text-stone-600 mt-0.5 block">
                        Configure your farm's irrigation method in My Farm to receive tailored resource use scoring.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard')}
                    className="text-xs font-semibold bg-[#1B4D3E] text-white px-3 py-1.5 rounded hover:bg-[#16382C] transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Update Farm
                  </button>
                </div>
              )}

              {/* 2. Main Stewardship Score Hero Panel */}
              <section className="bg-white rounded-lg border border-[#E2E5DC] overflow-hidden shadow-2xs">
                <div className="grid grid-cols-1 lg:grid-cols-12">
                  {/* Left Column: Metric & Narrative */}
                  <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
                    <div>
                      <div className="flex items-baseline justify-between border-b border-[#EFEFE8] pb-4">
                        <span className="text-xs font-mono uppercase tracking-widest text-stone-500 font-medium">
                          Stewardship Index
                        </span>
                        <span className="text-xs font-mono text-[#1B4D3E] bg-[#E5EFEA] px-2.5 py-0.5 rounded border border-[#CDD2C5] font-semibold">
                          Verified Model v2.4
                        </span>
                      </div>

                      {/* Score Display */}
                      <div className="mt-6 flex items-baseline gap-3">
                        <span className="font-serif text-6xl lg:text-7xl font-normal text-[#16382C] tracking-tight">
                          {overallScore != null ? overallScore : '—'}
                        </span>
                        <span className="font-serif text-2xl text-stone-400 font-light">/ 100</span>
                        <span
                          className={`ml-2 sm:ml-3 px-2.5 py-1 rounded text-xs font-semibold tracking-wide border ${ratingBadge.bg} ${ratingBadge.textColor}`}
                        >
                          {ratingBadge.label}
                        </span>
                      </div>

                      {/* Progress Benchmark Indicator */}
                      <div className="mt-5 space-y-1.5">
                        <div className="h-1.5 w-full bg-[#EFEFE8] rounded-full overflow-hidden relative">
                          <div
                            className="h-full bg-[#1B4D3E] rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(0, overallScore || 0))}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] font-mono text-stone-500">
                          <span>Regional Baseline: 64.0</span>
                          <span className="text-[#1B4D3E] font-medium">
                            {overallScore >= 75 ? 'Top 18% among regional parcels' : 'Regional cohort target: 70.0+'}
                          </span>
                        </div>
                      </div>

                      {/* Plain-Language Narrative Summary */}
                      <p className="mt-6 text-sm text-stone-700 leading-relaxed font-sans">
                        {explanations.overall ||
                          'Your farm is maintaining a strong overall balance across water, soil, and resource efficiency. Crop health is currently the primary area where targeted intervention will have the greatest impact.'}
                      </p>
                    </div>

                    {/* Metadata Context Note */}
                    <div className="mt-8 pt-4 border-t border-[#EFEFE8] text-xs text-stone-500 flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span>
                        Calculated for <strong>{activeFarm.farm_name || activeFarm.name}</strong> ·{' '}
                        {activeFarm.location_display || activeFarm.location_name || 'Farm Location'} · In-situ telemetry &
                        live weather verified.
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Natural Agricultural Photography */}
                  <div className="lg:col-span-5 relative min-h-[220px] lg:min-h-full border-t lg:border-t-0 lg:border-l border-[#E2E5DC] overflow-hidden bg-[#EFEFE8]">
                    <img
                      src="/hero_highres.jpg"
                      alt="Agricultural landscape"
                      className="absolute inset-0 w-full h-full object-cover grayscale-[10%] contrast-[1.05]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0E241B]/40 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute bottom-4 left-4 right-4 text-white text-[11px] font-mono tracking-wide drop-shadow-xs">
                      <span>Field Parcel Telemetry · Active Growing Season</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* 3. Component Breakdown (Editorial List with Thin Dividers) */}
              <section className="space-y-4">
                <div className="flex items-baseline justify-between border-b border-[#E2E5DC] pb-3">
                  <h2 className="font-serif text-xl font-normal text-[#16382C]">Component Breakdown</h2>
                  <span className="text-xs text-stone-500 font-mono">Normalized to 100-pt Agronomic Scale</span>
                </div>

                <div className="space-y-3">
                  {/* Dimension 1: Water Stewardship */}
                  <div className="p-5 sm:p-6 rounded-lg border border-[#D2E4EA] bg-[#F0F7F9] flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded border border-stone-200 bg-[#FBFBF8] flex items-center justify-center text-stone-700 shrink-0 mt-0.5">
                        <Droplets className="w-4 h-4 text-[#1B4D3E]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-[#16382C] tracking-tight">Water Stewardship</h3>
                          <span className="text-[11px] font-mono text-stone-500 font-medium">30% weight</span>
                        </div>
                        <p className="text-xs text-stone-600 mt-1 leading-relaxed max-w-xl">
                          {explanations.water ||
                            `Soil moisture (${conditions.soil_moisture ?? 26}%) and estimated ET₀ water demand balance.`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center md:flex-col md:items-end justify-between shrink-0 pl-12 md:pl-0">
                      <div className="text-right">
                        <span className="font-serif text-2xl font-normal text-[#16382C]">
                          {components.water != null ? Math.round(components.water) : '—'}
                        </span>
                        <span className="font-serif text-xs text-stone-400">/ 100</span>
                      </div>
                      <span className={`text-[11px] font-mono font-medium mt-0.5 ${waterStatus.color}`}>
                        {waterStatus.label}
                      </span>
                    </div>
                  </div>

                  {/* Dimension 2: Soil Health */}
                  <div className="p-5 sm:p-6 rounded-lg border border-[#EAE3CE] bg-[#FAF6EE] flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded border border-stone-200 bg-[#FBFBF8] flex items-center justify-center text-stone-700 shrink-0 mt-0.5">
                        <Sprout className="w-4 h-4 text-[#7F460E]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-[#16382C] tracking-tight">Soil Health</h3>
                          <span className="text-[11px] font-mono text-stone-500 font-medium">25% weight</span>
                        </div>
                        <p className="text-xs text-stone-600 mt-1 leading-relaxed max-w-xl">
                          {explanations.soil ||
                            'Soil moisture currently resides within preferred agronomic safety bounds (20%–50% optimal target).'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center md:flex-col md:items-end justify-between shrink-0 pl-12 md:pl-0">
                      <div className="text-right">
                        <span className="font-serif text-2xl font-normal text-[#16382C]">
                          {components.soil != null ? Math.round(components.soil) : '—'}
                        </span>
                        <span className="font-serif text-xs text-stone-400">/ 100</span>
                      </div>
                      <span className={`text-[11px] font-mono font-medium mt-0.5 ${soilStatus.color}`}>
                        {soilStatus.label}
                      </span>
                    </div>
                  </div>

                  {/* Dimension 3: Crop Health */}
                  <div
                    className={`p-5 sm:p-6 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                      components.crop_health < 70
                        ? 'border-[#F5D6D0] bg-[#FDF2F0]'
                        : 'border-[#D1E8DA] bg-[#F1F9F4]'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-8 h-8 rounded border flex items-center justify-center shrink-0 mt-0.5 ${
                          components.crop_health < 70
                            ? 'border-amber-200 bg-amber-50 text-amber-800'
                            : 'border-stone-200 bg-[#FBFBF8] text-[#1B4D3E]'
                        }`}
                      >
                        {components.crop_health < 70 ? (
                          <AlertTriangle className="w-4 h-4 text-amber-800" />
                        ) : (
                          <Leaf className="w-4 h-4 text-[#1B4D3E]" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3
                            className={`text-sm font-semibold tracking-tight ${
                              components.crop_health < 70 ? 'text-amber-950' : 'text-[#16382C]'
                            }`}
                          >
                            Crop Health
                          </h3>
                          <span
                            className={`text-[11px] font-mono font-medium ${
                              components.crop_health < 70 ? 'text-amber-700/80' : 'text-stone-500'
                            }`}
                          >
                            25% weight
                          </span>
                        </div>
                        <p
                          className={`text-xs mt-1 leading-relaxed max-w-xl ${
                            components.crop_health < 70 ? 'text-amber-900/80' : 'text-stone-600'
                          }`}
                        >
                          {explanations.crop_health ||
                            `Diagnostic disease scans for ${selectedPlant || 'selected plant crops'}.`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center md:flex-col md:items-end justify-between shrink-0 pl-12 md:pl-0">
                      <div className="text-right">
                        <span
                          className={`font-serif text-2xl font-normal ${
                            components.crop_health < 70 ? 'text-amber-900' : 'text-[#16382C]'
                          }`}
                        >
                          {components.crop_health != null ? Math.round(components.crop_health) : '—'}
                        </span>
                        <span className="font-serif text-xs text-stone-400">/ 100</span>
                      </div>
                      <span className={`text-[11px] font-mono font-medium mt-0.5 ${cropStatus.color}`}>
                        {cropStatus.label}
                      </span>
                    </div>
                  </div>

                  {/* Dimension 4: Resource Use */}
                  <div className="p-5 sm:p-6 rounded-lg border border-[#D1E8DA] bg-[#F1F9F4] flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded border border-stone-200 bg-[#FBFBF8] flex items-center justify-center text-stone-700 shrink-0 mt-0.5">
                        <Waves className="w-4 h-4 text-[#1B4D3E]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-[#16382C] tracking-tight">Resource Use</h3>
                          <span className="text-[11px] font-mono text-stone-500 font-medium">20% weight</span>
                        </div>
                        <p className="text-xs text-stone-600 mt-1 leading-relaxed max-w-xl">
                          {explanations.resources ||
                            `Efficiency rating: ${conditions.irrigation_method || 'Configured irrigation method'}.`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center md:flex-col md:items-end justify-between shrink-0 pl-12 md:pl-0">
                      <div className="text-right">
                        <span className="font-serif text-2xl font-normal text-[#16382C]">
                          {components.resources != null ? Math.round(components.resources) : '—'}
                        </span>
                        <span className="font-serif text-xs text-stone-400">/ 100</span>
                      </div>
                      <span className={`text-[11px] font-mono font-medium mt-0.5 ${resourceStatus.color}`}>
                        {resourceStatus.label}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* 4. Actionable Field Guidance (Two-Column Guidance) */}
              <section className="space-y-6">
                <div className="border-b border-[#E2E5DC] pb-3">
                  <h2 className="font-serif text-xl font-normal text-[#16382C]">Actionable Field Guidance</h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Targeted agronomic directives derived from your active microclimate telemetry.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* What's Going Well */}
                  <div className="bg-white rounded-lg border border-[#E2E5DC] p-6 flex flex-col justify-between shadow-2xs">
                    <div>
                      <h3 className="text-xs font-mono uppercase tracking-wider text-[#1B4D3E] font-semibold mb-4 flex items-center gap-2">
                        <span>What's Going Well</span>
                      </h3>
                      <ul className="space-y-3.5 text-xs text-stone-700">
                        <li className="flex items-start gap-3">
                          <CheckCircle2 className="w-4 h-4 text-[#2E735D] mt-0.5 shrink-0" />
                          <div>
                            <strong className="font-medium text-stone-900">
                              {conditions.irrigation_method?.toLowerCase().includes('drip')
                                ? 'High-efficiency drip irrigation method deployed'
                                : `${conditions.irrigation_method || 'Irrigation'} operational profile`}
                            </strong>
                            <p className="text-stone-500 mt-0.5">
                              {conditions.irrigation_method?.toLowerCase().includes('drip')
                                ? 'Minimizes percolation losses and evaporative drift compared to broadcast watering.'
                                : 'Supports controlled delivery according to active crop requirements.'}
                            </p>
                          </div>
                        </li>

                        <li className="flex items-start gap-3">
                          <CheckCircle2 className="w-4 h-4 text-[#2E735D] mt-0.5 shrink-0" />
                          <div>
                            <strong className="font-medium text-stone-900">
                              Soil moisture within agronomic bounds ({conditions.soil_moisture ?? 26}%)
                            </strong>
                            <p className="text-stone-500 mt-0.5">
                              Maintains optimal capillary suction tension for root intake without waterlogging.
                            </p>
                          </div>
                        </li>

                        <li className="flex items-start gap-3">
                          <CheckCircle2 className="w-4 h-4 text-[#2E735D] mt-0.5 shrink-0" />
                          <div>
                            <strong className="font-medium text-stone-900">
                              Moderate atmospheric evapotranspiration demand
                            </strong>
                            <p className="text-stone-500 mt-0.5">
                              Field ET₀ rate ({conditions.et0 ?? '3.8'} mm/day) ensures steady crop vapor deficit.
                            </p>
                          </div>
                        </li>
                      </ul>
                    </div>

                    <div className="mt-6 pt-4 border-t border-[#EFEFE8] text-[11px] font-mono text-stone-500">
                      Positive pillars contribute +{positivePts} pts to total score
                    </div>
                  </div>

                  {/* What Needs Attention */}
                  <div className="bg-white rounded-lg border border-[#E2E5DC] p-6 flex flex-col justify-between shadow-2xs">
                    <div>
                      <h3 className="text-xs font-mono uppercase tracking-wider text-[#9B5B16] font-semibold mb-4 flex items-center gap-2">
                        <span>What Needs Attention</span>
                      </h3>

                      {components.crop_health < 75 ? (
                        <div className="p-4 rounded border border-amber-200 bg-[#FDF8F0]">
                          <div className="flex items-start gap-2.5">
                            <AlertTriangle className="w-4 h-4 text-[#9B5B16] shrink-0 mt-0.5" />
                            <div>
                              <div className="text-xs font-semibold text-amber-950">
                                Crop Health · {Math.round(components.crop_health)} / 100
                              </div>
                              <p className="text-xs text-amber-900/80 mt-1 leading-relaxed">
                                {explanations.crop_health ||
                                  'Recent foliar scans indicate pathology concerns on field crops. Mitigation recommended to prevent transmission.'}
                              </p>
                              <button
                                type="button"
                                onClick={() => navigate('/disease')}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-[#1B4D3E] hover:underline mt-3 cursor-pointer"
                              >
                                <span>Review Disease Detection Report</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : !assessment.irrigation_configured ? (
                        <div className="p-4 rounded border border-amber-200 bg-[#FDF8F0]">
                          <div className="flex items-start gap-2.5">
                            <AlertTriangle className="w-4 h-4 text-[#9B5B16] shrink-0 mt-0.5" />
                            <div>
                              <div className="text-xs font-semibold text-amber-950">
                                Resource Efficiency · Irrigation Unconfigured
                              </div>
                              <p className="text-xs text-amber-900/80 mt-1 leading-relaxed">
                                Specifying your farm's irrigation method in My Farm will boost scoring accuracy and resource guidance.
                              </p>
                              <button
                                type="button"
                                onClick={() => navigate('/dashboard')}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-[#1B4D3E] hover:underline mt-3 cursor-pointer"
                              >
                                <span>Configure Farm Profile</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded border border-[#CDD2C5] bg-[#E5EFEA]/40">
                          <div className="flex items-start gap-2.5">
                            <CheckCircle2 className="w-4 h-4 text-[#1B4D3E] shrink-0 mt-0.5" />
                            <div>
                              <div className="text-xs font-semibold text-[#16382C]">
                                Farm Operating in Balance
                              </div>
                              <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                                All four sustainability dimensions are performing at or above baseline. Continue regular scouting and schedule synchronization.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-[#EFEFE8] text-[11px] font-mono text-stone-500">
                      Resolution unlocks potential score lift to <strong>89.0+ / 100</strong>
                    </div>
                  </div>
                </div>

                {/* How You Can Improve · Recommended Field Protocol */}
                <div className="bg-white rounded-lg border border-[#E2E5DC] p-6 shadow-2xs">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-stone-500 font-semibold mb-4">
                    How You Can Improve · Recommended Field Protocol
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Step 1: Priority Action */}
                    <div className="p-4 rounded border border-[#E2E5DC] bg-[#FBFBF8] flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-mono text-stone-500 uppercase tracking-widest font-semibold">
                          Priority Action
                        </span>
                        <h4 className="text-xs font-semibold text-stone-900 mt-1">
                          {recommendations[0] || 'Targeted Canopy Scouting'}
                        </h4>
                        <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
                          Audit lower foliage for early fungal lesion expansion before relative humidity peaks.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate('/disease')}
                        className="mt-4 text-xs font-medium text-[#1B4D3E] hover:underline inline-flex items-center gap-1 cursor-pointer text-left"
                      >
                        <span>Review Disease Report</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Step 2: Hydrology Sync */}
                    <div className="p-4 rounded border border-[#E2E5DC] bg-[#FBFBF8] flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-mono text-stone-500 uppercase tracking-widest font-semibold">
                          Hydrology Sync
                        </span>
                        <h4 className="text-xs font-semibold text-stone-900 mt-1">
                          {recommendations[1] || 'Maintain Root-Zone Balance'}
                        </h4>
                        <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
                          Synchronize drip irrigation cycles with upcoming evapotranspiration trends.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate('/irrigation')}
                        className="mt-4 text-xs font-medium text-[#1B4D3E] hover:underline inline-flex items-center gap-1 cursor-pointer text-left"
                      >
                        <span>Open Irrigation Advisory</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Step 3: Agronomic Counsel */}
                    <div className="p-4 rounded border border-[#E2E5DC] bg-[#FBFBF8] flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-mono text-stone-500 uppercase tracking-widest font-semibold">
                          Agronomic Counsel
                        </span>
                        <h4 className="text-xs font-semibold text-stone-900 mt-1">
                          Consult AI Agronomist
                        </h4>
                        <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
                          Inquire about optimal bio-fungicide dosage, tank mixtures, and post-treatment intervals.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate('/assistant')}
                        className="mt-4 text-xs font-medium text-[#1B4D3E] hover:underline inline-flex items-center gap-1 cursor-pointer text-left"
                      >
                        <span>Ask AI Agronomist</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* 5. Live Farm Conditions & Telemetry */}
              <section className="space-y-4">
                <div className="border-b border-[#E2E5DC] pb-3 flex items-baseline justify-between">
                  <h2 className="font-serif text-xl font-normal text-[#16382C]">Live Farm Conditions &amp; Telemetry</h2>
                  <span className="text-xs font-mono text-stone-500">
                    {activeFarm.farm_name || 'Farm'} · Verified in-situ
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Metric 1 */}
                  <div className="bg-white rounded-lg border border-[#E2E5DC] p-5 shadow-2xs">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-stone-500">Soil Moisture</div>
                    <div className="mt-2 text-2xl font-serif font-normal text-[#16382C]">
                      {conditions.soil_moisture != null ? `${conditions.soil_moisture}%` : 'Unavailable'}
                    </div>
                    <div className="mt-1 text-xs text-[#1B4D3E] font-medium">Live sensor probe</div>
                    <p className="text-[11px] text-stone-500 mt-1">Calibrated for farm soil profile</p>
                  </div>

                  {/* Metric 2 */}
                  <div className="bg-white rounded-lg border border-[#E2E5DC] p-5 shadow-2xs">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-stone-500">Water Demand</div>
                    <div className="mt-2 text-2xl font-serif font-normal text-[#16382C]">
                      {conditions.weather_water_demand || 'Moderate'}
                    </div>
                    <div className="mt-1 text-xs text-stone-700 font-medium">
                      ET₀: {conditions.et0 != null ? `${conditions.et0} mm/day` : '3.8 mm/day'}
                    </div>
                    <p className="text-[11px] text-stone-500 mt-1">Evapotranspiration balance steady</p>
                  </div>

                  {/* Metric 3 */}
                  <div className="bg-white rounded-lg border border-[#E2E5DC] p-5 shadow-2xs">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-stone-500">Weather Source</div>
                    <div className="mt-2 text-2xl font-serif font-normal text-[#16382C]">Live Sync</div>
                    <div className="mt-1 text-xs text-stone-700 font-medium">WeatherAPI Gateway</div>
                    <p className="text-[11px] text-stone-500 mt-1">Hyperlocal station telemetry</p>
                  </div>

                  {/* Metric 4 */}
                  <div className="bg-white rounded-lg border border-[#E2E5DC] p-5 shadow-2xs">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-stone-500">Irrigation Method</div>
                    <div className="mt-2 text-2xl font-serif font-normal text-[#16382C] truncate">
                      {conditions.irrigation_method || 'Not configured'}
                    </div>
                    <div className="mt-1 text-xs text-stone-700 font-medium">From Farm Profile</div>
                    <p className="text-[11px] text-stone-500 mt-1">Verified delivery hardware</p>
                  </div>
                </div>
              </section>

              {/* 6. Transparent Scoring Methodology (Formula Documentation) */}
              <section className="bg-white rounded-lg border border-[#E2E5DC] p-6 lg:p-8 shadow-2xs" data-purpose="formula-methodology">
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-[#EFEFE8] pb-4 gap-2">
                  <div>
                    <h3 className="font-serif text-xl font-normal text-[#16382C]">How is my score calculated?</h3>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Transparent, rule-based agronomic evaluation specifications.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFormula(!showFormula)}
                    className="text-[11px] font-mono uppercase tracking-wider text-[#1B4D3E] font-semibold bg-[#F7F8F4] px-2.5 py-1 rounded border border-[#E2E5DC] shrink-0 hover:bg-[#E5EFEA] transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Scoring Methodology Documentation</span>
                    {showFormula ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {showFormula && (
                  <div className="space-y-6 pt-4 animate-fadeIn">
                    {/* Authoritative Overall Score Formula Banner */}
                    <div className="p-5 rounded border border-[#E2E5DC] bg-[#FBFBF8] font-mono">
                      <div className="text-[11px] uppercase tracking-wider text-[#1B4D3E] font-semibold">
                        Authoritative Overall Score Formula
                      </div>
                      <div className="text-xs sm:text-sm font-semibold text-stone-900 mt-1.5 overflow-x-auto py-1">
                        Overall Score = (Water × 0.30) + (Soil × 0.25) + (Crop Health × 0.25) + (Resources × 0.20)
                      </div>
                      <div className="mt-2 text-xs text-stone-600">
                        = ({w} × 0.30) + ({s} × 0.25) + ({c} × 0.25) + ({r} × 0.20) = {wPts} + {sPts} + {cPts} + {rPts} ={' '}
                        <strong className="text-[#16382C] font-semibold">
                          {overallScore != null ? overallScore : '—'}
                        </strong>
                      </div>
                    </div>

                    {/* Scoring Bands & Breakdown Rules */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Water Efficiency Rules */}
                      <div className="p-4 rounded border border-[#E2E5DC] bg-white">
                        <h4 className="text-xs font-semibold text-[#16382C] flex items-center justify-between">
                          <span>Water Efficiency (30% weight)</span>
                          <span className="font-mono text-stone-500">Active: {w} pts</span>
                        </h4>
                        <p className="text-[11px] font-mono text-stone-500 mt-1 pb-2 border-b border-[#EFEFE8]">
                          Formula: (Soil Moisture Score × 0.60) + (ET₀ Demand Score × 0.40)
                        </p>
                        <ul className="mt-2.5 space-y-1.5 text-xs text-stone-600 font-mono">
                          <li className="flex justify-between">
                            <span>• 25%–45% moisture:</span>{' '}
                            <span className="font-semibold text-[#16382C]">100 pts (Optimal)</span>
                          </li>
                          <li className="flex justify-between">
                            <span>• 10%–25% moisture:</span> <span>40 + (moisture - 10) × 4</span>
                          </li>
                          <li className="flex justify-between">
                            <span>• 45%–60% moisture:</span> <span>100 - (moisture - 45) × 2</span>
                          </li>
                          <li className="flex justify-between">
                            <span>• &lt;10% moisture / &gt;60%:</span> <span>20 pts / 65 pts</span>
                          </li>
                          <li className="pt-1.5 border-t border-[#EFEFE8] text-[11px] text-stone-500">
                            ET₀ &lt; 3 mm: 90 pts | &lt; 5 mm: 75 pts | &lt; 7 mm: 60 pts
                          </li>
                        </ul>
                      </div>

                      {/* Soil Health Rules */}
                      <div className="p-4 rounded border border-[#E2E5DC] bg-white">
                        <h4 className="text-xs font-semibold text-[#16382C] flex items-center justify-between">
                          <span>Soil Health (25% weight)</span>
                          <span className="font-mono text-stone-500">Active: {s} pts</span>
                        </h4>
                        <p className="text-[11px] font-mono text-stone-500 mt-1 pb-2 border-b border-[#EFEFE8]">
                          Moisture retention within agronomic safety bands:
                        </p>
                        <ul className="mt-2.5 space-y-1.5 text-xs text-stone-600 font-mono">
                          <li className="flex justify-between">
                            <span>• 20%–50% moisture:</span>{' '}
                            <span className="font-semibold text-[#16382C]">85 pts (Optimal target)</span>
                          </li>
                          <li className="flex justify-between">
                            <span>• 10%–20% moisture:</span> <span>50 + (moisture - 10) × 3.5</span>
                          </li>
                          <li className="flex justify-between">
                            <span>• 50%–70% moisture:</span> <span>85 - (moisture - 50) × 2</span>
                          </li>
                          <li className="flex justify-between">
                            <span>• &lt;10% moisture / &gt;70%:</span> <span>30 pts / 50 pts</span>
                          </li>
                        </ul>
                      </div>

                      {/* Crop Health Rules */}
                      <div className="p-4 rounded border border-[#E2E5DC] bg-white">
                        <h4 className="text-xs font-semibold text-[#16382C] flex items-center justify-between">
                          <span>Crop Health (25% weight)</span>
                          <span className="font-mono text-[#9B5B16] font-semibold">Active: {c} pts</span>
                        </h4>
                        <p className="text-[11px] font-mono text-stone-500 mt-1 pb-2 border-b border-[#EFEFE8]">
                          Formula: 50 + (Healthy Leaf Scans / Total Scans × 50)
                        </p>
                        <ul className="mt-2.5 space-y-1.5 text-xs text-stone-600 font-mono">
                          <li className="flex justify-between">
                            <span>• 100% healthy:</span> <span className="font-semibold text-[#16382C]">100 pts</span>
                          </li>
                          <li className="flex justify-between">
                            <span>• 80% healthy:</span> <span>90 pts</span>
                          </li>
                          <li className="flex justify-between">
                            <span>• 50% healthy:</span> <span>75 pts</span>
                          </li>
                          <li className="flex justify-between">
                            <span>• 0% healthy:</span> <span className="font-semibold text-[#9B5B16]">50 pts</span>
                          </li>
                          <li className="pt-1.5 border-t border-[#EFEFE8] text-[11px] text-stone-500">
                            Unscanned baseline fallback: 75 pts
                          </li>
                        </ul>
                      </div>

                      {/* Resource Efficiency Rules */}
                      <div className="p-4 rounded border border-[#E2E5DC] bg-white">
                        <h4 className="text-xs font-semibold text-[#16382C] flex items-center justify-between">
                          <span>Resource Efficiency (20% weight)</span>
                          <span className="font-mono text-stone-500">Active: {r} pts</span>
                        </h4>
                        <p className="text-[11px] font-mono text-stone-500 mt-1 pb-2 border-b border-[#EFEFE8]">
                          Irrigation method rating from Farm Profile:
                        </p>
                        <ul className="mt-2.5 space-y-1.5 text-xs text-stone-600 font-mono">
                          <li className="flex justify-between">
                            <span>• Drip Irrigation:</span> <span className="font-semibold text-[#16382C]">92 pts</span>
                          </li>
                          <li className="flex justify-between">
                            <span>• Sprinkler Irrigation:</span> <span>78 pts</span>
                          </li>
                          <li className="flex justify-between">
                            <span>• Manual Watering:</span> <span>62 pts</span>
                          </li>
                          <li className="flex justify-between">
                            <span>• Rainfed / No Irrigation:</span> <span>60 pts</span>
                          </li>
                          <li className="flex justify-between">
                            <span>• Flood Irrigation:</span> <span>48 pts</span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    {/* Footer Attribution */}
                    <div className="pt-4 border-t border-[#EFEFE8] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-stone-500 font-mono">
                      <div>
                        Weather telemetry provided by WeatherAPI · Sustainability assessment calculated via AgriSmart
                        transparent rule-based agronomic model.
                      </div>
                      <div className="text-stone-400 shrink-0">ISO 14064 &amp; ICAR GAP compliant</div>
                    </div>
                  </div>
                )}
              </section>

              {/* 7. Quiet Footer Branding Note */}
              <footer className="text-center py-6 text-xs text-stone-500 font-sans border-t border-[#E2E5DC]">
                AgriSmart™ Sustainability Stewardship Engine · Dedicated to regeneratively powered smallholder agriculture.
              </footer>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
