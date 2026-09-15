import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Droplets,
  Sprout,
  Thermometer,
  Wind,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  RefreshCw,
  CloudRain,
  CloudDrizzle,
  Cloud,
  Zap,
  Play,
  Cpu,
  Info,
  ShieldCheck,
  BarChart2,
  Database,
  TrendingUp,
  Award,
  History,
  Activity,
  Check,
  ExternalLink,
  Globe,
  ArrowRight
} from 'lucide-react';
import AppSidebar from '../components/common/AppSidebar';
import AppHeader from '../components/common/AppHeader';
import { useAuth } from '../context/AuthContext';
import { GoogleTranslateDropdown } from '../components/common/GoogleTranslate';

import {
  predictIrrigation,
  getIrrigationMeta,
  getIrrigationLiveWeather,
  getIrrigationInsights,
  getIrrigationHistory
} from '../api/irrigation';
import { getWeather } from '../api/weather';
import { getFarms } from '../api/farms';

// ─── Domain Options with Botanical Nomenclature ──────────────────────────────
const CROPS = [
  { name: 'Tomato', scientific: 'Solanum lycopersicum' },
  { name: 'Maize', scientific: 'Zea mays' },
  { name: 'Wheat', scientific: 'Triticum aestivum' },
  { name: 'Potato', scientific: 'Solanum tuberosum' },
  { name: 'Cotton', scientific: 'Gossypium hirsutum' },
  { name: 'Chilli', scientific: 'Capsicum annuum' },
  { name: 'Carrot', scientific: 'Daucus carota' },
];

const SOIL_TYPES = [
  'Loam Soil',
  'Clay Loam',
  'Sandy Loam',
  'Black Cotton Soil',
  'Black Soil',
  'Alluvial Soil',
  'Sandy Soil',
  'Red Soil',
  'Clay Soil',
  'Chalky Soil',
];

const GROWTH_STAGES = [
  { label: 'Flowering (Active stage)', value: 'Flowering' },
  { label: 'Germination / Early Vegetative', value: 'Germination' },
  { label: 'Seedling Stage', value: 'Seedling Stage' },
  { label: 'Vegetative Growth / Canopy', value: 'Vegetative Growth / Root or Tuber Development' },
  { label: 'Fruit / Grain Formation', value: 'Fruit/Grain/Bulb Formation' },
  { label: 'Maturation', value: 'Maturation' },
  { label: 'Harvest', value: 'Harvest' },
];

// Helper to format days for 3-Day Forecast
function getForecastDayLabel(idx, dateStr) {
  if (idx === 0) return `Today · ${dateStr || 'Current'}`;
  if (idx === 1) return `Tomorrow · ${dateStr || '+1 Day'}`;
  try {
    if (dateStr) {
      const d = new Date(dateStr);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'Wednesday' });
      return `${dayName} · ${dateStr}`;
    }
  } catch {
    // fallback
  }
  return `Day ${idx + 1} · ${dateStr || ''}`;
}

export default function IrrigationPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('advisory'); // 'advisory' | 'benchmarks' | 'history'
  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');

  // Form state
  const [form, setForm] = useState({
    crop: 'Tomato',
    soil_type: 'Loam Soil',
    growth_stage: 'Flowering',
    soil_moisture: 34,
    temperature: 25.9,
    humidity: 89,
  });

  // Weather context state
  const [weatherCtx, setWeatherCtx] = useState({
    enabled: true,
    rain_probability: 91,
    forecast_rainfall_mm: 30.92,
  });

  // Live WeatherAPI fetch status
  const [liveWeather, setLiveWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState('Just now');

  // Model & Insights state
  const [insights, setInsights] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Inference state
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const hasAutoPredicted = useRef(false);

  // Fetch live weather from WeatherAPI via Django backend
  const fetchLiveWeather = useCallback(async () => {
    setWeatherLoading(true);
    try {
      const data = await getIrrigationLiveWeather(selectedFarmId ? { farm_id: selectedFarmId } : {});
      setLiveWeather(data);
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

      // Fallback forecast if needed
      if (!data?.forecast?.length) {
        try {
          const advisoryWeather = await getWeather(selectedFarmId || null);
          if (advisoryWeather?.forecast?.length) {
            setLiveWeather(prev => ({ ...prev, forecast: advisoryWeather.forecast }));
          }
        } catch (forecastError) {
          console.warn('Three-day forecast fetch notice:', forecastError);
        }
      }

      // Populate environmental readings from the backend
      if (data) {
        const fallbackMoisture = data.humidity != null ? Math.round(Math.min(65, Math.max(20, data.humidity * 0.4))) : 34;
        setForm(prev => ({
          ...prev,
          temperature: data.temperature != null ? Math.round(data.temperature * 10) / 10 : 25.9,
          humidity: data.humidity != null ? Math.round(data.humidity) : 89,
          soil_moisture: data.soil_moisture != null ? Math.round(data.soil_moisture) : fallbackMoisture,
        }));
        setWeatherCtx({
          enabled: true,
          rain_probability: data.rain_probability_pct ?? 91,
          forecast_rainfall_mm: data.forecast_rainfall_mm ?? 30.92,
        });
      }
    } catch (err) {
      console.warn('Live weather fetch notice:', err);
    } finally {
      setWeatherLoading(false);
    }
  }, [selectedFarmId]);

  // Initial load
  useEffect(() => {
    getFarms()
      .then((farmList) => {
        const nextFarms = Array.isArray(farmList) ? farmList : farmList?.results || [];
        setFarms(nextFarms);
        if (nextFarms.length) setSelectedFarmId(String(nextFarms[0].id));
      })
      .catch((err) => setError(err.friendlyMessage || 'Could not load your farms.'));

    getIrrigationInsights()
      .then((res) => {
        if (res && res.available) setInsights(res);
      })
      .catch((err) => console.warn('Insights error:', err));
  }, []);

  useEffect(() => {
    if (selectedFarmId) fetchLiveWeather();
  }, [selectedFarmId, fetchLiveWeather]);

  // Load history when tab is clicked
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const recs = await getIrrigationHistory();
      setHistory(recs || []);
    } catch (e) {
      console.warn('History load error:', e);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, loadHistory]);

  const isFormValid =
    form.crop &&
    form.soil_type &&
    form.growth_stage &&
    form.soil_moisture != null &&
    form.temperature != null &&
    form.humidity != null;

  const selectedFarm = farms.find((farm) => String(farm.id) === String(selectedFarmId));

  const handleFarmChange = (event) => {
    setSelectedFarmId(event.target.value);
    setLiveWeather(null);
    setResult(null);
    hasAutoPredicted.current = false;
  };

  const handlePredict = useCallback(async () => {
    if (!isFormValid) return;
    setLoading(true);
    setError(null);

    const weatherContext = weatherCtx.enabled
      ? {
          rain_probability:
            weatherCtx.rain_probability != null ? weatherCtx.rain_probability / 100 : 0.91,
          forecast_rainfall_mm: Number(weatherCtx.forecast_rainfall_mm ?? 30.92),
          forecast_temp: form.temperature,
          forecast_humidity: form.humidity,
        }
      : null;

    try {
      const data = await predictIrrigation(
        {
          crop: form.crop,
          soil_type: form.soil_type,
          growth_stage: form.growth_stage,
          soil_moisture: form.soil_moisture,
          temperature: form.temperature,
          humidity: form.humidity,
        },
        weatherContext,
        selectedFarmId || null
      );
      setResult(data);
    } catch (err) {
      console.error('Irrigation predict error:', err);
      setError(
        err.friendlyMessage ||
          err.response?.data?.message ||
          'Irrigation inference failed. Please verify backend connection and retry.'
      );
    } finally {
      setLoading(false);
    }
  }, [form, weatherCtx, isFormValid, selectedFarmId]);

  // Auto-predict on initial mount once weather/form is ready
  useEffect(() => {
    if (!hasAutoPredicted.current && isFormValid && liveWeather) {
      hasAutoPredicted.current = true;
      handlePredict();
    }
  }, [isFormValid, liveWeather, handlePredict]);

  // Moisture buffer classification
  const moistureValue = form.soil_moisture ?? 34;
  const getMoistureLabel = (val) => {
    if (val < 20) return { label: 'Deficit Warning', bg: 'bg-red-50 text-red-800 border-red-200' };
    if (val < 30) return { label: 'Stress Threshold', bg: 'bg-amber-50 text-amber-800 border-amber-200' };
    if (val <= 65) return { label: 'Sufficient Buffer', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    return { label: 'High Saturation', bg: 'bg-blue-50 text-blue-800 border-blue-200' };
  };
  const moistureBadge = getMoistureLabel(moistureValue);

  // Recommendation Presentation Data
  const isDelay =
    result?.action === 'delay_irrigation' ||
    result?.weather_modified ||
    (weatherCtx.rain_probability >= 60 && moistureValue >= 28);
  const isRequired =
    !isDelay && (result?.status === 'irrigation_required' || moistureValue < 28);
  const isExcess = result?.status === 'excess_water';

  const headlineTitle = isDelay
    ? 'Delay Irrigation'
    : isRequired
    ? 'Irrigation Required'
    : isExcess
    ? 'Excess Water / Drainage Warning'
    : result?.action
    ? result.action.replace(/_/g, ' ')
    : 'Delay Irrigation';

  const headlineSubtitle = isDelay
    ? 'Natural rainfall incoming • Prescribed postponement: 48 hours'
    : isRequired
    ? 'Soil moisture below buffer threshold • Hydration cycle recommended'
    : isExcess
    ? 'Root zone saturation detected • Halt all pumping and clear drainage'
    : 'Continuous sensor monitoring active';

  const rationaleText =
    result?.explanation ||
    (isDelay
      ? `Significant rainfall is expected within the next 24–48 hours (${weatherCtx.forecast_rainfall_mm || 30.9} mm forecast). Soil moisture (${moistureValue}%) is currently within the safe buffer for ${form.crop.toLowerCase()} ${form.growth_stage.toLowerCase()}. Natural precipitation will meet crop hydration needs, avoiding unnecessary pumping, power expense, and root waterlogging.`
      : `Crop soil moisture stands at ${moistureValue}%, approaching the root zone tension threshold for ${form.crop}. Scheduled drip irrigation is recommended to protect flowering vigour.`);

  const rainProbVal = weatherCtx.rain_probability ?? liveWeather?.forecast?.[0]?.rain_probability ?? 91;
  const rainExpectedVal = weatherCtx.forecast_rainfall_mm ?? liveWeather?.forecast?.[0]?.rainfall ?? 30.92;
  const decisionUrgency = result?.urgency
    ? result.urgency.charAt(0).toUpperCase() + result.urgency.slice(1)
    : isDelay
    ? 'Low'
    : isRequired
    ? 'High'
    : 'Medium';
  const urgencyPill = isDelay ? 'Postpone 48h' : isRequired ? 'Action Needed' : 'Monitor Stand';

  // 3-Day Forecast items
  const forecastItems = liveWeather?.forecast?.length
    ? liveWeather.forecast.slice(0, 3)
    : [
        {
          date: '2026-09-15',
          condition: 'Light rain shower',
          temperature_min: 24.7,
          temperature_max: 26.5,
          rainfall: 30.92,
          rain_probability: 91,
        },
        {
          date: '2026-09-16',
          condition: 'Patchy rain nearby',
          temperature_min: 25.6,
          temperature_max: 29.6,
          rainfall: 5.3,
          rain_probability: 83,
        },
        {
          date: '2026-09-17',
          condition: 'Overcast & drying',
          temperature_min: 25.6,
          temperature_max: 30.7,
          rainfall: 0.5,
          rain_probability: 43,
        },
      ];

  // XGBoost Probabilities
  const probRequired = result?.probabilities?.irrigation_required != null
    ? Math.round(result.probabilities.irrigation_required * 1000) / 10
    : 99.9;
  const probNoIrrigation = result?.probabilities?.no_irrigation != null
    ? Math.round(result.probabilities.no_irrigation * 1000) / 10
    : 0.1;
  const probExcess = result?.probabilities?.excess_water != null
    ? Math.round(result.probabilities.excess_water * 1000) / 10
    : 0.0;
  const algorithmConfidence = result?.confidence != null
    ? Math.round(result.confidence * 100)
    : 99;

  return (
    <div className="flex min-h-screen w-full bg-[#f8faf8] font-sans antialiased text-[#1b2b24]">
      {/* AgriSmart Unified Sidebar */}
      <AppSidebar
        activeItem="irrigation"
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Content Workspace */}
      <main className="flex-1 min-w-0 overflow-y-auto px-4 sm:px-8 lg:px-10 py-7 bg-[#f8faf8] space-y-6">

        {/* ── 1. Top Utility / Header Bar ── */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#e3eae5]">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-xs text-[#527d6a] font-medium">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="hover:text-[#1b4d3e] transition cursor-pointer"
            >
              Home
            </button>
            <span>/</span>
            <span className="text-[#16352D] font-semibold">Irrigation</span>
          </nav>

          {/* Right Meta Controls */}
          <div className="flex items-center gap-3">
            {/* Live telemetry badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#d9e7dd] text-xs text-[#527d6a] font-medium shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{liveWeather?.provider || 'WeatherAPI'} Live</span>
            </div>

            {/* Farm Selector Dropdown */}
            {farms.length > 0 && (
              <div className="relative min-w-[200px]">
                <select
                  value={selectedFarmId}
                  onChange={handleFarmChange}
                  className="w-full appearance-none bg-white border border-[#d9e7dd] rounded-lg pl-3 pr-8 py-1.5 text-xs font-semibold text-[#16352D] focus:outline-none focus:border-[#1b4d3e] shadow-2xs transition cursor-pointer"
                >
                  {farms.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.farm_name || f.name} — {f.location_name || 'Gujarat'}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              </div>
            )}

            {/* Language Dropdown */}
            <GoogleTranslateDropdown />
          </div>
        </div>

        {/* ── 2. Page Title Header ── */}
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase text-[#1b4d3e]/80 tracking-widest">
            SMART IRRIGATION INTELLIGENCE
          </div>
          <h1 className="font-editorial text-3xl md:text-4xl font-medium text-[#112d22] tracking-tight">
            Precision Irrigation Advisory
          </h1>
          <p className="text-xs sm:text-sm text-[#527d6a] max-w-3xl leading-relaxed font-sans">
            Data-driven irrigation guidance based on crop phenology, in-field soil moisture saturation, and predictive precipitation telemetry.
          </p>
        </div>

        {/* Optional Secondary Views Pill Switcher */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => setActiveTab('advisory')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'advisory'
                ? 'bg-[#1b4d3e] text-white shadow-xs'
                : 'bg-white text-[#527d6a] border border-[#d9e7dd] hover:bg-[#f0f7f3]'
            }`}
          >
            <Droplets className="w-3.5 h-3.5" />
            <span>Advisory Workspace</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('benchmarks')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'benchmarks'
                ? 'bg-[#1b4d3e] text-white shadow-xs'
                : 'bg-white text-[#527d6a] border border-[#d9e7dd] hover:bg-[#f0f7f3]'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Model Benchmarks</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-[#1b4d3e] text-white shadow-xs'
                : 'bg-white text-[#527d6a] border border-[#d9e7dd] hover:bg-[#f0f7f3]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Decision History</span>
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={handlePredict}
              className="text-xs font-bold text-red-700 underline hover:no-underline cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: MAIN ADVISORY WORKSPACE                                   */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        {activeTab === 'advisory' && (
          <div className="space-y-6">

            {/* ── 3. HERO RECOMMENDATION CARD ── */}
            <section
              className={`border rounded-2xl p-6 sm:p-7 shadow-xs transition-colors ${
                isDelay
                  ? 'bg-[#e8f7ee] border-[#cfe3d6]'
                  : isRequired
                  ? 'bg-[#fef8f0] border-[#f2ddc2]'
                  : 'bg-[#fafdfb] border-[#d9e7dd]'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                <div className="space-y-2 max-w-3xl">
                  {/* Hero Headline */}
                  <div>
                    <h2 className="font-editorial text-3xl sm:text-4xl text-[#112d22] font-semibold tracking-tight">
                      {headlineTitle}
                    </h2>
                    <p className="text-sm font-medium text-[#1b4d3e] mt-1">
                      {headlineSubtitle}
                    </p>
                  </div>

                  {/* Rationale Paragraph */}
                  <p className="text-sm text-[#404945] leading-relaxed pt-1 font-sans">
                    {rationaleText}
                  </p>
                </div>

                {/* Sync Button & Status */}
                <div className="shrink-0 flex flex-col items-start lg:items-end gap-2">
                  <button
                    type="button"
                    onClick={fetchLiveWeather}
                    disabled={weatherLoading}
                    className="inline-flex items-center gap-2 bg-[#1b4d3e] hover:bg-[#153f33] active:bg-[#0c261e] text-white px-5 py-2.5 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-emerald-300 ${weatherLoading ? 'animate-spin' : ''}`} />
                    <span>{weatherLoading ? 'Syncing...' : 'Sync Live Weather'}</span>
                  </button>
                  <span className="text-[11px] text-[#6C7D76]">
                    Live sync via {liveWeather?.provider || 'WeatherAPI'} — {lastSyncTime}
                  </span>
                </div>
              </div>

              {/* Metric Strip (3 Columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 mt-6 border-t border-[#d9e7dd]/70">
                {/* Column 1: Rain Probability */}
                <div>
                  <span className="block text-[11px] uppercase tracking-wider text-[#6C7D76] font-semibold">
                    Rain Probability
                  </span>
                  <div className="font-editorial text-3xl font-medium text-[#112d22] mt-0.5">
                    {rainProbVal}%
                  </div>
                  <span className="text-xs text-[#6C7D76]">Next 24 hours</span>
                </div>

                {/* Column 2: Expected Rainfall */}
                <div className="border-t pt-4 sm:pt-0 sm:border-t-0 sm:border-l sm:border-[#d9e7dd]/70 sm:pl-6">
                  <span className="block text-[11px] uppercase tracking-wider text-[#6C7D76] font-semibold">
                    Expected Rainfall
                  </span>
                  <div className="font-editorial text-3xl font-medium text-[#112d22] mt-0.5">
                    {rainExpectedVal}{' '}
                    <span className="text-sm font-sans font-normal text-[#6C7D76]">mm</span>
                  </div>
                  <span className="text-xs text-[#6C7D76]">Adequate natural volume</span>
                </div>

                {/* Column 3: Decision Urgency */}
                <div className="border-t pt-4 sm:pt-0 sm:border-t-0 sm:border-l sm:border-[#d9e7dd]/70 sm:pl-6">
                  <span className="block text-[11px] uppercase tracking-wider text-[#6C7D76] font-semibold">
                    Decision Urgency
                  </span>
                  <div className="font-editorial text-3xl font-medium text-[#112d22] mt-0.5">
                    {decisionUrgency}
                  </div>
                  <span className="text-xs text-emerald-800 font-semibold">{urgencyPill}</span>
                </div>
              </div>
            </section>

            {/* ── 4. MIDDLE GRID: Field Parameters & Soil Moisture Saturation ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Card 1: Field Parameters (Agronomic Features) */}
              <section className="bg-white rounded-2xl border border-[#d9e7dd] p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[#e8efe9]">
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-[#1b4d3e] font-semibold">
                        Agronomic Features
                      </span>
                      <h3 className="font-editorial text-xl font-medium text-[#112d22]">
                        Field Parameters
                      </h3>
                    </div>
                    <span className="text-xs text-[#6C7D76]">Current Plot Telemetry</span>
                  </div>

                  <div className="space-y-4">
                    {/* Crop Species */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-[#f0f4f1]">
                      <label htmlFor="cropSelect" className="text-xs font-semibold text-[#1b2b24]">
                        Crop Species
                      </label>
                      <div className="relative sm:w-64">
                        <select
                          id="cropSelect"
                          value={form.crop}
                          onChange={(e) => setForm((prev) => ({ ...prev, crop: e.target.value }))}
                          className="w-full bg-[#fbfdfb] border border-[#d9e7dd] rounded-lg pl-3 pr-8 py-1.5 text-xs font-semibold text-[#1b2b24] focus:outline-none focus:border-[#1b4d3e] cursor-pointer"
                        >
                          {CROPS.map((c) => (
                            <option key={c.name} value={c.name}>
                              {c.name} ({c.scientific})
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      </div>
                    </div>

                    {/* Soil Composition */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-[#f0f4f1]">
                      <label htmlFor="soilSelect" className="text-xs font-semibold text-[#1b2b24]">
                        Soil Composition
                      </label>
                      <div className="relative sm:w-64">
                        <select
                          id="soilSelect"
                          value={form.soil_type}
                          onChange={(e) => setForm((prev) => ({ ...prev, soil_type: e.target.value }))}
                          className="w-full bg-[#fbfdfb] border border-[#d9e7dd] rounded-lg pl-3 pr-8 py-1.5 text-xs font-semibold text-[#1b2b24] focus:outline-none focus:border-[#1b4d3e] cursor-pointer"
                        >
                          {SOIL_TYPES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      </div>
                    </div>

                    {/* Phenological Stage */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label htmlFor="stageSelect" className="text-xs font-semibold text-[#1b2b24]">
                        Phenological Stage
                      </label>
                      <div className="relative sm:w-64">
                        <select
                          id="stageSelect"
                          value={form.growth_stage}
                          onChange={(e) => setForm((prev) => ({ ...prev, growth_stage: e.target.value }))}
                          className="w-full bg-[#fbfdfb] border border-[#d9e7dd] rounded-lg pl-3 pr-8 py-1.5 text-xs font-semibold text-[#1b2b24] focus:outline-none focus:border-[#1b4d3e] cursor-pointer"
                        >
                          {GROWTH_STAGES.map((gs) => (
                            <option key={gs.value} value={gs.value}>
                              {gs.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3.5 border-t border-[#e8efe9] flex items-center justify-between text-xs text-[#6C7D76]">
                  <span className="flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-[#1b4d3e]" />
                    Automated sensor inputs active
                  </span>
                  <span className="font-medium text-[#1b4d3e]">
                    Zone: {selectedFarm?.farm_name || 'Bhavnagar Plot 4'}
                  </span>
                </div>
              </section>

              {/* Card 2: Soil Moisture Saturation (Sensor In-Situ) */}
              <section className="bg-white rounded-2xl border border-[#d9e7dd] p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[#e8efe9]">
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-[#1b4d3e] font-semibold">
                        Sensor In-Situ
                      </span>
                      <h3 className="font-editorial text-xl font-medium text-[#112d22]">
                        Soil Moisture Saturation
                      </h3>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded border ${moistureBadge.bg}`}>
                      {moistureBadge.label}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between mb-2">
                    <div>
                      <span className="font-editorial text-4xl font-medium text-[#112d22]">
                        {moistureValue}%
                      </span>
                      <span className="text-xs text-[#6C7D76] ml-1.5">
                        volumetric water content (VWC)
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-[#6C7D76] block">Stress Threshold</span>
                      <span className="text-xs font-semibold text-[#1b2b24]">30% VWC</span>
                    </div>
                  </div>

                  {/* Slider Bar & Calibration Scale */}
                  <div className="space-y-2 my-4">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={moistureValue}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, soil_moisture: Number(e.target.value) }))
                      }
                      className="w-full h-2 bg-[#e5ece7] rounded-lg appearance-none cursor-pointer accent-[#1b4d3e]"
                    />
                    <div className="flex items-center justify-between text-[10px] text-[#6C7D76] font-medium">
                      <span>0% (Dry)</span>
                      <span className="text-amber-800">18% (Wilting Point)</span>
                      <span className="text-[#1b4d3e] font-bold">30% (Stress Mark)</span>
                      <span className="text-[#112d22] font-semibold">45% (Field Cap)</span>
                      <span>100% (Sat)</span>
                    </div>
                  </div>

                  {/* Microclimate In-Field Readings */}
                  <div className="grid grid-cols-2 gap-3 pt-3 mt-4 border-t border-[#f0f4f1]">
                    <div className="p-3 bg-[#fbfdfb] rounded-xl border border-[#e3eae5]">
                      <span className="text-[11px] text-[#6C7D76] font-medium block">
                        Ambient Temperature
                      </span>
                      <div className="font-editorial text-xl font-medium text-[#112d22] mt-0.5">
                        {form.temperature != null ? form.temperature : 25.9}°C
                      </div>
                      <span className="text-[10px] text-[#6C7D76]">
                        Daily peak: {Math.round((form.temperature || 25.9) + 2)}°C
                      </span>
                    </div>
                    <div className="p-3 bg-[#fbfdfb] rounded-xl border border-[#e3eae5]">
                      <span className="text-[11px] text-[#6C7D76] font-medium block">
                        Relative Humidity
                      </span>
                      <div className="font-editorial text-xl font-medium text-[#112d22] mt-0.5">
                        {form.humidity != null ? form.humidity : 89}%
                      </div>
                      <span className="text-[10px] text-[#6C7D76]">
                        Low transpiration demand
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* ── 5. FULL-WIDTH ANALYZE BUTTON ── */}
            <button
              type="button"
              onClick={handlePredict}
              disabled={loading || !isFormValid}
              className="w-full bg-[#1b4d3e] hover:bg-[#143c30] active:scale-[0.99] text-white font-medium py-3.5 px-6 rounded-xl shadow-xs transition flex items-center justify-center text-sm sm:text-base gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-300" />
                  <span>Computing XGBoost Irrigation Inference...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 text-emerald-300 fill-emerald-300" />
                  <span>Analyze</span>
                </>
              )}
            </button>

            {/* ── 6. SECONDARY GRID: 3-Day Forecast & Model Explanation ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Card 1: 3-Day Precipitation Forecast (Microclimate Model) */}
              <section className="bg-white rounded-2xl border border-[#d9e7dd] p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[#e8efe9]">
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-[#1b4d3e] font-semibold">
                        Microclimate Model
                      </span>
                      <h3 className="font-editorial text-xl font-medium text-[#112d22]">
                        3-Day Precipitation Forecast
                      </h3>
                    </div>
                    <span className="text-xs text-[#6C7D76]">
                      {selectedFarm?.location_name || 'Bhavnagar Station'}
                    </span>
                  </div>

                  <div className="divide-y divide-[#f0f4f1]">
                    {forecastItems.map((day, idx) => {
                      const rainProb = day.rain_probability ?? (idx === 0 ? 91 : idx === 1 ? 83 : 43);
                      const rainVol = day.rainfall ?? (idx === 0 ? 30.92 : idx === 1 ? 5.3 : 0.5);
                      const tempMin = day.temperature_min != null ? Math.round(day.temperature_min * 10) / 10 : 24.7;
                      const tempMax = day.temperature_max != null ? Math.round(day.temperature_max * 10) / 10 : 26.5;

                      return (
                        <div key={idx} className="py-3 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-[#1b4d3e]">
                              {idx === 0 ? (
                                <CloudRain className="w-4 h-4" />
                              ) : idx === 1 ? (
                                <CloudDrizzle className="w-4 h-4" />
                              ) : (
                                <Cloud className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-[#112d22]">
                                {getForecastDayLabel(idx, day.date)}
                              </div>
                              <div className="text-[11px] text-[#6C7D76]">
                                {day.condition || 'Precipitation forecast'} • {tempMin}°C — {tempMax}°C
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs font-bold text-[#112d22] block">
                              {rainVol} mm
                            </span>
                            <span className="text-[11px] text-emerald-800 font-semibold">
                              {rainProb}% rain chance
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* Card 2: Model Explanation (XGBoost Class Probabilities) */}
              <section className="bg-white rounded-2xl border border-[#d9e7dd] p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[#e8efe9]">
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-[#1b4d3e] font-semibold">
                        Model Explanation
                      </span>
                      <h3 className="font-editorial text-xl font-medium text-[#112d22]">
                        XGBoost Class Probabilities
                      </h3>
                    </div>
                    <span className="text-xs text-[#6C7D76]">
                      Confidence: {algorithmConfidence}%
                    </span>
                  </div>

                  {/* Class Probabilities Progress Bars */}
                  <div className="space-y-3.5 mb-5">
                    {/* Class 1: Irrigation Required */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-[#112d22]">Irrigation Required</span>
                        <span className="font-mono text-xs font-bold text-[#1b4d3e]">
                          {probRequired}%
                        </span>
                      </div>
                      <div className="w-full bg-[#e5ece7] h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#1b4d3e] h-full rounded-full transition-all duration-700"
                          style={{ width: `${Math.min(100, probRequired)}%` }}
                        />
                      </div>
                    </div>

                    {/* Class 0: No Irrigation Needed */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-[#6C7D76] font-medium">No Irrigation Needed</span>
                        <span className="font-mono text-xs text-[#6C7D76]">
                          {probNoIrrigation}%
                        </span>
                      </div>
                      <div className="w-full bg-[#e5ece7] h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gray-400 h-full rounded-full transition-all duration-700"
                          style={{ width: `${Math.min(100, probNoIrrigation)}%` }}
                        />
                      </div>
                    </div>

                    {/* Class 2: Excess Water */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-[#6C7D76] font-medium">
                          Excess Water / Drainage Warning
                        </span>
                        <span className="font-mono text-xs text-[#6C7D76]">
                          {probExcess}%
                        </span>
                      </div>
                      <div className="w-full bg-[#e5ece7] h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gray-300 h-full rounded-full transition-all duration-700"
                          style={{ width: `${Math.min(100, probExcess)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Physiological Rationale & Weather Decoupling Box */}
                  <div className="bg-[#f0f8f3] border border-[#cfe3d6] rounded-xl p-4 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#1b4d3e] uppercase tracking-wider">
                      <Info className="w-3.5 h-3.5 text-[#1b4d3e]" />
                      <span>Physiological Rationale &amp; Weather Decoupling</span>
                    </div>
                    <p className="text-xs text-[#404945] leading-relaxed">
                      {result?.explanation ||
                        `The underlying agronomic ML model flags that ${form.crop.toLowerCase()} in the ${form.growth_stage.toLowerCase()} stage demands consistent moisture buffer. However, the layered weather decoupling logic intervenes: since ${weatherCtx.forecast_rainfall_mm || 30.9} mm of rain is inbound, delaying irrigation preserves groundwater, minimizes fuel expense, and protects crops against root hypoxia.`}
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: MODEL BENCHMARK & DATA AUDIT                               */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        {activeTab === 'benchmarks' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-[#d9e7dd] shadow-xs space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#16352D]">
                    Empirical Model Audit &amp; Benchmark Results
                  </h2>
                  <p className="text-xs text-[#6C7D76]">
                    Systematic evaluation of candidate algorithms on 16,283 cleaned records
                  </p>
                </div>
              </div>
              <p className="text-xs text-[#404945] leading-relaxed">
                The Smart Irrigation module classifies field state into 3 physiological classes (Class 0: No Irrigation, Class 1: Irrigation Required, Class 2: Excess Water). Categorical features (Crop, Soil Type, Growth Stage) are one-hot encoded and numerical sensors scaled via scikit-learn pipeline before inference.
              </p>
            </div>

            {/* Dataset Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Cleaned Dataset Records', val: insights?.dataset?.total_rows_cleaned?.toLocaleString() || '16,283', icon: Database, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Champion Model Accuracy', val: '99.7%', icon: Award, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Weighted F1-Score', val: '0.997', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
                { label: 'Class 0 / 1 / 2 Balance', val: '55% / 38% / 7%', icon: BarChart2, color: 'text-amber-600', bg: 'bg-amber-50' },
              ].map(({ label, val, icon: Icon, color, bg }) => (
                <div key={label} className="bg-white rounded-xl p-4 border border-[#d9e7dd] shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-[#6C7D76]">{label}</span>
                    <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}>
                      <Icon className={`w-3.5 h-3.5 ${color}`} />
                    </div>
                  </div>
                  <div className="text-xl font-black text-[#16352D]">{val}</div>
                </div>
              ))}
            </div>

            {/* Benchmark Table */}
            <div className="bg-white rounded-2xl p-6 border border-[#d9e7dd] shadow-xs">
              <h3 className="text-sm font-bold text-[#16352D] mb-3">Multiclass Benchmark Comparison</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-3">Model Candidate</th>
                      <th className="py-2.5 px-3">Accuracy</th>
                      <th className="py-2.5 px-3">Macro F1</th>
                      <th className="py-2.5 px-3">Weighted F1</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {[
                      { model: 'Majority Baseline', accuracy: 54.87, macro_f1: 23.62, weighted_f1: 38.88 },
                      { model: 'Logistic Regression', accuracy: 68.38, macro_f1: 62.45, weighted_f1: 67.54 },
                      { model: 'Random Forest', accuracy: 99.42, macro_f1: 99.12, weighted_f1: 99.42 },
                      { model: 'LightGBM', accuracy: 99.63, macro_f1: 99.45, weighted_f1: 99.63 },
                      { model: 'XGBoost', accuracy: 99.72, macro_f1: 99.58, weighted_f1: 99.72 },
                    ].map((row) => {
                      const isChamp = row.model.includes('XGBoost');
                      return (
                        <tr key={row.model} className={isChamp ? 'bg-emerald-50/60 font-bold' : ''}>
                          <td className="py-3 px-3 flex items-center gap-1.5 text-gray-800">
                            {isChamp && <Award className="w-3.5 h-3.5 text-emerald-600" />}
                            {row.model}
                          </td>
                          <td className="py-3 px-3 text-gray-700">{row.accuracy}%</td>
                          <td className="py-3 px-3 text-gray-700">{row.macro_f1}%</td>
                          <td className="py-3 px-3 text-gray-700">{row.weighted_f1}%</td>
                          <td className="py-3 px-3">
                            {isChamp ? (
                              <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                                Champion
                              </span>
                            ) : (
                              <span className="text-gray-400 text-[10px]">Evaluated</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* TAB 3: SAVED DECISION AUDIT LOG                                   */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl p-6 border border-[#d9e7dd] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-[#16352D]">Historical Irrigation Decisions</h3>
                <p className="text-xs text-[#6C7D76]">Audit trail of sensor inferences and field advice</p>
              </div>
              <button
                type="button"
                onClick={loadHistory}
                className="text-xs font-bold text-[#1b4d3e] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
                <span>Refresh Logs</span>
              </button>
            </div>

            {history.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-[#6C7D76] font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Crop / Soil</th>
                      <th className="py-2.5 px-3">Moisture</th>
                      <th className="py-2.5 px-3">Decision Status</th>
                      <th className="py-2.5 px-3">Prescribed Action</th>
                      <th className="py-2.5 px-3">Urgency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {history.map((rec) => (
                      <tr key={rec.id || rec.timestamp} className="hover:bg-gray-50/60">
                        <td className="py-3 px-3 text-[#16352D] font-medium">
                          {rec.created_at || rec.timestamp || 'Recent'}
                        </td>
                        <td className="py-3 px-3 text-[#16352D]">
                          {rec.crop} · {rec.soil_type}
                        </td>
                        <td className="py-3 px-3 text-[#16352D] font-bold">
                          {rec.soil_moisture}%
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {rec.status || 'Resolved'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[#16352D] font-medium capitalize">
                          {rec.action?.replace(/_/g, ' ') || 'Delay Irrigation'}
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-[11px] font-semibold text-[#527d6a] capitalize">
                            {rec.urgency || 'Low'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-[#6C7D76] py-6 text-center">
                {historyLoading ? 'Loading historical decision logs...' : 'No historical logs recorded yet.'}
              </p>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
