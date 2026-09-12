import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Droplets, Sprout, Thermometer, Wind, AlertTriangle,
  CheckCircle, XCircle, Clock, ChevronDown, RefreshCw,
  Menu, ArrowRight, Zap, CloudRain, Activity, Info,
  TrendingUp, BarChart2, Gauge, Database, History,
  Compass, Award, CloudSun, ShieldCheck, ExternalLink
} from 'lucide-react';
import AppSidebar from '../components/common/AppSidebar';
import AppHeader from '../components/common/AppHeader';
import { useAuth } from '../context/AuthContext';

import {
  predictIrrigation,
  getIrrigationMeta,
  getIrrigationLiveWeather,
  getIrrigationInsights,
  getIrrigationHistory
} from '../api/irrigation';

// ─── Supported domain options ────────────────────────────────────────────────
const CROPS = [
  { name: 'Tomato', emoji: '🍅' },
  { name: 'Wheat', emoji: '🌾' },
  { name: 'Potato', emoji: '🥔' },
  { name: 'Carrot', emoji: '🥕' },
  { name: 'Chilli', emoji: '🌶️' },
];

const SOIL_TYPES = [
  'Black Soil', 'Alluvial Soil', 'Sandy Soil',
  'Red Soil', 'Clay Soil', 'Loam Soil', 'Chalky Soil',
];

const GROWTH_STAGES = [
  'Germination',
  'Seedling Stage',
  'Vegetative Growth / Root or Tuber Development',
  'Flowering',
  'Pollination',
  'Fruit/Grain/Bulb Formation',
  'Maturation',
  'Harvest',
];

// ─── Colour / style maps keyed by prediction status ─────────────────────────
const STATUS_CONFIG = {
  irrigation_required: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    badge: 'bg-blue-100 text-blue-700',
    badgeDot: 'bg-blue-500',
    label: 'Irrigation Required',
    Icon: Droplets,
    barColor: 'bg-blue-500',
  },
  no_irrigation: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    badge: 'bg-emerald-100 text-emerald-700',
    badgeDot: 'bg-emerald-500',
    label: 'No Irrigation Needed',
    Icon: CheckCircle,
    barColor: 'bg-emerald-500',
  },
  excess_water: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    badge: 'bg-amber-100 text-amber-700',
    badgeDot: 'bg-amber-500',
    label: 'Excess Water Detected',
    Icon: AlertTriangle,
    barColor: 'bg-amber-500',
  },
};

const URGENCY_CONFIG = {
  high: { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'High Urgency' },
  medium: { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Medium Urgency' },
  low: { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Low Urgency' },
  warning: { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', label: 'Warning' },
};

const ACTION_LABELS = {
  irrigate_now: { label: 'Irrigate Now', icon: Droplets, color: 'text-blue-600' },
  delay_irrigation: { label: 'Delay Irrigation', icon: Clock, color: 'text-amber-600' },
  reduce_irrigation: { label: 'Reduce Irrigation', icon: TrendingUp, color: 'text-yellow-600' },
  monitor_closely: { label: 'Monitor Closely', icon: Activity, color: 'text-purple-600' },
  no_irrigation: { label: 'No Irrigation', icon: CheckCircle, color: 'text-emerald-600' },
  avoid_irrigation: { label: 'Avoid Irrigation', icon: XCircle, color: 'text-red-600' },
};

// ─── Helper sub-components ──────────────────────────────────────────────────

function SelectField({ label, id, value, onChange, options, icon: Icon }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-emerald-600" />}
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 transition pr-8 cursor-pointer shadow-sm"
        >
          <option value="">Select {label}…</option>
          {options.map((o) => {
            const val = typeof o === 'object' ? o.name : o;
            const text = typeof o === 'object' ? `${o.emoji || ''} ${o.name}` : o;
            return <option key={val} value={val}>{text}</option>;
          })}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      </div>
    </div>
  );
}

function SliderField({ label, id, value, onChange, min, max, unit, icon: Icon, color = 'emerald', statusBadge }) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const colorMap = {
    emerald: { track: 'bg-emerald-500', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700' },
    blue: { track: 'bg-blue-500', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700' },
    orange: { track: 'bg-orange-500', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700' },
    purple: { track: 'bg-purple-500', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-700' },
  };
  const c = colorMap[color] || colorMap.emerald;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
          {Icon && <Icon className={`w-3.5 h-3.5 ${c.text}`} />}
          {label}
        </label>
        <div className="flex items-center gap-2">
          {statusBadge && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadge.bg} ${statusBadge.color}`}>
              {statusBadge.label}
            </span>
          )}
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.badge}`}>
            {value}{unit}
          </span>
        </div>
      </div>
      <div className="relative h-2 bg-gray-100 rounded-full overflow-visible">
        <div
          className={`absolute left-0 top-0 h-full rounded-full ${c.track} transition-all`}
          style={{ width: `${pct}%` }}
        />
        <input
          type="range"
          id={id}
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-current ${c.text} shadow-sm pointer-events-none transition-all`}
          style={{ left: `calc(${pct}% - 8px)` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 font-medium">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

function ConfidenceBar({ label, value, color }) {
  const safeVal = Number(value) || 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-600 capitalize">{label.replace(/_/g, ' ')}</span>
        <span className="text-xs font-bold text-gray-800">{(safeVal * 100).toFixed(1)}%</span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${Math.min(100, safeVal * 100)}%` }}
        />
      </div>
    </div>
  );
}

function ResultCard({ result }) {
  if (!result) return null;
  const cfg = STATUS_CONFIG[result.status] || STATUS_CONFIG.no_irrigation;
  const urgencyCfg = URGENCY_CONFIG[result.urgency] || URGENCY_CONFIG.low;
  const actionCfg = ACTION_LABELS[result.action] || { label: result.action, icon: Info, color: 'text-gray-600' };
  const ActionIcon = actionCfg.icon;
  const StatusIcon = cfg.Icon;

  const probColors = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500'];
  const probKeys = Object.keys(result.probabilities || {});

  return (
    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Hero status banner */}
      <div className={`rounded-2xl p-5 border ${cfg.bg} ${cfg.border} flex items-start gap-4 shadow-sm`}>
        <div className={`w-12 h-12 rounded-xl ${cfg.iconBg} flex items-center justify-center flex-shrink-0 shadow-sm`}>
          <StatusIcon className={`w-6 h-6 ${cfg.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-black text-gray-900">{cfg.label}</h3>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${urgencyCfg.bg} ${urgencyCfg.color} border ${urgencyCfg.border}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${urgencyCfg.color.replace('text-', 'bg-')}`} />
              {urgencyCfg.label}
            </span>
            {result.weather_modified && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200">
                <CloudRain className="w-3.5 h-3.5" /> Weather Override Active
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <ActionIcon className={`w-4 h-4 ${actionCfg.color} flex-shrink-0`} />
            <span className={`text-sm font-black ${actionCfg.color}`}>{actionCfg.label}</span>
            <span className="text-gray-300">·</span>
            <span className="text-xs text-gray-500">
              Confidence: <span className="font-bold text-gray-800">{((result.confidence || 0) * 100).toFixed(1)}%</span>
            </span>
            {result.record_id && (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Saved #REC-{result.record_id}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Recommendation & Explanation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <span className="text-xs font-extrabold text-gray-800 uppercase tracking-wide">Agronomic Recommendation</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed font-medium">{result.recommendation}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
              <Info className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <span className="text-xs font-extrabold text-gray-800 uppercase tracking-wide">Physiological Rationale</span>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">{result.explanation}</p>
        </div>
      </div>

      {/* Probabilities Breakdown */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-extrabold text-gray-700 uppercase tracking-wide">XGBoost Class Probabilities</span>
          </div>
          <span className="text-[11px] text-gray-400 font-medium">Sum = 100%</span>
        </div>
        <div className="flex flex-col gap-3">
          {probKeys.map((key, i) => (
            <ConfidenceBar
              key={key}
              label={key}
              value={result.probabilities[key]}
              color={probColors[i % probColors.length]}
            />
          ))}
        </div>
      </div>

      {/* 3 Metric Gauges */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Model Confidence', value: `${((result.confidence || 0) * 100).toFixed(0)}%`, icon: Gauge, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Decision Urgency', value: result.urgency?.toUpperCase(), icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Prescribed Action', value: result.action?.replace(/_/g, ' '), icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`${bg} rounded-2xl p-3.5 text-center border border-gray-100 shadow-sm`}>
            <Icon className={`w-5 h-5 ${color} mx-auto mb-1`} />
            <div className={`text-sm font-black ${color} capitalize truncate`}>{value}</div>
            <div className="text-[10px] text-gray-500 font-bold mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Status description */}
      {result.status_description && (
        <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-gray-600 leading-relaxed">{result.status_description}</p>
        </div>
      )}

      {/* Warnings if any */}
      {result.warnings?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-bold text-amber-800">Agronomic Notices</span>
          </div>
          {result.warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-700 pl-6">{w}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Irrigation Page ───────────────────────────────────────────────────
export default function IrrigationPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('advisory'); // 'advisory' | 'benchmarks' | 'history'

  // Form state
  const [form, setForm] = useState({
    crop: 'Tomato',
    soil_type: 'Loam Soil',
    growth_stage: 'Flowering',
    soil_moisture: 35,
    temperature: 28,
    humidity: 60,
  });

  // Weather Intelligence state
  const [weatherCtx, setWeatherCtx] = useState({
    enabled: true,
    rain_probability: 20,
    forecast_rainfall_mm: 0,
  });

  // Live WeatherAPI fetch status
  const [liveWeather, setLiveWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // Model & Insights state
  const [insights, setInsights] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Inference state
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch live weather from WeatherAPI via Django backend
  const fetchLiveWeather = useCallback(async () => {
    setWeatherLoading(true);
    try {
      const data = await getIrrigationLiveWeather();
      setLiveWeather(data);
      // Auto-populate form readings from live WeatherAPI
      if (data) {
        setForm(prev => ({
          ...prev,
          temperature: Math.round(data.temperature || prev.temperature),
          humidity: Math.round(data.humidity || prev.humidity),
        }));
        setWeatherCtx(prev => ({
          ...prev,
          enabled: true,
          rain_probability: Math.round(data.rain_probability_pct ?? (data.rain_probability * 100)),
          forecast_rainfall_mm: Number(data.forecast_rainfall_mm || 0),
        }));
      }
    } catch (err) {
      console.warn('Live weather fetch notice:', err);
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  // Fetch insights and metadata on mount
  useEffect(() => {
    fetchLiveWeather();
    getIrrigationInsights().then(res => {
      if (res && res.available) setInsights(res);
    }).catch(err => console.warn('Insights error:', err));
  }, [fetchLiveWeather]);

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

  const isFormValid = form.crop && form.soil_type && form.growth_stage;

  const handlePredict = useCallback(async () => {
    if (!isFormValid) return;
    setLoading(true);
    setError(null);

    const weatherContext = weatherCtx.enabled
      ? {
          rain_probability: (weatherCtx.rain_probability || 0) / 100,
          forecast_rainfall_mm: Number(weatherCtx.forecast_rainfall_mm || 0),
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
        weatherContext
      );
      setResult(data);
    } catch (err) {
      setError(err.friendlyMessage || err.response?.data?.message || 'Irrigation inference failed. Please check inputs and retry.');
    } finally {
      setLoading(false);
    }
  }, [form, weatherCtx, isFormValid]);

  // Moisture state helper
  const getMoistureStatus = (val) => {
    if (val < 20) return { label: 'Depleted (Deficit)', color: 'text-red-700', bg: 'bg-red-100' };
    if (val < 40) return { label: 'Stress Threshold', color: 'text-amber-700', bg: 'bg-amber-100' };
    if (val < 65) return { label: 'Optimal Buffer', color: 'text-emerald-700', bg: 'bg-emerald-100' };
    if (val < 80) return { label: 'Adequate Moisture', color: 'text-blue-700', bg: 'bg-blue-100' };
    return { label: 'Saturated (Risk of Rot)', color: 'text-purple-700', bg: 'bg-purple-100' };
  };
  const moistureStatus = getMoistureStatus(form.soil_moisture);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans text-gray-900">
      {/* AgriSmart Sidebar */}
      <AppSidebar
        activeItem="irrigation"
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Unified Top Navigation Header */}
        <AppHeader
          moduleId="irrigation"
          title="Smart Irrigation Advisory"
          subtitle="XGBoost ML Pipeline · Layered Weather Intelligence"
          onMenuClick={() => setMobileOpen(true)}
          badgeText="WeatherAPI Live"
          badgeType="blue"
          rightActions={
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 shadow-2xs">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              Django ML Active
            </span>
          }
        />

        {/* Navigation Tabs */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-2 flex items-center gap-2 overflow-x-auto flex-shrink-0">
          <button
            onClick={() => setActiveTab('advisory')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
              activeTab === 'advisory'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Irrigation Advisory Engine
          </button>
          <button
            onClick={() => setActiveTab('benchmarks')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
              activeTab === 'benchmarks'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Model Benchmark & Data Audit
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Saved History
          </button>
        </div>

        {/* Body Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50/70">
          <div className="max-w-6xl mx-auto flex flex-col gap-6">

            {/* ═════════════════════════════════════════════════════════════════
                TAB 1: IRRIGATION ADVISORY ENGINE
            ═════════════════════════════════════════════════════════════════ */}
            {activeTab === 'advisory' && (
              <>
                {/* WeatherAPI Quick-Sync Banner */}
                <div className="bg-gradient-to-r from-blue-700 via-sky-600 to-emerald-600 rounded-3xl p-5 text-white shadow-md relative overflow-hidden">
                  <div className="absolute -right-6 -bottom-6 w-40 h-40 bg-white/10 rounded-full blur-xl pointer-events-none" />
                  <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="max-w-xl">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-blue-100 text-[11px] font-extrabold uppercase tracking-wide mb-2 backdrop-blur-sm">
                        <CloudSun className="w-3.5 h-3.5" />
                        Live Weather Intelligence · WeatherAPI.com
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black leading-tight text-white">
                        Precision Irrigation Decision Engine
                      </h2>
                      <p className="text-xs sm:text-sm text-blue-100 mt-1 font-medium leading-relaxed">
                        Evaluates soil moisture saturation, crop growth phase, and real-time precipitation forecast to prevent over-watering and root rot.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20">
                      {liveWeather ? (
                        <div className="text-xs text-blue-100">
                          <div className="font-bold text-white text-sm flex items-center gap-1.5">
                            <span>{liveWeather.temperature}°C</span> · <span>{liveWeather.condition}</span>
                          </div>
                          <div className="text-[11px] mt-0.5">
                            Rain Chance: <span className="font-bold text-yellow-200">{liveWeather.rain_probability_pct}%</span> · Rain: <span className="font-bold text-yellow-200">{liveWeather.forecast_rainfall_mm}mm</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-blue-100">
                          Click to pull live field weather
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={fetchLiveWeather}
                        disabled={weatherLoading}
                        className="px-3.5 py-2 rounded-xl bg-white text-blue-800 font-extrabold text-xs hover:bg-blue-50 active:scale-95 transition shadow-sm flex items-center gap-1.5 flex-shrink-0"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${weatherLoading ? 'animate-spin' : ''}`} />
                        {weatherLoading ? 'Syncing...' : 'Sync WeatherAPI'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Main 2-Column Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                  {/* LEFT: Input Form (5 cols) */}
                  <div className="lg:col-span-5 flex flex-col gap-4">

                    {/* Crop Profile Card */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-50">
                        <Sprout className="w-4 h-4 text-emerald-600" />
                        <h3 className="text-sm font-black text-gray-800">Crop & Soil Features</h3>
                      </div>
                      <div className="flex flex-col gap-4">
                        <SelectField
                          label="Crop Species"
                          id="crop"
                          value={form.crop}
                          onChange={(v) => setForm(f => ({ ...f, crop: v }))}
                          options={CROPS}
                          icon={Sprout}
                        />
                        <SelectField
                          label="Soil Type"
                          id="soil_type"
                          value={form.soil_type}
                          onChange={(v) => setForm(f => ({ ...f, soil_type: v }))}
                          options={SOIL_TYPES}
                          icon={Droplets}
                        />
                        <SelectField
                          label="Crop Growth Stage"
                          id="growth_stage"
                          value={form.growth_stage}
                          onChange={(v) => setForm(f => ({ ...f, growth_stage: v }))}
                          options={GROWTH_STAGES}
                          icon={Activity}
                        />
                      </div>
                    </div>

                    {/* Sensor Telemetry Card */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-50">
                        <div className="flex items-center gap-2">
                          <Gauge className="w-4 h-4 text-blue-600" />
                          <h3 className="text-sm font-black text-gray-800">Field Environmental Readings</h3>
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Input Telemetry</span>
                      </div>

                      <div className="flex flex-col gap-5">
                        {/* Soil Moisture Slider */}
                        <SliderField
                          label="Soil Moisture (MOI)"
                          id="soil_moisture"
                          value={form.soil_moisture}
                          onChange={(v) => setForm(f => ({ ...f, soil_moisture: v }))}
                          min={0}
                          max={100}
                          unit="%"
                          icon={Droplets}
                          color="blue"
                          statusBadge={moistureStatus}
                        />

                        {/* Temperature Slider */}
                        <SliderField
                          label="Ambient Temperature"
                          id="temperature"
                          value={form.temperature}
                          onChange={(v) => setForm(f => ({ ...f, temperature: v }))}
                          min={0}
                          max={55}
                          unit="°C"
                          icon={Thermometer}
                          color="orange"
                        />

                        {/* Humidity Slider */}
                        <SliderField
                          label="Relative Humidity"
                          id="humidity"
                          value={form.humidity}
                          onChange={(v) => setForm(f => ({ ...f, humidity: v }))}
                          min={0}
                          max={100}
                          unit="%"
                          icon={Wind}
                          color="emerald"
                        />
                      </div>
                    </div>

                    {/* Weather Intelligence Layer Toggle Card */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <CloudRain className="w-4 h-4 text-purple-600" />
                          <h3 className="text-sm font-black text-gray-800">Weather Intelligence Layer</h3>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={weatherCtx.enabled}
                            onChange={(e) => setWeatherCtx(w => ({ ...w, enabled: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>
                      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                        Decoupled decision layer: if heavy precipitation is forecast within 24–48 hours, irrigation is intelligently delayed to conserve water and prevent waterlogging.
                      </p>

                      {weatherCtx.enabled && (
                        <div className="flex flex-col gap-4 pt-2 border-t border-gray-50">
                          <SliderField
                            label="24h Rain Probability"
                            id="rain_probability"
                            value={weatherCtx.rain_probability}
                            onChange={(v) => setWeatherCtx(w => ({ ...w, rain_probability: v }))}
                            min={0}
                            max={100}
                            unit="%"
                            icon={CloudRain}
                            color="purple"
                          />
                          <SliderField
                            label="Forecast Precipitation"
                            id="forecast_rainfall_mm"
                            value={weatherCtx.forecast_rainfall_mm}
                            onChange={(v) => setWeatherCtx(w => ({ ...w, forecast_rainfall_mm: v }))}
                            min={0}
                            max={50}
                            unit=" mm"
                            icon={Droplets}
                            color="blue"
                          />
                        </div>
                      )}
                    </div>

                    {/* Run Decision Button */}
                    <button
                      type="button"
                      onClick={handlePredict}
                      disabled={loading || !isFormValid}
                      className="w-full py-3.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 text-white font-black text-sm shadow-md transition flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Running XGBoost Inference...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          <span>Run Irrigation Analysis</span>
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </>
                      )}
                    </button>

                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 flex items-start gap-2.5 text-red-700 text-xs font-semibold">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
                        <span>{error}</span>
                      </div>
                    )}

                  </div>

                  {/* RIGHT: Visual Results Panel (7 cols) */}
                  <div className="lg:col-span-7">
                    {result ? (
                      <ResultCard result={result} />
                    ) : (
                      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 flex flex-col items-center justify-center text-center h-full min-h-[460px]">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4">
                          <Droplets className="w-8 h-8 text-emerald-600" />
                        </div>
                        <h3 className="text-base font-black text-gray-800">Ready for Irrigation Inference</h3>
                        <p className="text-xs text-gray-500 max-w-sm mt-1.5 leading-relaxed font-medium">
                          Select your crop and soil parameters on the left, or sync live WeatherAPI readings, then click <strong className="text-emerald-700">Run Irrigation Analysis</strong>.
                        </p>
                        <div className="mt-6 flex items-center gap-3 flex-wrap justify-center">
                          <span className="text-[11px] font-bold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
                            XGBoost Champion Model
                          </span>
                          <span className="text-[11px] font-bold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
                            3-Class Physiological Target
                          </span>
                          <span className="text-[11px] font-bold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
                            WeatherAPI Live Forecast
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </>
            )}

            {/* ═════════════════════════════════════════════════════════════════
                TAB 2: MODEL BENCHMARK & DATA AUDIT (from evaluation_report.json)
            ═════════════════════════════════════════════════════════════════ */}
            {activeTab === 'benchmarks' && (
              <div className="flex flex-col gap-6 animate-in fade-in duration-300">

                {/* Audit Intro Banner */}
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-gray-900">Empirical Model Audit & Benchmark Results</h2>
                      <p className="text-xs text-gray-500">Systematic evaluation of 5 candidate algorithms on 16,283 cleaned records</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                    The Smart Irrigation module classifies field state into 3 physiological classes (Class 0: No Irrigation, Class 1: Irrigation Required, Class 2: Excess Water).
                    All categorical features (Crop, Soil Type, Growth Stage) are one-hot encoded and numerical sensors scaled via scikit-learn pipeline before inference.
                  </p>
                </div>

                {/* Dataset Characteristics Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Cleaned Dataset Records', val: insights?.dataset?.total_rows_cleaned?.toLocaleString() || '16,283', icon: Database, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Champion Model Accuracy', val: '99.7%', icon: Award, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Weighted F1-Score', val: '0.997', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
                    { label: 'Class 0 / 1 / 2 Balance', val: '55% / 38% / 7%', icon: BarChart2, color: 'text-amber-600', bg: 'bg-amber-50' },
                  ].map(({ label, val, icon: Icon, color, bg }) => (
                    <div key={label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-gray-500">{label}</span>
                        <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}>
                          <Icon className={`w-3.5 h-3.5 ${color}`} />
                        </div>
                      </div>
                      <div className="text-xl font-black text-gray-900">{val}</div>
                    </div>
                  ))}
                </div>

                {/* 2-Column: Feature Importance + Algorithm Comparison */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                  {/* Feature Importance Chart (5 cols) */}
                  <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col gap-4">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-50">
                      <div className="flex items-center gap-2">
                        <BarChart2 className="w-4 h-4 text-emerald-600" />
                        <h3 className="text-sm font-black text-gray-900">XGBoost Feature Importance</h3>
                      </div>
                      <span className="text-[10px] text-gray-400 font-bold">Relative % Weight</span>
                    </div>

                    <div className="flex flex-col gap-3">
                      {(insights?.top_features || [
                        { name: 'Temperature', importance: 22.5 },
                        { name: 'Soil Moisture', importance: 12.6 },
                        { name: 'Growth Stage Maturation', importance: 7.5 },
                        { name: 'Fruit / Grain / Bulb Formation', importance: 6.7 },
                        { name: 'Humidity', importance: 5.2 },
                        { name: 'Crop Chilli', importance: 5.1 },
                        { name: 'Pollination Stage', importance: 5.1 },
                        { name: 'Harvest Stage', importance: 4.9 },
                        { name: 'Germination Stage', importance: 4.3 },
                        { name: 'Seedling Stage', importance: 4.2 },
                      ]).map((feat) => (
                        <div key={feat.name} className="flex flex-col gap-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-bold text-gray-700">{feat.name}</span>
                            <span className="font-extrabold text-emerald-700">{feat.importance}%</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${Math.min(100, feat.importance * 3.5)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Model Comparison Table (7 cols) */}
                  <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col gap-4">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-50">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-purple-600" />
                        <h3 className="text-sm font-black text-gray-900">Multiclass Benchmark Comparison</h3>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        Stratified Holdout
                      </span>
                    </div>

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
                          {(insights?.benchmarks || [
                            { model: 'Majority Baseline', accuracy: 54.87, macro_f1: 23.62, weighted_f1: 38.88 },
                            { model: 'Logistic Regression', accuracy: 68.38, macro_f1: 62.45, weighted_f1: 67.54 },
                            { model: 'Random Forest', accuracy: 99.42, macro_f1: 99.12, weighted_f1: 99.42 },
                            { model: 'LightGBM', accuracy: 99.63, macro_f1: 99.45, weighted_f1: 99.63 },
                            { model: 'XGBoost', accuracy: 99.72, macro_f1: 99.58, weighted_f1: 99.72 },
                          ]).map((row) => {
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

                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 text-xs text-gray-600 leading-relaxed mt-2">
                      <p className="font-bold text-gray-800 mb-1 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-blue-500" />
                        Scientific Honesty & Real-Field Deployment Note:
                      </p>
                      The dataset features repeating temperature cycles and synchronized moisture increments characteristic of synthetic benchmark data.
                      AgriSmart couples this with live capacitance soil sensors and real-world WeatherAPI forecast telemetry before triggering physical irrigation valves in the field.
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════
                TAB 3: SAVED IRRIGATION HISTORY (from Django SmartIrrigationRecord)
            ═════════════════════════════════════════════════════════════════ */}
            {activeTab === 'history' && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-black text-gray-900">Irrigation History & Advisory Log</h2>
                    <p className="text-xs text-gray-500">Persistent log of all ML recommendations generated for your crops</p>
                  </div>
                  <button
                    type="button"
                    onClick={loadHistory}
                    disabled={historyLoading}
                    className="px-3 py-1.5 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50 transition flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>

                {history.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 text-center border border-gray-100">
                    <History className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-gray-700">No irrigation records saved yet</p>
                    <p className="text-xs text-gray-400 mt-1">Run an analysis in the Advisory tab to save your first recommendation.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-400 font-bold uppercase text-[10px]">
                            <th className="py-3 px-4">Date & Time</th>
                            <th className="py-3 px-4">Crop</th>
                            <th className="py-3 px-4">Soil Moisture</th>
                            <th className="py-3 px-4">Temp / Humidity</th>
                            <th className="py-3 px-4">Recommendation</th>
                            <th className="py-3 px-4">Action</th>
                            <th className="py-3 px-4">Confidence</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {history.map((rec) => {
                            const cfg = STATUS_CONFIG[rec.status] || STATUS_CONFIG.no_irrigation;
                            return (
                              <tr key={rec.id} className="hover:bg-gray-50/80 transition">
                                <td className="py-3 px-4 text-gray-500 font-medium">{rec.created_at}</td>
                                <td className="py-3 px-4 font-bold text-gray-800">{rec.crop}</td>
                                <td className="py-3 px-4">
                                  <span className="font-extrabold text-blue-700">{rec.soil_moisture}%</span>
                                </td>
                                <td className="py-3 px-4 text-gray-600">
                                  {rec.temperature}°C · {rec.humidity}%
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] ${cfg.badge}`}>
                                    {cfg.label}
                                  </span>
                                </td>
                                <td className="py-3 px-4 font-bold text-gray-800 capitalize">
                                  {rec.action?.replace(/_/g, ' ')}
                                </td>
                                <td className="py-3 px-4 font-extrabold text-gray-700">
                                  {((rec.confidence || 0) * 100).toFixed(0)}%
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
