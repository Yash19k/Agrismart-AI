import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Flame,
  Bug,
  MapPin,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  Database,
  UserCheck,
  CalendarCheck,
  Menu,
  Download,
  CheckCircle2,
  Layers
} from 'lucide-react';
import AppSidebar from '../components/common/AppSidebar';
import { getRegionalSummary, getHotspotsMap } from '../api/hotspots';
import { getPestSummary } from '../api/pests';

export default function RegionalMonitoringPage() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [summary, setSummary] = useState(null);
  const [pestSummary, setPestSummary] = useState(null);
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRegionalData();
  }, []);

  const loadRegionalData = async () => {
    try {
      setLoading(true);
      const reg = await getRegionalSummary();
      setSummary(reg);

      const pSum = await getPestSummary();
      setPestSummary(pSum);

      const mapData = await getHotspotsMap(30);
      setClusters(mapData.clusters || []);
    } catch (err) {
      console.error('Failed to load regional monitoring data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAF8] text-gray-800">
      <AppSidebar activeItem="regional" mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

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
            <div className="w-9 h-9 rounded-xl bg-red-100 text-red-800 flex items-center justify-center">
              <Activity className="w-5 h-5 text-red-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-gray-900 leading-none">
                  Regional Agricultural Surveillance
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-red-100 text-red-800 border border-red-200">
                  DAO Command
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                District-level epidemic forecasting, cluster containment & advisory broadcast
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate('/hotspots')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-xs transition-all cursor-pointer"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Open Hotspot Map</span>
            </button>
          </div>
        </header>

        <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Total Monitored Acreage
              </span>
              <div className="text-2xl font-black text-gray-900 mt-1">
                {summary ? `${summary.total_acreage_monitored} ac` : '0 ac'}
              </div>
              <div className="text-[11px] text-gray-500 mt-1">
                Across {summary?.total_farms_monitored || 0} registered parcels
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
              <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider">
                Active Outbreak Hotspots
              </span>
              <div className="text-2xl font-black text-red-600 mt-1">
                {summary ? summary.active_hotspot_clusters : 0}
              </div>
              <div className="text-[11px] text-red-500 font-semibold mt-1">
                {summary?.critical_clusters_count || 0} Critical | {summary?.high_clusters_count || 0} High
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
              <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">
                EIL Pest Exceedances
              </span>
              <div className="text-2xl font-black text-amber-600 mt-1">
                {pestSummary ? pestSummary.action_required_count : 0}
              </div>
              <div className="text-[11px] text-amber-700 font-semibold mt-1">
                Economic threshold breaches
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                Dominant Pathogen Pressure
              </span>
              <div className="text-lg font-black text-gray-900 mt-1 truncate">
                {summary?.top_dominant_disease || 'None detected'}
              </div>
              <div className="text-[11px] text-gray-500 mt-1">
                Primary Vector: <strong>{summary?.top_pest_vector || 'None'}</strong>
              </div>
            </div>
          </div>

          {/* Quick Navigation to P0 Modules */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              onClick={() => navigate('/pests')}
              className="p-3.5 rounded-2xl bg-white border border-gray-100 shadow-2xs hover:border-emerald-300 text-left transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-gray-900 flex items-center gap-1.5">
                  <Bug className="w-4 h-4 text-emerald-600" />
                  Pest Trap Surveillance
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Trap logs, card images, species counts & vector alert thresholds
              </p>
            </button>

            <button
              onClick={() => navigate('/expert')}
              className="p-3.5 rounded-2xl bg-white border border-gray-100 shadow-2xs hover:border-purple-300 text-left transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-gray-900 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-purple-600" />
                  Agronomist Reviews
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Human-in-the-loop clinical audit queue & ground truth validation
              </p>
            </button>

            <button
              onClick={() => navigate('/followups')}
              className="p-3.5 rounded-2xl bg-white border border-gray-100 shadow-2xs hover:border-teal-300 text-left transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-gray-900 flex items-center gap-1.5">
                  <CalendarCheck className="w-4 h-4 text-teal-600" />
                  Recovery Tracking
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                5-7 day recheck outcomes, intervention efficacy & recovery %
              </p>
            </button>

            <button
              onClick={() => navigate('/feedback')}
              className="p-3.5 rounded-2xl bg-white border border-gray-100 shadow-2xs hover:border-indigo-300 text-left transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-gray-900 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-indigo-600" />
                  Retraining Dataset
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                70/15/15 PyTorch data loader exports & concordance telemetry
              </p>
            </button>
          </div>

          {/* Active Hotspot Zones Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                  Regional Outbreak Clusters Under Surveillance
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Clusters grouped via pure Python Haversine geodesic proximity (25 km radius)
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-400 font-bold uppercase text-[10px] border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3">Cluster Zone</th>
                    <th className="px-4 py-3">Surveillance Tier</th>
                    <th className="px-4 py-3">Incidents Count</th>
                    <th className="px-4 py-3">Parcels Affected</th>
                    <th className="px-4 py-3">Threatened Crops</th>
                    <th className="px-4 py-3">Primary Pathogens / Vectors</th>
                    <th className="px-4 py-3 text-right">Map View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {clusters.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-8 text-center text-gray-400">
                        No active clusters recorded in this surveillance cycle.
                      </td>
                    </tr>
                  ) : (
                    clusters.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-extrabold text-gray-900">
                          {c.zone_name}
                        </td>
                        <td className="px-4 py-3">
                          {c.severity === 'critical' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                              Critical Outbreak
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                              High Vigilance
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-bold text-gray-800">
                          {c.incident_count} reports
                        </td>
                        <td className="px-4 py-3 text-gray-600 font-semibold">
                          {c.affected_farms_count} farms
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {(c.affected_crops || []).join(', ')}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {(c.primary_threats || []).slice(0, 2).join(', ')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => navigate('/hotspots')}
                            className="px-2.5 py-1 rounded-lg text-emerald-700 font-bold hover:bg-emerald-50 transition-all cursor-pointer"
                          >
                            Inspect 📍
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
