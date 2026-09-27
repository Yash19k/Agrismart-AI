import React, { useEffect, useState, useCallback } from 'react';
import {
  Sprout,
  MapPin,
  Layers,
  AlertCircle,
  Compass,
  Menu,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Building,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import AppSidebar from '../components/common/AppSidebar';
import { useAuth } from '../context/AuthContext';
import { getFarms, createFarm, updateFarm, deleteFarm } from '../api/farms';
import FarmLocationMap from '../components/farm/FarmLocationMap';

const CROP_STAGE_OPTIONS = [
  { value: 'seedling', label: 'Seedling (Early Emergence)' },
  { value: 'vegetative', label: 'Vegetative (Leaf & Stem Growth)' },
  { value: 'flowering', label: 'Flowering (Bloom & Pollination)' },
  { value: 'fruiting', label: 'Fruiting / Grain Fill' },
  { value: 'maturity', label: 'Maturity / Ripening' },
  { value: 'harvest', label: 'Harvest Ready' },
];

const SOIL_TYPE_OPTIONS = [
  { value: 'black', label: 'Black Cotton Soil (Regur - High Clay)' },
  { value: 'alluvial', label: 'Alluvial Soil (Fertile River Silt)' },
  { value: 'red', label: 'Red Soil (Well-drained, Iron-rich)' },
  { value: 'loamy', label: 'Loamy Soil (Balanced Organic Matter)' },
  { value: 'sandy', label: 'Sandy Soil (High Drainage)' },
  { value: 'clayey', label: 'Clayey Soil (High Water Retention)' },
];

const IRRIGATION_OPTIONS = [
  { value: 'drip', label: 'Drip Irrigation (Precision Micro-emitters)' },
  { value: 'sprinkler', label: 'Sprinkler Irrigation (Overhead Spray)' },
  { value: 'flood', label: 'Surface / Flood Irrigation' },
  { value: 'manual', label: 'Manual Watering / Rainfed' },
  { value: 'none', label: 'No Irrigation (Dryland)' },
];

const POPULAR_CROPS = [
  'Tomato',
  'Potato',
  'Corn (Maize)',
  'Cotton',
  'Wheat',
  'Rice (Paddy)',
  'Chilli (Pepper)',
  'Soybean',
  'Groundnut',
  'Sugarcane',
  'Onion',
  'Brinjal (Eggplant)',
  'Apple',
  'Grape',
  'Banana',
];

export default function FarmPage() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [farms, setFarms] = useState([]);
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Form State
  const [form, setForm] = useState({
    farm_name: '',
    latitude: 22.5645,
    longitude: 72.9289,
    location_name: '',
    farm_boundary: null,
    farm_area_acres: null,
    crop: 'Tomato',
    crop_variety: '',
    crop_stage: 'vegetative',
    soil_type: 'black',
    soil_ph: '',
    soil_moisture_pct: '',
    irrigation_type: 'drip',
  });

  const [validationErrors, setValidationErrors] = useState({});

  const selectFarm = useCallback((farm) => {
    setSelectedFarm(farm);
    setValidationErrors({});
    setFeedback(null);
    setForm({
      farm_name: farm.farm_name || '',
      latitude: farm.latitude !== undefined && farm.latitude !== null ? farm.latitude : 22.5645,
      longitude: farm.longitude !== undefined && farm.longitude !== null ? farm.longitude : 72.9289,
      location_name: farm.location_name || '',
      farm_boundary: farm.farm_boundary || null,
      farm_area_acres: farm.farm_area_acres !== undefined && farm.farm_area_acres !== null ? farm.farm_area_acres : null,
      crop: farm.crop || 'Tomato',
      crop_variety: farm.crop_variety || '',
      crop_stage: farm.crop_stage || 'vegetative',
      soil_type: farm.soil_type || 'black',
      soil_ph: farm.soil_ph !== null && farm.soil_ph !== undefined ? farm.soil_ph : '',
      soil_moisture_pct: farm.soil_moisture_pct !== null && farm.soil_moisture_pct !== undefined ? farm.soil_moisture_pct : '',
      irrigation_type: farm.irrigation_type || 'drip',
    });
  }, []);

  const startNewFarm = useCallback(() => {
    setSelectedFarm(null);
    setValidationErrors({});
    setFeedback(null);
    setForm({
      farm_name: '',
      latitude: 22.5645,
      longitude: 72.9289,
      location_name: '',
      farm_boundary: null,
      farm_area_acres: null,
      crop: 'Tomato',
      crop_variety: '',
      crop_stage: 'vegetative',
      soil_type: 'black',
      soil_ph: '',
      soil_moisture_pct: '',
      irrigation_type: 'drip',
    });
  }, []);

  const loadFarms = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getFarms();
      const list = res.results || res || [];
      setFarms(list);
      if (list.length > 0) {
        selectFarm(list[0]);
      } else {
        startNewFarm();
      }
    } catch (err) {
      console.error('Failed to load farms:', err);
      setFeedback({
        type: 'error',
        text: 'Unable to load your farm records. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }, [selectFarm, startNewFarm]);

  useEffect(() => {
    loadFarms();
  }, [loadFarms]);


  const handleLocationChange = (lat, lng) => {
    setForm((prev) => ({
      ...prev,
      latitude: Number(Number(lat).toFixed(6)),
      longitude: Number(Number(lng).toFixed(6)),
    }));
    if (validationErrors.location) {
      setValidationErrors((prev) => ({ ...prev, location: null }));
    }
  };

  const handleBoundaryChange = (geojson, acres) => {
    setForm((prev) => ({
      ...prev,
      farm_boundary: geojson,
      farm_area_acres: acres,
    }));
    setValidationErrors((prev) => {
      const next = { ...prev };
      delete next.boundary;
      return next;
    });
  };

  const validateForm = () => {
    const errors = {};

    if (!form.farm_name.trim()) {
      errors.farm_name = 'Farm Name is required.';
    }

    if (
      form.latitude === undefined ||
      form.latitude === null ||
      isNaN(form.latitude) ||
      form.latitude < -90 ||
      form.latitude > 90
    ) {
      errors.location = 'A valid farm location latitude is required (-90 to 90).';
    }

    if (
      form.longitude === undefined ||
      form.longitude === null ||
      isNaN(form.longitude) ||
      form.longitude < -180 ||
      form.longitude > 180
    ) {
      errors.location = 'A valid farm location longitude is required (-180 to 180).';
    }

    const boundaryCoords =
      form.farm_boundary?.coordinates || form.farm_boundary?.geometry?.coordinates;
    if (!form.farm_boundary || !boundaryCoords) {
      errors.boundary = 'Please draw your farm boundary polygon on the map.';
    } else {
      if (!Array.isArray(boundaryCoords) || !Array.isArray(boundaryCoords[0]) || boundaryCoords[0].length < 4) {
        errors.boundary = 'The drawn farm boundary must be a valid closed polygon with at least 3 points.';
      }
    }

    if (!form.crop.trim()) {
      errors.crop = 'Cultivated crop is required.';
    }

    if (!form.crop_stage) {
      errors.crop_stage = 'Crop growth stage is required.';
    }

    if (!form.soil_type) {
      errors.soil_type = 'Soil type is required.';
    }

    if (!form.irrigation_type) {
      errors.irrigation_type = 'Irrigation method is required.';
    }

    if (form.soil_ph !== '' && form.soil_ph !== null) {
      const ph = parseFloat(form.soil_ph);
      if (isNaN(ph) || ph < 0 || ph > 14) {
        errors.soil_ph = 'Soil pH must be a number between 0 and 14.';
      }
    }

    if (form.soil_moisture_pct !== '' && form.soil_moisture_pct !== null) {
      const moisture = parseFloat(form.soil_moisture_pct);
      if (isNaN(moisture) || moisture < 0 || moisture > 100) {
        errors.soil_moisture_pct = 'Soil moisture must be between 0% and 100%.';
      }
    }

    setValidationErrors(errors);
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);

    const { isValid, errors } = validateForm();
    if (!isValid) {
      const firstError = Object.values(errors)[0];
      setFeedback({
        type: 'error',
        text: firstError || 'Please correct the highlighted errors before saving.',
      });
      return;
    }

    setSaving(true);

    let boundaryPayload = form.farm_boundary;
    if (boundaryPayload?.type === 'Feature' && boundaryPayload.geometry) {
      boundaryPayload = boundaryPayload.geometry;
    }

    const payload = {
      farm_name: form.farm_name.trim(),
      latitude: parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
      location_name: form.location_name.trim(),
      farm_boundary: boundaryPayload,
      farm_area_acres: form.farm_area_acres,
      crop: form.crop.trim(),
      crop_variety: form.crop_variety.trim(),
      crop_stage: form.crop_stage,
      soil_type: form.soil_type,
      irrigation_type: form.irrigation_type,
      soil_ph: form.soil_ph === '' || form.soil_ph === null ? null : parseFloat(form.soil_ph),
      soil_moisture_pct:
        form.soil_moisture_pct === '' || form.soil_moisture_pct === null
          ? null
          : parseFloat(form.soil_moisture_pct),
    };

    try {
      if (selectedFarm && selectedFarm.id) {
        const updated = await updateFarm(selectedFarm.id, payload);
        setSelectedFarm(updated);
        setFarms((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
        setFeedback({
          type: 'success',
          text: `Farm "${updated.farm_name}" updated successfully with boundary and calculated area (${updated.farm_area_acres || updated.farm_size} acres).`,
        });
      } else {
        const created = await createFarm(payload);
        setSelectedFarm(created);
        setFarms((prev) => [created, ...prev]);
        setFeedback({
          type: 'success',
          text: `Farm "${created.farm_name}" registered successfully with ${created.farm_area_acres || created.farm_size} acres.`,
        });
      }
    } catch (err) {
      console.error('Farm save error:', err);
      const serverError =
        err.response?.data?.farm_boundary?.[0] ||
        err.response?.data?.farm_name?.[0] ||
        err.response?.data?.detail ||
        'Failed to save farm details. Please check values.';
      setFeedback({
        type: 'error',
        text: serverError,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedFarm || !selectedFarm.id) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${selectedFarm.farm_name}"? This action cannot be undone.`
    );
    if (!confirmDelete) return;

    setDeleting(true);
    setFeedback(null);
    try {
      await deleteFarm(selectedFarm.id);
      const remaining = farms.filter((f) => f.id !== selectedFarm.id);
      setFarms(remaining);
      if (remaining.length > 0) {
        selectFarm(remaining[0]);
      } else {
        startNewFarm();
      }
      setFeedback({
        type: 'success',
        text: 'Farm profile removed successfully.',
      });
    } catch (err) {
      console.error('Failed to delete farm:', err);
      setFeedback({
        type: 'error',
        text: 'Failed to delete farm. Please try again.',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F7F8F3] text-[#16352D]">
      <AppSidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-[#DCE8DF] flex items-center justify-between px-4 sm:px-6 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg text-[#6C7D76] hover:bg-[#F7F8F3]"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Sprout className="w-6 h-6 text-[#047857]" />
              <h1 className="font-editorial text-lg sm:text-xl font-bold text-[#003629]">
                My Farm Profile
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {user?.is_demo && (
              <span className="text-xs bg-[#eef7f2] text-[#047857] px-2.5 py-1 rounded-full font-semibold border border-[#c4e5d4] hidden sm:inline">
                Demo Profile
              </span>
            )}
            <button
              type="button"
              onClick={startNewFarm}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#ecfef3] hover:bg-[#d1fae5] text-[#047857] text-xs font-semibold border border-[#a7f3d0] transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add New Farm</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-5xl w-full mx-auto space-y-6">
          {loading ? (
            <div className="bg-white rounded-2xl p-12 border border-[#DCE8DF] flex flex-col items-center justify-center gap-3 shadow-xs">
              <Loader2 className="w-8 h-8 text-[#047857] animate-spin" />
              <p className="text-sm font-semibold text-slate-700">Loading your farm profile & map...</p>
            </div>
          ) : (
            <>
              {/* Header intro card */}
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#DCE8DF] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#047857] uppercase tracking-wider mb-1">
                    <Compass className="w-4 h-4" />
                    Stage 0 · Farm Context & Geospatial Boundary
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#003629]">
                    {selectedFarm ? selectedFarm.farm_name : 'Register New Farm Plot'}
                  </h2>
                  <p className="text-xs sm:text-[13px] text-[#6C7D76] mt-1 max-w-2xl leading-relaxed">
                    Configure your farm coordinates, outline the actual field boundary on the interactive Leaflet map to calculate area in acres, and record crop and soil parameters.
                  </p>
                </div>

                {/* Farm Selector Pill Bar */}
                {farms.length > 0 && (
                  <div className="flex items-center gap-2 self-stretch sm:self-auto bg-[#F7F8F3] p-1.5 rounded-xl border border-[#DCE8DF]">
                    <span className="text-[11px] font-semibold text-[#6C7D76] pl-1.5 hidden md:inline">
                      Plots:
                    </span>
                    <select
                      value={selectedFarm?.id || 'new'}
                      onChange={(e) => {
                        if (e.target.value === 'new') {
                          startNewFarm();
                        } else {
                          const found = farms.find((f) => f.id === parseInt(e.target.value));
                          if (found) selectFarm(found);
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-lg border-0 text-xs font-semibold bg-white text-[#16352D] focus:ring-2 focus:ring-[#047857]"
                    >
                      {farms.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.farm_name} ({f.crop} · {f.farm_area_acres || f.farm_size || '—'} ac)
                        </option>
                      ))}
                      <option value="new">+ Add New Farm...</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Feedback Banners */}
              {feedback && (
                <div
                  className={`p-4 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-between gap-3 shadow-xs transition-all ${
                    feedback.type === 'success'
                  ? 'bg-[#ecfef3] text-[#065f46] border border-[#a7f3d0]'
                  : 'bg-[#fff1f2] text-[#9f1239] border border-[#fecdd3]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-[#047857] flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                )}
                <span>{feedback.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="text-xs opacity-75 hover:opacity-100 font-bold px-1.5"
              >
                ✕
              </button>
            </div>
          )}

          {/* Main Farm Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Farm Information Section */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#DCE8DF] shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-[#DCE8DF]">
                <Building className="w-5 h-5 text-[#047857]" />
                <h3 className="font-bold text-base text-[#003629]">1. Farm Information</h3>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5" htmlFor="farm-name">
                  Farm Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="farm-name"
                  type="text"
                  required
                  value={form.farm_name}
                  onChange={(e) => setForm({ ...form, farm_name: e.target.value })}
                  placeholder="e.g. Patel Organic Green Valley Plot 1"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#047857]/20 ${
                    validationErrors.farm_name
                      ? 'border-red-300 bg-red-50/50 text-red-900 focus:border-red-500'
                      : 'border-[#DCE8DF] bg-[#fafdfb] text-slate-900 focus:border-[#047857]'
                  }`}
                />
                {validationErrors.farm_name && (
                  <p className="mt-1 text-xs text-red-600 font-medium">{validationErrors.farm_name}</p>
                )}
              </div>
            </div>

            {/* 2. Farm Location & Boundary Section */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#DCE8DF] shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#DCE8DF]">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#047857]" />
                  <h3 className="font-bold text-base text-[#003629]">2. Farm Location & Boundary</h3>
                </div>
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  Interactive Leaflet Map
                </span>
              </div>

              {/* Location Name Field */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5" htmlFor="location-name">
                  Location / Village / District Name
                </label>
                <input
                  id="location-name"
                  type="text"
                  value={form.location_name}
                  onChange={(e) => setForm({ ...form, location_name: e.target.value })}
                  placeholder="e.g. Anand, Gujarat or Mogri Village"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE8DF] bg-[#fafdfb] text-sm text-slate-900 focus:outline-none focus:border-[#047857] focus:ring-2 focus:ring-[#047857]/20"
                />
              </div>

              {/* Interactive Map Component */}
              <FarmLocationMap
                latitude={form.latitude}
                longitude={form.longitude}
                onLocationChange={handleLocationChange}
                farmBoundary={form.farm_boundary}
                onBoundaryChange={handleBoundaryChange}
                calculatedAreaAcres={form.farm_area_acres}
              />

              {validationErrors.location && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{validationErrors.location}</span>
                </div>
              )}

              {validationErrors.boundary && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{validationErrors.boundary}</span>
                </div>
              )}
            </div>

            {/* 3. Crop Information Section */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#DCE8DF] shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-[#DCE8DF]">
                <Sprout className="w-5 h-5 text-[#047857]" />
                <h3 className="font-bold text-base text-[#003629]">3. Crop Information</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Cultivated Crop */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5" htmlFor="crop">
                    Cultivated Crop <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="crop"
                    list="crop-options"
                    type="text"
                    required
                    value={form.crop}
                    onChange={(e) => setForm({ ...form, crop: e.target.value })}
                    placeholder="e.g. Tomato, Potato"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE8DF] bg-[#fafdfb] text-sm text-slate-900 focus:outline-none focus:border-[#047857]"
                  />
                  <datalist id="crop-options">
                    {POPULAR_CROPS.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                  {validationErrors.crop && (
                    <p className="mt-1 text-xs text-red-600 font-medium">{validationErrors.crop}</p>
                  )}
                </div>

                {/* Crop Variety */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5" htmlFor="crop-variety">
                    Crop Variety <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    id="crop-variety"
                    type="text"
                    value={form.crop_variety}
                    onChange={(e) => setForm({ ...form, crop_variety: e.target.value })}
                    placeholder="e.g. Abhinav, Pusa Ruby"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE8DF] bg-[#fafdfb] text-sm text-slate-900 focus:outline-none focus:border-[#047857]"
                  />
                </div>

                {/* Crop Growth Stage */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5" htmlFor="crop-stage">
                    Growth Stage <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="crop-stage"
                    required
                    value={form.crop_stage}
                    onChange={(e) => setForm({ ...form, crop_stage: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE8DF] bg-[#fafdfb] text-sm text-slate-900 focus:outline-none focus:border-[#047857]"
                  >
                    {CROP_STAGE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 4. Farm Conditions Section */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#DCE8DF] shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-[#DCE8DF]">
                <Layers className="w-5 h-5 text-[#047857]" />
                <h3 className="font-bold text-base text-[#003629]">4. Farm Conditions</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Irrigation Method */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5" htmlFor="irrigation-type">
                    Irrigation Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="irrigation-type"
                    required
                    value={form.irrigation_type}
                    onChange={(e) => setForm({ ...form, irrigation_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE8DF] bg-[#fafdfb] text-sm text-slate-900 focus:outline-none focus:border-[#047857]"
                  >
                    {IRRIGATION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Soil Type */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5" htmlFor="soil-type">
                    Soil Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="soil-type"
                    required
                    value={form.soil_type}
                    onChange={(e) => setForm({ ...form, soil_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE8DF] bg-[#fafdfb] text-sm text-slate-900 focus:outline-none focus:border-[#047857]"
                  >
                    {SOIL_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Soil pH */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5" htmlFor="soil-ph">
                    Soil pH <span className="text-slate-400 font-normal">(Optional, 0-14)</span>
                  </label>
                  <input
                    id="soil-ph"
                    type="number"
                    step="0.1"
                    min="0"
                    max="14"
                    value={form.soil_ph}
                    onChange={(e) => setForm({ ...form, soil_ph: e.target.value })}
                    placeholder="e.g. 6.8"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE8DF] bg-[#fafdfb] text-sm text-slate-900 focus:outline-none focus:border-[#047857]"
                  />
                  {validationErrors.soil_ph && (
                    <p className="mt-1 text-xs text-red-600 font-medium">{validationErrors.soil_ph}</p>
                  )}
                </div>

                {/* Soil Moisture % */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5" htmlFor="soil-moisture">
                    Soil Moisture % <span className="text-slate-400 font-normal">(Optional, 0-100)</span>
                  </label>
                  <input
                    id="soil-moisture"
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={form.soil_moisture_pct}
                    onChange={(e) => setForm({ ...form, soil_moisture_pct: e.target.value })}
                    placeholder="e.g. 42%"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE8DF] bg-[#fafdfb] text-sm text-slate-900 focus:outline-none focus:border-[#047857]"
                  />
                  {validationErrors.soil_moisture_pct && (
                    <p className="mt-1 text-xs text-red-600 font-medium">{validationErrors.soil_moisture_pct}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Form Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div>
                {selectedFarm && selectedFarm.id && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold border border-red-200 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{deleting ? 'Deleting...' : 'Delete Farm'}</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#047857] hover:bg-[#065f46] text-white text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving Farm Profile...' : selectedFarm ? 'Update Farm Profile' : 'Save Farm'}</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          </form>
        </>
      )}
    </main>
      </div>
    </div>
  );
}
