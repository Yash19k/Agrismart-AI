import React, { useEffect, useState } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Activity,
  Plus,
  Menu,
  ShieldCheck,
  Check,
  FileCheck
} from 'lucide-react';
import AppSidebar from '../components/common/AppSidebar';
import { getFollowUps, completeFollowUp } from '../api/followups';
import { getFarms } from '../api/farms';

export default function FollowUpPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');

  // Complete follow-up modal
  const [selectedFollowUp, setSelectedFollowUp] = useState(null);
  const [completeForm, setCompleteForm] = useState({
    outcome: 'resolved',
    intervention_applied: '',
    recovery_percentage: 85,
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadFollowUps();
  }, [filterStatus]);

  const loadFollowUps = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterStatus) params.status = filterStatus;
      const data = await getFollowUps(params);
      setFollowups(data);
    } catch (err) {
      console.error('Failed to load follow-ups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenComplete = (fu) => {
    setSelectedFollowUp(fu);
    setCompleteForm({
      outcome: 'resolved',
      intervention_applied: 'Applied recommended bio-fungicide spray and improved furrow drainage.',
      recovery_percentage: 85,
      notes: 'New foliage is emerging clean with no secondary lesion spread.',
    });
  };

  const handleSaveComplete = async (e) => {
    e.preventDefault();
    if (!selectedFollowUp) return;

    try {
      setSubmitting(true);
      await completeFollowUp(selectedFollowUp.id, completeForm);
      setSelectedFollowUp(null);
      loadFollowUps();
    } catch (err) {
      console.error('Failed to complete follow-up:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Completed
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
            <AlertCircle className="w-3 h-3 text-red-500" />
            Overdue Recheck
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-500" />
            Scheduled
          </span>
        );
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAF8] text-gray-800">
      <AppSidebar activeItem="followups" mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

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
            <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-gray-900 leading-none">
                  Follow-up & Treatment Recheck
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                  Recovery Tracking
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Post-treatment 5-7 day verification schedules and crop canopy regeneration logging
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs font-semibold bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-700 focus:outline-none focus:border-emerald-600 shadow-2xs"
            >
              <option value="">All Follow-up Reminders</option>
              <option value="scheduled">Scheduled Only</option>
              <option value="completed">Completed Only</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </header>

        <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
          {/* Summary Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Total Follow-ups Logged
              </span>
              <div className="text-2xl font-black text-gray-900 mt-1">{followups.length}</div>
              <div className="text-[11px] text-gray-500 mt-1">Treatment validation schedules</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                Completed & Verified
              </span>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {followups.filter((f) => f.status === 'completed').length}
              </div>
              <div className="text-[11px] text-gray-500 mt-1">Canopy regeneration audited</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
              <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                Pending Recheck
              </span>
              <div className="text-2xl font-black text-blue-700 mt-1">
                {followups.filter((f) => f.status === 'scheduled').length}
              </div>
              <div className="text-[11px] text-gray-500 mt-1">Awaiting 5-day field scouting</div>
            </div>
          </div>

          {/* Follow-up Cards */}
          <div className="space-y-4">
            {loading ? (
              <div className="p-12 text-center text-gray-400 text-xs">Loading follow-up tracking…</div>
            ) : followups.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-2xs">
                <CalendarCheck className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <h4 className="font-extrabold text-gray-900">No Follow-ups Found</h4>
                <p className="text-xs text-gray-400 mt-1">Follow-ups are automatically scheduled when disease is detected.</p>
              </div>
            ) : (
              followups.map((fu) => {
                const isCompleted = fu.status === 'completed';

                return (
                  <div
                    key={fu.id}
                    className="bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs space-y-4 hover:border-gray-200 transition-all"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-50 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-gray-900">{fu.farm_name}</h4>
                          {getStatusBadge(fu.status)}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Scheduled Recheck Date: <strong>{fu.scheduled_date}</strong>
                        </p>
                      </div>

                      {!isCompleted && (
                        <button
                          onClick={() => handleOpenComplete(fu)}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Complete Recheck</span>
                        </button>
                      )}
                    </div>

                    {/* Timeline Progression */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Initial Scan */}
                      <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100 text-xs space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">
                          Day 0: Initial Diagnosis
                        </span>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-800">
                            {fu.original_crop} — {fu.original_disease}
                          </span>
                          <span className="capitalize font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
                            {fu.original_severity} severity
                          </span>
                        </div>
                        <p className="text-gray-500 text-[11px]">
                          Initial symptomatic scan triggering remedial prescription.
                        </p>
                      </div>

                      {/* Follow-up Recheck */}
                      <div className="bg-emerald-50/50 rounded-xl p-3.5 border border-emerald-100 text-xs space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">
                          Day 5-7: Recheck Outcome
                        </span>
                        {isCompleted ? (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-emerald-900">
                                Outcome: {fu.outcome_display}
                              </span>
                              <span className="font-mono font-bold text-emerald-700">
                                {fu.recovery_percentage}% Recovery
                              </span>
                            </div>
                            <div className="w-full bg-emerald-200/60 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-emerald-600 h-1.5 rounded-full"
                                style={{ width: `${fu.recovery_percentage || 85}%` }}
                              />
                            </div>
                            <p className="text-gray-600 text-[11px] italic">
                              "{fu.intervention_applied || 'Bio-treatment applied.'}"
                            </p>
                          </>
                        ) : (
                          <div className="text-gray-400 py-3 text-center text-xs">
                            Awaiting farmer re-inspection after treatment application window.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Complete Modal */}
        {selectedFollowUp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-base font-black text-gray-900">
                  Log Field Recheck Results
                </h3>
                <button
                  onClick={() => setSelectedFollowUp(null)}
                  className="text-gray-400 hover:text-gray-600 font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveComplete} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Recovery Outcome</label>
                  <select
                    value={completeForm.outcome}
                    onChange={(e) => setCompleteForm({ ...completeForm, outcome: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-600"
                  >
                    <option value="resolved">Completely Resolved (Healthy Regeneration)</option>
                    <option value="improved">Improved (Lesion Spread Halted)</option>
                    <option value="unchanged">Unchanged (No Visible Response)</option>
                    <option value="worsened">Worsened (Pathogen Expanding)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Intervention Applied by Farmer
                  </label>
                  <textarea
                    rows="2"
                    value={completeForm.intervention_applied}
                    onChange={(e) =>
                      setCompleteForm({ ...completeForm, intervention_applied: e.target.value })
                    }
                    placeholder="e.g. Applied Trichoderma bio-spray and thinned lower canopy foliage..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-normal focus:outline-none focus:border-emerald-600"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Estimated Canopy Recovery Percentage (0 - 100%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={completeForm.recovery_percentage}
                    onChange={(e) =>
                      setCompleteForm({
                        ...completeForm,
                        recovery_percentage: Number(e.target.value),
                      })
                    }
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Scouting Notes</label>
                  <textarea
                    rows="2"
                    value={completeForm.notes}
                    onChange={(e) => setCompleteForm({ ...completeForm, notes: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-normal focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedFollowUp(null)}
                    className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-xs transition-all cursor-pointer"
                  >
                    {submitting ? 'Saving...' : 'Commit Recheck'}
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
