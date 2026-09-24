import React, { useEffect, useState } from 'react';
import {
  Bug,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Trash2,
  Upload,
  Info,
  Layers,
  Search,
  Eye,
  Menu
} from 'lucide-react';
import AppSidebar from '../components/common/AppSidebar';
import { getFarms } from '../api/farms';
import {
  getPestObservations,
  createPestObservation,
  getPestSummary,
  deletePestObservation
} from '../api/pests';

export default function PestTrapPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [observations, setObservations] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Filter state
  const [filterPest, setFilterPest] = useState('');
  const [filterThreshold, setFilterThreshold] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    farm: '',
    trap_type: 'sticky_yellow',
    pest_type: 'Whitefly',
    pest_count: '',
    notes: '',
    image: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadObservations();
  }, [selectedFarmId, filterPest, filterThreshold]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const farmsRes = await getFarms();
      const farmList = farmsRes.results || farmsRes || [];
      setFarms(farmList);
      if (farmList.length > 0) {
        setSelectedFarmId(farmList[0].id);
        setFormData(prev => ({ ...prev, farm: farmList[0].id }));
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.farm) {
      setFormError('Please select a farm.');
      return;
    }
    if (formData.pest_count === '' || isNaN(formData.pest_count)) {
      setFormError('Please enter a valid pest count.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');
      const data = new FormData();
      data.append('farm', formData.farm);
      data.append('trap_type', formData.trap_type);
      data.append('pest_type', formData.pest_type);
      data.append('pest_count', parseInt(formData.pest_count, 10));
      data.append('notes', formData.notes);
      if (formData.image) {
        data.append('image', formData.image);
      }

      await createPestObservation(data);
      setShowAddModal(false);
      setFormData({
        farm: selectedFarmId || (farms[0]?.id || ''),
        trap_type: 'sticky_yellow',
        pest_type: 'Whitefly',
        pest_count: '',
        notes: '',
        image: null,
      });
      loadObservations();
    } catch (err) {
      console.error(err);
      setFormError(err.response?.data?.detail || 'Failed to submit observation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this pest observation record?')) {
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
                <h1 className="text-lg font-black text-gray-900 leading-none">Pest Trap & Vector Surveillance</h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                  IPM Module
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Sticky card counts, pheromone lure thresholds & vector pressure monitoring
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

            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-xs cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Record Trap Count</span>
            </button>
          </div>
        </header>

        <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
          {/* Disclaimer Banner */}
          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/70 text-amber-900 text-xs flex items-center gap-2.5">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              <strong>Prototype Decision Support:</strong> Pest counts are user-verified counts from field sticky traps or leaf counts.
              Threshold levels reflect Economic Injury Level (EIL) approximations. Confirm chemical treatment with local agricultural extension offices.
            </span>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Trap Records</div>
              <div className="text-2xl font-black text-gray-900 mt-1">
                {summary ? summary.total_observations : 0}
              </div>
              <div className="text-[11px] text-gray-500 mt-1">Across registered parcels</div>
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
                <span className="text-xs font-bold text-gray-700">Filter Records</span>
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
                      <td colSpan="7" className="px-4 py-8 text-center text-gray-400">
                        No pest trap observations found. Click "Record Trap Count" above to submit observations.
                      </td>
                    </tr>
                  ) : (
                    observations.map((obs) => (
                      <tr key={obs.id} className="hover:bg-gray-50/50 transition-colors">
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
                            onClick={() => handleDelete(obs.id)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
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

          {/* Reference Knowledge Card */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-2xs">
            <h3 className="text-sm font-extrabold text-gray-900 mb-2">Standard IPM Trap Thresholds (per 10×10 cm card)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <span className="font-bold text-gray-800">Whitefly (Yellow Trap)</span>
                <p className="text-gray-500 mt-1">Alert: &ge;15 adults | Action: &ge;30 adults. Prime vector for Tomato Yellow Leaf Curl Virus (TYLCV).</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <span className="font-bold text-gray-800">Thrips (Blue Trap)</span>
                <p className="text-gray-500 mt-1">Alert: &ge;10 adults | Action: &ge;25 adults. Vector for Groundnut Bud Necrosis & Tomato Spotted Wilt.</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <span className="font-bold text-gray-800">Bollworm (Pheromone Lure)</span>
                <p className="text-gray-500 mt-1">Alert: &ge;5 moths/night | Action: &ge;10 moths for 3 consecutive nights. Trigger bio-agent release.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Add Observation Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-base font-black text-gray-900">Record Field Trap Observation</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Target Farm Parcel</label>
                  <select
                    value={formData.farm}
                    onChange={(e) => setFormData({ ...formData, farm: e.target.value })}
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
                      value={formData.trap_type}
                      onChange={(e) => setFormData({ ...formData, trap_type: e.target.value })}
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
                      value={formData.pest_type}
                      onChange={(e) => setFormData({ ...formData, pest_type: e.target.value })}
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
                    value={formData.pest_count}
                    onChange={(e) => setFormData({ ...formData, pest_count: e.target.value })}
                    placeholder="e.g. 24"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-600"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Card Image (Optional Verification Photo)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFormData({ ...formData, image: e.target.files[0] })}
                    className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Field Scouting Notes</label>
                  <textarea
                    rows="2"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="e.g. High counts along southern boundary adjacent to weed patches..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-normal focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-xs transition-all"
                  >
                    {submitting ? 'Saving...' : 'Save Observation'}
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
