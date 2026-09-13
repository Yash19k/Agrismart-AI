import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle,
  Droplets,
  Info,
  Leaf,
  Loader2,
  Menu,
  RefreshCw,
  Sprout,
  TrendingUp,
  Waves,
} from 'lucide-react';
import AppHeader from '../components/common/AppHeader';
import AppSidebar from '../components/common/AppSidebar';
import { getFarms } from '../api/farms';
import { getWeather } from '../api/weather';

const RESOURCE_SCORES = {
  drip: 100,
  sprinkler: 80,
  manual: 60,
  none: 50,
  flood: 40,
};

const RESOURCE_LABELS = {
  drip: 'Drip irrigation',
  sprinkler: 'Sprinkler irrigation',
  manual: 'Manual watering',
  none: 'No irrigation system',
  flood: 'Flood irrigation',
};

const INITIAL_RESOURCE_INPUTS = {
  soilType: '',
  soilPh: '',
  waterVolume: '',
  waterPeriod: 'week',
  measurementSource: 'estimate',
  irrigationsPerWeek: '',
  minutesPerIrrigation: '',
  leakage: 'none',
  energyType: 'electricity',
  energyAmount: '',
  fertilizerKg: '',
  pesticideLiters: '',
  compostKg: '',
  mulch: 'no',
};

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function weightedAverage(parts) {
  const available = parts.filter(({ value }) => value != null);
  if (!available.length) return null;
  const totalWeight = available.reduce((sum, part) => sum + part.weight, 0);
  return available.reduce((sum, part) => sum + part.value * part.weight, 0) / totalWeight;
}

function moistureScore(moisture) {
  if (moisture == null) return null;
  if (moisture >= 25 && moisture <= 45) return 100;
  if (moisture < 25) return clamp(40 + (moisture - 10) * 4);
  return clamp(100 - (moisture - 45) * 2);
}

function et0Score(et0) {
  if (et0 == null) return null;
  if (et0 < 3) return 90;
  if (et0 < 5) return 75;
  if (et0 < 7) return 60;
  return 45;
}

function scoreSoilType(soilType) {
  return {
    loamy: 100,
    alluvial: 90,
    black: 85,
    clayey: 75,
    red: 70,
    sandy: 60,
  }[soilType] ?? null;
}

function scoreSoilPh(ph) {
  const value = Number(ph);
  if (!Number.isFinite(value) || value < 0 || value > 14) return null;
  if (value >= 6 && value <= 7.5) return 100;
  if (value >= 5.5 && value < 6 || value > 7.5 && value <= 8) return 80;
  return 50;
}

function scoreGrowingConditions(weather, inputs) {
  const current = weather?.current || {};
  const moisture = moistureScore(weather?.soil?.moisture_percent);
  const temperature = Number(current.temperature);
  const humidity = Number(current.humidity);
  const temperaturePart = Number.isFinite(temperature)
    ? (temperature >= 18 && temperature <= 32 ? 100 : temperature < 10 || temperature > 40 ? 35 : 70)
    : null;
  const humidityPart = Number.isFinite(humidity)
    ? (humidity >= 45 && humidity <= 75 ? 100 : humidity < 25 || humidity > 90 ? 40 : 70)
    : null;
  const soilTypePart = scoreSoilType(inputs.soilType);
  const soilPhPart = scoreSoilPh(inputs.soilPh);

  const score = weightedAverage([
    { value: moisture, weight: 0.3 },
    { value: temperaturePart, weight: 0.25 },
    { value: humidityPart, weight: 0.2 },
    { value: soilTypePart, weight: 0.15 },
    { value: soilPhPart, weight: 0.1 },
  ]);
  return score == null ? null : Math.round(score);
}

function calculateResourceScore(farm, weather, inputs) {
  const area = Number(farm?.farm_size);
  const et0 = Number(weather?.today?.et0);
  const water = Number(inputs.waterVolume);
  const hasWater = Number.isFinite(area) && area > 0 && Number.isFinite(et0) && et0 > 0 && water > 0;
  const weeklyWater = hasWater
    ? water * (inputs.waterPeriod === 'day' ? 7 : inputs.waterPeriod === 'irrigation' ? Number(inputs.irrigationsPerWeek) || 1 : 1)
    : null;
  const benchmark = hasWater ? et0 * 7 * area * 4046.86 * 0.7 : null;
  const waterScore = benchmark ? clamp(100 - Math.max(0, (weeklyWater / benchmark) - 1) * 100) : null;
  const frequency = Number(inputs.irrigationsPerWeek);
  const duration = Number(inputs.minutesPerIrrigation);
  const frequencyScore = frequency > 0 ? (frequency <= 4 ? 100 : frequency <= 6 ? 75 : 50) : null;
  const durationScore = duration > 0 ? (duration <= 60 ? 100 : duration <= 120 ? 75 : 50) : null;
  const leakageScore = { none: 100, minor: 60, significant: 20 }[inputs.leakage];
  const practiceScore = weightedAverage([
    { value: frequencyScore, weight: 0.4 },
    { value: durationScore, weight: 0.3 },
    { value: leakageScore, weight: 0.3 },
  ]);
  const energy = Number(inputs.energyAmount);
  const energyPer1000L = weeklyWater && energy > 0 ? energy / (weeklyWater / 1000) : null;
  const energyScore = energyPer1000L == null ? null : inputs.energyType === 'electricity'
    ? (energyPer1000L <= 0.5 ? 100 : energyPer1000L <= 1 ? 80 : energyPer1000L <= 2 ? 60 : 40)
    : (energyPer1000L <= 0.1 ? 100 : energyPer1000L <= 0.25 ? 80 : energyPer1000L <= 0.5 ? 60 : 40);
  const fertilizer = Number(inputs.fertilizerKg);
  const pesticide = Number(inputs.pesticideLiters);
  const compost = Number(inputs.compostKg);
  const hasInputPractice = inputs.mulch === 'yes' || inputs.compostKg !== '' || inputs.fertilizerKg !== '' || inputs.pesticideLiters !== '';
  const chemicalScore = hasInputPractice ? weightedAverage([
    { value: Number.isFinite(fertilizer) && fertilizer >= 0 && area > 0 ? clamp(100 - (fertilizer / area) * 10) : null, weight: 0.45 },
    { value: Number.isFinite(pesticide) && pesticide >= 0 && area > 0 ? clamp(100 - (pesticide / area) * 30) : null, weight: 0.35 },
    { value: inputs.mulch === 'yes' || compost > 0 ? 100 : null, weight: 0.2 },
  ]) : null;
  const methodBaseline = RESOURCE_SCORES[farm?.irrigation_type] ?? 50;
  const score = weightedAverage([
    { value: waterScore, weight: 0.5 },
    { value: practiceScore, weight: 0.2 },
    { value: energyScore, weight: 0.2 },
    { value: chemicalScore, weight: 0.1 },
  ]) ?? methodBaseline;
  return { score: Math.round(score * 10) / 10, waterScore, benchmark, weeklyWater, energyScore, practiceScore, chemicalScore, hasInputs: Boolean(inputs.waterVolume || inputs.irrigationsPerWeek || inputs.energyAmount || inputs.fertilizerKg || inputs.pesticideLiters || inputs.compostKg || inputs.mulch === 'yes') };
}

function calculateScore(farm, weather, inputs) {
  const moisture = moistureScore(weather?.soil?.moisture_percent);
  const water = weightedAverage([
    { value: moisture, weight: 0.6 },
    { value: et0Score(weather?.today?.et0), weight: 0.4 },
  ]);
  const resourceDetails = calculateResourceScore(farm, weather, inputs);
  const resource = resourceDetails.score;
  const crop = scoreGrowingConditions(weather, inputs);
  const score = weightedAverage([
    { value: water, weight: 0.4 },
    { value: resource, weight: 0.3 },
    { value: crop, weight: 0.3 },
  ]);
  return {
    score: score == null ? null : Math.round(score * 10) / 10,
    water: water == null ? null : Math.round(water * 10) / 10,
    resource,
    crop,
    moisture,
    et0: weather?.today?.et0 ?? null,
    rainfall: weather?.today?.rainfall ?? null,
    rainProbability: weather?.today?.rain_probability ?? null,
    provider: weather?.meta?.provider || 'Weather API',
    fetchedAt: weather?.meta?.fetched_at || null,
    resourceDetails,
  };
}

function scoreBand(score) {
  if (score >= 80) return { label: 'Strong foundation', color: 'text-emerald-700', bg: 'bg-emerald-50' };
  if (score >= 60) return { label: 'Room to improve', color: 'text-amber-700', bg: 'bg-amber-50' };
  return { label: 'Action recommended', color: 'text-red-700', bg: 'bg-red-50' };
}

function MetricCard({ icon: Icon, title, value, description, color }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-2xl font-black text-gray-900">{value == null ? '—' : `${Math.round(value)}/100`}</span>
      </div>
      <h3 className="mt-4 text-sm font-extrabold text-gray-900">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-gray-500">{description}</p>
    </div>
  );
}

export default function SustainabilityPage() {
  const navigate = useNavigate();
  const [farms, setFarms] = useState([]);
  const [farmId, setFarmId] = useState('');
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [resourceInputs, setResourceInputs] = useState(INITIAL_RESOURCE_INPUTS);
  const [submittedInputs, setSubmittedInputs] = useState(null);

  const farm = farms.find((item) => String(item.id) === String(farmId)) || farms[0];
  const result = useMemo(() => (farm && weather && submittedInputs ? calculateScore(farm, weather, submittedInputs) : null), [farm, weather, submittedInputs]);
  const band = result?.score != null ? scoreBand(result.score) : null;

  const loadData = async (selectedId = '') => {
    setLoading(true);
    setError('');
    setSubmittedInputs(null);
    try {
      const farmList = await getFarms();
      const nextFarms = Array.isArray(farmList) ? farmList : farmList?.results || [];
      setFarms(nextFarms);
      const nextFarm = nextFarms.find((item) => String(item.id) === String(selectedId)) || nextFarms[0];
      if (!nextFarm) return;
      setFarmId(String(nextFarm.id));
      // Open-Meteo supplies ET0 and modeled soil moisture used by this page.
      // Existing dashboard/weather callers keep their configured provider.
      setWeather(await getWeather(nextFarm.id, 'open-meteo'));
    } catch (err) {
      setError(err.friendlyMessage || 'Unable to load sustainability data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const suggestions = result ? [
    result.water != null && result.water < 80 ? 'Use shorter, targeted irrigation cycles and check the latest soil moisture before watering.' : 'Check the latest soil moisture and ET₀ before watering to avoid unnecessary irrigation.',
    result.resource < 80 ? `Reduce resource use by checking leaks and reviewing ${RESOURCE_LABELS[farm?.irrigation_type] || 'the current irrigation method'}.` : 'Maintain the current efficient irrigation method and inspect lines for leaks.',
    result.crop != null && result.crop < 80 ? 'Review crop conditions daily; use shade, mulch, or ventilation when temperature or humidity moves outside the target range.' : 'Continue monitoring temperature, humidity, and soil moisture through the growing cycle.',
  ] : [];

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
            <button type="button" onClick={() => loadData(farm?.id)} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100" aria-label="Refresh score">
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-7">
          <div className="max-w-6xl mx-auto space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">No disease model used</p>
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">How sustainable is your farm today?</h1>
                <p className="text-sm text-gray-500 mt-2 max-w-2xl">An indicative score from water efficiency, resource use, and crop growing conditions. Every rule is published below so the result is reproducible.</p>
              </div>
              {farms.length > 0 && (
                <label className="text-xs font-bold text-gray-600">
                  Select farm
                  <select value={farm?.id || ''} onChange={(event) => loadData(event.target.value)} className="mt-1 block min-w-56 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold text-gray-700">
                    {farms.map((item) => <option key={item.id} value={item.id}>{item.farm_name || item.name} — {item.location_name || item.location_display || 'saved coordinates'}</option>)}
                  </select>
                </label>
              )}
            </div>

            {loading && <div className="bg-white rounded-2xl p-10 text-center border border-gray-100"><Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto" /><p className="text-sm text-gray-500 mt-3">Reading your farm conditions…</p></div>}
            {!loading && error && <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-sm text-red-700">{error}</div>}
            {!loading && !error && !farm && <div className="bg-white rounded-2xl p-8 text-center border border-gray-100"><Sprout className="w-8 h-8 text-emerald-600 mx-auto" /><h2 className="font-extrabold text-gray-900 mt-3">Add a farm to calculate your score</h2><button onClick={() => navigate('/dashboard')} className="mt-4 text-sm font-bold text-emerald-700 inline-flex items-center gap-1">Go to dashboard <ArrowRight className="w-4 h-4" /></button></div>}
            {!loading && !error && farm && (
              <>
                <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div><h2 className="font-extrabold text-gray-900">Resource-use inputs</h2><p className="text-xs text-gray-500 mt-1">Enter your latest weekly figures. The score updates immediately; flow rate is not required.</p></div>
                    <Waves className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                    <label className="text-xs font-bold text-gray-700">Soil type
                      <select value={resourceInputs.soilType} onChange={(event) => setResourceInputs((current) => ({ ...current, soilType: event.target.value }))} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium">
                        <option value="">Select soil type</option><option value="loamy">Loamy</option><option value="alluvial">Alluvial</option><option value="black">Black</option><option value="clayey">Clayey</option><option value="red">Red</option><option value="sandy">Sandy</option>
                      </select>
                    </label>
                    <label className="text-xs font-bold text-gray-700">Soil pH
                      <input type="number" min="0" max="14" step="0.1" placeholder="e.g. 6.5" value={resourceInputs.soilPh} onChange={(event) => setResourceInputs((current) => ({ ...current, soilPh: event.target.value }))} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium focus:border-emerald-400 focus:outline-none" />
                    </label>
                    {[
                      ['waterVolume', 'Water used', 'number', 'Liters'],
                      ['irrigationsPerWeek', 'Irrigations / week', 'number', 'Count'],
                      ['minutesPerIrrigation', 'Minutes / irrigation', 'number', 'Minutes'],
                      ['energyAmount', 'Pump energy / week', 'number', 'kWh or liters'],
                      ['fertilizerKg', 'Fertilizer / week', 'number', 'kg'],
                      ['pesticideLiters', 'Pesticide / week', 'number', 'liters'],
                      ['compostKg', 'Compost / week', 'number', 'kg'],
                    ].map(([key, label, type, placeholder]) => (
                      <label key={key} className="text-xs font-bold text-gray-700">{label}
                        <input type={type} min="0" step="any" placeholder={placeholder} value={resourceInputs[key]} onChange={(event) => setResourceInputs((current) => ({ ...current, [key]: event.target.value }))} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium focus:border-emerald-400 focus:outline-none" />
                      </label>
                    ))}
                    <label className="text-xs font-bold text-gray-700">Water period
                      <select value={resourceInputs.waterPeriod} onChange={(event) => setResourceInputs((current) => ({ ...current, waterPeriod: event.target.value }))} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium">
                        <option value="week">Per week</option><option value="day">Per day</option><option value="irrigation">Per irrigation</option>
                      </select>
                    </label>
                    <label className="text-xs font-bold text-gray-700">Reading source
                      <select value={resourceInputs.measurementSource} onChange={(event) => setResourceInputs((current) => ({ ...current, measurementSource: event.target.value }))} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium">
                        <option value="meter">Meter reading</option><option value="estimate">Personal estimate</option>
                      </select>
                    </label>
                    <label className="text-xs font-bold text-gray-700">Pump energy unit
                      <select value={resourceInputs.energyType} onChange={(event) => setResourceInputs((current) => ({ ...current, energyType: event.target.value }))} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium">
                        <option value="electricity">Electricity (kWh)</option><option value="fuel">Fuel (liters)</option>
                      </select>
                    </label>
                    <label className="text-xs font-bold text-gray-700">Leakage
                      <select value={resourceInputs.leakage} onChange={(event) => setResourceInputs((current) => ({ ...current, leakage: event.target.value }))} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium">
                        <option value="none">No visible leakage</option><option value="minor">Minor leakage</option><option value="significant">Significant leakage</option>
                      </select>
                    </label>
                    <label className="text-xs font-bold text-gray-700">Compost or mulch
                      <select value={resourceInputs.mulch} onChange={(event) => setResourceInputs((current) => ({ ...current, mulch: event.target.value }))} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium">
                        <option value="no">Neither</option><option value="yes">Used this week</option>
                      </select>
                    </label>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3">
                    <p className="text-[11px] text-gray-500">Water score uses your volume against an ET₀-and-area benchmark. Energy is scored per 1,000 liters. Blank fields are excluded, not treated as zero.</p>
                    <button type="button" onClick={() => setSubmittedInputs({ ...resourceInputs })} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-800 transition-colors whitespace-nowrap">
                      <TrendingUp className="w-4 h-4" /> Calculate score
                    </button>
                  </div>
                </section>
              </>
            )}
            {!loading && !error && result && (
              <>
                <section className="grid lg:grid-cols-[1.1fr_2fr] gap-5">
                  <div className="bg-emerald-900 rounded-2xl p-6 text-white shadow-sm">
                    <div className="flex items-start justify-between"><div><p className="text-xs font-bold text-emerald-200 uppercase tracking-wider">Overall score</p><p className="text-6xl font-black mt-3">{result.score}</p><p className="text-sm text-emerald-200 mt-1">out of 100</p></div><Leaf className="w-9 h-9 text-emerald-300" /></div>
                    {band ? <div className={`inline-flex mt-6 px-3 py-1.5 rounded-full text-xs font-extrabold ${band.bg} ${band.color}`}>{band.label}</div> : <div className="inline-flex mt-6 px-3 py-1.5 rounded-full text-xs font-extrabold bg-amber-50 text-amber-700">Insufficient live data</div>}
                    <p className="text-xs text-emerald-200 mt-5 leading-5">Based on {farm.farm_name || farm.name}, located at {farm.location_name || farm.location_display || 'the farm coordinates'}, {farm.crop || 'your crop'}, and the latest weather reading.</p>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <MetricCard icon={Droplets} title="Water conditions" value={result.water} description="Live soil moisture (60%) + live ET₀ demand (40%)." color="bg-blue-50 text-blue-600" />
                    <MetricCard icon={Waves} title="Resource use" value={result.resource} description={result.resourceDetails.hasInputs ? 'Calculated from your water, energy, practice, and input data.' : 'Enter resource inputs above to replace the method baseline.'} color="bg-amber-50 text-amber-600" />
                    <MetricCard icon={Sprout} title="Crop health proxy" value={result.crop} description="Growing conditions only; not disease detection." color="bg-emerald-50 text-emerald-600" />
                  </div>
                </section>

                <section className="grid lg:grid-cols-2 gap-5">
                  <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <div className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-600" /><h2 className="font-extrabold text-gray-900">Improvement suggestions</h2></div>
                    <div className="mt-4 space-y-3">{suggestions.map((suggestion) => <div key={suggestion} className="flex gap-3 text-sm text-gray-600"><CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" /><span>{suggestion}</span></div>)}</div>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <div className="flex items-center gap-2"><Info className="w-5 h-5 text-emerald-600" /><h2 className="font-extrabold text-gray-900">Current inputs</h2></div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-500">Soil moisture</p><p className="font-black text-gray-900 mt-1">{result.moisture == null ? 'Unavailable' : `${result.moisture}%`}</p></div><div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-500">ET₀ demand</p><p className="font-black text-gray-900 mt-1">{result.et0 == null ? 'Unavailable' : `${result.et0} mm`}</p></div><div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-500">Irrigation</p><p className="font-black text-gray-900 mt-1 capitalize">{farm.irrigation_type || 'Not set'}</p></div><div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-500">Crop</p><p className="font-black text-gray-900 mt-1">{farm.crop || 'Not set'}</p></div></div>
                  </div>
                </section>

                <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <h2 className="font-extrabold text-gray-900">Published formula and rules</h2>
                  <p className="text-sm text-gray-600 mt-2">Final = (Water × 0.40) + (Resource × 0.30) + (Crop conditions × 0.30). Each component is on a 0–100 scale and is rounded to one decimal only at the final component calculation.</p>
                  <div className="mt-4 grid md:grid-cols-3 gap-4 text-xs text-gray-600 leading-5">
                    <p><strong className="text-gray-900">Water:</strong> live moisture score × 0.60 + live ET₀ score × 0.40. Moisture is 100 from 25–45%; outside that range it declines linearly. ET₀ is 90 below 3 mm, 75 for 3–5, 60 for 5–7, and 45 above 7. If one live value is unavailable, the remaining value is reweighted instead of using a guessed 70.</p>
                    <p><strong className="text-gray-900">Resource:</strong> when inputs are provided: water efficiency 50% + irrigation practice 20% + pump energy 20% + fertilizer/pesticide/compost/mulch 10%. Water is compared with ET₀ × 7 × farm acres × 4,046.86 liters × 0.70. If no resource inputs are entered, the irrigation-method baseline is used.</p>
                    <p><strong className="text-gray-900">Crop conditions:</strong> live moisture × 0.30 + live temperature × 0.25 + live humidity × 0.20 + soil type × 0.15 + soil pH × 0.10. Soil type and pH are general suitability indicators; missing readings are excluded and available readings are reweighted. This remains a growing-conditions proxy and never uses disease scans or an ML model.</p>
                  </div>
                </section>
                <p className="text-xs text-gray-500">Live source: {result.provider} · fetched {result.fetchedAt ? new Date(result.fetchedAt).toLocaleString() : 'time unavailable'} · location: {farm.location_name || farm.location_display || 'farm coordinates'}. Weather values are API estimates, not on-site sensor measurements.</p>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
