import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Droplets,
  HelpCircle,
  Info,
  Leaf,
  Loader2,
  RefreshCw,
  Sparkles,
  Sprout,
  TrendingUp,
  Waves,
} from 'lucide-react';
import AppHeader from '../components/common/AppHeader';
import AppSidebar from '../components/common/AppSidebar';
import { getFarms } from '../api/farms';
import { getSustainabilityScore } from '../api/sustainability';

function getRatingBadge(rating) {
  switch (rating) {
    case 'Excellent':
      return { label: 'Excellent', color: 'text-emerald-800', bg: 'bg-emerald-100 border-emerald-300' };
    case 'Good':
      return { label: 'Good', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' };
    case 'Moderate':
      return { label: 'Moderate', color: 'text-amber-800', bg: 'bg-amber-100 border-amber-300' };
    case 'Needs improvement':
      return { label: 'Needs improvement', color: 'text-orange-800', bg: 'bg-orange-100 border-orange-300' };
    case 'Poor':
      return { label: 'Poor', color: 'text-red-800', bg: 'bg-red-100 border-red-300' };
    default:
      return { label: 'Unavailable', color: 'text-gray-700', bg: 'bg-gray-100 border-gray-300' };
  }
}

function ComponentCard({ icon: Icon, title, value, description, color, sourceLabel }) {
  const displayVal = value != null ? `${Math.round(value)} / 100` : '—';
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-2xl font-black text-gray-900">{displayVal}</span>
      </div>
      <h3 className="mt-4 text-base font-black text-gray-900">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-gray-500">{description}</p>
      {sourceLabel && (
        <span className="inline-block mt-3 px-2 py-0.5 text-[11px] font-semibold text-gray-500 bg-gray-50 rounded-md border border-gray-100">
          {sourceLabel}
        </span>
      )}
    </div>
  );
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
  const [showFormula, setShowFormula] = useState(false);

  // Load initial farm list and score
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
        setSelectedPlant(data.selected_plant || (data.available_plants && data.available_plants[0]) || '');
      }
    } catch (err) {
      setError(err?.friendlyMessage || 'Unable to load sustainability assessment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Switch farm: updates available plants and auto-selects latest scanned plant for that farm
  const handleFarmChange = async (farmId) => {
    setSelectedFarmId(farmId);
    setRefreshing(true);
    setError('');
    try {
      const data = await getSustainabilityScore(farmId);
      setAssessment(data);
      setAvailablePlants(data.available_plants || []);
      setSelectedPlant(data.selected_plant || (data.available_plants && data.available_plants[0]) || '');
    } catch (err) {
      setError(err?.friendlyMessage || 'Unable to load sustainability score for this farm.');
    } finally {
      setRefreshing(false);
    }
  };

  // Switch plant: recalculates sustainability score for selected plant without mixing histories
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

  useEffect(() => {
    loadInitialData();
  }, []);

  const activeFarm = farms.find((f) => String(f.id) === String(selectedFarmId)) || assessment?.farm || farms[0];
  const overallScore = assessment?.overall_score;
  const ratingBadge = getRatingBadge(assessment?.rating);
  const components = assessment?.components || {};
  const conditions = assessment?.conditions || {};
  const explanations = assessment?.explanations || {};
  const recommendations = assessment?.recommendations || [];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <AppSidebar activeItem="sustainability" mobileOpen={sidebarOpen} setMobileOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AppHeader
          moduleId="sustainability"
          title="Sustainability Score"
          subtitle="Transparent, rule-based farm stewardship insights"
          onMenuClick={() => setSidebarOpen(true)}
          rightActions={(
            <button
              type="button"
              onClick={() => handlePlantChange(selectedPlant)}
              disabled={refreshing || loading}
              className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-50"
              title="Refresh score"
              aria-label="Refresh score"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          )}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-7">
          <div className="max-w-6xl mx-auto space-y-6">

            {/* Top Section with Farm & Plant Selectors Side by Side */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-emerald-800 bg-emerald-100/80">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                    Automated & Rule-Based
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mt-2">
                  How sustainable is your farm today?
                </h1>
                <p className="text-sm text-gray-600 mt-1 max-w-2xl leading-relaxed">
                  Your score is calculated automatically using your farm profile, live weather conditions, and recent crop health data.
                </p>
              </div>

              {farms.length > 0 && (
                <div className="flex flex-wrap items-end gap-3 sm:self-end">
                  {/* Farm Dropdown */}
                  <div className="flex flex-col gap-1">
                    <label htmlFor="farm-select" className="text-xs font-bold text-gray-700">
                      Select farm
                    </label>
                    <select
                      id="farm-select"
                      value={selectedFarmId}
                      onChange={(e) => handleFarmChange(e.target.value)}
                      disabled={refreshing}
                      className="min-w-56 bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-sm font-bold text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      {farms.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.farm_name || f.name} — {f.location_display || f.location_name || 'Farm'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Plant Dropdown */}
                  <div className="flex flex-col gap-1">
                    <label htmlFor="plant-select" className="text-xs font-bold text-gray-700">
                      Select plant
                    </label>
                    <select
                      id="plant-select"
                      value={selectedPlant}
                      onChange={(e) => handlePlantChange(e.target.value)}
                      disabled={refreshing || availablePlants.length === 0}
                      className="min-w-40 bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-sm font-bold text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      {availablePlants.length > 0 ? (
                        availablePlants.map((plant) => (
                          <option key={plant} value={plant}>
                            {plant}
                          </option>
                        ))
                      ) : (
                        <option value="">{selectedPlant || 'No plants recorded'}</option>
                      )}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Loading State */}
            {loading && (
              <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
                <p className="text-sm font-semibold text-gray-600 mt-3">Analyzing your farm conditions…</p>
              </div>
            )}

            {/* Error Message */}
            {!loading && error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-sm text-red-700 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && farms.length === 0 && (
              <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 shadow-sm">
                <Sprout className="w-10 h-10 text-emerald-600 mx-auto" />
                <h2 className="font-black text-gray-900 text-lg mt-3">Add a farm to calculate your score</h2>
                <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                  Sustainability scoring evaluates your farm's crops, live weather conditions, and irrigation method.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="mt-5 text-sm font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1.5"
                >
                  Go to dashboard <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Assessment Content */}
            {!loading && !error && assessment && activeFarm && (
              <>
                {/* Weather Warning alert */}
                {!assessment.weather_available && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 text-sm text-amber-900 flex items-start gap-3 shadow-sm">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-extrabold text-amber-900 block">Weather data unavailable</strong>
                      <span className="text-amber-800 text-xs sm:text-sm mt-0.5 block leading-relaxed">
                        We cannot calculate the latest water and soil condition. Please check your connection or try refreshing shortly.
                      </span>
                    </div>
                  </div>
                )}

                {/* Irrigation missing alert */}
                {!assessment.irrigation_configured && (
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 sm:p-5 text-sm text-blue-900 flex items-start justify-between gap-3 shadow-sm">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-extrabold text-blue-900 block">Irrigation method not configured</strong>
                        <span className="text-blue-800 text-xs sm:text-sm mt-0.5 block leading-relaxed">
                          Please configure your irrigation system in My Farm to receive tailored resource use scoring.
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/dashboard')}
                      className="text-xs font-bold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap flex-shrink-0"
                    >
                      Update Farm
                    </button>
                  </div>
                )}

                {/* Main Score Hero Card & Component Grid */}
                <section className="grid lg:grid-cols-[1.15fr_2fr] gap-5">
                  {/* Left: Overall Score Card */}
                  <div className="bg-emerald-900 rounded-2xl p-6 sm:p-7 text-white shadow-sm flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-40 h-40 bg-emerald-800/40 rounded-full blur-2xl pointer-events-none" />

                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-extrabold text-emerald-300 uppercase tracking-wider">
                            Overall Score
                          </p>
                          <div className="flex items-baseline gap-2 mt-2">
                            <span className="text-6xl sm:text-7xl font-black tracking-tight">
                              {overallScore != null ? overallScore : '—'}
                            </span>
                            <span className="text-lg font-semibold text-emerald-200">/ 100</span>
                          </div>
                        </div>
                        <Leaf className="w-10 h-10 text-emerald-300 flex-shrink-0 opacity-90" />
                      </div>

                      <div className="mt-4">
                        <span className={`inline-flex px-3.5 py-1 rounded-full text-xs font-extrabold border ${ratingBadge.bg} ${ratingBadge.color}`}>
                          {ratingBadge.label}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 pt-5 border-t border-emerald-800/80">
                      <p className="text-xs text-emerald-200/90 leading-5">
                        Calculated for <strong className="text-white">{activeFarm.farm_name || activeFarm.name}</strong> (Plant: <strong className="text-white">{selectedPlant || activeFarm.crop || 'Crop'}</strong>), located at {activeFarm.location_display || activeFarm.location_name || 'farm location'}.
                      </p>
                    </div>
                  </div>

                  {/* Right: 4 Component Cards */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <ComponentCard
                      icon={Droplets}
                      title="Water"
                      value={components.water}
                      description="Soil moisture (60%) + weather water demand (40%)."
                      sourceLabel="Live weather telemetry"
                      color="bg-blue-50 text-blue-600"
                    />
                    <ComponentCard
                      icon={Sprout}
                      title="Soil"
                      value={components.soil}
                      description="Optimal agronomic moisture balance (20%–50% target)."
                      sourceLabel="Live weather telemetry"
                      color="bg-amber-50 text-amber-600"
                    />
                    <ComponentCard
                      icon={Leaf}
                      title="Crop Health"
                      value={components.crop_health}
                      description={`Diagnostic scans for ${selectedPlant || 'selected plant'}.`}
                      sourceLabel="Recent leaf disease scans"
                      color="bg-emerald-50 text-emerald-600"
                    />
                    <ComponentCard
                      icon={Waves}
                      title="Resource Use"
                      value={components.resources}
                      description={`Efficiency baseline: ${conditions.irrigation_method || 'System method'}.`}
                      sourceLabel="From your farm profile"
                      color="bg-teal-50 text-teal-600"
                    />
                  </div>
                </section>

                {/* Today's Farm Conditions & Improvement Suggestions */}
                <section className="grid lg:grid-cols-2 gap-5">
                  {/* Farm Conditions */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Info className="w-5 h-5 text-emerald-600" />
                      <h2 className="font-black text-gray-900 text-lg">Today's farm conditions</h2>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Live telemetry and profile parameters powering your score.</p>

                    <div className="mt-5 grid grid-cols-2 gap-3.5">
                      <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100/80">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-gray-500">Soil moisture</p>
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Live</span>
                        </div>
                        <p className="text-xl font-black text-gray-900 mt-1">
                          {conditions.soil_moisture != null ? `${conditions.soil_moisture}%` : 'Unavailable'}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-1">Live weather data</p>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100/80">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-gray-500">Water demand</p>
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Live</span>
                        </div>
                        <p className="text-xl font-black text-gray-900 mt-1">
                          {conditions.weather_water_demand || 'Unavailable'}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-1">
                          {conditions.et0 != null ? `${conditions.et0} mm/day` : 'Water demand from weather'}
                        </p>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100/80">
                        <p className="text-xs font-bold text-gray-500">Irrigation</p>
                        <p className="text-base font-black text-gray-900 mt-1">
                          {conditions.irrigation_method || 'Not configured'}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-1">From your farm profile</p>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100/80">
                        <p className="text-xs font-bold text-gray-500">Plant / Crop</p>
                        <p className="text-base font-black text-gray-900 mt-1">
                          {selectedPlant || conditions.crop || 'Not set'}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-1">Selected plant</p>
                      </div>
                    </div>
                  </div>

                  {/* Improvement Suggestions */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-600" />
                        <h2 className="font-black text-gray-900 text-lg">What you can improve</h2>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Actionable steps generated from your farm's actual metrics.</p>

                      <div className="mt-4 space-y-3">
                        {recommendations.length > 0 ? (
                          recommendations.map((suggestion, idx) => (
                            <div key={idx} className="flex items-start gap-3 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100/60">
                              <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                              <span className="text-xs sm:text-sm font-medium text-gray-800 leading-snug">{suggestion}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-gray-500 italic">No current improvement advisories.</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                      <span>Refreshed with real-time farm & weather data</span>
                      <button
                        type="button"
                        onClick={() => handlePlantChange(selectedPlant)}
                        className="text-emerald-700 font-bold hover:underline inline-flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" /> Refresh score
                      </button>
                    </div>
                  </div>
                </section>

                {/* Why Did I Get This Score? Section */}
                <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-emerald-600" />
                    <h2 className="font-black text-gray-900 text-lg">
                      Why is my score {overallScore != null ? overallScore : '—'}?
                    </h2>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Plain-language breakdown of each score component for {selectedPlant || 'this plant'}.</p>

                  <div className="mt-4 grid md:grid-cols-2 gap-4">
                    <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
                          <Droplets className="w-3.5 h-3.5" /> Water (30% weight)
                        </span>
                        <span className="text-sm font-black text-gray-900">
                          {components.water != null ? `${components.water} / 100` : '—'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {explanations.water || 'Evaluates live soil moisture optimality and atmospheric water demand.'}
                      </p>
                    </div>

                    <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                          <Sprout className="w-3.5 h-3.5" /> Soil (25% weight)
                        </span>
                        <span className="text-sm font-black text-gray-900">
                          {components.soil != null ? `${components.soil} / 100` : '—'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {explanations.soil || 'Measures whether moisture resides in the agronomic sweet spot (20%–50%).'}
                      </p>
                    </div>

                    <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                          <Leaf className="w-3.5 h-3.5" /> Crop Health (25% weight)
                        </span>
                        <span className="text-sm font-black text-gray-900">
                          {components.crop_health != null ? `${components.crop_health} / 100` : '—'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {explanations.crop_health || 'Reflects your recent leaf scan pathology records.'}
                      </p>
                    </div>

                    <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-teal-700 flex items-center gap-1.5">
                          <Waves className="w-3.5 h-3.5" /> Resources (20% weight)
                        </span>
                        <span className="text-sm font-black text-gray-900">
                          {components.resources != null ? `${components.resources} / 100` : '—'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {explanations.resources || 'Evaluates the efficiency rating of your farm profile irrigation system.'}
                      </p>
                    </div>
                  </div>
                </section>

                {/* Published Formula and Reproducibility (Collapsible Section) */}
                <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowFormula((prev) => !prev)}
                    className="w-full p-5 text-left flex items-center justify-between hover:bg-gray-50/60 transition-colors"
                  >
                    <div>
                      <h2 className="font-black text-gray-900 text-base">How is my score calculated?</h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        View the transparent, published mathematical formula and scoring rules.
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-gray-100 text-gray-600">
                      {showFormula ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {showFormula && (
                    <div className="p-6 pt-2 border-t border-gray-100 bg-gray-50/40 text-xs text-gray-600 space-y-5">
                      <div className="bg-white p-4 rounded-xl border border-gray-200 font-mono text-xs text-gray-800 leading-relaxed">
                        <p className="font-bold text-gray-900 mb-1 font-sans">Authoritative Overall Score Formula:</p>
                        Overall Score = (Water × 0.30) + (Soil × 0.25) + (Crop Health × 0.25) + (Resources × 0.20)
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-gray-200/80 space-y-2">
                          <p className="font-extrabold text-gray-900 text-sm">💧 Water Efficiency (30% weight)</p>
                          <p className="leading-relaxed">
                            <strong className="text-gray-800">Formula:</strong> (Soil Moisture Score × 0.60) + (ET₀ Demand Score × 0.40)
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-gray-600 pl-1">
                            <li><strong>25%–45% moisture:</strong> 100 pts (Optimal)</li>
                            <li><strong>&lt;10% moisture:</strong> 20 pts</li>
                            <li><strong>10%–25% moisture:</strong> 40 + (moisture - 10) × 4</li>
                            <li><strong>45%–60% moisture:</strong> 100 - (moisture - 45) × 2</li>
                            <li><strong>&gt;60% moisture:</strong> 65 pts</li>
                            <li><strong>ET₀ &lt; 3 mm:</strong> 90 pts | <strong>&lt; 5 mm:</strong> 75 pts | <strong>&lt; 7 mm:</strong> 60 pts | <strong>≥ 7 mm:</strong> 45 pts</li>
                          </ul>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-gray-200/80 space-y-2">
                          <p className="font-extrabold text-gray-900 text-sm">🌱 Soil Health (25% weight)</p>
                          <p className="leading-relaxed">
                            <strong className="text-gray-800">Moisture retention in agronomic safety bands:</strong>
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-gray-600 pl-1">
                            <li><strong>20%–50% moisture:</strong> 85 pts (Optimal target)</li>
                            <li><strong>&lt;10% moisture:</strong> 30 pts</li>
                            <li><strong>10%–20% moisture:</strong> 50 + (moisture - 10) × 3.5</li>
                            <li><strong>50%–70% moisture:</strong> 85 - (moisture - 50) × 2</li>
                            <li><strong>&gt;70% moisture:</strong> 50 pts</li>
                          </ul>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-gray-200/80 space-y-2">
                          <p className="font-extrabold text-gray-900 text-sm">🍃 Crop Health (25% weight)</p>
                          <p className="leading-relaxed">
                            <strong className="text-gray-800">Formula:</strong> 50 + (Healthy Leaf Scans / Total Scans × 50)
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-gray-600 pl-1">
                            <li><strong>100% healthy:</strong> 100 pts</li>
                            <li><strong>80% healthy:</strong> 90 pts</li>
                            <li><strong>50% healthy:</strong> 75 pts</li>
                            <li><strong>0% healthy:</strong> 50 pts</li>
                            <li><strong>No disease scans yet for selected plant:</strong> 75 pts (Standard baseline)</li>
                          </ul>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-gray-200/80 space-y-2">
                          <p className="font-extrabold text-gray-900 text-sm">🚿 Resource Efficiency (20% weight)</p>
                          <p className="leading-relaxed">
                            <strong className="text-gray-800">Irrigation method rating from Farm Profile:</strong>
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-gray-600 pl-1">
                            <li><strong>Drip Irrigation:</strong> 92 pts</li>
                            <li><strong>Sprinkler Irrigation:</strong> 78 pts</li>
                            <li><strong>Manual Watering:</strong> 62 pts</li>
                            <li><strong>Flood Irrigation:</strong> 48 pts</li>
                            <li><strong>Rainfed / No Irrigation:</strong> 60 pts</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
