import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CloudSun,
  Droplets,
  Sprout,
  Leaf,
  MapPin,
  Sun,
  ChevronDown,
  ArrowRight,
  LogOut,
  Menu,
  X,
  Plus,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  CloudRain,
  Wind,
  Layers,
  ShieldAlert,
  Check,
  Printer,
  Sliders,
  Calendar,
  Search,
  Bell,
  Sparkles,
  Bot,
  ExternalLink,
  ChevronRight,
  Droplet
} from 'lucide-react';

import '../styles/disease.css';

import { getDashboard } from '../api/dashboard';
import { createFarm, searchLocation } from '../api/farms';
import AppSidebar from '../components/common/AppSidebar';
import AppHeader from '../components/common/AppHeader';
import farmHeroImg from '../assets/hero_highres.jpg';

const POPULAR_CITIES = [
  { name: 'Anand, Gujarat', latitude: 22.5645, longitude: 72.9289 },
  { name: 'Ahmedabad, Gujarat', latitude: 23.0225, longitude: 72.5714 },
  { name: 'Vadodara, Gujarat', latitude: 22.3072, longitude: 73.1812 },
  { name: 'Surat, Gujarat', latitude: 21.1702, longitude: 72.8311 },
  { name: 'Rajkot, Gujarat', latitude: 22.3039, longitude: 70.8022 },
  { name: 'Mehsana, Gujarat', latitude: 23.5880, longitude: 72.3693 },
  { name: 'Junagadh, Gujarat', latitude: 21.5222, longitude: 70.4579 },
  { name: 'Bhavnagar, Gujarat', latitude: 21.7645, longitude: 72.1519 },
  { name: 'Jamnagar, Gujarat', latitude: 22.4707, longitude: 70.0577 },
  { name: 'Gandhinagar, Gujarat', latitude: 23.2156, longitude: 72.6369 },
  { name: 'Bhuj / Kutch, Gujarat', latitude: 23.2420, longitude: 69.6669 },
  { name: 'Pune, Maharashtra', latitude: 18.5204, longitude: 73.8567 },
  { name: 'Nashik, Maharashtra', latitude: 19.9975, longitude: 73.7898 },
  { name: 'Nagpur, Maharashtra', latitude: 21.1458, longitude: 79.0882 },
  { name: 'Indore, Madhya Pradesh', latitude: 22.7196, longitude: 75.8577 },
  { name: 'Jaipur, Rajasthan', latitude: 26.9124, longitude: 75.7873 },
];

// Helper for botanical scientific names
function getScientificCrop(crop) {
  const c = (crop || '').toLowerCase();
  if (c.includes('tomato')) return 'Solanum lycopersicum';
  if (c.includes('cotton')) return 'Gossypium hirsutum';
  if (c.includes('corn') || c.includes('maize')) return 'Zea mays';
  if (c.includes('potato')) return 'Solanum tuberosum';
  if (c.includes('grape')) return 'Vitis vinifera';
  if (c.includes('apple')) return 'Malus domestica';
  if (c.includes('strawberry')) return 'Fragaria × ananassa';
  if (c.includes('rice')) return 'Oryza sativa';
  if (c.includes('wheat')) return 'Triticum aestivum';
  return 'Cultivated Specimen';
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeNav, setActiveNav] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Live real data states from API
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFarmId, setSelectedFarmId] = useState(null);

  // Modals & Popovers
  const [showAddFarmModal, setShowAddFarmModal] = useState(false);
  const [showForecastModal, setShowForecastModal] = useState(false);
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);
  const [showFarmDropdown, setShowFarmDropdown] = useState(false);

  // Today's Action Plan interactive checklist
  const [completedSteps, setCompletedSteps] = useState([1]); // step 1 checked by default

  // Add farm form state
  const [farmForm, setFarmForm] = useState({
    farm_name: '',
    location_name: '',
    latitude: 22.5645,
    longitude: 72.9289,
    crop: 'Tomato',
    soil_type: 'black',
    farm_size: 4.5,
    irrigation_type: 'drip',
  });
  const [locationQuery, setLocationQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [locationResults, setLocationResults] = useState([]);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [submittingFarm, setSubmittingFarm] = useState(false);

  const farmerName = user?.name || 'Farmer';
  const firstName = farmerName.split(' ')[0] || 'Farmer';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Fetch dashboard data strictly from backend API
  const loadDashboard = async (farmId = null) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDashboard(farmId);
      setDashboardData(data);
      if (data?.farm?.id) {
        setSelectedFarmId(data.farm.id);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError(
        err.friendlyMessage ||
          'Unable to connect to AgriSmart server. Please verify backend is running.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard(selectedFarmId);
  }, []);

  // Handle city dropdown selection
  const handleCityDropdownSelect = (cityName) => {
    setSelectedCity(cityName);
    if (!cityName || cityName === 'custom') return;
    const match = POPULAR_CITIES.find((c) => c.name === cityName);
    if (match) {
      setFarmForm((prev) => ({
        ...prev,
        location_name: match.name,
        latitude: match.latitude,
        longitude: match.longitude,
      }));
      setLocationQuery(match.name);
      setLocationResults([]);
    }
  };

  // Handle location search in modal
  const handleLocationSearch = async (val) => {
    setLocationQuery(val);
    if (val.trim().length >= 2) {
      setSearchingLocation(true);
      try {
        const results = await searchLocation(val);
        setLocationResults(results);
      } catch (e) {
        console.warn('Location search error:', e);
      } finally {
        setSearchingLocation(false);
      }
    } else {
      setLocationResults([]);
    }
  };

  const selectLocation = (loc) => {
    setFarmForm((prev) => ({
      ...prev,
      location_name: loc.display || loc.name,
      latitude: loc.latitude,
      longitude: loc.longitude,
    }));
    setSelectedCity('custom');
    setLocationQuery(loc.display || loc.name);
    setLocationResults([]);
  };

  // Submit new farm
  const handleCreateFarm = async (e) => {
    e.preventDefault();
    if (!farmForm.farm_name.trim()) return;
    setSubmittingFarm(true);
    try {
      const newFarm = await createFarm(farmForm);
      setShowAddFarmModal(false);
      setFarmForm({
        farm_name: '',
        location_name: '',
        latitude: 22.5645,
        longitude: 72.9289,
        crop: 'Tomato',
        soil_type: 'black',
        farm_size: 4.5,
        irrigation_type: 'drip',
      });
      setLocationQuery('');
      await loadDashboard(newFarm.id);
    } catch (err) {
      alert(err.friendlyMessage || 'Could not save farm. Please try again.');
    } finally {
      setSubmittingFarm(false);
    }
  };

  // Toggle checklist steps
  const toggleStep = (stepNumber) => {
    setCompletedSteps((prev) =>
      prev.includes(stepNumber) ? prev.filter((s) => s !== stepNumber) : [...prev, stepNumber]
    );
  };

  // Derived real data
  const farm = dashboardData?.farm;
  const farmName = farm?.name || farm?.farm_name || 'Primary Farm Plot';
  const location = farm?.location || farm?.location_name || 'Bhavnagar, Gujarat';
  const acreage = farm?.farm_size || '12.4';
  const soilType = farm?.soil_type || 'Loam';
  const primaryCrop = farm?.crop || 'Tomato';
  const secondaryCrop = dashboardData?.crops?.[1]?.name || 'Corn / Maize';

  const weather = dashboardData?.current_weather;
  const temperature = weather?.temperature != null ? Math.round(weather.temperature) : 24.5;
  const humidity = weather?.humidity != null ? weather.humidity : 78;
  const rainInbound =
    weather?.precipitation != null
      ? weather.precipitation
      : dashboardData?.forecast?.[0]?.precipitation != null
      ? dashboardData.forecast[0].precipitation
      : 30.9;
  const rainProb =
    dashboardData?.forecast?.[0]?.rain_probability != null
      ? dashboardData.forecast[0].rain_probability
      : dashboardData?.irrigation?.rain_probability != null
      ? dashboardData.irrigation.rain_probability
      : 85;
  const soilMoisture =
    dashboardData?.soil?.moisture_percent != null
      ? dashboardData.soil.moisture_percent
      : dashboardData?.soil?.moisture != null
      ? dashboardData.soil.moisture
      : 54;

  const irrigation = dashboardData?.irrigation;
  const postponeHours =
    irrigation?.status === 'DELAY' || rainProb >= 60 ? 48 : irrigation?.status === 'RECOMMEND' ? 0 : 24;

  const dateDisplay =
    dashboardData?.meta?.date_display ||
    new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  const season = dashboardData?.meta?.season || 'Autumn Crop Cycle 2026';
  const weatherProvider = dashboardData?.meta?.provider || 'WeatherAPI';
  const alerts = dashboardData?.alerts || [];
  const cropsList = dashboardData?.crops || [];
  const forecastList = dashboardData?.forecast || [];
  const sustainabilityScore = dashboardData?.sustainability?.score ?? 82;

  return (
    <div className="flex min-h-screen bg-[#f6fbf8] text-[#193229] font-sans antialiased selection:bg-[#b2ebd0] selection:text-[#0b231c]">
      {/* Unified AgriSmart Sidebar */}
      <AppSidebar
        activeItem="dashboard"
        mobileOpen={sidebarOpen}
        setMobileOpen={setSidebarOpen}
        onItemClick={(id) => {
          setActiveNav(id);
          if (id === 'dashboard') navigate('/dashboard');
          if (id === 'disease') navigate('/disease');
          if (id === 'assistant') navigate('/assistant');
          if (id === 'weather') navigate('/weather');
          if (id === 'irrigation') navigate('/irrigation');
          if (id === 'sustainability') navigate('/sustainability');
          if (id === 'crop') navigate('/crop');
          if (id === 'myfarm') setShowAddFarmModal(true);
        }}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Unified Top Navigation Header */}
        <AppHeader
          moduleId="dashboard"
          title="AgriSmart Central"
          subtitle="Overview"
          onMenuClick={() => setSidebarOpen(true)}
          badgeText={`${weatherProvider} Live`}
          badgeType="emerald"
          centerContent={
            <div className="hidden lg:flex items-center gap-2.5 w-full max-w-md mx-2">
              {/* Farm Location Selector Button */}
              <div className="relative flex-shrink-0">
                {dashboardData?.has_farm ? (
                  <button
                    type="button"
                    onClick={() => setShowFarmDropdown(!showFarmDropdown)}
                    className="flex items-center gap-2 text-xs text-[#16352D] font-medium px-3 py-1.5 rounded-lg border border-[#DCE8DF] bg-white hover:bg-[#EAF5EE] transition-colors cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#1b4d3e]" />
                    <span className="max-w-[180px] truncate">{location}</span>
                    <ChevronDown className="w-3 h-3 text-[#6C7D76]" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAddFarmModal(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#1b4d3e] hover:text-[#133a2f] bg-[#ecfef3] px-3 py-1.5 rounded-lg border border-[#aae1c2] transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Configure Farm</span>
                  </button>
                )}

                {/* Farms dropdown popover */}
                {showFarmDropdown && dashboardData?.all_farms && (
                  <div className="absolute left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-[#DCE8DF] py-2 z-50">
                    <div className="px-3.5 py-1.5 text-[10px] font-bold text-[#6C7D76] uppercase tracking-wider">
                      Your Registered Farms
                    </div>
                    {dashboardData.all_farms.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          setSelectedFarmId(f.id);
                          setShowFarmDropdown(false);
                          loadDashboard(f.id);
                        }}
                        className={`w-full text-left px-3.5 py-2 text-xs font-medium flex items-center justify-between hover:bg-[#ecfef3] transition-colors cursor-pointer ${
                          f.id === dashboardData?.farm?.id
                            ? 'text-[#1b4d3e] font-bold bg-[#ecfef3]/60'
                            : 'text-[#16352D]'
                        }`}
                      >
                        <span className="truncate">{f.farm_name}</span>
                        {f.id === dashboardData?.farm?.id && (
                          <Check className="w-3.5 h-3.5 text-[#2fa874]" />
                        )}
                      </button>
                    ))}
                    <div className="border-t border-[#edf6f0] my-1" />
                    <button
                      type="button"
                      onClick={() => {
                        setShowFarmDropdown(false);
                        setShowAddFarmModal(true);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-semibold text-[#1b4d3e] hover:bg-[#ecfef3] flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Another Farm
                    </button>
                  </div>
                )}
              </div>
            </div>
          }
          rightActions={
            <div className="flex items-center gap-3">
              {/* Live Temperature Quick Pill */}
              <button
                type="button"
                onClick={() => setShowForecastModal(true)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#ecfef3] border border-[#d2f4e0] text-[#1b4d3e] text-xs font-semibold hover:bg-[#d8f5e4] transition-colors cursor-pointer"
                title="View 7-day agricultural forecast"
              >
                <Sun className="w-3.5 h-3.5 text-[#e5a034]" />
                <span>{temperature}°C</span>
                <span className="text-[#527d6a] font-normal truncate max-w-[80px]">
                  {weather?.condition || 'Live'}
                </span>
              </button>

              {/* Advisories Popover Toggle */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowAlertsDropdown(!showAlertsDropdown)}
                  className="relative p-2 rounded-xl hover:bg-[#ecfef3] text-[#16352D] transition-colors cursor-pointer"
                  aria-label="Alerts"
                  title="Field Advisories"
                >
                  <Bell className="w-4 h-4" />
                  {alerts.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#c95a5a] rounded-full" />
                  )}
                </button>

                {showAlertsDropdown && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-[#DCE8DF] p-4 z-50 animate-fadeIn">
                    <div className="flex items-center justify-between pb-2.5 border-b border-[#DCE8DF]">
                      <span className="text-xs font-bold text-[#16352D]">Active Field Advisories</span>
                      <span className="text-[10px] bg-[#ecfef3] text-[#1b4d3e] font-bold px-2 py-0.5 rounded-full border border-[#d2f4e0]">
                        {alerts.length} Items
                      </span>
                    </div>
                    <div className="mt-2.5 space-y-2 max-h-60 overflow-y-auto">
                      {alerts.length > 0 ? (
                        alerts.map((alert, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-[#F7F8F3] border border-[#DCE8DF] flex items-start gap-2.5"
                          >
                            <span className="text-base shrink-0">{alert.icon || '🔔'}</span>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[#16352D]">{alert.title}</p>
                              <p className="text-[11px] text-[#6C7D76] mt-0.5 leading-snug">
                                {alert.message}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-[#6C7D76] py-3 text-center">
                          All systems nominal. No active advisories.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          }
        />

        {/* Main Dashboard Scrollable Canvas */}
        <main className="flex-1 overflow-y-auto">
          <div className="w-full max-w-[1240px] mx-auto px-6 py-8 space-y-8">
            {/* Loading Indicator */}
            {loading && !dashboardData && (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <RefreshCw className="w-8 h-8 text-[#1b4d3e] animate-spin" />
                <p className="text-sm font-medium text-[#527d6a]">
                  Synchronizing field telemetry &amp; agronomic models...
                </p>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="p-4 rounded-2xl bg-[#fdf2f2] border border-[#f8d7d7] flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-[#c95a5a] shrink-0" />
                  <div>
                    <p className="font-bold text-[#c95a5a]">Telemetry Notice</p>
                    <p className="text-[#6C7D76]">{error}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => loadDashboard(selectedFarmId)}
                  className="px-3 py-1.5 rounded-lg bg-[#c95a5a] text-white font-semibold hover:bg-red-700 transition-colors whitespace-nowrap cursor-pointer"
                >
                  Retry Sync
                </button>
              </div>
            )}

            {/* Empty Farm State Setup Banner */}
            {dashboardData && !dashboardData.has_farm && (
              <div className="p-6 rounded-2xl bg-[#ecfef3] border border-[#bfe7cf] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white border border-[#aee3c5] flex items-center justify-center text-[#1b4d3e] shrink-0 shadow-xs">
                    <Sprout className="w-6 h-6 text-[#2fa874]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#113329]">
                      Welcome to AgriSmart! Configure Your Farm Plot
                    </h3>
                    <p className="text-xs text-[#4d7362] mt-0.5 leading-relaxed">
                      Set up your farm coordinates, crops, and soil type to stream live microclimate telemetry and personalized agronomic prescriptions.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddFarmModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-[#1b4d3e] hover:bg-[#133a2f] text-white text-xs font-semibold shadow-xs transition-colors whitespace-nowrap cursor-pointer"
                >
                  + Add Farm Information
                </button>
              </div>
            )}

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* 1. TOP EDITORIAL HEADER & GREETING                            */}
            {/* ═════════════════════════════════════════════════════════════ */}
            <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2">
              <div className="space-y-2 max-w-3xl">
                <div className="inline-flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#2fa874]" />
                  <span className="text-[11px] font-semibold text-[#1b4d3e] tracking-widest uppercase">
                    DAILY FIELD ADVISORY · {season.toUpperCase()}
                  </span>
                </div>

                <h1 className="font-editorial text-4xl sm:text-5xl text-[#003629] font-normal tracking-tight leading-tight">
                  {greeting}, {firstName}. Here's your farm brief for today.
                </h1>

                <p className="text-xs sm:text-sm text-[#4d7362] leading-relaxed font-sans">
                  {dateDisplay} · {farmName} ({acreage} Acres) — Current field telemetry, pathogen alerts, and recommended morning protocols.
                </p>
              </div>

              {/* Header Right Actions */}
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowForecastModal(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#ecfef3] hover:bg-[#d8f5e4] text-[#003629] border border-[#d2f4e0] transition-colors text-xs font-semibold shadow-xs cursor-pointer"
                >
                  <Sliders className="w-4 h-4 text-[#2fa874]" />
                  <span>Field Telemetry</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#1b4d3e] hover:bg-[#133a2f] active:bg-[#0c261e] text-white transition-colors text-xs font-semibold shadow-md shadow-[#1b4d3e]/20 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-emerald-200" />
                  <span>Print Advisory Brief</span>
                </button>
              </div>
            </header>

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* 2. HERO AGRICULTURAL PANORAMA & FLOATING INSET BADGE          */}
            {/* ═════════════════════════════════════════════════════════════ */}
            <section className="relative w-full rounded-2xl overflow-hidden shadow-editorial aspect-[21/9] max-h-[380px] bg-[#eaf4ee] border border-[#DCE8DF]">
              <div
                className="w-full h-full bg-cover bg-center transition-transform duration-700 hover:scale-[1.01]"
                style={{ backgroundImage: `url(${farmHeroImg})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#003629]/85 via-[#003629]/25 to-transparent pointer-events-none" />

              {/* Top Inset Status Indicators */}
              <div className="absolute top-5 left-6 flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-md text-[#003629] text-[11px] font-semibold flex items-center gap-1.5 shadow-xs border border-white/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2fa874] animate-ping" />
                  Telemetry Synced 06:15 IST
                </span>
                <span className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-md text-[#527d6a] text-[11px] font-medium border border-white/40">
                  Sensor Node: {location ? location.substring(0, 3).toUpperCase() + '-04B' : 'BVN-04B'}
                </span>
              </div>

              {/* Bottom Floating Narrative Badge */}
              <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="bg-white/95 backdrop-blur-md px-6 py-4 rounded-xl shadow-xl max-w-xl border border-[#DCE8DF]">
                  <div className="flex items-center gap-2 text-[#2fa874] mb-1">
                    <Leaf className="w-4 h-4 stroke-[2]" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#1b4d3e]">
                      Active Agricultural Zone
                    </span>
                  </div>
                  <p className="font-editorial text-xl sm:text-2xl font-bold text-[#003629] leading-snug">
                    {farmName}: {primaryCrop} &amp; {secondaryCrop} Rotation
                  </p>
                  <p className="text-xs text-[#527d6a] mt-0.5">
                    {soilMoisture}% Soil Moisture · {soilType} Soil · South-Facing Slope
                  </p>
                </div>

                <div className="hidden md:flex items-center gap-2 bg-white/90 backdrop-blur-md px-4 py-2.5 rounded-full text-[#003629] text-xs font-semibold border border-white/50 shadow-xs">
                  <Droplet className="w-4 h-4 text-[#2fa874]" />
                  <span>Rain Intercept Mode: {rainProb >= 50 ? 'Active' : 'Standby'}</span>
                </div>
              </div>
            </section>

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* 3. HORIZONTAL TELEMETRY & BRIEF STRIP (5 Columns)             */}
            {/* ═════════════════════════════════════════════════════════════ */}
            <section className="bg-white rounded-2xl p-6 shadow-editorial border border-[#DCE8DF]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                {/* Metric 1: Field Temperature */}
                <div className="flex flex-col justify-between pr-4 border-r border-[#edf6f0] last:border-0">
                  <div className="flex items-center gap-2 text-[#6C7D76] mb-2">
                    <Sun className="w-4 h-4 text-[#e5a034]" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6C7D76]">
                      Field Temperature
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-editorial text-4xl font-normal text-[#003629]">
                      {temperature}°
                    </span>
                    <span className="text-xs text-[#6C7D76] font-medium">C</span>
                  </div>
                  <p className="text-xs text-[#527d6a] mt-2">
                    Morning low: {Math.max(16, temperature - 3)}°C · Peak: {temperature + 4}°C
                  </p>
                </div>

                {/* Metric 2: Atmospheric Humidity */}
                <div className="flex flex-col justify-between pr-4 border-r border-[#edf6f0] last:border-0">
                  <div className="flex items-center gap-2 text-[#6C7D76] mb-2">
                    <Droplets className="w-4 h-4 text-[#2fa874]" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6C7D76]">
                      Atmospheric Humidity
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-editorial text-4xl font-normal text-[#003629]">
                      {humidity}
                    </span>
                    <span className="text-xs text-[#6C7D76] font-medium">%</span>
                  </div>
                  <p className="text-xs text-[#527d6a] mt-2">
                    Dew point achieved at 05:40 AM
                  </p>
                </div>

                {/* Metric 3: Rain Forecast */}
                <div className="flex flex-col justify-between pr-4 border-r border-[#edf6f0] last:border-0">
                  <div className="flex items-center gap-2 text-[#6C7D76] mb-2">
                    <CloudRain className="w-4 h-4 text-[#2fa874]" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6C7D76]">
                      Precipitation Inbound
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-editorial text-4xl font-normal text-[#003629]">
                      {rainInbound}
                    </span>
                    <span className="text-xs text-[#6C7D76] font-medium">mm</span>
                  </div>
                  <p className="text-xs text-[#2fa874] font-medium mt-2">
                    {rainProb}% probability next 24–48h
                  </p>
                </div>

                {/* Metric 4: Soil VWC Moisture */}
                <div className="flex flex-col justify-between pr-4 border-r border-[#edf6f0] last:border-0">
                  <div className="flex items-center gap-2 text-[#6C7D76] mb-2">
                    <Layers className="w-4 h-4 text-[#2fa874]" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6C7D76]">
                      In-Situ Soil Moisture
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-editorial text-4xl font-normal text-[#003629]">
                      {soilMoisture}
                    </span>
                    <span className="text-xs text-[#6C7D76] font-medium">% VWC</span>
                  </div>
                  <div className="w-full bg-[#e2efe7] h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-[#2fa874] h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, Math.max(0, soilMoisture))}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-[#527d6a] mt-1.5">
                    {soilMoisture >= 40 ? 'Sufficient Buffer (Stress: 30%)' : 'Moisture Depletion Buffer'}
                  </p>
                </div>

                {/* Metric 5: Primary Protocol Callout */}
                <div className="flex flex-col justify-between bg-[#ecfef3] p-4 rounded-xl border border-[#bfe7cf]">
                  <div className="flex items-center gap-1.5 text-[#1b4d3e]">
                    <CheckCircle className="w-4 h-4 text-[#2fa874]" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Core Protocol
                    </span>
                  </div>
                  <div className="my-2">
                    <p className="font-editorial text-lg font-bold text-[#003629] leading-tight">
                      {postponeHours > 0
                        ? `Postpone Irrigation ${postponeHours} Hours`
                        : 'Irrigation Recommended Today'}
                    </p>
                    <p className="text-[11px] text-[#4d7362] mt-1 leading-snug">
                      {postponeHours > 0
                        ? 'Rainfall matches full transpiration demand.'
                        : 'Soil moisture depleted below target threshold.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/irrigation')}
                    className="inline-flex items-center gap-1 text-[#1b4d3e] hover:text-[#003629] text-xs font-semibold hover:underline cursor-pointer"
                  >
                    <span>Review Decision Log</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </section>

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* 4. TWO-COLUMN ADVISORY WORKSPACE (60% Left, 40% Right)        */}
            {/* ═════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* ── LEFT COLUMN: Diagnostic Alerts & Action Checklist (7 cols) ── */}
              <div className="lg:col-span-7 space-y-8">
                {/* Section A: Needs Your Attention */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-[#c95a5a]" />
                      <h2 className="font-editorial text-2xl font-bold text-[#003629]">
                        Needs Your Attention
                      </h2>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-[#f2fbf5] text-[#1b4d3e] border border-[#d2f4e0] text-xs font-semibold">
                      3 Active Items
                    </span>
                  </div>

                  {/* Alert 1: Bacterial Spot / Pathogen Alert */}
                  <div className="bg-white p-5 rounded-xl border border-[#DCE8DF] shadow-editorial hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-[#fdf2f2] text-[#c95a5a] border border-[#f8d7d7] flex items-center justify-center shrink-0 mt-0.5">
                        <ShieldAlert className="w-5 h-5" />
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm sm:text-base text-[#16352D]">
                            Bacterial Spot Inoculum
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#F7F8F3] text-[#527d6a] border border-[#DCE8DF]">
                            Block 4-B {primaryCrop}
                          </span>
                        </div>
                        <p className="text-xs text-[#527d6a] leading-relaxed">
                          <em className="italic text-[#16352D]">Xanthomonas campestris</em> detected on lower canopy leaves. Avoid overhead watering to suppress bacterial exudate splash dispersal.
                        </p>
                        <p className="text-xs text-[#2fa874] font-medium pt-0.5">
                          Protocol: Plan dawn foliar application with copper bactericide.
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 flex items-center justify-between bg-[#f8faf8] px-3.5 py-2 rounded-lg border border-[#edf6f0]">
                      <span className="text-[11px] text-[#6C7D76]">Model Confidence: 94.2%</span>
                      <button
                        type="button"
                        onClick={() => navigate('/disease')}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#1b4d3e] hover:underline cursor-pointer"
                      >
                        <span>Review Diagnostic Report</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Alert 2: Irrigation Decoupling */}
                  <div className="bg-white p-5 rounded-xl border border-[#DCE8DF] shadow-editorial hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-[#ecfef3] text-[#1b4d3e] border border-[#bfe7cf] flex items-center justify-center shrink-0 mt-0.5">
                        <Droplets className="w-5 h-5 text-[#2fa874]" />
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm sm:text-base text-[#16352D]">
                            Automatic Irrigation Decoupled
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#ecfef3] text-[#1b4d3e] border border-[#d2f4e0]">
                            Preventative
                          </span>
                        </div>
                        <p className="text-xs text-[#527d6a] leading-relaxed">
                          Significant {rainInbound} mm rainfall inbound over 48 hours. Valves on sub-main lines 3 and 4 held closed to avoid root-zone hypoxia and collar rot.
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 flex items-center justify-between bg-[#f8faf8] px-3.5 py-2 rounded-lg border border-[#edf6f0]">
                      <span className="text-[11px] text-[#2fa874] font-medium">
                        Estimated Water Saved: 14,200 Liters
                      </span>
                      <button
                        type="button"
                        onClick={() => navigate('/irrigation')}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#1b4d3e] hover:underline cursor-pointer"
                      >
                        <span>Open Irrigation Engine</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Alert 3: Spray Window Restriced */}
                  <div className="bg-white p-5 rounded-xl border border-[#DCE8DF] shadow-editorial hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-[#F7F8F3] text-[#1b4d3e] border border-[#DCE8DF] flex items-center justify-center shrink-0 mt-0.5">
                        <Wind className="w-5 h-5 text-[#527d6a]" />
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm sm:text-base text-[#16352D]">
                            Foliar Application Window Restricted
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#F7F8F3] text-[#527d6a] border border-[#DCE8DF]">
                            Microclimate Alert
                          </span>
                        </div>
                        <p className="text-xs text-[#527d6a] leading-relaxed">
                          Sustained wind gusts measure {weather?.wind_speed || 24} km/h. Droplet drift risk elevated. Hold all spray applications until morning calm window (&lt;18 km/h) tomorrow.
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 flex items-center justify-between bg-[#f8faf8] px-3.5 py-2 rounded-lg border border-[#edf6f0]">
                      <span className="text-[11px] text-[#6C7D76]">
                        Next Optimal Window: Tomorrow, 06:00 – 08:30 AM
                      </span>
                      <button
                        type="button"
                        onClick={() => navigate('/weather')}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#1b4d3e] hover:underline cursor-pointer"
                      >
                        <span>Check Spray Window</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Section B: Today's Action Plan (Interactive Checklist) */}
                <div className="bg-white rounded-2xl p-6 shadow-editorial border border-[#DCE8DF] space-y-5">
                  <div className="flex items-center justify-between pb-2 border-b border-[#edf6f0]">
                    <div>
                      <span className="text-[11px] font-semibold text-[#2fa874] uppercase tracking-wider">
                        Daily Execution
                      </span>
                      <h2 className="font-editorial text-2xl font-bold text-[#003629]">
                        Today's Field Action Plan
                      </h2>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-[#527d6a]">
                        {completedSteps.length} of 4 Completed
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Step 1 */}
                    <label
                      onClick={() => toggleStep(1)}
                      className={`group flex items-start gap-3.5 p-3.5 rounded-xl border transition-colors cursor-pointer ${
                        completedSteps.includes(1)
                          ? 'bg-[#f4faf6] border-[#d2f4e0]'
                          : 'bg-[#fafdfb] border-[#edf6f0] hover:bg-[#f4faf6]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={completedSteps.includes(1)}
                        onChange={() => {}}
                        className="mt-1 h-4 w-4 rounded text-[#1b4d3e] accent-[#1b4d3e] cursor-pointer"
                      />
                      <div className="space-y-0.5 flex-1">
                        <span className="text-[11px] font-semibold text-[#2fa874]">STEP 01</span>
                        <p
                          className={`text-xs sm:text-sm font-medium ${
                            completedSteps.includes(1)
                              ? 'line-through text-[#6C7D76]'
                              : 'text-[#16352D]'
                          }`}
                        >
                          Postpone scheduled drip irrigation cycle across Block 4-B.
                        </p>
                        <p className="text-[11px] text-[#527d6a]">
                          Automated valve override confirmed in sensor console.
                        </p>
                      </div>
                    </label>

                    {/* Step 2 */}
                    <label
                      onClick={() => toggleStep(2)}
                      className={`group flex items-start gap-3.5 p-3.5 rounded-xl border transition-colors cursor-pointer ${
                        completedSteps.includes(2)
                          ? 'bg-[#f4faf6] border-[#d2f4e0]'
                          : 'bg-[#fafdfb] border-[#edf6f0] hover:bg-[#f4faf6]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={completedSteps.includes(2)}
                        onChange={() => {}}
                        className="mt-1 h-4 w-4 rounded text-[#1b4d3e] accent-[#1b4d3e] cursor-pointer"
                      />
                      <div className="space-y-0.5 flex-1">
                        <span className="text-[11px] font-semibold text-[#2fa874]">STEP 02</span>
                        <p
                          className={`text-xs sm:text-sm font-medium ${
                            completedSteps.includes(2)
                              ? 'line-through text-[#6C7D76]'
                              : 'text-[#16352D]'
                          }`}
                        >
                          Inspect tomato lower canopy for foliar halo lesions and prune symptomatic tissue.
                        </p>
                        <p className="text-[11px] text-[#527d6a]">
                          Sterilize shears between rows using 70% isopropyl alcohol.
                        </p>
                      </div>
                    </label>

                    {/* Step 3 */}
                    <label
                      onClick={() => toggleStep(3)}
                      className={`group flex items-start gap-3.5 p-3.5 rounded-xl border transition-colors cursor-pointer ${
                        completedSteps.includes(3)
                          ? 'bg-[#f4faf6] border-[#d2f4e0]'
                          : 'bg-[#fafdfb] border-[#edf6f0] hover:bg-[#f4faf6]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={completedSteps.includes(3)}
                        onChange={() => {}}
                        className="mt-1 h-4 w-4 rounded text-[#1b4d3e] accent-[#1b4d3e] cursor-pointer"
                      />
                      <div className="space-y-0.5 flex-1">
                        <span className="text-[11px] font-semibold text-[#2fa874]">STEP 03</span>
                        <p
                          className={`text-xs sm:text-sm font-medium ${
                            completedSteps.includes(3)
                              ? 'line-through text-[#6C7D76]'
                              : 'text-[#16352D]'
                          }`}
                        >
                          Clear low drainage furrows along perimeter to prevent standing rain pooling.
                        </p>
                        <p className="text-[11px] text-[#527d6a]">
                          Mitigates runoff saturation ahead of incoming 30mm rainfall.
                        </p>
                      </div>
                    </label>

                    {/* Step 4 */}
                    <label
                      onClick={() => toggleStep(4)}
                      className={`group flex items-start gap-3.5 p-3.5 rounded-xl border transition-colors cursor-pointer ${
                        completedSteps.includes(4)
                          ? 'bg-[#f4faf6] border-[#d2f4e0]'
                          : 'bg-[#fafdfb] border-[#edf6f0] hover:bg-[#f4faf6]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={completedSteps.includes(4)}
                        onChange={() => {}}
                        className="mt-1 h-4 w-4 rounded text-[#1b4d3e] accent-[#1b4d3e] cursor-pointer"
                      />
                      <div className="space-y-0.5 flex-1">
                        <span className="text-[11px] font-semibold text-[#2fa874]">STEP 04</span>
                        <p
                          className={`text-xs sm:text-sm font-medium ${
                            completedSteps.includes(4)
                              ? 'line-through text-[#6C7D76]'
                              : 'text-[#16352D]'
                          }`}
                        >
                          Prepare copper bactericide / bio-fungicide mix for tomorrow's dawn calm window.
                        </p>
                        <p className="text-[11px] text-[#527d6a]">
                          Recommended dosage: 2.5g per liter as per ICAR-TNAU guidelines.
                        </p>
                      </div>
                    </label>
                  </div>

                  <div className="pt-2 flex flex-wrap justify-between items-center text-xs text-[#527d6a] border-t border-[#edf6f0] gap-2">
                    <span>Field Technician: {farmerName}</span>
                    <button
                      type="button"
                      onClick={() => navigate('/assistant')}
                      className="text-xs font-semibold text-[#1b4d3e] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Ask AI Agronomist for Guidance</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* ── RIGHT COLUMN: Crop Stand, 3-Day Microclimate, Sustainability (5 cols) ── */}
              <div className="lg:col-span-5 space-y-8">
                {/* 1. Crop Stand Status */}
                <div className="bg-white rounded-2xl p-6 shadow-editorial border border-[#DCE8DF] space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-editorial text-2xl font-bold text-[#003629]">
                      Crop Stand Status
                    </h2>
                    <span className="text-xs font-medium text-[#527d6a]">{location}</span>
                  </div>

                  <div className="space-y-3">
                    {/* Primary Crop */}
                    <div className="p-3.5 rounded-xl bg-[#fafdfb] border border-[#edf6f0] flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#16352D]">{primaryCrop}</span>
                          <span className="text-[11px] italic text-[#6C7D76]">
                            ({getScientificCrop(primaryCrop)})
                          </span>
                        </div>
                        <p className="text-xs text-[#527d6a]">Flowering &amp; Fruit Set Stage</p>
                      </div>
                      <div className="text-right">
                        <span className="px-2.5 py-1 rounded-full bg-[#fdf2f2] text-[#c95a5a] border border-[#f8d7d7] text-[10px] font-semibold">
                          Attention
                        </span>
                        <p className="text-[10px] text-[#6C7D76] mt-1">Bacterial spot</p>
                      </div>
                    </div>

                    {/* Secondary Crop */}
                    <div className="p-3.5 rounded-xl bg-[#fafdfb] border border-[#edf6f0] flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#16352D]">Cotton</span>
                          <span className="text-[11px] italic text-[#6C7D76]">
                            (Gossypium hirsutum)
                          </span>
                        </div>
                        <p className="text-xs text-[#527d6a]">Vegetative Canopy Development</p>
                      </div>
                      <div className="text-right">
                        <span className="px-2.5 py-1 rounded-full bg-[#ecfef3] text-[#1b4d3e] border border-[#d2f4e0] text-[10px] font-semibold">
                          Healthy
                        </span>
                        <p className="text-[10px] text-[#6C7D76] mt-1">Vigorous foliage</p>
                      </div>
                    </div>

                    {/* Crop 3 */}
                    <div className="p-3.5 rounded-xl bg-[#fafdfb] border border-[#edf6f0] flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#16352D]">Corn / Maize</span>
                          <span className="text-[11px] italic text-[#6C7D76]">(Zea mays)</span>
                        </div>
                        <p className="text-xs text-[#527d6a]">Tasseling &amp; Silking</p>
                      </div>
                      <div className="text-right">
                        <span className="px-2.5 py-1 rounded-full bg-[#F7F8F3] text-[#527d6a] border border-[#DCE8DF] text-[10px] font-semibold">
                          Monitor
                        </span>
                        <p className="text-[10px] text-[#6C7D76] mt-1">Blight contained</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. 3-Day Microclimate Forecast */}
                <div className="bg-white rounded-2xl p-6 shadow-editorial border border-[#DCE8DF] space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-editorial text-2xl font-bold text-[#003629]">
                      3-Day Microclimate
                    </h2>
                    <div className="flex items-center gap-1 text-[#2fa874] text-xs font-semibold">
                      <CloudSun className="w-4 h-4" />
                      <span>Hyperlocal Station</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Day 1 (Today) */}
                    <div className="p-3.5 rounded-xl bg-[#ecfef3]/50 border border-[#d2f4e0] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-white border border-[#bfe7cf] flex items-center justify-center text-[#2fa874] shadow-xs">
                          <CloudRain className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-[#16352D]">Today</p>
                          <p className="text-xs text-[#527d6a]">
                            {weather?.condition || 'Light rain shower'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-[#003629]">
                          {temperature - 1}° – {temperature + 3}°C
                        </span>
                        <p className="text-[11px] text-[#2fa874] font-medium">
                          {rainProb}% ({rainInbound} mm)
                        </p>
                      </div>
                    </div>

                    {/* Day 2 (Tomorrow) */}
                    <div className="p-3.5 rounded-xl bg-[#fafdfb] border border-[#edf6f0] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-white border border-[#DCE8DF] flex items-center justify-center text-[#527d6a] shadow-xs">
                          <CloudSun className="w-5 h-5 text-[#e5a034]" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-[#16352D]">Tomorrow</p>
                          <p className="text-xs text-[#527d6a]">
                            {forecastList[1]?.condition || 'Patchy rain nearby'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-[#003629]">
                          {forecastList[1]?.temperature_min ? Math.round(forecastList[1].temperature_min) : 24}° –{' '}
                          {forecastList[1]?.temperature_max ? Math.round(forecastList[1].temperature_max) : 30}°C
                        </span>
                        <p className="text-[11px] text-[#527d6a]">
                          {forecastList[1]?.rain_probability || 45}% (5.3 mm)
                        </p>
                      </div>
                    </div>

                    {/* Day 3 */}
                    <div className="p-3.5 rounded-xl bg-[#fafdfb] border border-[#edf6f0] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-white border border-[#DCE8DF] flex items-center justify-center text-[#527d6a] shadow-xs">
                          <Sun className="w-5 h-5 text-[#e5a034]" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-[#16352D]">Day 3</p>
                          <p className="text-xs text-[#527d6a]">
                            {forecastList[2]?.condition || 'Overcast skies'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-[#003629]">
                          {forecastList[2]?.temperature_min ? Math.round(forecastList[2].temperature_min) : 23}° –{' '}
                          {forecastList[2]?.temperature_max ? Math.round(forecastList[2].temperature_max) : 29}°C
                        </span>
                        <p className="text-[11px] text-[#527d6a]">
                          {forecastList[2]?.rain_probability || 20}% (0.5 mm)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Farm Snapshot & Sustainability Card */}
                <div className="bg-white rounded-2xl p-6 shadow-editorial border border-[#DCE8DF] space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#2fa874] uppercase tracking-wider">
                      Ecological Performance
                    </span>
                    <Leaf className="w-4 h-4 text-[#2fa874]" />
                  </div>

                  <div className="flex items-center gap-5">
                    {/* Inline Circular SVG Gauge */}
                    <div className="relative w-20 h-20 shrink-0">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-[#e2efe7]"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3.5"
                        />
                        <path
                          className="text-[#2fa874]"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeDasharray={`${Math.min(100, Math.max(0, sustainabilityScore))}, 100`}
                          strokeLinecap="round"
                          strokeWidth="3.5"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="font-editorial text-2xl font-bold text-[#003629] leading-none">
                          {sustainabilityScore}
                        </span>
                        <span className="text-[9px] text-[#527d6a] uppercase mt-0.5">/100</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="font-bold text-sm text-[#003629]">Sustainability Index</p>
                      <p className="text-xs text-[#527d6a] leading-relaxed">
                        Efficient water consumption · High organic matter score · Zero runoff penalty.
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 flex items-center justify-between bg-[#f8faf8] p-3 rounded-xl border border-[#edf6f0]">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-[#6C7D76] block">Infrastructure Asset</span>
                      <span className="text-xs font-semibold text-[#003629]">
                        {acreage} Cultivated Acres · Drip Fed
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/sustainability')}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#1b4d3e] hover:underline cursor-pointer"
                    >
                      <span>View Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* 5. OPERATIONAL ENGINES / QUICK WORKFLOWS                      */}
            {/* ═════════════════════════════════════════════════════════════ */}
            <section className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-[#2fa874] uppercase tracking-wider">
                    Operational Engines
                  </span>
                  <h2 className="font-editorial text-2xl font-bold text-[#003629]">
                    AgriSmart AI Suites
                  </h2>
                </div>
                <span className="text-xs text-[#6C7D76]">
                  Integrated with {location} Telemetry Hub
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Tool 1: Disease Detection */}
                <div
                  onClick={() => navigate('/disease')}
                  className="group p-5 rounded-2xl bg-white hover:bg-[#ecfef3] transition-all duration-200 shadow-editorial border border-[#DCE8DF] flex flex-col justify-between cursor-pointer"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-[#ecfef3] border border-[#d2f4e0] flex items-center justify-center text-[#1b4d3e] group-hover:bg-[#1b4d3e] group-hover:text-white transition-colors">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-sm text-[#003629]">Disease Detection</h3>
                      <p className="text-xs text-[#527d6a] line-clamp-2 leading-relaxed">
                        Scan crop leaves for instant pathology diagnosis and prescriptive treatment.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-2 flex items-center gap-1 text-[#2fa874] text-xs font-semibold group-hover:translate-x-1 transition-transform">
                    <span>Diagnose Leaf</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Tool 2: AI Agronomist */}
                <div
                  onClick={() => navigate('/assistant')}
                  className="group p-5 rounded-2xl bg-white hover:bg-[#ecfef3] transition-all duration-200 shadow-editorial border border-[#DCE8DF] flex flex-col justify-between cursor-pointer"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-[#ecfef3] border border-[#d2f4e0] flex items-center justify-center text-[#1b4d3e] group-hover:bg-[#1b4d3e] group-hover:text-white transition-colors">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-sm text-[#003629]">AI Agronomist</h3>
                      <p className="text-xs text-[#527d6a] line-clamp-2 leading-relaxed">
                        Access research-grounded advisory desk and ICAR/TNAU certified agronomic evidence.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-2 flex items-center gap-1 text-[#2fa874] text-xs font-semibold group-hover:translate-x-1 transition-transform">
                    <span>Consult Assistant</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Tool 3: Smart Irrigation */}
                <div
                  onClick={() => navigate('/irrigation')}
                  className="group p-5 rounded-2xl bg-white hover:bg-[#ecfef3] transition-all duration-200 shadow-editorial border border-[#DCE8DF] flex flex-col justify-between cursor-pointer"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-[#ecfef3] border border-[#d2f4e0] flex items-center justify-center text-[#1b4d3e] group-hover:bg-[#1b4d3e] group-hover:text-white transition-colors">
                      <Droplets className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-sm text-[#003629]">Smart Irrigation</h3>
                      <p className="text-xs text-[#527d6a] line-clamp-2 leading-relaxed">
                        Inspect real-time soil moisture and automated precipitation decoupling telemetry.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-2 flex items-center gap-1 text-[#2fa874] text-xs font-semibold group-hover:translate-x-1 transition-transform">
                    <span>Manage Valves</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Tool 4: Crop Recommendation */}
                <div
                  onClick={() => navigate('/crop')}
                  className="group p-5 rounded-2xl bg-white hover:bg-[#ecfef3] transition-all duration-200 shadow-editorial border border-[#DCE8DF] flex flex-col justify-between cursor-pointer"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-[#ecfef3] border border-[#d2f4e0] flex items-center justify-center text-[#1b4d3e] group-hover:bg-[#1b4d3e] group-hover:text-white transition-colors">
                      <Sprout className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-sm text-[#003629]">Crop Recommendation</h3>
                      <p className="text-xs text-[#527d6a] line-clamp-2 leading-relaxed">
                        Analyze multi-variable N-P-K soil chemistry and climate factors for seasonal sowings.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-2 flex items-center gap-1 text-[#2fa874] text-xs font-semibold group-hover:translate-x-1 transition-transform">
                    <span>Plan Next Season</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </section>

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* 6. EDITORIAL FOOTER SIGN-OFF                                  */}
            {/* ═════════════════════════════════════════════════════════════ */}
            <footer className="pt-6 pb-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#6C7D76] gap-4 border-t border-[#DCE8DF]">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#2fa874]" />
                <span>
                  Advisory calculated via AgroVerdant Engine v4.2 · Certified for local Agro-Climatic Zone
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span>Next Telemetry Ping: 07:00 IST</span>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="text-[#1b4d3e] hover:underline font-semibold cursor-pointer"
                >
                  Export Season Archive
                </button>
              </div>
            </footer>
          </div>
        </main>
      </div>

      {/* ── 7-Day Agricultural Forecast Modal ── */}
      {showForecastModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-[#DCE8DF] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#DCE8DF] mb-4">
              <div className="flex items-center gap-2.5">
                <Sun className="w-6 h-6 text-[#e5a034]" />
                <div>
                  <h3 className="font-editorial text-xl font-bold text-[#003629]">
                    7-Day Agricultural Forecast
                  </h3>
                  <p className="text-xs text-[#6C7D76]">
                    Microclimate telemetry streamed via {weatherProvider}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForecastModal(false)}
                className="p-1.5 rounded-lg text-[#6C7D76] hover:text-[#16352D] hover:bg-[#F7F8F3] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {forecastList.length > 0 ? (
                forecastList.map((day, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-[#fafdfb] border border-[#DCE8DF] hover:border-[#2fa874] transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="text-2xl">{day.emoji || '☀️'}</span>
                      <div>
                        <div className="text-sm font-bold text-[#16352D]">
                          {new Date(day.date).toLocaleDateString('en-GB', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </div>
                        <div className="text-xs text-[#6C7D76]">{day.condition}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-semibold">
                      <div className="text-right">
                        <span className="font-bold text-[#16352D]">
                          {Math.round(day.temperature_max)}°
                        </span>
                        <span className="text-[#6C7D76] ml-1">/ {Math.round(day.temperature_min)}°</span>
                      </div>
                      <div className="text-[#1b4d3e] font-bold min-w-[50px] text-right">
                        ☔ {day.rain_probability != null ? `${day.rain_probability}%` : '0%'}
                      </div>
                      <div className="text-[#527d6a] text-[11px] hidden sm:block">
                        ET₀: {day.et0 != null ? `${day.et0}mm` : '—'}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#6C7D76] text-center py-6">
                  Forecast data currently unavailable.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Configure Farm Modal ── */}
      {showAddFarmModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#DCE8DF] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#DCE8DF] mb-5">
              <div className="flex items-center gap-2.5">
                <Sprout className="w-5 h-5 text-[#2fa874]" />
                <h3 className="font-editorial text-xl font-bold text-[#003629]">
                  {dashboardData?.has_farm ? 'Manage Farm Profile' : 'Configure Farm Plot'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddFarmModal(false)}
                className="p-1.5 rounded-lg text-[#6C7D76] hover:text-[#16352D] hover:bg-[#F7F8F3] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFarm} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#16352D] mb-1">Farm / Plot Name *</label>
                <input
                  type="text"
                  required
                  value={farmForm.farm_name}
                  onChange={(e) => setFarmForm({ ...farmForm, farm_name: e.target.value })}
                  placeholder="e.g. Green Valley Plot 4"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE8DF] bg-[#fafdfb] text-xs focus:outline-none focus:border-[#2fa874]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#16352D] mb-1">Select Region / City</label>
                <select
                  value={selectedCity}
                  onChange={(e) => handleCityDropdownSelect(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE8DF] bg-[#fafdfb] text-xs focus:outline-none focus:border-[#2fa874]"
                >
                  <option value="">Choose a regional city...</option>
                  {POPULAR_CITIES.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                  <option value="custom">Search Custom Location...</option>
                </select>
              </div>

              {selectedCity === 'custom' && (
                <div className="relative">
                  <label className="block font-semibold text-[#16352D] mb-1">Search Village / District</label>
                  <input
                    type="text"
                    value={locationQuery}
                    onChange={(e) => handleLocationSearch(e.target.value)}
                    placeholder="Type at least 2 characters..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE8DF] bg-[#fafdfb] text-xs focus:outline-none focus:border-[#2fa874]"
                  />
                  {searchingLocation && (
                    <span className="text-[11px] text-[#527d6a] mt-1 block">Searching...</span>
                  )}
                  {locationResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-[#DCE8DF] rounded-xl shadow-lg max-h-40 overflow-y-auto">
                      {locationResults.map((loc, i) => (
                        <div
                          key={i}
                          onClick={() => selectLocation(loc)}
                          className="px-3 py-2 hover:bg-[#ecfef3] cursor-pointer text-xs"
                        >
                          {loc.display || loc.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#16352D] mb-1">Primary Crop</label>
                  <input
                    type="text"
                    value={farmForm.crop}
                    onChange={(e) => setFarmForm({ ...farmForm, crop: e.target.value })}
                    placeholder="e.g. Tomato"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE8DF] bg-[#fafdfb] text-xs focus:outline-none focus:border-[#2fa874]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#16352D] mb-1">Acreage (Acres)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={farmForm.farm_size}
                    onChange={(e) => setFarmForm({ ...farmForm, farm_size: parseFloat(e.target.value) || 1 })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE8DF] bg-[#fafdfb] text-xs focus:outline-none focus:border-[#2fa874]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#16352D] mb-1">Soil Type</label>
                  <select
                    value={farmForm.soil_type}
                    onChange={(e) => setFarmForm({ ...farmForm, soil_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE8DF] bg-[#fafdfb] text-xs focus:outline-none focus:border-[#2fa874]"
                  >
                    <option value="black">Black Soil</option>
                    <option value="alluvial">Alluvial Soil</option>
                    <option value="loamy">Loamy Soil</option>
                    <option value="red">Red Soil</option>
                    <option value="sandy">Sandy Soil</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#16352D] mb-1">Irrigation Setup</label>
                  <select
                    value={farmForm.irrigation_type}
                    onChange={(e) => setFarmForm({ ...farmForm, irrigation_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE8DF] bg-[#fafdfb] text-xs focus:outline-none focus:border-[#2fa874]"
                  >
                    <option value="drip">Drip Irrigation</option>
                    <option value="sprinkler">Sprinkler Irrigation</option>
                    <option value="flood">Flood / Furrow</option>
                    <option value="rainfed">Rainfed</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddFarmModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#DCE8DF] hover:bg-[#F7F8F3] font-semibold text-[#6C7D76] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingFarm}
                  className="px-5 py-2.5 rounded-xl bg-[#1b4d3e] hover:bg-[#133a2f] text-white font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submittingFarm ? 'Saving...' : 'Save Farm Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
