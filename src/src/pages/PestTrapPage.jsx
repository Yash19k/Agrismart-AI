import React, { useEffect, useState } from 'react';
import {
  Bug,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Trash2,
  Info,
  Menu,
  Activity,
  Droplets,
  Thermometer,
  Gauge
} from 'lucide-react';
import AppSidebar from '../components/common/AppSidebar';
import { getFarms } from '../api/farms';
import {
  getPestObservations,
  createPestObservation,
  getPestSummary,
  deletePestObservation
} from '../api/pests';
import {
  getSensorReadings,
  createSensorReading,
  getLatestSensorReading
} from '../api/sensors';

export default function PestTrapPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pests'); // 'pests' | 'sensors'
  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  
  // Pest State
  const [observations, setObservations] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filterPest, setFilterPest] = useState('');
  const [filterThreshold, setFilterThreshold] = useState('');
  const [showAddPestModal, setShowAddPestModal] = useState(false);
  const [pestFormData, setPestFormData] = useState({
    farm: '',
    trap_type: 'sticky_yellow',
    pest_type: 'Whitefly',
    pest_count: '',
    notes: '',
    image: null,
  });

  // Sensor State
  const [sensorReadings, setSensorReadings] = useState([]);
  const [latestSensor, setLatestSensor] = useState(null);
  const [showAddSensorModal, setShowAddSensorModal] = useState(false);
  const [sensorFormData, setSensorFormData] = useState({
    farm: '',
    soil_moisture: '',
    temperature: '',
    humidity: '',
    ph: '',
    source: 'manual', // 'manual' | 'simulated'
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'pests') {
      loadObservations();
    } else {
      loadSensorData();
    }
  }, [selectedFarmId, activeTab, filterPest, filterThreshold]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const farmsRes = await getFarms();
      const farmList = farmsRes.results || farmsRes || [];
      setFarms(farmList);
      if (farmList.length > 0) {
        const firstId = farmList[0].id;
        setSelectedFarmId(firstId);
        setPestFormData(prev => ({ ...prev, farm: firstId }));
        setSensorFormData(prev => ({ ...prev, farm: firstId }));
      }
      const sum = await getPestSummary();
      setSummary(sum);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadObservations = async () => {
    try {
      const params = {};
      if (selectedFarmId) params.farm_id = selectedFarmId;
      if (filterPest) params.pest_type = filterPest;
      if (filterThreshold) params.threshold_level = filterThreshold;
      const data = await getPestObservations(params);
      setObservations(data);

      const sum = await getPestSummary(selectedFarmId || null);
      setSummary(sum);
    } catch (err) {
      console.error('Failed to load observations:', err);
    }
  };

  const loadSensorData = async () => {
    try {
      const params = {};
      if (selectedFarmId) {
        params.farm_id = selectedFarmId;
        const latest = await getLatestSensorReading(selectedFarmId);
        setLatestSensor(latest);
      } else {
        setLatestSensor(null);
      }
      const readings = await getSensorReadings(params);
      setSensorReadings(readings.results || readings || []);
    } catch (err) {
      console.error('Failed to load sensor readings:', err);
    }
  };

  const handlePestSubmit = async (e) => {
    e.preventDefault();
    if (!pestFormData.farm) {
      setFormError('Please select a farm parcel.');
      return;
    }
    if (pestFormData.pest_count === '' || isNaN(pestFormData.pest_count)) {
      setFormError('Please enter a valid pest count.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');
      const data = new FormData();
      data.append('farm', pestFormData.farm);
      data.append('trap_type', pestFormData.trap_type);
      data.append('pest_type', pestFormData.pest_type);
      data.append('pest_count', pestFormData.pest_count);
      if (pestFormData.notes) data.append('notes', pestFormData.notes);
      if (pestFormData.image) data.append('image', pestFormData.image);

      await createPestObservation(data);
      setShowAddPestModal(false);
      setPestFormData({
        farm: selectedFarmId || (farms[0]?.id || ''),
        trap_type: 'sticky_yellow',
        pest_type: 'Whitefly',
        pest_count: '',
        notes: '',
        image: null,
      });
      loadObservations();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to submit observation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSensorSubmit = async (e) => {
    e.preventDefault();
    if (!sensorFormData.farm) {
      setFormError('Please select a farm parcel.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');
      const payload = {
        farm: sensorFormData.farm,
        source: sensorFormData.source,
      };
      if (sensorFormData.soil_moisture !== '') payload.soil_moisture = parseFloat(sensorFormData.soil_moisture);
      if (sensorFormData.temperature !== '') payload.temperature = parseFloat(sensorFormData.temperature);
      if (sensorFormData.humidity !== '') payload.humidity = parseFloat(sensorFormData.humidity);
      if (sensorFormData.ph !== '') payload.ph = parseFloat(sensorFormData.ph);

      await createSensorReading(payload);
      setShowAddSensorModal(false);
      setSensorFormData({
        farm: selectedFarmId || (farms[0]?.id || ''),
        soil_moisture: '',
        temperature: '',
        humidity: '',
        ph: '',
        source: 'manual',
      });
      loadSensorData();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to record sensor reading.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePest = async (id) => {
    if (window.confirm('Delete this scouting observation record?')) {
      try {
        await deletePestObservation(id);
        loadObservations();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const getThresholdBadge = (level) => {
    switch (level) {
      case 'action_required':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
            <AlertTriangle className="w-3 h-3 text-red-500" />
            Action Required (EIL)
          </span>
        );
      case 'alert':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            Scouting Alert
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            Normal
          </span>
        );
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAF8] text-gray-800">
      <AppSidebar activeItem="pests" mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <main className="flex-1 overflow-y-auto flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-xs border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-1.5 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-50"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Bug className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-gray-900 leading-none">Pest & Sensor Surveillance</h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Stage 1b
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Manual field scouting observations & farm sensor telemetry (manual / simulated)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedFarmId}
              onChange={(e) => setSelectedFarmId(e.target.value)}
              className="text-xs font-semibold bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-700 focus:outline-none focus:border-emerald-600 shadow-2xs"
            >
              <option value="">All Monitored Plots</option>
              {farms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.farm_name} ({f.crop || 'Plot'})
                </option>
              ))}
            </select>

            {activeTab === 'pests' ? (
              <button
                onClick={() => {
                  setFormError('');
                  setShowAddPestModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-xs cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Record Scouting Count</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setFormError('');
                  setShowAddSensorModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-xs cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Log Sensor Reading</span>
              </button>
            )}
          </div>
        </header>

        <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
          {/* Navigation Tabs */}
          <div className="flex border-b border-gray-200 gap-4">
            <button
              onClick={() => setActiveTab('pests')}
              className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'pests'
                  ? 'border-emerald-700 text-emerald-800'
                  : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}
            >
              <Bug className="w-4 h-4" />
              <span>Pest Scouting Observations</span>
            </button>
            <button
              onClick={() => setActiveTab('sensors')}
              className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'sensors'
                  ? 'border-emerald-700 text-emerald-800'
                  : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Field Sensor Readings</span>
            </button>
          </div>

          {activeTab === 'pests' ? (
            <>
              {/* Disclaimer Banner */}
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/70 text-amber-900 text-xs flex items-center gap-2.5">
                <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>
                  <strong>Prototype Decision Support:</strong> Observations are manual scouting counts recorded from yellow/blue sticky traps or field plant counts. Threshold levels reflect Economic Injury Level (EIL) approximations. Confirm chemical treatment with local agricultural extension officers.
                </span>
              </div>

              {/* Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Scouting Records</div>
                  <div className="text-2xl font-black text-gray-900 mt-1">
                    {summary ? summary.total_observations : 0}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-1">Manual scouting logs</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Pests Counted</div>
                  <div className="text-2xl font-black text-emerald-800 mt-1">
                    {summary ? summary.total_pests_counted : 0}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-1">Insects identified on cards</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
                  <div className="text-[11px] font-bold text-red-500 uppercase tracking-wider">Action Required (EIL)</div>
                  <div className="text-2xl font-black text-red-600 mt-1">
                    {summary ? summary.action_required_count : 0}
                  </div>
                  <div className="text-[11px] text-red-500 font-semibold mt-1">Exceeding damage thresholds</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
                  <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Scouting Alerts</div>
                  <div className="text-2xl font-black text-amber-600 mt-1">
                    {summary ? summary.alert_count : 0}
                  </div>
                  <div className="text-[11px] text-amber-600 font-semibold mt-1">Increasing vector pressure</div>
                </div>
              </div>

              {/* Filters & Table Section */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-bold text-gray-700">Filter Scouting Records</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={filterPest}
                      onChange={(e) => setFilterPest(e.target.value)}
                      className="text-xs bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 font-medium text-gray-700"
                    >
                      <option value="">All Insect Species</option>
                      <option value="Whitefly">Whitefly</option>
                      <option value="Aphid">Aphid</option>
                      <option value="Thrips">Thrips</option>
                      <option value="Spider Mite">Spider Mite</option>
                      <option value="Fruit Fly">Fruit Fly</option>
                      <option value="Bollworm">Bollworm</option>
                    </select>

                    <select
                      value={filterThreshold}
                      onChange={(e) => setFilterThreshold(e.target.value)}
                      className="text-xs bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 font-medium text-gray-700"
                    >
                      <option value="">All Threshold Statuses</option>
                      <option value="normal">Normal</option>
                      <option value="alert">Alert</option>
                      <option value="action_required">Action Required</option>
                    </select>
                  </div>
                </div>

                {/* Observations Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50/75 border-b border-gray-100 text-gray-400 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="px-4 py-3">Source & Mode</th>
                        <th className="px-4 py-3">Parcel / Farm</th>
                        <th className="px-4 py-3">Trap Type</th>
                        <th className="px-4 py-3">Pest Vector</th>
                        <th className="px-4 py-3">Count</th>
                        <th className="px-4 py-3">Threshold Status</th>
                        <th className="px-4 py-3">Observed Date</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {observations.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="px-4 py-8 text-center text-gray-400">
                            No pest trap observations found. Click "Record Scouting Count" above to submit observations.
                          </td>
                        </tr>
                      ) : (
                        observations.map((obs) => (
                          <tr key={obs.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                Manual scouting observation
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-gray-900">
                              {obs.farm_name}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {obs.trap_type_display}
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-bold text-gray-800">{obs.pest_type}</span>
                            </td>
                            <td className="px-4 py-3 font-mono font-bold text-gray-900 text-sm">
                              {obs.pest_count}
                            </td>
                            <td className="px-4 py-3">
                              {getThresholdBadge(obs.threshold_level)}
                            </td>
                            <td className="px-4 py-3 text-gray-500">
                              {new Date(obs.observed_at).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => handleDeletePest(obs.id)}
                                className="p-1 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                                title="Delete Record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Sensor Tab Content */}
              <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200/70 text-blue-900 text-xs flex items-center gap-2.5">
                <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>
                  <strong>Field Sensor Telemetry (Stage 1b):</strong> Sensor data represents <em>Manual Entry</em> by farmers or <em>Simulated Sensor Feed</em> for demonstration and research. When fresh (&lt;24h), readings directly feed the Stage 2 Risk Engine.
                </span>
              </div>

              {/* Latest Sensor Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Soil Moisture</span>
                    <Droplets className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="text-2xl font-black text-gray-900 mt-2">
                    {latestSensor?.soil_moisture != null ? `${latestSensor.soil_moisture}%` : '--'}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1">
                    {latestSensor ? `Source: ${latestSensor.source_display}` : 'No active reading'}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Air Temperature</span>
                    <Thermometer className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-2xl font-black text-gray-900 mt-2">
                    {latestSensor?.temperature != null ? `${latestSensor.temperature}°C` : '--'}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1">
                    {latestSensor ? `Recorded: ${new Date(latestSensor.recorded_at).toLocaleTimeString()}` : 'No active reading'}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Canopy Humidity</span>
                    <Gauge className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-2xl font-black text-gray-900 mt-2">
                    {latestSensor?.humidity != null ? `${latestSensor.humidity}%` : '--'}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1">Relative canopy moisture</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Soil pH</span>
                    <Activity className="w-4 h-4 text-purple-500" />
                  </div>
                  <div className="text-2xl font-black text-gray-900 mt-2">
                    {latestSensor?.ph != null ? latestSensor.ph : '--'}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1">Soil acidity/alkalinity</div>
                </div>
              </div>

              {/* Sensor Readings Table */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-bold text-gray-700">Sensor Ingest Log</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    Showing latest readings across selected farm
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50/75 border-b border-gray-100 text-gray-400 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="px-4 py-3">Source Tag</th>
                        <th className="px-4 py-3">Parcel</th>
                        <th className="px-4 py-3">Soil Moisture</th>
                        <th className="px-4 py-3">Temperature</th>
                        <th className="px-4 py-3">Humidity</th>
                        <th className="px-4 py-3">Soil pH</th>
                        <th className="px-4 py-3">Recorded At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sensorReadings.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="px-4 py-8 text-center text-gray-400">
                            No sensor readings recorded yet. Click "Log Sensor Reading" or run <code>simulate_sensor_feed</code>.
                          </td>
                        </tr>
                      ) : (
                        sensorReadings.map((r) => (
                          <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  r.source === 'simulated'
                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                {r.source_display}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-gray-900">{r.farm_name}</td>
                            <td className="px-4 py-3 font-mono">{r.soil_moisture != null ? `${r.soil_moisture}%` : '--'}</td>
                            <td className="px-4 py-3 font-mono">{r.temperature != null ? `${r.temperature}°C` : '--'}</td>
                            <td className="px-4 py-3 font-mono">{r.humidity != null ? `${r.humidity}%` : '--'}</td>
                            <td className="px-4 py-3 font-mono">{r.ph != null ? r.ph : '--'}</td>
                            <td className="px-4 py-3 text-gray-500">
                              {new Date(r.recorded_at).toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Add Pest Observation Modal */}
        {showAddPestModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-base font-black text-gray-900">Record Field Scouting Observation</h3>
                <button
                  onClick={() => setShowAddPestModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                  {formError}
                </div>
              )}

              <form onSubmit={handlePestSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Target Farm Parcel</label>
                  <select
                    value={pestFormData.farm}
                    onChange={(e) => setPestFormData({ ...pestFormData, farm: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-600"
                    required
                  >
                    <option value="">Select parcel</option>
                    {farms.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.farm_name} ({f.crop})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Trap Mechanism</label>
                    <select
                      value={pestFormData.trap_type}
                      onChange={(e) => setPestFormData({ ...pestFormData, trap_type: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-600"
                    >
                      <option value="sticky_yellow">Yellow Sticky Trap</option>
                      <option value="sticky_blue">Blue Sticky Trap</option>
                      <option value="pheromone">Pheromone Lure Trap</option>
                      <option value="light">Light Trap</option>
                      <option value="manual">Manual Scouting</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Pest Vector Species</label>
                    <select
                      value={pestFormData.pest_type}
                      onChange={(e) => setPestFormData({ ...pestFormData, pest_type: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-600"
                    >
                      <option value="Whitefly">Whitefly</option>
                      <option value="Aphid">Aphid</option>
                      <option value="Thrips">Thrips</option>
                      <option value="Spider Mite">Spider Mite</option>
                      <option value="Fruit Fly">Fruit Fly</option>
                      <option value="Bollworm">Bollworm / Pod Borer</option>
                      <option value="Other">Other Species</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Observed Count (Insects per card/plot)</label>
                  <input
                    type="number"
                    min="0"
                    value={pestFormData.pest_count}
                    onChange={(e) => setPestFormData({ ...pestFormData, pest_count: e.target.value })}
                    placeholder="e.g. 24"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-600"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Field Scouting Notes</label>
                  <textarea
                    rows="2"
                    value={pestFormData.notes}
                    onChange={(e) => setPestFormData({ ...pestFormData, notes: e.target.value })}
                    placeholder="e.g. High counts along southern boundary adjacent to weed patches..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-normal focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddPestModal(false)}
                    className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-xs transition-all cursor-pointer"
                  >
                    {submitting ? 'Saving...' : 'Save Observation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Sensor Reading Modal */}
        {showAddSensorModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-base font-black text-gray-900">Log Field Sensor Reading</h3>
                <button
                  onClick={() => setShowAddSensorModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSensorSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Target Farm Parcel</label>
                  <select
                    value={sensorFormData.farm}
                    onChange={(e) => setSensorFormData({ ...sensorFormData, farm: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-600"
                    required
                  >
                    <option value="">Select parcel</option>
                    {farms.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.farm_name} ({f.crop})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Data Source Tag</label>
                  <select
                    value={sensorFormData.source}
                    onChange={(e) => setSensorFormData({ ...sensorFormData, source: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-600"
                  >
                    <option value="manual">Manual Entry (Handheld field probe)</option>
                    <option value="simulated">Simulated Sensor Feed (Demo / Test)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Soil Moisture (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={sensorFormData.soil_moisture}
                      onChange={(e) => setSensorFormData({ ...sensorFormData, soil_moisture: e.target.value })}
                      placeholder="e.g. 45.5"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Air Temperature (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={sensorFormData.temperature}
                      onChange={(e) => setSensorFormData({ ...sensorFormData, temperature: e.target.value })}
                      placeholder="e.g. 28.4"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Relative Humidity (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={sensorFormData.humidity}
                      onChange={(e) => setSensorFormData({ ...sensorFormData, humidity: e.target.value })}
                      placeholder="e.g. 78.0"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Soil pH (0 - 14)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="14"
                      value={sensorFormData.ph}
                      onChange={(e) => setSensorFormData({ ...sensorFormData, ph: e.target.value })}
                      placeholder="e.g. 6.8"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddSensorModal(false)}
                    className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-xs transition-all cursor-pointer"
                  >
                    {submitting ? 'Saving...' : 'Save Sensor Reading'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
