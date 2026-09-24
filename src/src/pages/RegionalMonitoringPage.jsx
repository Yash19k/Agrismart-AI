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
  Layers,
  Send,
  Radio,
  X,
  RefreshCw,
  Bell,
  Clock,
  Sparkles
} from 'lucide-react';
import AppSidebar from '../components/common/AppSidebar';
import { getOfficerDashboard } from '../api/dashboard';
import { dispatchHotspotAdvisory, getHotspotsMap, getRegionalSummary } from '../api/hotspots';
import { getPestSummary } from '../api/pests';

export default function RegionalMonitoringPage() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Dispatch advisory modal state
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [advisoryMessage, setAdvisoryMessage] = useState('');
  const [dispatching, setDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState(null);

  useEffect(() => {
    loadRegionalData();
  }, []);

  const loadRegionalData = async () => {
    try {
      setLoading(true);
      setError(null);
      // Attempt unified officer dashboard endpoint first
      const data = await getOfficerDashboard();
      setDashboardData(data);
    } catch (err) {
      console.warn('Failed to load officer dashboard, falling back to aggregate endpoints:', err);
      try {
        const [reg, pSum, mapData] = await Promise.all([
          getRegionalSummary().catch(() => null),
          getPestSummary().catch(() => null),
          getHotspotsMap(30).catch(() => ({ clusters: [] })),
        ]);
        setDashboardData({
          officer: { name: 'Agriculture Officer', assigned_region: 'Regional Command' },
          hotspot_clusters: mapData?.clusters || [],
          expert_review_backlog: { total_pending: 0, urgent: 0, normal: 0 },
          pest_pressure: {
            total_observations: pSum?.total_observations || 0,
            action_required: pSum?.action_required_count || 0,
            alert: pSum?.alert_count || 0,
            top_pests: [],
          },
          followup_coverage: {
            total: 0,
            completed: 0,
            scheduled: 0,
            overdue: 0,
            completion_rate_percent: 0,
          },
          trend_30_days: [],
          region_stats: {
            total_farms: reg?.total_farms_monitored || 0,
            total_acreage: reg?.total_acreage_monitored || 0,
          },
        });
      } catch (fallbackErr) {
        setError('Failed to load regional surveillance data. Please check network connection.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadRegionalData();
  };

  const handleOpenDispatch = (cluster) => {
    setSelectedCluster(cluster);
    setAdvisoryMessage(
      `URGENT ADVISORY: Disease/pest flare identified in ${cluster.zone_name}. Inspect ${
        (cluster.affected_crops || []).join('/') || 'crops'
      } immediately and initiate preventive IPM sanitation.`
    );
    setDispatchResult(null);
    setDispatchModalOpen(true);
  };

  const handleSendDispatch = async (e) => {
    e.preventDefault();
    if (!selectedCluster || !advisoryMessage.trim()) return;

    try {
      setDispatching(true);
      const res = await dispatchHotspotAdvisory(selectedCluster.id, advisoryMessage.trim());
      setDispatchResult({
        success: true,
        message: `Successfully broadcasted advisory to ${res.farmers_notified || 0} registered farmer(s) in ${res.zone_name}.`,
      });
      setTimeout(() => {
        setDispatchModalOpen(false);
        setDispatchResult(null);
      }, 2500);
    } catch (err) {
      setDispatchResult({
        success: false,
        message: err.response?.data?.detail || 'Failed to dispatch advisory. Please try again.',
      });
    } finally {
      setDispatching(false);
    }
  };

  const officer = dashboardData?.officer || {};
  const clusters = dashboardData?.hotspot_clusters || [];
  const backlog = dashboardData?.expert_review_backlog || { total_pending: 0, urgent: 0, normal: 0 };
  const pestPressure = dashboardData?.pest_pressure || { total_observations: 0, action_required: 0, alert: 0, top_pests: [] };
  const followupCoverage = dashboardData?.followup_coverage || { total: 0, completed: 0, scheduled: 0, overdue: 0, completion_rate_percent: 0 };
  const regionStats = dashboardData?.region_stats || { total_farms: 0, total_acreage: 0 };
  const trend = dashboardData?.trend_30_days || [];

  // Calculate max incidents for sparkline scaling
  const maxTrend = Math.max(...trend.map(t => t.total || 0), 1);

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
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-red-100 text-red-800 border border-red-200">
                  DAO Officer Command
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                District-level epidemic containment, agronomist audit backlog &amp; advisory broadcast
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              title="Refresh Surveillance Data"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-700' : ''}`} />
            </button>
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
          {/* Officer Region Assignment Banner */}
          <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-[#143d30] text-white p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20">
                <MapPin className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-bold text-emerald-300 tracking-wider">
                    Surveillance Jurisdiction
                  </span>
                  <span className="text-[10px] bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 px-2 py-0.2 rounded-full font-mono">
                    Live Geoscope
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-black tracking-tight mt-0.5">
                  {officer.assigned_region || 'Gujarat / Central Zone'}
                </h2>
                <p className="text-xs text-emerald-100/70 mt-0.5">
                  Commanding Officer: <strong className="text-white">{officer.name || 'Regional Officer'}</strong> · Scoped to active district parcels
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => navigate('/expert')}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold transition-all text-white flex items-center gap-1.5 cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5 text-purple-300" />
                <span>Audit Queue ({backlog.total_pending})</span>
              </button>
              <button
                onClick={() => navigate('/feedback')}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold transition-all text-white flex items-center gap-1.5 cursor-pointer"
              >
                <Database className="w-3.5 h-3.5 text-teal-300" />
                <span>Model Dataset</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 5 Core Surveillance KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* 1. Monitored Acreage */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Surveillance Acreage
                </span>
                <div className="text-2xl font-black text-gray-900 mt-1">
                  {regionStats.total_acreage} ac
                </div>
              </div>
              <div className="text-[11px] text-gray-500 mt-2 font-medium">
                {regionStats.total_farms} registered parcels
              </div>
            </div>

            {/* 2. Outbreak Hotspots */}
            <div className="bg-white p-4 rounded-2xl border border-red-100 shadow-2xs flex flex-col justify-between bg-red-50/20">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">
                    Outbreak Clusters
                  </span>
                  <Flame className="w-3.5 h-3.5 text-red-500" />
                </div>
                <div className="text-2xl font-black text-red-600 mt-1">
                  {clusters.length}
                </div>
              </div>
              <div className="text-[11px] text-red-600 font-semibold mt-2">
                {clusters.filter(c => c.severity === 'critical').length} Critical Tier · 25km radius
              </div>
            </div>

            {/* 3. Expert Review Backlog */}
            <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-2xs flex flex-col justify-between bg-purple-50/20">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                    Agronomist Backlog
                  </span>
                  <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                </div>
                <div className="text-2xl font-black text-purple-900 mt-1">
                  {backlog.total_pending}
                </div>
              </div>
              <div className="text-[11px] text-purple-700 font-semibold mt-2">
                <span className="text-red-600 font-bold">{backlog.urgent} urgent</span> · {backlog.normal} standard
              </div>
            </div>

            {/* 4. Follow-up Coverage */}
            <div className="bg-white p-4 rounded-2xl border border-teal-100 shadow-2xs flex flex-col justify-between bg-teal-50/20">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider">
                    Follow-Up Coverage
                  </span>
                  <CalendarCheck className="w-3.5 h-3.5 text-teal-600" />
                </div>
                <div className="text-2xl font-black text-teal-900 mt-1">
                  {followupCoverage.completion_rate_percent}%
                </div>
              </div>
              <div className="text-[11px] text-teal-800 font-medium mt-2">
                {followupCoverage.completed}/{followupCoverage.total} re-scans ({followupCoverage.overdue} overdue)
              </div>
            </div>

            {/* 5. Pest EIL Breaches */}
            <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-2xs flex flex-col justify-between bg-amber-50/20">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                    Pest EIL Thresholds
                  </span>
                  <Bug className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div className="text-2xl font-black text-amber-700 mt-1">
                  {pestPressure.action_required}
                </div>
              </div>
              <div className="text-[11px] text-amber-800 font-semibold mt-2">
                {pestPressure.alert} alerts · {pestPressure.total_observations} trap logs
              </div>
            </div>
          </div>

          {/* 30-Day Epidemiological Incident Trend Chart */}
          {trend.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-700" />
                    30-Day Regional Incident Trendline
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Daily aggregate disease reports &amp; pest threshold exceedances for predictive intervention planning
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                    <span className="text-gray-600">Disease Outbreaks</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-gray-600">Pest Thresholds</span>
                  </div>
                </div>
              </div>

              {/* Sparkline / Bar Graph */}
              <div className="pt-2">
                <div className="h-28 flex items-end gap-1 sm:gap-1.5 bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                  {trend.map((day, idx) => {
                    const diseaseHeight = Math.min(100, Math.round((day.disease_incidents / maxTrend) * 100));
                    const pestHeight = Math.min(100, Math.round((day.pest_incidents / maxTrend) * 100));
                    return (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col justify-end items-center h-full group relative cursor-pointer"
                      >
                        {/* Tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 bg-gray-900 text-white text-[10px] rounded px-2 py-1 pointer-events-none whitespace-nowrap z-30 shadow-md">
                          {day.date}: {day.disease_incidents} disease, {day.pest_incidents} pests
                        </div>
                        <div className="w-full flex gap-0.5 items-end justify-center">
                          <div
                            style={{ height: `${Math.max(diseaseHeight, 3)}%` }}
                            className="w-1.5 sm:w-2 bg-emerald-600 rounded-t-sm group-hover:bg-emerald-500 transition-all"
                          />
                          <div
                            style={{ height: `${Math.max(pestHeight, 3)}%` }}
                            className="w-1.5 sm:w-2 bg-amber-500 rounded-t-sm group-hover:bg-amber-400 transition-all"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 mt-1.5 px-2">
                  <span>30 Days Ago</span>
                  <span>15 Days Ago</span>
                  <span>Today</span>
                </div>
              </div>
            </div>
          )}

          {/* Quick Navigation to P0 Surveillance Modules */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              onClick={() => navigate('/pests')}
              className="p-3.5 rounded-2xl bg-white border border-gray-100 shadow-2xs hover:border-emerald-300 text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-gray-900 flex items-center gap-1.5">
                  <Bug className="w-4 h-4 text-emerald-600" />
                  Pest Trap Surveillance
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Trap logs, card images, species counts &amp; vector alert thresholds
              </p>
            </button>

            <button
              onClick={() => navigate('/expert')}
              className="p-3.5 rounded-2xl bg-white border border-gray-100 shadow-2xs hover:border-purple-300 text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-gray-900 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-purple-600" />
                  Agronomist Reviews
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Human-in-the-loop clinical audit queue ({backlog.total_pending} awaiting confirmation)
              </p>
            </button>

            <button
              onClick={() => navigate('/followups')}
              className="p-3.5 rounded-2xl bg-white border border-gray-100 shadow-2xs hover:border-teal-300 text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-gray-900 flex items-center gap-1.5">
                  <CalendarCheck className="w-4 h-4 text-teal-600" />
                  Surveillance Follow-Ups
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                5–7 day recheck outcomes, field recovery &amp; intervention efficacy
              </p>
            </button>

            <button
              onClick={() => navigate('/feedback')}
              className="p-3.5 rounded-2xl bg-white border border-gray-100 shadow-2xs hover:border-indigo-300 text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-gray-900 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-indigo-600" />
                  Retraining Dataset
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                70/15/15 PyTorch partition exports &amp; expert concordance telemetry
              </p>
            </button>
          </div>

          {/* Active Hotspot Zones Table with Dispatch Action */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <span>Regional Outbreak Clusters Under Surveillance</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-mono">
                    {clusters.length} active
                  </span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Haversine-grouped incident clusters. Dispatch broadcast advisories directly to affected farmers.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-400 font-bold uppercase text-[10px] border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3">Cluster Zone</th>
                    <th className="px-4 py-3">Surveillance Tier</th>
                    <th className="px-4 py-3">Incidents</th>
                    <th className="px-4 py-3">Parcels</th>
                    <th className="px-4 py-3">Threatened Crops</th>
                    <th className="px-4 py-3">Primary Threats</th>
                    <th className="px-4 py-3 text-right">Actions</th>
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
                          {(c.affected_crops || []).join(', ') || 'Various'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {(c.primary_threats || []).slice(0, 2).join(', ') || 'Mixed'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenDispatch(c)}
                              className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                              title="Broadcast warning alert to farmers in this cluster"
                            >
                              <Radio className="w-3 h-3 text-red-600" />
                              <span>Dispatch</span>
                            </button>
                            <button
                              onClick={() => navigate('/hotspots')}
                              className="px-2.5 py-1 rounded-lg text-emerald-700 font-bold hover:bg-emerald-50 transition-all cursor-pointer"
                            >
                              Map 📍
                            </button>
                          </div>
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

      {/* Dispatch Advisory Modal */}
      {dispatchModalOpen && selectedCluster && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center">
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-gray-900">
                    Dispatch Hotspot Advisory
                  </h3>
                  <p className="text-xs text-gray-500">
                    Broadcast immediate alert to farmers in {selectedCluster.zone_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDispatchModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Cluster Brief */}
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Target Outbreak Zone:</span>
                <span className="font-bold text-gray-900">{selectedCluster.zone_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Affected Crops:</span>
                <span className="font-semibold text-gray-800">{(selectedCluster.affected_crops || []).join(', ') || 'General'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Cluster Radius:</span>
                <span className="font-semibold text-gray-800">{selectedCluster.radius_km || 15} km</span>
              </div>
            </div>

            {dispatchResult && (
              <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                dispatchResult.success
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {dispatchResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                )}
                <span>{dispatchResult.message}</span>
              </div>
            )}

            <form onSubmit={handleSendDispatch} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Advisory Message Broadcast
                </label>
                <textarea
                  rows={4}
                  required
                  value={advisoryMessage}
                  onChange={(e) => setAdvisoryMessage(e.target.value)}
                  placeholder="Enter high-priority advisory instructions for registered farmers in this zone..."
                  className="w-full p-3 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  This advisory will trigger in-app bell alerts for all farmers with parcels located within the cluster perimeter.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setDispatchModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dispatching}
                  className="px-5 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{dispatching ? 'Broadcasting...' : 'Broadcast to Zone'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
