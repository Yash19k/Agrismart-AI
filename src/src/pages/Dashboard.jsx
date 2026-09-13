import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CloudSun, Droplets, Sprout, Leaf,
  History, Bell, Search, MapPin, Sun, ChevronDown,
  TrendingUp, TrendingDown, ArrowRight,
  Send, LogOut, Menu, X, Plus, AlertTriangle, RefreshCw, CheckCircle,
  CloudRain, Wind, Layers, ShieldAlert
} from 'lucide-react';
import { getDashboard } from '../api/dashboard';
import { createFarm, searchLocation } from '../api/farms';
import { sendChatMessage } from '../api/assistant';
import AppSidebar from '../components/common/AppSidebar';
import AppHeader from '../components/common/AppHeader';

// ─── Sidebar nav items ──────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'disease', label: 'Disease Detection', icon: ShieldAlert },
  { id: 'weather', label: 'Weather & Advisory', icon: CloudSun },
  { id: 'irrigation', label: 'Irrigation', icon: Droplets },
  { id: 'crop', label: 'Crop Recommendation', icon: Sprout },
  { id: 'myfarm', label: 'My Farm', icon: MapPin },
];

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
  { name: 'Patan, Gujarat', latitude: 23.8493, longitude: 72.1266 },
  { name: 'Amreli, Gujarat', latitude: 21.6032, longitude: 71.2221 },
  { name: 'Pune, Maharashtra', latitude: 18.5204, longitude: 73.8567 },
  { name: 'Nashik, Maharashtra', latitude: 19.9975, longitude: 73.7898 },
  { name: 'Nagpur, Maharashtra', latitude: 21.1458, longitude: 79.0882 },
  { name: 'Indore, Madhya Pradesh', latitude: 22.7196, longitude: 75.8577 },
  { name: 'Jaipur, Rajasthan', latitude: 26.9124, longitude: 75.7873 },
  { name: 'Ludhiana, Punjab', latitude: 30.9010, longitude: 75.8573 },
  { name: 'Karnal, Haryana', latitude: 29.6857, longitude: 76.9905 },
];

// ─── Quick-stat card ────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, color, value, label, sub, trendUp }) => (
  <div className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div className="min-w-0">
      <div className="text-2xl font-extrabold text-gray-900 leading-none">{value}</div>
      <div className="text-sm font-semibold text-gray-600 mt-0.5">{label}</div>
      {sub && (
        <div className={`text-xs font-semibold mt-1 flex items-center gap-1 ${trendUp ? 'text-emerald-600' : 'text-gray-500'}`}>
          {trendUp === true ? <TrendingUp className="w-3 h-3" /> : (trendUp === false ? <TrendingDown className="w-3 h-3 text-red-500" /> : null)}
          <span className="truncate">{sub}</span>
        </div>
      )}
    </div>
  </div>
);

// ─── Section header ─────────────────────────────────────────────────────────
const SectionHeader = ({ title, subtitle, action, onAction }) => (
  <div className="flex items-start justify-between mb-4">
    <div>
      <h2 className="text-base font-extrabold text-gray-900">{title}</h2>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
    {action && (
      <button onClick={onAction} className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 whitespace-nowrap">
        {action} <ArrowRight className="w-3 h-3" />
      </button>
    )}
  </div>
);

// ─── Main Dashboard ──────────────────────────────────────────────────────────
const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeNav, setActiveNav] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatMsg, setChatMsg] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

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

  const firstName = user?.name?.split(' ')[0] || 'Farmer';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  const handleLogout = () => { logout(); navigate('/login', { replace: true }); };

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
      setError(err.friendlyMessage || 'Unable to connect to AgriSmart server. Please verify backend is running.');
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
    const match = POPULAR_CITIES.find(c => c.name === cityName);
    if (match) {
      setFarmForm(prev => ({
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
    setFarmForm(prev => ({
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

  const sendChat = async (presetText = null) => {
    const textToSend = presetText || chatMsg;
    if (!textToSend.trim() || chatLoading) return;

    const userMessage = textToSend.trim();
    setChatHistory(h => [...h, { role: 'user', text: userMessage }]);
    if (!presetText) setChatMsg('');
    setChatLoading(true);

    try {
      const response = await sendChatMessage({
        message: userMessage,
        context: {
          crop: dashboardData?.farm?.crop || 'Tomato',
          farm_id: dashboardData?.farm?.id,
          weather: {
            temperature: dashboardData?.current_weather?.temperature,
            humidity: dashboardData?.current_weather?.humidity,
            rain_probability: dashboardData?.forecast?.[0]?.rain_probability || 0,
            condition: dashboardData?.current_weather?.condition,
          }
        },
        language: 'en'
      });

      setChatHistory(h => [
        ...h,
        {
          role: 'ai',
          text: response.answer || 'No recommendation received.',
        }
      ]);
    } catch (err) {
      console.error('Assistant chat failed:', err);
      const crop = dashboardData?.farm?.crop || 'crops';
      const temp = dashboardData?.current_weather?.temperature ? `${dashboardData.current_weather.temperature}°C` : 'current weather';
      setChatHistory(h => [
        ...h,
        {
          role: 'ai',
          text: `Based on your live farm data (${crop} under ${temp}): ${dashboardData?.irrigation?.recommendation || 'Regular monitoring recommended.'}`
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Soil moisture label helper
  const getSoilMoistureStatus = (val) => {
    if (val == null) return 'No Sensor Data';
    if (val < 20) return 'Low Moisture - Watering Needed';
    if (val <= 40) return 'Optimal Field Moisture';
    return 'Adequate Moisture';
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Unified Sidebar */}
      <AppSidebar
        activeItem={activeNav}
        onItemClick={(id) => {
          setActiveNav(id);
          if (id === 'dashboard') navigate('/dashboard');
          if (id === 'disease') navigate('/disease');
          if (id === 'assistant') navigate('/assistant');
          if (id === 'irrigation') navigate('/irrigation');
          if (id === 'sustainability') navigate('/sustainability');
          if (id === 'myfarm') setShowAddFarmModal(true);
          if (id === 'weather') setShowForecastModal(true);
        }}
        mobileOpen={sidebarOpen}
        setMobileOpen={setSidebarOpen}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Unified Top Navigation Header ── */}
        <AppHeader
          moduleId="dashboard"
          title="AgriSmart Dashboard"
          subtitle={`${greeting}, ${firstName}`}
          onMenuClick={() => setSidebarOpen(true)}
          badgeText="Open-Meteo Live"
          badgeType="emerald"
          centerContent={
            <div className="hidden lg:flex items-center gap-2.5 w-full max-w-md mx-2">
              <div className="flex-1 relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search advisories or crops..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs bg-gray-50 focus:bg-white focus:border-emerald-400 focus:outline-none transition-colors"
                />
              </div>

              {/* Farm Location Selector */}
              <div className="relative flex-shrink-0">
                {dashboardData?.has_farm ? (
                  <button
                    onClick={() => setShowFarmDropdown(!showFarmDropdown)}
                    className="flex items-center gap-1.5 text-xs text-gray-700 font-bold px-2.5 py-1.5 rounded-xl hover:bg-gray-100 transition-colors border border-gray-200 bg-white"
                  >
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="max-w-[120px] truncate">{dashboardData?.farm?.location || dashboardData?.farm?.name}</span>
                    <ChevronDown className="w-3 h-3 text-gray-400" />
                  </button>
                ) : (
                  <button
                    onClick={() => setShowAddFarmModal(true)}
                    className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200 transition-colors whitespace-nowrap"
                  >
                    <Plus className="w-3 h-3 text-emerald-600" />
                    <span>Add Farm</span>
                  </button>
                )}

                {/* Farms dropdown */}
                {showFarmDropdown && dashboardData?.all_farms && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Your Farms</div>
                    {dashboardData.all_farms.map(f => (
                      <button
                        key={f.id}
                        onClick={() => {
                          setSelectedFarmId(f.id);
                          setShowFarmDropdown(false);
                          loadDashboard(f.id);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center justify-between hover:bg-emerald-50 transition-colors ${f.id === dashboardData?.farm?.id ? 'text-emerald-800 font-bold bg-emerald-50/50' : 'text-gray-700'}`}
                      >
                        <span className="truncate">{f.farm_name}</span>
                        {f.id === dashboardData?.farm?.id && <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
                      </button>
                    ))}
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      onClick={() => { setShowFarmDropdown(false); setShowAddFarmModal(true); }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add New Farm
                    </button>
                  </div>
                )}
              </div>
            </div>
          }
          rightActions={
            <>
              {/* Weather pill from real API */}
              {dashboardData?.current_weather?.temperature != null && (
                <button
                  onClick={() => setShowForecastModal(true)}
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 hover:border-amber-300 transition-colors cursor-pointer text-xs"
                  title="Click to view 7-day forecast"
                >
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span className="font-bold text-amber-700">{Math.round(dashboardData.current_weather.temperature)}°C</span>
                  <span className="text-amber-600 truncate max-w-[80px]">{dashboardData.current_weather.condition || 'Clear'}</span>
                </button>
              )}

              {/* Notifications / Alerts */}
              <div className="relative">
                <button
                  onClick={() => setShowAlertsDropdown(!showAlertsDropdown)}
                  className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
                  aria-label="Alerts"
                >
                  <Bell className="w-4 h-4 text-gray-500" />
                  {dashboardData?.alerts?.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </button>

                {showAlertsDropdown && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 z-50">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                      <span className="text-xs font-bold text-gray-800">Active Advisories & Alerts</span>
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 font-extrabold px-2 py-0.5 rounded-full">
                        {dashboardData?.alerts?.length || 0}
                      </span>
                    </div>
                    <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                      {dashboardData?.alerts?.length > 0 ? (
                        dashboardData.alerts.map((alert, idx) => (
                          <div key={idx} className="p-2 rounded-xl bg-gray-50 border border-gray-100 flex items-start gap-2">
                            <span className="text-base flex-shrink-0">{alert.icon || '🔔'}</span>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-gray-900">{alert.title}</p>
                              <p className="text-[11px] text-gray-600 mt-0.5 leading-snug">{alert.message}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-400 py-3 text-center">No active alerts for your farm.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          }
        />

        {/* ── Dashboard body ── */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">

            {/* Loading State */}
            {loading && !dashboardData && (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
                <p className="text-sm font-bold text-gray-600">Loading farm insights & live weather...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-red-900">Dashboard Notice</p>
                    <p className="text-xs text-red-700">{error}</p>
                  </div>
                </div>
                <button
                  onClick={() => loadDashboard(selectedFarmId)}
                  className="px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors whitespace-nowrap"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Empty Farm State Banner */}
            {dashboardData && !dashboardData.has_farm && (
              <div className="mb-6 p-6 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                    <Sprout className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-emerald-950">Add Your Farm to Start</h3>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      Configure your farm location, crops, and soil to see real-time Open-Meteo weather and agricultural recommendations.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddFarmModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-colors whitespace-nowrap shadow-sm"
                >
                  + Add Farm Information
                </button>
              </div>
            )}

            {/* ── Welcome banner ── */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                  {greeting}, {firstName}! <span>🌿</span>
                </h1>
                <p className="text-sm text-gray-500 mt-1 font-medium">
                  {dashboardData?.farm?.name
                    ? `Live agricultural intelligence for ${dashboardData.farm.name}.`
                    : "Here's what's happening on your farm today."}
                </p>
              </div>
              {/* Season badge */}
              <div className="hidden md:flex flex-col items-end gap-1">
                <div className="text-xs text-gray-400 font-semibold">
                  {dashboardData?.meta?.date_display || new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
                <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-xl">
                  <Sprout className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-xs font-bold text-amber-700">{dashboardData?.meta?.season || 'Current Season'}</span>
                </div>
              </div>
            </div>

            {/* ── 4 Stat Cards from Live API ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              {/* 1. Active Crops */}
              <StatCard
                icon={Sprout}
                color="bg-emerald-600"
                value={dashboardData?.stats?.active_crops ?? (dashboardData?.crops?.length || (dashboardData?.farm?.crop ? 1 : 0))}
                label="Active Crops"
                sub={dashboardData?.stats?.active_crops_names || dashboardData?.farm?.crop || 'No crops logged'}
                trendUp={true}
              />
              {/* 2. Soil Moisture Index (Live API) */}
              <StatCard
                icon={Droplets}
                color="bg-cyan-600"
                value={dashboardData?.soil?.moisture_percent != null ? `${dashboardData.soil.moisture_percent}%` : (dashboardData?.soil?.moisture != null ? `${dashboardData.soil.moisture}%` : '—')}
                label="Soil Moisture Index"
                sub={getSoilMoistureStatus(dashboardData?.soil?.moisture_percent ?? dashboardData?.soil?.moisture)}
                trendUp={dashboardData?.soil?.moisture_percent != null ? dashboardData.soil.moisture_percent >= 20 : null}
              />
              {/* 3. Rainfall / Precipitation (Live API) */}
              <StatCard
                icon={CloudRain}
                color="bg-blue-600"
                value={dashboardData?.current_weather?.precipitation != null ? `${dashboardData.current_weather.precipitation} mm` : (dashboardData?.forecast?.[0]?.precipitation != null ? `${dashboardData.forecast[0].precipitation} mm` : '0 mm')}
                label="Precipitation / Rain"
                sub={dashboardData?.forecast?.[0]?.rain_probability != null
                  ? `${dashboardData.forecast[0].rain_probability}% rain probability`
                  : `Live ${dashboardData?.meta?.provider || 'weather'} data`}
                trendUp={true}
              />
              {/* 4. Water Usage / Farm Size */}
              <StatCard
                icon={Layers}
                color="bg-amber-600"
                value={dashboardData?.has_farm ? (dashboardData?.stats?.water_usage_liters ? `${dashboardData.stats.water_usage_liters} L` : (dashboardData?.farm?.farm_size ? `${dashboardData.farm.farm_size} Ac` : '0 L')) : '—'}
                label={dashboardData?.stats?.water_usage_liters ? "Water Usage" : "Farm Area"}
                sub={dashboardData?.has_farm ? (dashboardData?.irrigation?.status === 'RECOMMEND' ? 'Irrigation required' : 'Optimal conservation') : 'No farm logged'}
                trendUp={dashboardData?.has_farm ? dashboardData?.irrigation?.status !== 'RECOMMEND' : null}
              />
            </div>

            {/* ── Main 2‑column grid ── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

              {/* ── Left / Center Column ── */}
              <div className="xl:col-span-2 space-y-5">

                {/* 1. Crop Recommendation & Status */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <SectionHeader
                    title="🌾 Crop Recommendations & Suitability"
                    subtitle="Scientifically recommended crops based on your soil type and live temperature."
                    action="+ Add / Manage Farm"
                    onAction={() => setShowAddFarmModal(true)}
                  />

                  {/* Top recommended crops from API */}
                  <div className="grid sm:grid-cols-3 gap-3 mb-4">
                    {dashboardData?.crop_recommendation?.length > 0 ? (
                      dashboardData.crop_recommendation.map((rec, idx) => (
                        <div key={idx} className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-100 hover:border-emerald-300 transition-colors flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-2xl">{rec.emoji || '🌱'}</span>
                              <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                                Recommended
                              </span>
                            </div>
                            <p className="text-sm font-extrabold text-gray-900 mt-2">{rec.name}</p>
                            <p className="text-xs text-gray-600 mt-1 leading-snug">{rec.reason}</p>
                          </div>
                          {rec.temp_note && (
                            <p className="text-[11px] font-semibold text-emerald-700 mt-2.5 pt-2 border-t border-emerald-100/70">
                              {rec.temp_note}
                            </p>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="sm:col-span-3 text-xs text-gray-500 py-3 italic text-center">
                        Add farm soil details to receive customized crop recommendations.
                      </div>
                    )}
                  </div>

                  {/* Active crops list */}
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">
                      Currently Planted Crops
                    </p>
                    <div className="flex gap-3 overflow-x-auto pb-1">
                      {dashboardData?.crops?.length > 0 ? (
                        dashboardData.crops.map((crop, idx) => (
                          <div
                            key={crop.id || idx}
                            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-emerald-200 transition-colors cursor-pointer min-w-[85px]"
                          >
                            <span className="text-2xl">{crop.emoji || '🌱'}</span>
                            <span className="text-xs font-bold text-gray-800">{crop.name}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                              {crop.status === 'active' ? 'Active' : crop.status}
                            </span>
                          </div>
                        ))
                      ) : dashboardData?.farm?.crop ? (
                        <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gray-50 border border-gray-100 min-w-[85px]">
                          <span className="text-2xl">🌱</span>
                          <span className="text-xs font-bold text-gray-800">{dashboardData.farm.crop}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                            Primary
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 py-2">No active crops logged.</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Irrigation Advisory Card */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <SectionHeader
                    title="💧 Irrigation Advisory & Soil Hydration"
                    subtitle="Real-time watering guidance based on soil volumetric moisture and weather demand."
                    action="Forecast Details"
                    onAction={() => setShowForecastModal(true)}
                  />
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
                    {/* Gauge */}
                    <div className="relative w-20 h-20 flex-shrink-0">
                      <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3.5" />
                        <circle
                          cx="18" cy="18" r="15.9" fill="none" stroke="#3b82f6" strokeWidth="3.5"
                          strokeDasharray={`${Math.min(dashboardData?.soil?.moisture_percent ?? dashboardData?.soil?.moisture ?? 0, 100)} 100`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Droplets className="w-6 h-6 text-blue-500" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-extrabold text-gray-900">
                        {dashboardData?.has_farm ? (
                          dashboardData?.irrigation?.status === 'RECOMMEND'
                            ? 'Irrigation Recommended'
                            : (dashboardData?.irrigation?.status === 'DELAY' ? 'Delay Irrigation' : 'Not Required Currently')
                        ) : 'No Farm Logged'}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5 leading-snug">
                        {dashboardData?.has_farm
                          ? (dashboardData?.irrigation?.reason || 'Soil moisture is in sufficient range.')
                          : 'Add your farm to evaluate soil moisture and irrigation requirements.'}
                      </p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-2.5">
                    <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100">
                      <span className="text-[11px] font-semibold text-gray-500">Soil Moisture</span>
                      <p className="text-base font-extrabold text-blue-900 mt-0.5">
                        {dashboardData?.soil?.moisture_percent != null
                          ? `${dashboardData.soil.moisture_percent}%`
                          : (dashboardData?.soil?.moisture != null ? `${dashboardData.soil.moisture}%` : '—')}
                      </p>
                      <span className="text-[10px] text-blue-700 font-medium">
                        {getSoilMoistureStatus(dashboardData?.soil?.moisture_percent ?? dashboardData?.soil?.moisture)}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-cyan-50/60 border border-cyan-100">
                      <span className="text-[11px] font-semibold text-gray-500">Rain Probability</span>
                      <p className="text-base font-extrabold text-cyan-900 mt-0.5">
                        {dashboardData?.irrigation?.rain_probability != null
                          ? `${dashboardData.irrigation.rain_probability}%`
                          : (dashboardData?.forecast?.[0]?.rain_probability != null ? `${dashboardData.forecast[0].rain_probability}%` : '—')}
                      </p>
                      <span className="text-[10px] text-cyan-700 font-medium">
                        {dashboardData?.meta?.provider || 'Weather'} forecast
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100">
                      <span className="text-[11px] font-semibold text-gray-500">Evapotranspiration (ET₀)</span>
                      <p className="text-base font-extrabold text-amber-900 mt-0.5">
                        {dashboardData?.irrigation?.et0 != null
                          ? `${dashboardData.irrigation.et0} mm`
                          : (dashboardData?.forecast?.[0]?.et0 != null ? `${dashboardData.forecast[0].et0} mm` : '—')}
                      </p>
                      <span className="text-[10px] text-amber-700 font-medium">Daily water demand</span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-xs font-bold text-blue-800 bg-blue-50 rounded-xl px-3 py-2.5">
                    <span>🕐</span>
                    <span>Recommended Window: </span>
                    <span className="text-blue-950 font-extrabold">
                      {dashboardData?.has_farm
                        ? (dashboardData?.irrigation?.next_window || dashboardData?.irrigation?.recommendation || 'Regular Schedule')
                        : 'Configure Farm First'}
                    </span>
                  </div>
                </div>

                {/* 3. AI Farm Assistant */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col">
                  <SectionHeader
                    title="🤖 AI Farm Assistant"
                    subtitle="Ask questions regarding your crops, weather conditions, or irrigation schedule."
                    action="Open AI Agronomist →"
                    onAction={() => navigate('/assistant')}
                  />

                  {/* Chat messages */}
                  {chatHistory.length > 0 && (
                    <div className="mb-3 space-y-2 max-h-48 overflow-y-auto pr-1">
                      {chatHistory.map((m, i) => (
                        <div
                          key={i}
                          className={`text-xs rounded-xl px-3.5 py-2.5 max-w-[90%] font-semibold leading-relaxed ${m.role === 'user' ? 'bg-emerald-100 text-emerald-900 ml-auto' : 'bg-gray-100 text-gray-800'
                            }`}
                        >
                          {m.text}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Input */}
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={chatMsg}
                      onChange={(e) => setChatMsg(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                      placeholder="E.g. What is the best watering time today or how to protect crops?"
                      className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-400 focus:outline-none bg-gray-50"
                      disabled={chatLoading}
                    />
                    <button
                      onClick={() => sendChat()}
                      disabled={chatLoading}
                      className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center hover:bg-emerald-800 transition-colors flex-shrink-0 disabled:opacity-50 cursor-pointer"
                    >
                      <Send className="w-4 h-4 text-white" />
                    </button>
                  </div>

                  {/* Quick prompts */}
                  <div className="flex flex-wrap gap-1.5">
                    {['Best time to irrigate', 'Suggest crops for my soil', 'Explain rainfall outlook', 'Check temperature risk'].map(p => (
                      <button
                        key={p}
                        onClick={() => navigate('/assistant', { state: { initialQuery: p } })}
                        className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-emerald-100 hover:text-emerald-800 transition-colors cursor-pointer"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Right Column ── */}
              <div className="space-y-5">

                {/* 1. Live Weather Card */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <SectionHeader
                    title="☀️ Live Weather"
                    action="7-Day Forecast"
                    onAction={() => setShowForecastModal(true)}
                  />
                  <div className="flex items-center gap-3 mb-4">
                    <Sun className="w-11 h-11 text-amber-400" />
                    <div>
                      <div className="text-3xl font-extrabold text-gray-900">
                        {dashboardData?.current_weather?.temperature != null
                          ? `${Math.round(dashboardData.current_weather.temperature)}°C`
                          : '—'}
                      </div>
                      <div className="text-sm text-gray-600 font-semibold">
                        {dashboardData?.current_weather?.condition || 'Live Open-Meteo'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {[
                      {
                        label: 'Humidity',
                        val: dashboardData?.current_weather?.humidity != null ? `${dashboardData.current_weather.humidity}%` : '—'
                      },
                      {
                        label: 'Rainfall',
                        val: dashboardData?.current_weather?.precipitation != null ? `${dashboardData.current_weather.precipitation} mm` : '0 mm'
                      },
                      {
                        label: 'Rain Probability',
                        val: dashboardData?.forecast?.[0]?.rain_probability != null
                          ? `${dashboardData.forecast[0].rain_probability}%`
                          : (dashboardData?.irrigation?.rain_probability != null ? `${dashboardData.irrigation.rain_probability}%` : '—')
                      },
                      {
                        label: 'Wind Speed',
                        val: dashboardData?.current_weather?.wind_speed != null ? `${dashboardData.current_weather.wind_speed} km/h` : '—'
                      },
                    ].map(({ label, val }) => (
                      <div key={label} className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                        <span className="text-gray-500 font-medium">{label}</span>
                        <span className="font-bold text-gray-800">{val}</span>
                      </div>
                    ))}
                  </div>

                  {/* Weather rule advisory */}
                  <div className="mt-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
                    <p className="text-sm font-extrabold text-blue-800">
                      {dashboardData?.has_farm ? (
                        dashboardData?.wind_risk?.level === 'HIGH'
                          ? '💨 Strong Wind Advisory'
                          : (dashboardData?.forecast?.[0]?.rain_probability >= 50
                            ? '☔ Rain expected in field today.'
                            : '☀️ Favorable field conditions.')
                      ) : '📍 Weather Disconnected'}
                    </p>
                    <p className="text-xs text-blue-700 mt-0.5">
                      {dashboardData?.has_farm
                        ? (dashboardData?.wind_risk?.advisory || dashboardData?.disease_weather_risk?.recommendation || 'Conditions are suitable for normal field operations.')
                        : 'Add your farm location to stream real-time weather and advisories.'}
                    </p>
                  </div>
                </div>

                {/* 2. Farm Specs / Profile Card */}
                {dashboardData?.has_farm && dashboardData?.farm && (
                  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <SectionHeader
                      title="🏡 Farm Specifications"
                      action="Edit Farm"
                      onAction={() => setShowAddFarmModal(true)}
                    />
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-gray-50">
                        <span className="text-gray-500 font-semibold">Farm Name</span>
                        <span className="font-extrabold text-gray-900">{dashboardData.farm.name}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-50">
                        <span className="text-gray-500 font-semibold">Location</span>
                        <span className="font-bold text-gray-700 truncate max-w-[170px] text-right">{dashboardData.farm.location}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-50">
                        <span className="text-gray-500 font-semibold">Primary Crop</span>
                        <span className="font-bold text-emerald-800">{dashboardData.farm.crop || 'None'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-50">
                        <span className="text-gray-500 font-semibold">Soil Type</span>
                        <span className="font-bold text-gray-700 capitalize">{dashboardData.farm.soil_type || 'Loamy'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-50">
                        <span className="text-gray-500 font-semibold">Farm Size</span>
                        <span className="font-bold text-gray-700">{dashboardData.farm.farm_size} Acres</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-gray-500 font-semibold">Irrigation Method</span>
                        <span className="font-bold text-blue-700 capitalize">{dashboardData.farm.irrigation_type || 'Drip'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Active Advisories / Alerts Card */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <SectionHeader title="🔔 Active Advisories" />
                  <div className="space-y-2">
                    {dashboardData?.alerts?.length > 0 ? (
                      dashboardData.alerts.slice(0, 4).map((alert, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-start gap-2.5">
                          <span className="text-lg flex-shrink-0">{alert.icon || '🔔'}</span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-900">{alert.title}</p>
                            <p className="text-[11px] text-gray-600 mt-0.5 leading-snug">{alert.message}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400 py-3 text-center">No active alerts for your farm.</p>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ── 7-Day Forecast Modal ── */}
      {showForecastModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
              <div className="flex items-center gap-2">
                <Sun className="w-6 h-6 text-amber-500" />
                <div>
                  <h3 className="text-lg font-extrabold text-gray-900">7-Day Agricultural Forecast</h3>
                  <p className="text-xs text-gray-500">Live data powered by Open-Meteo gateway</p>
                </div>
              </div>
              <button onClick={() => setShowForecastModal(false)} className="p-1 rounded-lg text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {dashboardData?.forecast?.length > 0 ? (
                dashboardData.forecast.map((day, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100 hover:border-emerald-200 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{day.emoji || '☀️'}</span>
                      <div>
                        <div className="text-sm font-extrabold text-gray-900">
                          {new Date(day.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </div>
                        <div className="text-xs text-gray-500">{day.condition}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-semibold">
                      <div className="text-right">
                        <span className="font-extrabold text-gray-900">{Math.round(day.temperature_max)}°</span>
                        <span className="text-gray-400 ml-1">/ {Math.round(day.temperature_min)}°</span>
                      </div>
                      <div className="text-blue-600 font-bold min-w-[50px] text-right">
                        ☔ {day.rain_probability != null ? `${day.rain_probability}%` : '0%'}
                      </div>
                      <div className="text-amber-700 text-[11px] hidden sm:block">
                        ET₀: {day.et0 != null ? `${day.et0}mm` : '—'}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500 text-center py-6">Forecast data currently unavailable.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Farm Modal ── */}
      {showAddFarmModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-extrabold text-gray-900">Add / Configure Farm</h3>
              </div>
              <button onClick={() => setShowAddFarmModal(false)} className="p-1 text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFarm} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Farm Name</label>
                <input
                  type="text"
                  required
                  value={farmForm.farm_name}
                  onChange={(e) => setFarmForm({ ...farmForm, farm_name: e.target.value })}
                  placeholder="e.g. Green Valley Farm"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:border-emerald-500 focus:outline-none bg-gray-50"
                />
              </div>

              {/* City Dropdown */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Select Farm City / District (Quick Select)
                </label>
                <select
                  value={selectedCity}
                  onChange={(e) => handleCityDropdownSelect(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-emerald-500 focus:outline-none bg-gray-50 font-semibold text-gray-800"
                >
                  <option value="">-- Choose City from Dropdown --</option>
                  {POPULAR_CITIES.map((c) => (
                    <option key={c.name} value={c.name}>
                      📍 {c.name}
                    </option>
                  ))}
                  <option value="custom">🔍 Other City / Village (Search Below)</option>
                </select>
              </div>

              {/* Location search */}
              <div className="relative">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Or Search Any Village / Taluka (Live Open-Meteo Geocoding)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={locationQuery}
                    onChange={(e) => handleLocationSearch(e.target.value)}
                    placeholder="Search e.g. Anand, Ahmedabad, Pune, Nashik..."
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:border-emerald-500 focus:outline-none bg-gray-50"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
                {searchingLocation && (
                  <p className="text-[10px] text-gray-400 mt-1">Searching Open-Meteo locations...</p>
                )}
                {locationResults.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50 max-h-40 overflow-y-auto">
                    {locationResults.map((loc, idx) => (
                      <div
                        key={idx}
                        onClick={() => selectLocation(loc)}
                        className="px-3 py-2 text-xs hover:bg-emerald-50 cursor-pointer font-medium text-gray-800"
                      >
                        {loc.display} (lat: {loc.latitude?.toFixed(2)}, lon: {loc.longitude?.toFixed(2)})
                      </div>
                    ))}
                  </div>
                )}
                {farmForm.location_name && (
                  <div className="mt-1.5 p-2 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800 font-semibold">
                    <span>📍 Selected: {farmForm.location_name}</span>
                    <span className="text-[11px] text-emerald-600">
                      {farmForm.latitude.toFixed(4)}°N, {farmForm.longitude.toFixed(4)}°E
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Primary Crop</label>
                  <select
                    value={farmForm.crop}
                    onChange={(e) => setFarmForm({ ...farmForm, crop: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:border-emerald-500 focus:outline-none bg-gray-50"
                  >
                    <option value="Tomato">Tomato 🍅</option>
                    <option value="Chilli">Chilli 🌶️</option>
                    <option value="Okra">Okra 🥦</option>
                    <option value="Cotton">Cotton 🌿</option>
                    <option value="Wheat">Wheat 🌾</option>
                    <option value="Rice">Rice 🍚</option>
                    <option value="Maize">Maize 🌽</option>
                    <option value="Onion">Onion 🧅</option>
                    <option value="Potato">Potato 🥔</option>
                    <option value="Brinjal">Brinjal 🍆</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Soil Type</label>
                  <select
                    value={farmForm.soil_type}
                    onChange={(e) => setFarmForm({ ...farmForm, soil_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:border-emerald-500 focus:outline-none bg-gray-50"
                  >
                    <option value="black">Black Cotton Soil</option>
                    <option value="alluvial">Alluvial Soil</option>
                    <option value="red">Red Soil</option>
                    <option value="loamy">Loamy Soil</option>
                    <option value="clayey">Clayey Soil</option>
                    <option value="sandy">Sandy Soil</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Farm Size (Acres)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={farmForm.farm_size}
                    onChange={(e) => setFarmForm({ ...farmForm, farm_size: parseFloat(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:border-emerald-500 focus:outline-none bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Irrigation System</label>
                  <select
                    value={farmForm.irrigation_type}
                    onChange={(e) => setFarmForm({ ...farmForm, irrigation_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:border-emerald-500 focus:outline-none bg-gray-50"
                  >
                    <option value="drip">Drip Irrigation</option>
                    <option value="sprinkler">Sprinkler</option>
                    <option value="flood">Flood Irrigation</option>
                    <option value="manual">Manual</option>
                    <option value="none">No Irrigation</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddFarmModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingFarm}
                  className="px-5 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-colors"
                >
                  {submittingFarm ? 'Saving Farm...' : 'Save & Connect Weather'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
