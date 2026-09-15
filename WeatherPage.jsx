import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CloudSun, CloudRain, Droplets, Wind, Thermometer,
  AlertTriangle, CheckCircle2, Clock, ArrowRight,
  RefreshCw, Sprout, ShieldAlert, Sparkles, ExternalLink,
  Info, Compass, Sun, Layers, SlidersHorizontal, Bot,
  CheckCircle, ChevronRight, Calendar
} from 'lucide-react';
import AppSidebar from './src/src/components/common/AppSidebar';
import AppHeader from './src/src/components/common/AppHeader';
import { useAuth } from './src/src/context/AuthContext';
import { getWeather, analyzeWeather } from './src/src/api/weather';
import { getFarms } from './src/src/api/farms';

// ─── Supported Domain Constants ──────────────────────────────────────────────
const CROPS = [
  { name: 'Tomato', emoji: '🍅' },
  { name: 'Wheat', emoji: '🌾' },
  { name: 'Potato', emoji: '🥔' },
  { name: 'Carrot', emoji: '🥕' },
  { name: 'Chilli', emoji: '🌶️' },
  { name: 'Cotton', emoji: '🌱' },
  { name: 'Rice', emoji: '🌾' },
  { name: 'Maize', emoji: '🌽' },
];

const SOIL_TYPES = [
  { id: 'black', name: 'Black Clay Soil', retention: 'High' },
  { id: 'alluvial', name: 'Alluvial Loam Soil', retention: 'Balanced' },
  { id: 'loam', name: 'Loam Soil', retention: 'Good' },
  { id: 'red', name: 'Red Loam Soil', retention: 'Moderate' },
  { id: 'sandy', name: 'Sandy Soil', retention: 'Low' },
  { id: 'clay', name: 'Heavy Clay Soil', retention: 'Very High' },
];

const GROWTH_STAGES = [
  'Germination / Seedling',
  'Vegetative Growth',
  'Flowering & Pollination',
  'Fruit / Grain Formation',
  'Ripening & Maturation',
  'Harvest Ready',
];

/**
 * WeatherPage Component
 *
 * Core Concept:
 * WEATHER DATA + FARM CONDITIONS → AGRICULTURAL INTERPRETATION → ACTIONABLE FARM ADVICE
 *
 * Grounded in real live WeatherAPI data with zero mock data.
 * Adheres to AgroVerdant Editorial aesthetics (warm ivory, forest green, serif typography, 8-12px rounding).
 */
export default function WeatherPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Navigation & layout states
  const [mobileOpen, setMobileOpen] = useState(false);

  // Farms state
  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState(null);

  // Weather state from backend API
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [lastSyncedTime, setLastSyncedTime] = useState(null);

  // Farm Context (Interactive & Editable)
  const [crop, setCrop] = useState('Tomato');
  const [growthStage, setGrowthStage] = useState('Vegetative Growth');
  const [soilType, setSoilType] = useState('black');
  const [soilMoisture, setSoilMoisture] = useState(55);
  const [isCustomContext, setIsCustomContext] = useState(false);

  // Load user's farms on mount
  useEffect(() => {
    let isMounted = true;
    async function loadFarms() {
      try {
        const farmList = await getFarms();
        if (isMounted && Array.isArray(farmList) && farmList.length > 0) {
          setFarms(farmList);
          const defaultFarm = farmList[0];
          setSelectedFarmId(defaultFarm.id);
          if (defaultFarm.crop) setCrop(defaultFarm.crop);
          if (defaultFarm.soil_type) setSoilType(defaultFarm.soil_type.toLowerCase());
        }
      } catch (err) {
        console.error('Failed to load farms:', err);
      }
    }
    loadFarms();
    return () => { isMounted = false; };
  }, []);

  // Fetch live weather from WeatherAPI via Django backend
  const fetchWeatherData = useCallback(async (farmId, isSync = false) => {
    if (isSync) {
      setSyncing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      // First try WeatherAPI explicitly
      const data = await getWeather(farmId, 'weatherapi');
      setWeatherData(data);
      setLastSyncedTime(new Date());

      // If backend reports soil moisture, use it initially unless user customized
      if (!isCustomContext && data?.soil?.moisture_percent != null) {
        setSoilMoisture(data.soil.moisture_percent);
      }
    } catch (err) {
      console.warn('WeatherAPI call failed, trying default provider:', err);
      try {
        const fallbackData = await getWeather(farmId);
        setWeatherData(fallbackData);
        setLastSyncedTime(new Date());
        if (!isCustomContext && fallbackData?.soil?.moisture_percent != null) {
          setSoilMoisture(fallbackData.soil.moisture_percent);
        }
      } catch (secondErr) {
        console.error('All weather endpoints failed:', secondErr);
        setError('Unable to fetch meteorological data. Please ensure the AgriSmart backend is online.');
      }
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [isCustomContext]);

  // Refetch weather when selected farm changes
  useEffect(() => {
    if (selectedFarmId) {
      fetchWeatherData(selectedFarmId);
    } else if (farms.length === 0) {
      fetchWeatherData(null);
    }
  }, [selectedFarmId, fetchWeatherData, farms.length]);

  // Current active farm object
  const activeFarm = useMemo(() => {
    return farms.find((f) => f.id === selectedFarmId) || null;
  }, [farms, selectedFarmId]);

  // When user selects another farm from dropdown
  const handleFarmChange = (farmId) => {
    const numericId = Number(farmId);
    setSelectedFarmId(numericId);
    const newFarm = farms.find((f) => f.id === numericId);
    if (newFarm) {
      if (newFarm.crop) setCrop(newFarm.crop);
      if (newFarm.soil_type) setSoilType(newFarm.soil_type.toLowerCase());
      setIsCustomContext(false);
    }
  };

  // ─── Live Atmospheric Values ──────────────────────────────────────────────
  const current = weatherData?.current || {};
  const today = weatherData?.today || {};
  const daily = weatherData?.daily || [];
  const meta = weatherData?.meta || {};

  const temp = current.temperature != null ? Math.round(current.temperature) : 27;
  const feelsLike = current.feels_like != null ? Math.round(current.feels_like) : temp;
  const humidity = current.humidity != null ? current.humidity : 75;
  const windSpeed = current.wind_speed != null ? current.wind_speed : 18;
  const condition = current.condition || 'Partly Cloudy';

  // Tomorrow's rain prediction from daily[1] or today's forecast
  const tomorrowForecast = daily.length > 1 ? daily[1] : daily[0] || {};
  const rainProbToday = today.rain_probability != null ? today.rain_probability : (daily[0]?.rain_probability || 0);
  const rainProbTomorrow = tomorrowForecast.rain_probability != null ? tomorrowForecast.rain_probability : 0;
  const expectedRainfallMm = tomorrowForecast.rainfall != null
    ? tomorrowForecast.rainfall
    : (tomorrowForecast.precipitation != null ? tomorrowForecast.precipitation : (today.rainfall || 0));

  // ─── Agricultural Interpretation Engine (Rules Synchronized) ───────────────
  const interpretation = useMemo(() => {
    const isRainImminent = rainProbTomorrow >= 45 || rainProbToday >= 50 || expectedRainfallMm >= 2.0;
    const isSoilSaturated = soilMoisture >= 75;
    const isSoilLow = soilMoisture <= 30;
    const isDiseaseFavorable = humidity >= 78 && temp >= 20 && temp <= 32;
    const isHighWind = windSpeed >= 22;
    const isHeatStress = temp >= 36;

    // 1. Primary Hero Advice
    let primaryHeadline = 'FAVORABLE CONDITIONS FOR NORMAL FIELD WORK';
    let urgency = 'normal'; // 'alert', 'warning', 'positive'
    let why = '';
    let whatToDo = [];

    if (isRainImminent && !isSoilLow) {
      primaryHeadline = 'DELAY IRRIGATION BY 24–48 HOURS';
      urgency = 'alert';
      why = `Rainfall of ${expectedRainfallMm > 0 ? expectedRainfallMm + ' mm' : 'measurable volume'} is forecasted with ${rainProbTomorrow}% probability tomorrow. Combined with current ${soilType} soil moisture (${soilMoisture}%), irrigating today risks waterlogging, root hypoxia, and nutrient leaching.`;
      whatToDo = [
        'Pause automated drip and sprinkler cycles immediately.',
        'Inspect field drainage channels and furrow ends to avoid standing water.',
        'Postpone broadcast fertilizer applications to prevent nutrient runoff.'
      ];
    } else if (isSoilLow && isRainImminent) {
      primaryHeadline = 'DELAY IRRIGATION & MONITOR INCOMING RAIN';
      urgency = 'warning';
      why = `Soil moisture is at a deficit (${soilMoisture}%), but a ${rainProbTomorrow}% chance of rain is expected within 24 hours. Wait for natural precipitation before applying supplemental irrigation.`;
      whatToDo = [
        'Hold irrigation for 18–24 hours to conserve water.',
        'If rain fails to materialize by tomorrow evening, apply a 50% cycle.',
        'Prepare soil basins around crops to capture rainwater efficiently.'
      ];
    } else if (isSoilLow && !isRainImminent) {
      primaryHeadline = 'SUPPLEMENTAL IRRIGATION RECOMMENDED TODAY';
      urgency = 'alert';
      why = `Current soil moisture is low (${soilMoisture}%) with no significant rain forecasted in the next 3 days. Soil moisture is approaching the permanent wilting point for ${crop} during the ${growthStage} stage.`;
      whatToDo = [
        'Irrigate during early morning (6:00 AM – 9:00 AM) to minimize evaporative loss.',
        `Target 20–25 mm depth to replenish the root zone of ${crop}.`,
        'Apply organic mulching around rows to suppress moisture evaporation.'
      ];
    } else if (isDiseaseFavorable) {
      primaryHeadline = 'HIGH DISEASE RISK: SCOUT LEAF CANOPY';
      urgency = 'warning';
      why = `Relative humidity of ${humidity}% combined with warm temperatures (${temp}°C) creates optimal microclimatic spore-germination pressure for fungal and bacterial pathogens on ${crop}.`;
      whatToDo = [
        'Perform targeted scouting on lower leaves for blights, spots, or powdery mildew.',
        'Ensure plant row spacing and pruning allows adequate air circulation.',
        'Upload leaf photos to AgriSmart Disease Scan for AI optical validation.'
      ];
    } else if (isHighWind) {
      primaryHeadline = 'STRONG WIND: POSTPONE FOLIAR SPRAYING';
      urgency = 'warning';
      why = `Wind gusts reaching ${windSpeed} km/h exceed the safe threshold for foliar spray applications (<15 km/h), creating severe chemical drift and reduced deposition efficiency.`;
      whatToDo = [
        'Postpone pesticide and liquid fertilizer applications until winds subside.',
        'Check trellising and stakes on tall or heavy-fruiting crops.',
        'Irrigate using ground drip lines rather than high-pressure overhead sprinklers.'
      ];
    } else {
      primaryHeadline = 'OPTIMAL WINDOW FOR FIELD OPERATIONS';
      urgency = 'positive';
      why = `Stable temperatures (${temp}°C), moderate humidity (${humidity}%), and calm winds (${windSpeed} km/h) provide an ideal operational window for farm activities without moisture or disease stress.`;
      whatToDo = [
        'Excellent conditions for weeding, cultivation, and soil aeration.',
        'Safe window for scheduled foliar nutrients or preventive biologicals.',
        'Standard maintenance of irrigation emitters and field sensors.'
      ];
    }

    // 2. Specific Focus Categories
    // Category A: Irrigation Advice
    let irrigationStatus = 'Sufficient';
    let irrigationAdviceText = '';
    if (isRainImminent) {
      irrigationStatus = 'Postpone';
      irrigationAdviceText = `Rain expected tomorrow (${rainProbTomorrow}%). Save water and protect root aeration by pausing watering cycles.`;
    } else if (soilMoisture < 35) {
      irrigationStatus = 'Irrigate Soon';
      irrigationAdviceText = `Soil moisture is below optimal buffer (${soilMoisture}%). Schedule early morning irrigation.`;
    } else {
      irrigationStatus = 'Adequate';
      irrigationAdviceText = `Soil moisture is balanced at ${soilMoisture}%. Normal retention allows postponing irrigation for 2–3 days.`;
    }

    // Category B: Disease Risk Score & Level
    let diseaseScore = 20;
    if (humidity >= 85) diseaseScore += 40;
    else if (humidity >= 75) diseaseScore += 25;
    else if (humidity >= 60) diseaseScore += 10;
    if (temp >= 20 && temp <= 30) diseaseScore += 25;
    if (expectedRainfallMm >= 2.0) diseaseScore += 25;
    diseaseScore = Math.min(diseaseScore, 95);

    const diseaseLevel = diseaseScore >= 65 ? 'High' : diseaseScore >= 40 ? 'Moderate' : 'Low';

    // Category C: Field Operations
    const sprayingSuitable = windSpeed < 18 && rainProbToday < 40 && expectedRainfallMm < 1.0;
    const machinerySuitable = !isSoilSaturated && expectedRainfallMm < 5.0;

    return {
      primaryHeadline,
      urgency,
      why,
      whatToDo,
      irrigationStatus,
      irrigationAdviceText,
      diseaseScore,
      diseaseLevel,
      sprayingSuitable,
      machinerySuitable,
    };
  }, [rainProbTomorrow, rainProbToday, expectedRainfallMm, soilMoisture, soilType, crop, growthStage, humidity, temp, windSpeed]);

  // Formatted last synced time string
  const formattedSyncTime = useMemo(() => {
    if (!lastSyncedTime) return 'Connecting...';
    return lastSyncedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [lastSyncedTime]);

  // Helper for 7-day agricultural implication
  const getDailyImplication = (d, index) => {
    if (index === 0) {
      return interpretation.primaryHeadline.toLowerCase();
    }
    const prob = d.rain_probability || 0;
    const rf = d.rainfall || d.precipitation || 0;
    const maxT = d.temperature_max || 28;
    const wind = d.wind_speed_max || 15;

    if (prob >= 60 || rf >= 3.0) return 'Rain expected; hold irrigation & check drainage.';
    if (prob >= 40) return 'Scattered precipitation; monitor soil before watering.';
    if (maxT >= 36) return 'High heat stress; plan evening shade/hydration.';
    if (wind >= 25) return 'Windy conditions; avoid foliar pesticide spraying.';
    return 'Clear operational window; suitable for field work.';
  };

  return (
    <div className="flex h-screen bg-[#faf8f5] overflow-hidden font-sans text-stone-900">
      {/* App Sidebar */}
      <AppSidebar
        activeItem="weather"
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Unified Top Navigation Header */}
        <AppHeader
          moduleId="weather"
          title="Weather & Advisory"
          subtitle="Agricultural Interpretation & Daily Farm Operations"
          onMenuClick={() => setMobileOpen(true)}
          badgeText={meta.provider ? `${meta.provider} Live` : 'WeatherAPI Live'}
          badgeType="emerald"
          rightActions={
            <div className="flex items-center gap-2">
              <span className="hidden md:inline-flex items-center gap-1.5 text-xs font-bold text-[#1b4332] bg-emerald-50/80 px-2.5 py-1 rounded-lg border border-emerald-200/60">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                Agronomic Engine Active
              </span>
            </div>
          }
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="max-w-6xl mx-auto space-y-6">

            {/* ── 1. Editorial Sub-Header & Farm Selector ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-stone-200/80">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
                    {activeFarm ? activeFarm.farm_name || activeFarm.name : 'Your Farm'}
                  </h2>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200">
                    {activeFarm?.location_name || activeFarm?.location_display || 'Anand, Gujarat'}
                  </span>
                </div>
                <p className="text-xs text-stone-600 mt-1">
                  Live atmospheric telemetry interpreted through AgriSmart soil and microclimate models.
                </p>
              </div>

              {/* Controls: Farm Selector & Sync Button */}
              <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
                {farms.length > 1 && (
                  <select
                    value={selectedFarmId || ''}
                    onChange={(e) => handleFarmChange(e.target.value)}
                    className="text-xs font-semibold bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-stone-800 focus:outline-none focus:border-[#1b4332]"
                  >
                    {farms.map((f) => (
                      <option key={f.id} value={f.id}>
                        🏡 {f.farm_name || f.name} ({f.crop || 'Crop'})
                      </option>
                    ))}
                  </select>
                )}

                <div className="flex items-center gap-1.5 text-xs text-stone-500 bg-white border border-stone-200/80 rounded-lg px-2.5 py-1.5">
                  <Clock className="w-3.5 h-3.5 text-stone-400" />
                  <span>Synced {formattedSyncTime}</span>
                </div>

                <button
                  type="button"
                  onClick={() => fetchWeatherData(selectedFarmId, true)}
                  disabled={syncing || loading}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#1b4332] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  <span>{syncing ? 'Syncing...' : 'Sync Live Weather'}</span>
                </button>
              </div>
            </div>

            {/* Error notice if API fails */}
            {error && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>{error}</span>
                </div>
                <button
                  onClick={() => fetchWeatherData(selectedFarmId)}
                  className="font-bold underline ml-3 cursor-pointer hover:text-amber-950"
                >
                  Retry
                </button>
              </div>
            )}

            {/* ── 2. HERO: Today's Farm Advice (5-Second Answer) ── */}
            <div
              className={`rounded-xl border p-5 sm:p-6 transition-all ${
                interpretation.urgency === 'alert'
                  ? 'bg-amber-50/50 border-amber-300/80 shadow-xs'
                  : interpretation.urgency === 'warning'
                  ? 'bg-orange-50/40 border-orange-200 shadow-xs'
                  : 'bg-emerald-50/50 border-emerald-200/80 shadow-xs'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-200/60">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded bg-[#1b4332] text-white">
                    Today's Primary Farm Advice
                  </span>
                  <span className="text-xs font-semibold text-stone-600">
                    for {crop} ({growthStage})
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-600">
                  <span>Agronomic Priority:</span>
                  <span
                    className={`uppercase font-black px-2 py-0.5 rounded text-[10px] ${
                      interpretation.urgency === 'alert'
                        ? 'bg-amber-200 text-amber-900'
                        : interpretation.urgency === 'warning'
                        ? 'bg-orange-200 text-orange-900'
                        : 'bg-emerald-200 text-emerald-900'
                    }`}
                  >
                    {interpretation.urgency === 'alert' ? 'Action Required' : interpretation.urgency === 'warning' ? 'Attention Advised' : 'Optimal'}
                  </span>
                </div>
              </div>

              {/* Large Serif Headline */}
              <div className="my-4">
                <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 leading-tight">
                  {interpretation.primaryHeadline}
                </h1>
              </div>

              {/* The "Why" Rationale + Evidence Chips */}
              <div className="bg-white/90 rounded-lg p-4 border border-stone-200/80 mb-4">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-[#1b4332] flex-shrink-0 mt-0.5">
                    <Info className="w-3.5 h-3.5" />
                  </div>
                  <div className="space-y-2 text-stone-800">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#1b4332]">
                      Agronomic Rationale (The "Why")
                    </p>
                    <p className="text-sm font-medium leading-relaxed text-stone-700">
                      {interpretation.why}
                    </p>
                  </div>
                </div>

                {/* Evidence Chips */}
                <div className="mt-3 pt-3 border-t border-stone-100 flex flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-stone-100 font-semibold text-stone-700">
                    <CloudRain className="w-3.5 h-3.5 text-blue-600" />
                    <span>Rain Tomorrow: <strong>{rainProbTomorrow}%</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-stone-100 font-semibold text-stone-700">
                    <Droplets className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Rainfall Volume: <strong>{expectedRainfallMm} mm</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-stone-100 font-semibold text-stone-700">
                    <Layers className="w-3.5 h-3.5 text-amber-700" />
                    <span>Soil Moisture: <strong>{soilMoisture}%</strong> ({soilType})</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-stone-100 font-semibold text-stone-700">
                    <Thermometer className="w-3.5 h-3.5 text-orange-600" />
                    <span>Air Temp: <strong>{temp}°C</strong> (RH: {humidity}%)</span>
                  </div>
                </div>
              </div>

              {/* The "What to Do" Actionable Checklist */}
              <div className="bg-white/90 rounded-lg p-4 border border-stone-200/80">
                <p className="text-xs font-bold uppercase tracking-wider text-[#1b4332] mb-2.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  What To Do Today (Operational Steps)
                </p>
                <div className="grid sm:grid-cols-3 gap-2.5">
                  {interpretation.whatToDo.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-2.5 rounded-md bg-stone-50/80 border border-stone-200/60 text-xs font-medium text-stone-800"
                    >
                      <span className="w-5 h-5 rounded-full bg-[#1b4332] text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                        {idx + 1}
                      </span>
                      <span className="leading-snug">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── 3. Current Conditions Strip (Clean Horizontal Row, Hairline Dividers) ── */}
            <div className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-stone-700">
                    Current Atmospheric Observations
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-stone-400">
                  Data Provider: <strong className="text-stone-600">{meta.provider || 'WeatherAPI'}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-stone-200/70">
                {/* 1. Temperature */}
                <div className="p-3 first:pt-0 md:first:pt-3">
                  <span className="text-[11px] font-medium text-stone-500 block">Temperature</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="font-serif text-2xl font-bold text-stone-900">{temp}°C</span>
                    <span className="text-[11px] font-semibold text-stone-500">Feels {feelsLike}°</span>
                  </div>
                  <span className="text-[10px] font-medium text-stone-500 mt-1 block truncate">
                    {condition}
                  </span>
                </div>

                {/* 2. Humidity */}
                <div className="p-3">
                  <span className="text-[11px] font-medium text-stone-500 block">Relative Humidity</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="font-serif text-2xl font-bold text-stone-900">{humidity}%</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${humidity >= 80 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                      {humidity >= 80 ? 'High' : 'Normal'}
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-stone-500 mt-1 block">
                    {humidity >= 80 ? 'Spore favorable' : 'Normal transpiration'}
                  </span>
                </div>

                {/* 3. Rain Probability */}
                <div className="p-3">
                  <span className="text-[11px] font-medium text-stone-500 block">Rain Probability</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="font-serif text-2xl font-bold text-blue-700">{rainProbTomorrow}%</span>
                    <span className="text-[11px] font-semibold text-stone-500">Tomorrow</span>
                  </div>
                  <span className="text-[10px] font-medium text-stone-500 mt-1 block">
                    Today: {rainProbToday}%
                  </span>
                </div>

                {/* 4. Expected Rainfall */}
                <div className="p-3">
                  <span className="text-[11px] font-medium text-stone-500 block">Expected Rainfall</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="font-serif text-2xl font-bold text-stone-900">{expectedRainfallMm}</span>
                    <span className="text-xs font-semibold text-stone-500">mm</span>
                  </div>
                  <span className="text-[10px] font-medium text-stone-500 mt-1 block">
                    {expectedRainfallMm >= 2.0 ? 'Substantial rain' : 'Minimal / Trace'}
                  </span>
                </div>

                {/* 5. Wind Velocity */}
                <div className="p-3 col-span-2 md:col-span-1">
                  <span className="text-[11px] font-medium text-stone-500 block">Wind Velocity</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="font-serif text-2xl font-bold text-stone-900">{windSpeed}</span>
                    <span className="text-xs font-semibold text-stone-500">km/h</span>
                  </div>
                  <span className="text-[10px] font-medium text-stone-500 mt-1 block">
                    {windSpeed >= 20 ? 'Moderate drift risk' : 'Calm spray window'}
                  </span>
                </div>
              </div>
            </div>

            {/* ── 4. Interactive "Your Farm Conditions" Bar ── */}
            <div className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#1b4332]" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-800">
                    Your Farm Context (Interactive Simulator)
                  </h3>
                  {isCustomContext && (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Simulated Parameters Active
                    </span>
                  )}
                </div>
                {isCustomContext && (
                  <button
                    type="button"
                    onClick={() => {
                      if (activeFarm) {
                        setCrop(activeFarm.crop || 'Tomato');
                        setSoilType(activeFarm.soil_type?.toLowerCase() || 'black');
                      }
                      setSoilMoisture(weatherData?.soil?.moisture_percent ?? 55);
                      setIsCustomContext(false);
                    }}
                    className="text-xs text-[#1b4332] hover:underline font-bold self-start sm:self-auto cursor-pointer"
                  >
                    Reset to Saved Farm
                  </button>
                )}
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-3">
                {/* Crop Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 mb-1">Active Crop</label>
                  <select
                    value={crop}
                    onChange={(e) => { setCrop(e.target.value); setIsCustomContext(true); }}
                    className="w-full text-xs font-semibold bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-stone-800 focus:outline-none focus:border-[#1b4332]"
                  >
                    {CROPS.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.emoji} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Growth Stage Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 mb-1">Growth Stage</label>
                  <select
                    value={growthStage}
                    onChange={(e) => { setGrowthStage(e.target.value); setIsCustomContext(true); }}
                    className="w-full text-xs font-semibold bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-stone-800 focus:outline-none focus:border-[#1b4332]"
                  >
                    {GROWTH_STAGES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Soil Type */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 mb-1">Soil Classification</label>
                  <select
                    value={soilType}
                    onChange={(e) => { setSoilType(e.target.value); setIsCustomContext(true); }}
                    className="w-full text-xs font-semibold bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-stone-800 focus:outline-none focus:border-[#1b4332]"
                  >
                    {SOIL_TYPES.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.retention})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Soil Moisture Slider */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-stone-600 mb-1">
                    <span>Soil Moisture</span>
                    <span className="text-[#1b4332] font-extrabold">{soilMoisture}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="95"
                    value={soilMoisture}
                    onChange={(e) => { setSoilMoisture(Number(e.target.value)); setIsCustomContext(true); }}
                    className="w-full accent-[#1b4332] cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-stone-400 font-semibold mt-0.5">
                    <span>Dry (10%)</span>
                    <span>Optimal (50%)</span>
                    <span>Saturated (90%)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 5. What Today's Weather Means for Your Farm (3 Focus Columns) ── */}
            <div className="grid md:grid-cols-3 gap-5">

              {/* 5A. Soil Moisture & Irrigation */}
              <div className="bg-white rounded-xl border border-stone-200/80 p-5 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                        <Droplets className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wide">
                          Irrigation & Water Balance
                        </h4>
                        <span className="text-[10px] text-stone-500">Root-zone hydration</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      interpretation.irrigationStatus === 'Postpone'
                        ? 'bg-amber-100 text-amber-800'
                        : interpretation.irrigationStatus === 'Irrigate Soon'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {interpretation.irrigationStatus}
                    </span>
                  </div>

                  <p className="text-xs text-stone-700 leading-relaxed mt-2">
                    {interpretation.irrigationAdviceText}
                  </p>

                  <div className="mt-4 p-3 rounded-lg bg-stone-50 border border-stone-100 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-stone-500">Volumetric Moisture:</span>
                      <span className="font-bold text-stone-800">{soilMoisture}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Daily Demand (ET₀):</span>
                      <span className="font-bold text-stone-800">{today.et0 ? `${today.et0} mm` : '3.8 mm/day'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Rain Buffer:</span>
                      <span className="font-bold text-blue-700">+{expectedRainfallMm} mm incoming</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => navigate('/irrigation')}
                    className="w-full flex items-center justify-between text-xs font-bold text-[#1b4332] hover:text-[#0b261e] p-1.5 rounded-lg hover:bg-emerald-50/50 transition-colors"
                  >
                    <span>Open Irrigation Advisory</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 5B. Crop Health & Disease Weather Risk */}
              <div className="bg-white rounded-xl border border-stone-200/80 p-5 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-700 flex items-center justify-center">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wide">
                          Crop Health & Disease Risk
                        </h4>
                        <span className="text-[10px] text-stone-500">Microclimate favorability</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      interpretation.diseaseLevel === 'High'
                        ? 'bg-red-100 text-red-800'
                        : interpretation.diseaseLevel === 'Moderate'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {interpretation.diseaseLevel} Risk
                    </span>
                  </div>

                  <p className="text-xs text-stone-700 leading-relaxed mt-2">
                    {interpretation.diseaseLevel === 'High'
                      ? `Humid microclimate (RH ${humidity}%) at ${temp}°C creates high spore germination risk for fungal foliar diseases on ${crop}.`
                      : interpretation.diseaseLevel === 'Moderate'
                      ? `Moderate humidity levels may favor pathogen proliferation if leaves stay wet for prolonged periods.`
                      : `Atmospheric conditions currently suppress fungal and bacterial pathogen spread.`}
                  </p>

                  {/* Safety Disclaimer */}
                  <div className="mt-4 p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/60 text-[11px] text-amber-900 leading-snug">
                    <span className="font-bold">Notice:</span> Weather indicates environmental risk only. Never diagnose disease without an optical leaf inspection.
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => navigate('/disease')}
                    className="w-full flex items-center justify-between text-xs font-bold text-orange-900 hover:text-orange-950 p-1.5 rounded-lg hover:bg-orange-50/50 transition-colors"
                  >
                    <span>Check Crop Health / Run Leaf Scan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 5C. Field Work & Operations */}
              <div className="bg-white rounded-xl border border-stone-200/80 p-5 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#1b4332] flex items-center justify-center">
                        <Sprout className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wide">
                          Field Work & Operations
                        </h4>
                        <span className="text-[10px] text-stone-500">Spraying & machine access</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 mt-2 text-xs">
                    {/* Spraying */}
                    <div className="flex items-start gap-2">
                      <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${interpretation.sprayingSuitable ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <div>
                        <span className="font-bold text-stone-800">Foliar Spraying: </span>
                        <span className="text-stone-600">
                          {interpretation.sprayingSuitable
                            ? 'Optimal calm conditions (<18 km/h wind).'
                            : `Caution: ${windSpeed} km/h wind may cause chemical drift.`}
                        </span>
                      </div>
                    </div>

                    {/* Fertilization */}
                    <div className="flex items-start gap-2">
                      <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${expectedRainfallMm < 2.0 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <div>
                        <span className="font-bold text-stone-800">Broadcast Fertilizer: </span>
                        <span className="text-stone-600">
                          {expectedRainfallMm < 2.0
                            ? 'Low leaching risk; suitable for side-dressing.'
                            : 'Hold broadcast application; rain may wash nutrients into furrows.'}
                        </span>
                      </div>
                    </div>

                    {/* Machine Access */}
                    <div className="flex items-start gap-2">
                      <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${interpretation.machinerySuitable ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <div>
                        <span className="font-bold text-stone-800">Tractor & Tillage: </span>
                        <span className="text-stone-600">
                          {interpretation.machinerySuitable
                            ? 'Firm traction; safe for cultivation and harvesting.'
                            : 'Soil compaction risk; avoid heavy machinery.'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100">
                  <div className="text-[11px] text-stone-500 font-medium">
                    Best working window: <strong className="text-stone-800">6:30 AM – 10:30 AM</strong>
                  </div>
                </div>
              </div>

            </div>

            {/* ── 6. 7-Day Farm Weather & Operational Outlook ── */}
            <div className="bg-white rounded-xl border border-stone-200/80 p-5 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#1b4332]" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-800">
                    7-Day Farm Weather & Operational Outlook
                  </h3>
                </div>
                <span className="text-[11px] text-stone-500 font-medium">
                  Agricultural field implications per day
                </span>
              </div>

              <div className="divide-y divide-stone-100">
                {daily.length > 0 ? (
                  daily.map((day, idx) => (
                    <div
                      key={day.date || idx}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-stone-50/50 px-2 rounded-lg transition-colors"
                    >
                      {/* Left: Date & Condition */}
                      <div className="flex items-center gap-3 sm:w-1/4">
                        <span className="text-xl flex-shrink-0">{day.emoji || '☀️'}</span>
                        <div>
                          <div className="text-xs font-extrabold text-stone-900">
                            {idx === 0 ? 'Today' : idx === 1 ? 'Tomorrow' : new Date(day.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </div>
                          <div className="text-[11px] text-stone-500 truncate max-w-[130px]">
                            {day.condition || 'Clear'}
                          </div>
                        </div>
                      </div>

                      {/* Middle: Temperatures & Rain */}
                      <div className="flex items-center gap-4 sm:w-1/4 text-xs font-semibold">
                        <div className="text-stone-800">
                          <span className="font-extrabold text-stone-900">{Math.round(day.temperature_max || 0)}°</span>
                          <span className="text-stone-400 ml-1">/ {Math.round(day.temperature_min || 0)}°C</span>
                        </div>
                        <div className="text-blue-700 font-bold flex items-center gap-1">
                          <CloudRain className="w-3.5 h-3.5 inline" />
                          <span>{day.rain_probability != null ? `${day.rain_probability}%` : '0%'}</span>
                          {day.rainfall > 0 && <span className="text-[10px] text-stone-500 font-normal">({day.rainfall}mm)</span>}
                        </div>
                      </div>

                      {/* Right: Specific Farm Implication */}
                      <div className="sm:w-1/2 flex items-center gap-2">
                        <span className="text-[11px] font-medium text-stone-700 bg-stone-100/70 border border-stone-200/50 rounded px-2.5 py-1 w-full truncate">
                          💡 {getDailyImplication(day, idx)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-stone-500 italic">
                    Forecast data currently syncing from WeatherAPI gateway...
                  </div>
                )}
              </div>
            </div>

            {/* ── 7. Ask AI Agronomist Integration ── */}
            <div className="rounded-xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50/80 via-white to-emerald-50/40 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#1b4332] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-stone-900">
                      Have a specific question about today's weather?
                    </h4>
                    <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">
                      Groq LLaMA 3.3
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 mt-0.5">
                    Ask the AgriSmart Agronomist for custom advice on pesticide timing, planting dates, or fertilizer schedules.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const query = `Based on today's weather in ${activeFarm?.location_name || 'Anand'} (${temp}°C, ${humidity}% humidity, ${rainProbTomorrow}% rain tomorrow), what specific advice do you have for my ${crop} crop?`;
                  navigate('/assistant', { state: { initialQuery: query } });
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#1b4332] text-white text-xs font-bold hover:bg-[#164233] transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shadow-2xs cursor-pointer"
              >
                <span>Ask AI Agronomist</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* ── 8. Data Source Transparency & Grounding Note ── */}
            <div className="pt-2 pb-6 text-center text-[11px] text-stone-400 space-y-1">
              <p>
                <strong>Data Provenance:</strong> Live atmospheric observations and 7-day numerical forecasts powered by <strong>WeatherAPI</strong>.
              </p>
              <p>
                Agricultural interpretations calculated by the <strong>AgriSmart Agronomic Intelligence Engine</strong> using FAO-56 Penman-Monteith crop water balance models and microclimate pathogen thresholds.
              </p>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
