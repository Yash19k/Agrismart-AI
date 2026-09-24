import React, { useEffect, useState } from 'react';
import {
  CheckSquare,
  ShieldCheck,
  AlertCircle,
  FileText,
  UserCheck,
  Star,
  CheckCircle2,
  XCircle,
  Clock,
  Menu,
  Info,
  ArrowRight
} from 'lucide-react';
import AppSidebar from '../components/common/AppSidebar';
import {
  getExpertReviews,
  getUnreviewedQueue,
  submitExpertReview,
} from '../api/expert';

export default function ExpertReviewPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' or 'history'
  const [queue, setQueue] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal review state
  const [selectedScan, setSelectedScan] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    status: 'confirmed',
    expert_crop: '',
    expert_disease: '',
    expert_severity: 'medium',
    is_healthy: false,
    confidence_rating: 5,
    diagnosis_notes: '',
    action_plan: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'queue') {
        const q = await getUnreviewedQueue();
        setQueue(q);
      } else {
        const h = await getExpertReviews();
        setHistory(h);
      }
    } catch (err) {
      console.error('Failed to load expert review data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReview = (scan) => {
    setSelectedScan(scan);
    setReviewForm({
      status: 'confirmed',
      expert_crop: scan.crop_name,
      expert_disease: scan.predicted_disease,
      expert_severity: scan.severity || 'medium',
      is_healthy: scan.is_healthy,
      confidence_rating: 5,
      diagnosis_notes: '',
      action_plan: 'Implement registered protective fungicide or bio-agent immediately. Follow label pre-harvest intervals.',
    });
  };

  const handleStatusChange = (newStatus) => {
    setReviewForm((prev) => ({
      ...prev,
      status: newStatus,
      is_healthy: newStatus === 'confirmed' ? selectedScan.is_healthy : prev.is_healthy,
    }));
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!selectedScan) return;

    try {
      setSubmitting(true);
      await submitExpertReview({
        scan: selectedScan.scan_id,
        status: reviewForm.status,
        expert_crop: reviewForm.expert_crop,
        expert_disease: reviewForm.expert_disease,
        expert_severity: reviewForm.expert_severity,
        is_healthy: reviewForm.is_healthy,
        confidence_rating: reviewForm.confidence_rating,
        diagnosis_notes: reviewForm.diagnosis_notes,
        action_plan: reviewForm.action_plan,
      });

      setSubmitSuccess('Review logged successfully & dispatched to retraining dataset!');
      setTimeout(() => {
        setSubmitSuccess('');
        setSelectedScan(null);
        loadData();
      }, 1200);
    } catch (err) {
      console.error('Failed to submit review:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAF8] text-gray-800">
      <AppSidebar activeItem="expert" mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

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
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-gray-900 leading-none">
                  Agronomist Expert Validation
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                  Human-in-the-Loop
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                KVK & DAO verification queue — audits ConvNeXt-Tiny predictions and generates ground truth
              </p>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex p-1 bg-gray-100 rounded-xl">
            <button
              onClick={() => setActiveTab('queue')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'queue'
                  ? 'bg-white text-gray-900 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Pending Verification ({queue.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'history'
                  ? 'bg-white text-gray-900 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Verified Log
            </button>
          </div>
        </header>

        <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
          {/* Provenance Banner */}
          <div className="p-3.5 rounded-2xl bg-purple-50/80 border border-purple-200/70 text-purple-900 text-xs flex items-center gap-2.5">
            <Info className="w-4 h-4 text-purple-600 flex-shrink-0" />
            <span>
              <strong>Scientific Provenance:</strong> The AI model's prediction is preserved as an immutable baseline.
              Expert corrections do not overwrite model inference; instead, they establish official ground truth for retraining.
            </span>
          </div>

          {activeTab === 'queue' ? (
            /* Queue Grid */
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">
                Awaiting Clinical Evaluation ({queue.length})
              </h3>

              {loading ? (
                <div className="p-12 text-center text-gray-400 text-xs">Loading queue…</div>
              ) : queue.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-2xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  <h4 className="font-extrabold text-gray-900">Queue is Clear!</h4>
                  <p className="text-xs text-gray-400 mt-1">All current disease scans have been validated by an agronomist.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {queue.map((item) => (
                    <div
                      key={item.scan_id}
                      className="bg-white rounded-2xl border border-gray-100 p-4 shadow-2xs flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-extrabold text-gray-900">{item.farm_name}</span>
                          {item.priority === 'urgent' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200 flex items-center gap-1">
                              <span>🚨 Urgent Priority</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400">{item.created_at}</span>
                          )}
                        </div>

                        <div className="h-36 rounded-xl bg-gray-100 overflow-hidden relative border border-gray-100">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt="Scan"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                              Specimen Photo
                            </div>
                          )}
                          <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-white font-bold text-[10px] backdrop-blur-xs">
                            {item.crop_name}
                          </span>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-3 space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Model Prediction:</span>
                            <span className="font-bold text-gray-800">{item.predicted_disease}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">AI Confidence:</span>
                            <span className="font-mono font-bold text-emerald-700">
                              {item.confidence_percent}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Severity:</span>
                            <span className="capitalize font-semibold text-gray-700">
                              {item.severity}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenReview(item)}
                        className="mt-4 w-full py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Perform Expert Review</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* History Table */
            <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                  Verified Audit Log ({history.length})
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-400 font-bold uppercase text-[10px] border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3">Scan / Farm</th>
                      <th className="px-4 py-3">Original AI Class</th>
                      <th className="px-4 py-3">Validation Status</th>
                      <th className="px-4 py-3">Expert Diagnosis</th>
                      <th className="px-4 py-3">Agronomist Notes</th>
                      <th className="px-4 py-3">Verified Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {history.map((rev) => (
                      <tr key={rev.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-semibold text-gray-900">
                          #{rev.scan} ({rev.farm_name || 'Parcel'})
                        </td>
                        <td className="px-4 py-3 text-gray-600 font-mono text-[11px]">
                          {rev.ai_predicted_class} ({Math.round(rev.ai_confidence * 100)}%)
                        </td>
                        <td className="px-4 py-3">
                          {rev.status === 'confirmed' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Confirmed
                            </span>
                          ) : rev.status === 'corrected' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Corrected Diagnosis
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">
                              {rev.status}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-bold text-gray-900">
                          {rev.expert_crop} — {rev.expert_disease}
                        </td>
                        <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                          {rev.diagnosis_notes || 'Confirmed morphology.'}
                        </td>
                        <td className="px-4 py-3 text-gray-400">
                          {new Date(rev.reviewed_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Clinical Review Modal */}
        {selectedScan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-base font-black text-gray-900">Clinical Agronomy Verification</h3>
                <button
                  onClick={() => setSelectedScan(null)}
                  className="text-gray-400 hover:text-gray-600 font-bold"
                >
                  ✕
                </button>
              </div>

              {submitSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                  {submitSuccess}
                </div>
              )}

              {/* Immutable AI Snapshot Strip */}
              <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200 text-xs space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Immutable AI Prediction Baseline
                </span>
                <div className="flex justify-between font-mono font-semibold text-gray-700">
                  <span>Inference: {selectedScan.predicted_disease}</span>
                  <span>Confidence: {selectedScan.confidence_percent}</span>
                </div>
              </div>

              <form onSubmit={handleSubmitReview} className="space-y-4 text-xs">
                {/* Decision Radio */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1.5">Expert Verification Decision</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleStatusChange('confirmed')}
                      className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                        reviewForm.status === 'confirmed'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      ✓ Confirm AI
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange('corrected')}
                      className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                        reviewForm.status === 'corrected'
                          ? 'border-amber-600 bg-amber-50 text-amber-800'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      ✎ Correct Diagnosis
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange('rejected')}
                      className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                        reviewForm.status === 'rejected'
                          ? 'border-red-600 bg-red-50 text-red-800'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      ✕ Unusable Image
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Validated Crop</label>
                    <input
                      type="text"
                      value={reviewForm.expert_crop}
                      onChange={(e) => setReviewForm({ ...reviewForm, expert_crop: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-purple-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Validated Pathogen / Diagnosis</label>
                    <input
                      type="text"
                      value={reviewForm.expert_disease}
                      onChange={(e) => setReviewForm({ ...reviewForm, expert_disease: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-purple-600"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Severity Rating</label>
                    <select
                      value={reviewForm.expert_severity}
                      onChange={(e) => setReviewForm({ ...reviewForm, expert_severity: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-purple-600"
                    >
                      <option value="none">None (Healthy)</option>
                      <option value="low">Low (Early lesion)</option>
                      <option value="medium">Moderate Spread</option>
                      <option value="high">Severe / Critical</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Expert Confidence (1-5)</label>
                    <select
                      value={reviewForm.confidence_rating}
                      onChange={(e) => setReviewForm({ ...reviewForm, confidence_rating: Number(e.target.value) })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-purple-600"
                    >
                      <option value="5">5 - Definitive Clinical Diagnosis</option>
                      <option value="4">4 - High Confidence</option>
                      <option value="3">3 - Moderate Confidence</option>
                      <option value="2">2 - Probable</option>
                      <option value="1">1 - Uncertain / Needs Lab Test</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Differential Diagnosis Notes (Morphological Features)
                  </label>
                  <textarea
                    rows="2"
                    value={reviewForm.diagnosis_notes}
                    onChange={(e) => setReviewForm({ ...reviewForm, diagnosis_notes: e.target.value })}
                    placeholder="e.g. Distinct concentric rings and target-spot pattern confirms Alternaria solani; no water-soaking observed."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-normal focus:outline-none focus:border-purple-600"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Remedial Action Plan</label>
                  <textarea
                    rows="2"
                    value={reviewForm.action_plan}
                    onChange={(e) => setReviewForm({ ...reviewForm, action_plan: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-normal focus:outline-none focus:border-purple-600"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedScan(null)}
                    className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold shadow-xs transition-all cursor-pointer"
                  >
                    {submitting ? 'Submitting...' : 'Commit Verification'}
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
