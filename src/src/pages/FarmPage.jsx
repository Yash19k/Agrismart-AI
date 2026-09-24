import React, { useEffect, useState } from 'react';
import {
  Sprout,
  MapPin,
  Layers,
  Droplets,
  Activity,
  Check,
  AlertCircle,
  Clock,
  Compass,
  Menu,
  ShieldCheck,
  Thermometer,
  Cpu
} from 'lucide-react';
import AppSidebar from '../components/common/AppSidebar';
import { useAuth } from '../context/AuthContext';
import { getFarms, createFarm, updateFarm } from '../api/farms';
import { getLatestSensorReading } from '../api/sensors';

const POPULAR_CITIES = [
  { name: 'Anand, Gujarat', lat: 22.5645, lon: 72.9289 },
  { name: 'Petlad, Gujarat', lat: 22.5100, lon: 72.9800 },
  { name: 'Sanand, Gujarat', lat: 22.9850, lon: 72.3800 },
  { name: 'Padra, Gujarat', lat: 22.2400, lon: 73.0800 },
  { name: 'Gondal, Gujarat', lat: 21.9600, lon: 70.7900 },
  { name: 'Bardoli, Gujarat', lat: 21.1200, lon: 73.1100 },
];

export default function FarmPage() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [farms, setFarms] = useState([]);
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [latestSensor, setLatestSensor] = useState(null);

  const [form, setForm] = useState({
    farm_name: '',
    location_name: '',
    latitude: 22.5645,
    longitude: 72.9289,
    crop: 'Tomato',
    crop_variety: '',
    crop_stage: 'vegetative',
    soil_type: 'black',
    soil_ph: '',
    soil_moisture_pct: '',
    farm_size: 2.5,
    irrigation_type: 'drip',
  });

  useEffect(() => {
    loadFarms();
  }, []);

  const loadFarms = async () => {
    try {
      setLoading(true);
      const res = await getFarms();
      const list = res.results || res || [];
      setFarms(list);
      if (list.length > 0) {
        selectFarm(list[0]);
      }
    } catch (err) {
      console.error('Failed to load farms:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectFarm = async (f) => {
    setSelectedFarm(f);
    setForm({
      farm_name: f.farm_name || '',
      location_name: f.location_name || '',
      latitude: f.latitude || 22.5645,
      longitude: f.longitude || 72.9289,
      crop: f.crop || 'Tomato',
      crop_variety: f.crop_variety || '',
      crop_stage: f.crop_stage || 'vegetative',
      soil_type: f.soil_type || 'black',
      soil_ph: f.soil_ph !== null && f.soil_ph !== undefined ? f.soil_ph : '',
      soil_moisture_pct: f.soil_moisture_pct !== null && f.soil_moisture_pct !== undefined ? f.soil_moisture_pct : '',
      farm_size: f.farm_size || 2.5,
      irrigation_type: f.irrigation_type || 'drip',
    });

    try {
      const sensor = await getLatestSensorReading(f.id);
      setLatestSensor(sensor);
    } catch (err) {
      setLatestSensor(null);
    }
  };

  const handleCitySelect = (cityName) => {
    const match = POPULAR_CITIES.find(c => c.name === cityName);
    if (match) {
      setForm(prev => ({
        ...prev,
        location_name: match.name,
        latitude: match.lat,
        longitude: match.lon
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const payload = {
      ...form,
      latitude: parseFloat(form.latitude) || 22.5645,
      longitude: parseFloat(form.longitude) || 72.9289,
      farm_size: parseFloat(form.farm_size) || 1.0,
      soil_ph: form.soil_ph === '' ? null : parseFloat(form.soil_ph),
      soil_moisture_pct: form.soil_moisture_pct === '' ? null : parseFloat(form.soil_moisture_pct),
    };

    try {
      if (selectedFarm && selectedFarm.id) {
        const updated = await updateFarm(selectedFarm.id, payload);
        setMessage({ type: 'success', text: 'Farm context updated successfully.' });
        setSelectedFarm(updated);
        setFarms(farms.map(f => f.id === updated.id ? updated : f));
      } else {
        const created = await createFarm(payload);
        setMessage({ type: 'success', text: 'New farm profile configured.' });
        setSelectedFarm(created);
        setFarms([created, ...farms]);
      }
    } catch (err) {
      console.error('Farm save error:', err);
      setMessage({ type: 'error', text: 'Failed to save farm details. Please check values.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F7F8F3] text-[#16352D]">
      <AppSidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-[#DCE8DF] flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg text-[#6C7D76] hover:bg-[#F7F8F3]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Sprout className="w-6 h-6 text-[#2fa874]" />
              <h1 className="font-editorial text-xl font-bold text-[#003629]">
                My Farm Profile
              </h1>
            </div>
          </div>

          {user?.is_demo && (
            <span className="text-xs bg-[#eef7f2] text-[#248057] px-3 py-1 rounded-full font-semibold border border-[#c4e5d4]">
              Demo Data Mode
            </span>
          )}
        </header>

        <main className="flex-1 p-6 max-w-5xl w-full mx-auto space-y-6">
          {/* Header intro card */}
          <div className="bg-white rounded-2xl p-6 border border-[#DCE8DF] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#527d6a] uppercase tracking-wider mb-1">
                <Compass className="w-4 h-4" />
                Stage 0 · Farm Context & Agronomic Parameters
              </div>
              <h2 className="text-xl font-bold text-[#003629]">
                {selectedFarm ? selectedFarm.farm_name : 'Configure Your Primary Plot'}
              </h2>
              <p className="text-xs text-[#6C7D76] mt-0.5">
                Accurate farm context feeds the disease safety gate, weather risk calculations, and localized IPM guidance.
              </p>
            </div>

            {farms.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#6C7D76]">Switch Plot:</span>
                <select
                  value={selectedFarm?.id || ''}
                  onChange={(e) => {
                    const found = farms.find(f => f.id === parseInt(e.target.value));
                    if (found) selectFarm(found);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-[#DCE8DF] text-xs bg-white font-medium"
                >
                  {farms.map(f => (
                    <option key={f.id} value={f.id}>{f.farm_name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {message && (
            <div className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
              message.type === 'success' ? 'bg-[#ecfef3] text-[#13663b] border border-[#a7f3d0]' : 'bg-[#fff1f2] text-[#9f1239] border border-[#fecdd3]'
            }`}>
              {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {message.text}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form column */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-[#DCE8DF] shadow-xs">
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-[#16352D] mb-1">Plot / Farm Name *</label>
                  <input
                    type="text"
                    required
                    value={form.farm_name}
                    onChange={(e) => setForm({ ...form, farm_name: e.target.value })}
                    placeholder="e.g. Patel Organic Farms Plot 1"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE8DF] bg-[#fafdfb] text-xs focus:outline-none focus:border-[#2fa874]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#16352D] mb-1">Regional Location</label>
                    <select
                      value={form.location_name}
                      onChange={(e) => handleCitySelect(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE8DF] bg-[#fafdfb] text-xs focus:outline-none focus:border-[#2fa874]"
                    >
                      <option value="">Select district / regional hub...</option>
                      {POPULAR_CITIES.map(c => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-[#16352D] mb-1">Acreage (Acres)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={form.farm_size}
                      onChange={(e) => setForm({ ...form, farm_size: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE8DF] bg-[#fafdfb] text-xs focus:outline-none focus:border-[#2fa874]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#16352D] mb-1">Latitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={form.latitude}
                      onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE8DF] bg-[#fafdfb] text-xs focus:outline-none focus:border-[#2fa874]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#16352D] mb-1">Longitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={form.longitude}
                      onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE8DF] bg-[#fafdfb] text-xs focus:outline-none focus:border-[#2fa874]"
                    />
                  </div>
                </div>

                <hr className="border-[#DCE8DF] my-2" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#16352D] mb-1">Cultivated Crop *</label>
                    <input
                      type="text"
                      required
                      value={form.crop}
                      onChange={(e) => setForm({ ...form, crop: e.target.value })}
                      placeholder="e.g. Tomato, Potato, Chilli"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE8DF] bg-[#fafdfb] text-xs focus:outline-none focus:border-[#2fa874]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#16352D] mb-1">Crop Variety (Optional)</label>
                    <input
                      type="text"
                      value={form.crop_variety}
                      onChange={(e) => setForm({ ...form, crop_variety: e.target.value })}
                      placeholder="e.g. Abhinav (F1), Kufri Jyoti"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE8DF] bg-[#fafdfb] text-xs focus:outline-none focus:border-[#2fa874]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#16352D] mb-1">Crop Growth Stage *</label>
                    <select
                      value={form.crop_stage}
                      onChange={(e) => setForm({ ...form, crop_stage: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE8DF] bg-[#fafdfb] text-xs focus:outline-none focus:border-[#2fa874]"
                    >
                      <option value="seedling">Seedling</option>
                      <option value="vegetative">Vegetative</option>
                      <option value="flowering">Flowering</option>
                      <option value="fruiting">Fruiting / Pod Formation</option>
                      <option value="harvest">Maturity / Harvest</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-[#16352D] mb-1">Irrigation Method</label>
                    <select
                      value={form.irrigation_type}
                      onChange={(e) => setForm({ ...form, irrigation_type: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE8DF] bg-[#fafdfb] text-xs focus:outline-none focus:border-[#2fa874]"
                    >
                      <option value="drip">Drip Irrigation</option>
                      <option value="sprinkler">Sprinkler Irrigation</option>
                      <option value="flood">Flood / Furrow</option>
                      <option value="rainfed">Rainfed</option>
                    </select>
                  </div>
                </div>

                <hr className="border-[#DCE8DF] my-2" />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-[#16352D] mb-1">Soil Type</label>
                    <select
                      value={form.soil_type}
                      onChange={(e) => setForm({ ...form, soil_type: e.target.value })}
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
                    <label className="block font-semibold text-[#16352D] mb-1">Soil pH (Optional)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="3.0"
                      max="11.0"
                      value={form.soil_ph}
                      onChange={(e) => setForm({ ...form, soil_ph: e.target.value })}
                      placeholder="e.g. 6.8"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE8DF] bg-[#fafdfb] text-xs focus:outline-none focus:border-[#2fa874]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#16352D] mb-1">Soil Moisture % (Opt.)</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={form.soil_moisture_pct}
                      onChange={(e) => setForm({ ...form, soil_moisture_pct: e.target.value })}
                      placeholder="e.g. 35"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE8DF] bg-[#fafdfb] text-xs focus:outline-none focus:border-[#2fa874]"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 rounded-xl bg-[#1b4d3e] hover:bg-[#133a2f] text-white font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : (selectedFarm ? 'Update Farm Profile' : 'Save Farm Profile')}
                  </button>
                </div>
              </form>
            </div>

            {/* Side column: Telemetry & Safety Overview */}
            <div className="space-y-6">
              {/* Telemetry card */}
              <div className="bg-white rounded-2xl p-5 border border-[#DCE8DF] shadow-xs">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#16352D] mb-3">
                  <Cpu className="w-4 h-4 text-[#2fa874]" />
                  Sensor Telemetry Status
                </div>

                {latestSensor ? (
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between items-center py-1.5 border-b border-[#F7F8F3]">
                      <span className="text-[#6C7D76]">Source:</span>
                      <span className="font-semibold text-[#003629] capitalize">
                        {latestSensor.source} entry
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-[#F7F8F3]">
                      <span className="text-[#6C7D76]">Soil Moisture:</span>
                      <span className="font-semibold text-[#003629]">
                        {latestSensor.soil_moisture !== null ? `${latestSensor.soil_moisture}%` : 'Not recorded'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-[#F7F8F3]">
                      <span className="text-[#6C7D76]">Air Temperature:</span>
                      <span className="font-semibold text-[#003629]">
                        {latestSensor.temperature !== null ? `${latestSensor.temperature}°C` : 'Not recorded'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-[#F7F8F3]">
                      <span className="text-[#6C7D76]">Air Humidity:</span>
                      <span className="font-semibold text-[#003629]">
                        {latestSensor.humidity !== null ? `${latestSensor.humidity}%` : 'Not recorded'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-[#F7F8F3]">
                      <span className="text-[#6C7D76]">Soil pH:</span>
                      <span className="font-semibold text-[#003629]">
                        {latestSensor.ph !== null ? latestSensor.ph : 'Not recorded'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6C7D76] pt-1">
                      Recorded: {new Date(latestSensor.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-[#6C7D76]">
                    No sensor readings recorded for this plot yet. You can log readings in the Pest & Sensor tab.
                  </div>
                )}
              </div>

              {/* Integrity & Safety Guard card */}
              <div className="bg-[#f0f7f3] rounded-2xl p-5 border border-[#d2e8db] text-xs">
                <div className="flex items-center gap-2 font-semibold text-[#003629] mb-2">
                  <ShieldCheck className="w-4 h-4 text-[#2fa874]" />
                  Safety Gate 2.1 Verification
                </div>
                <p className="text-[#436357] leading-relaxed">
                  The model verifies that your plot crop matches the detected symptom plant before any certified chemical options can be discussed. If symptoms mismatch or confidence is below 80%, the system locks chemical options and prepares an expert review recommendation.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
