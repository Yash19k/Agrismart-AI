import React, { useEffect, useState } from 'react';
import {
  PhoneCall,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Filter,
  Send,
  Building,
  Menu,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import AppSidebar from '../components/common/AppSidebar';
import { useAuth } from '../context/AuthContext';
import { getReferrals, updateReferral, createReferral } from '../api/referrals';
import { getFarms } from '../api/farms';

export default function ReferralPage() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [referrals, setReferrals] = useState([]);
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedReferral, setSelectedReferral] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const isStaff = user?.role === 'expert' || user?.role === 'officer';

  useEffect(() => {
    loadData();
  }, [filterStatus]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterStatus) params.status = filterStatus;
      const data = await getReferrals(params);
      setReferrals(data.results || data || []);

      const fData = await getFarms();
      setFarms(fData.results || fData || []);
    } catch (err) {
      console.error('Failed to load referrals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFarmerRequest = async (refId) => {
    try {
      setUpdating(true);
      const updated = await updateReferral(refId, { status: 'requested' });
      setReferrals(referrals.map(r => r.id === refId ? updated : r));
    } catch (err) {
      console.error('Failed to update referral status:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleStaffResolve = async (newStatus) => {
    if (!selectedReferral) return;
    try {
      setUpdating(true);
      const updated = await updateReferral(selectedReferral.id, {
        status: newStatus,
        notes: resolutionNotes
      });
      setReferrals(referrals.map(r => r.id === selectedReferral.id ? updated : r));
      setSelectedReferral(null);
      setResolutionNotes('');
    } catch (err) {
      console.error('Failed to resolve referral:', err);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Completed</span>;
      case 'requested':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Requested by Farmer</span>;
      case 'declined':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">Declined</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">System Recommended</span>;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F7F8F3] text-[#16352D]">
      <AppSidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-[#DCE8DF] flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg text-[#6C7D76] hover:bg-[#F7F8F3]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <PhoneCall className="w-6 h-6 text-[#2fa874]" />
              <h1 className="font-editorial text-xl font-bold text-[#003629]">
                Stage 6 · Agricultural Extension & KVK Referrals
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#6C7D76]" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-[#DCE8DF] text-xs bg-white font-medium"
            >
              <option value="">All Statuses</option>
              <option value="recommended">Recommended</option>
              <option value="requested">Requested</option>
              <option value="completed">Completed</option>
              <option value="declined">Declined</option>
            </select>
          </div>
        </header>

        <main className="flex-1 p-6 max-w-5xl w-full mx-auto space-y-6">
          {/* Static Directory Notice */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
            <div>
              <span className="font-bold">Directory Disclaimer:</span> Krishi Vigyan Kendra (KVK) and laboratory contacts are provided from a curated demonstration directory. Verify phone numbers and official schedules with your local Taluka/District extension officer before visiting.
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center">
              <div className="w-8 h-8 border-3 border-[#2fa874] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-[#6C7D76]">Loading referral cases...</p>
            </div>
          ) : referrals.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-[#DCE8DF] shadow-xs">
              <Building className="w-10 h-10 text-[#a3b8ad] mx-auto mb-3" />
              <h3 className="font-editorial text-lg font-bold text-[#003629] mb-1">
                No Referrals Found
              </h3>
              <p className="text-xs text-[#6C7D76] max-w-md mx-auto">
                Referrals are automatically recommended when leaf scans detect critical pathogen pressure or uncertain diagnoses that require on-ground agronomist examination.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {referrals.map((refItem) => {
                const kvk = refItem.directory_entry || {};
                return (
                  <div
                    key={refItem.id}
                    className="bg-white rounded-2xl p-5 border border-[#DCE8DF] shadow-xs hover:border-[#b4d6c1] transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-[#F7F8F3]">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-[#003629]">
                            {refItem.farm_name || 'Farm Plot'}
                          </h4>
                          {getStatusBadge(refItem.status)}
                        </div>
                        <span className="text-[11px] text-[#6C7D76] block mt-0.5">
                          Type: <strong className="capitalize">{refItem.type}</strong> · Created: {new Date(refItem.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div>
                        {user?.role === 'farmer' && refItem.status === 'recommended' && (
                          <button
                            onClick={() => handleFarmerRequest(refItem.id)}
                            disabled={updating}
                            className="px-4 py-2 rounded-xl bg-[#1b4d3e] hover:bg-[#133a2f] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            Request KVK Support
                          </button>
                        )}

                        {isStaff && (refItem.status === 'requested' || refItem.status === 'recommended') && (
                          <button
                            onClick={() => {
                              setSelectedReferral(refItem);
                              setResolutionNotes(refItem.notes || '');
                            }}
                            className="px-4 py-2 rounded-xl bg-[#003629] hover:bg-[#00261d] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            Review & Resolve
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-[#6C7D76] font-semibold block mb-1">Referral Reason:</span>
                        <p className="text-[#16352D] bg-[#F7F8F3] p-2.5 rounded-xl">
                          {refItem.reason}
                        </p>
                      </div>

                      <div>
                        <span className="text-[#6C7D76] font-semibold block mb-1">Assigned Extension Contact:</span>
                        <div className="bg-[#fafdfb] border border-[#DCE8DF] p-2.5 rounded-xl">
                          <p className="font-bold text-[#003629]">{kvk.name || 'Regional KVK Center'}</p>
                          <p className="text-[#436357] mt-0.5">District: {kvk.district || 'Gujarat Sector'}</p>
                          <p className="text-[#436357]">Helpline: {kvk.contact || '1800-180-1551 (Kisan Call Center)'}</p>
                          <span className="text-[10px] text-[#718b7f] italic block mt-1">
                            Demo/static directory, verify contact before use.
                          </span>
                        </div>
                      </div>
                    </div>

                    {refItem.notes && (
                      <div className="mt-3 pt-3 border-t border-[#F7F8F3] text-xs">
                        <span className="text-[#6C7D76] font-semibold">Staff Notes: </span>
                        <span className="text-[#16352D]">{refItem.notes}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Staff Resolution Modal */}
          {selectedReferral && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#DCE8DF]">
                <h3 className="font-editorial text-lg font-bold text-[#003629] mb-2">
                  Resolve Referral #{selectedReferral.id}
                </h3>
                <p className="text-xs text-[#6C7D76] mb-4">
                  For plot: <strong>{selectedReferral.farm_name}</strong>
                </p>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-[#16352D] mb-1">Agronomist Resolution Notes</label>
                    <textarea
                      rows={3}
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="e.g. Conducted laboratory spore wash; confirmed early blight threshold. Advised certified bio-agent spray."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE8DF] text-xs focus:outline-none focus:border-[#2fa874]"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedReferral(null)}
                      className="px-4 py-2 rounded-xl border border-[#DCE8DF] text-[#6C7D76] font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => handleStaffResolve('declined')}
                      className="px-4 py-2 rounded-xl bg-red-100 text-red-700 hover:bg-red-200 font-semibold"
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => handleStaffResolve('completed')}
                      className="px-4 py-2 rounded-xl bg-[#1b4d3e] hover:bg-[#133a2f] text-white font-semibold"
                    >
                      Mark Completed
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
