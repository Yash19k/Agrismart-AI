import React, { useEffect, useState } from 'react';
import {
  Database,
  Download,
  Share2,
  CheckCircle2,
  XCircle,
  BarChart3,
  Layers,
  Sparkles,
  Menu,
  Info,
  Filter,
  RefreshCw
} from 'lucide-react';
import AppSidebar from '../components/common/AppSidebar';
import {
  getFeedbackRecords,
  getFeedbackStats,
  triggerAutoPartition,
  updateFeedbackSplit,
  getExportCsvUrl,
  getExportJsonUrl,
} from '../api/feedback';

export default function FeedbackDatasetPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [splitFilter, setSplitFilter] = useState('');
  const [partitioning, setPartitioning] = useState(false);

  useEffect(() => {
    loadData();
  }, [splitFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (splitFilter) params.split = splitFilter;
      const data = await getFeedbackRecords(params);
      setRecords(data);

      const st = await getFeedbackStats();
      setStats(st);
    } catch (err) {
      console.error('Failed to load feedback dataset:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePartition = async () => {
    try {
      setPartitioning(true);
      await triggerAutoPartition();
      await loadData();
    } catch (err) {
      console.error('Partitioning failed:', err);
    } finally {
      setPartitioning(false);
    }
  };

  const handleSplitChange = async (id, newSplit) => {
    try {
      await updateFeedbackSplit(id, newSplit);
      loadData();
    } catch (err) {
      console.error('Failed to update split:', err);
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAF8] text-gray-800">
      <AppSidebar activeItem="feedback" mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

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
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-gray-900 leading-none">
                  Model Retraining Feedback Dataset
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  ML Curation
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Continuous learning pipeline — Agronomist verified ground-truth exports for ConvNeXt-Tiny fine-tuning
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePartition}
              disabled={partitioning}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 shadow-2xs transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>{partitioning ? 'Splitting...' : 'Auto Split (70/15/15)'}</span>
            </button>

            <a
              href={getExportCsvUrl()}
              download
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 shadow-xs transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </a>

            <a
              href={getExportJsonUrl()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-800 bg-indigo-100 hover:bg-indigo-200 shadow-2xs transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>JSON</span>
            </a>
          </div>
        </header>

        <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
          {/* Info Callout */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/70 text-indigo-950 text-xs flex items-center gap-2.5">
            <Info className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <span>
              <strong>Continuous Model Refinement:</strong> When experts confirm or correct diagnosis in the validation portal,
              specimens are indexed here with immutable inference provenance and agronomist ground truth. Exports conform directly to standard PyTorch / Torchvision folder and CSV data loaders.
            </span>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Total Curated Samples
              </span>
              <div className="text-2xl font-black text-gray-900 mt-1">
                {stats ? stats.total_samples : 0}
              </div>
              <div className="text-[11px] text-gray-500 mt-1">Indexed field specimens</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                Model Baseline Accuracy
              </span>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {stats ? `${stats.model_accuracy_vs_ground_truth}%` : '0%'}
              </div>
              <div className="text-[11px] text-gray-500 mt-1">
                Concordance with agronomists ({stats?.concordant_count || 0} / {stats?.total_samples || 0})
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
              <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">
                Training Split (70%)
              </span>
              <div className="text-2xl font-black text-amber-700 mt-1">
                {stats ? stats.splits?.train : 0}
              </div>
              <div className="text-[11px] text-gray-500 mt-1">Samples marked for training</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
              <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">
                Val & Test Splits (30%)
              </span>
              <div className="text-2xl font-black text-purple-700 mt-1">
                {(stats?.splits?.val || 0) + (stats?.splits?.test || 0)}
              </div>
              <div className="text-[11px] text-gray-500 mt-1">
                Val: {stats?.splits?.val || 0} | Test: {stats?.splits?.test || 0}
              </div>
            </div>
          </div>

          {/* Dataset Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                Dataset Manifest Samples ({records.length})
              </h3>

              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-gray-400" />
                <select
                  value={splitFilter}
                  onChange={(e) => setSplitFilter(e.target.value)}
                  className="text-xs bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 font-medium text-gray-700"
                >
                  <option value="">All Dataset Splits</option>
                  <option value="train">Train Set</option>
                  <option value="val">Validation Set</option>
                  <option value="test">Test Set</option>
                  <option value="unassigned">Unassigned</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-400 font-bold uppercase text-[10px] border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3">Scan ID</th>
                    <th className="px-4 py-3">AI Prediction (ConvNeXt)</th>
                    <th className="px-4 py-3">Expert Ground Truth</th>
                    <th className="px-4 py-3">Concordance</th>
                    <th className="px-4 py-3">Dataset Split</th>
                    <th className="px-4 py-3">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-mono font-bold text-gray-900">
                        #{r.scan}
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-[11px]">
                        {r.original_prediction} ({Math.round((r.original_confidence || 0) * 100)}%)
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-900">
                        {r.ground_truth_label}
                      </td>
                      <td className="px-4 py-3">
                        {r.is_concordant ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Match
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-bold">
                            <XCircle className="w-3.5 h-3.5" />
                            Corrected
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={r.dataset_split}
                          onChange={(e) => handleSplitChange(r.id, e.target.value)}
                          className={`text-[11px] font-bold rounded-lg px-2 py-1 border cursor-pointer ${
                            r.dataset_split === 'train'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : r.dataset_split === 'val'
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : r.dataset_split === 'test'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-gray-100 text-gray-700 border-gray-200'
                          }`}
                        >
                          <option value="train">Train (70%)</option>
                          <option value="val">Val (15%)</option>
                          <option value="test">Test (15%)</option>
                          <option value="unassigned">Unassigned</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-[11px]">
                        {r.source_display}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
