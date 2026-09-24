import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Droplets,
  Thermometer,
  ShieldAlert,
  Info,
  Layers,
  Menu,
  FileText,
  Calendar,
  Compass
} from 'lucide-react';
import AppSidebar from '../components/common/AppSidebar';
import { useAuth } from '../context/AuthContext';
import { getFarms } from '../api/farms';
import { getFarmRisk } from '../api/risk';
import DiseaseForecast from '../components/disease/DiseaseForecast';

export default function RiskForecastPage() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [riskData, setRiskData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadInitialFarms();
  }, []);

  useEffect(() => {
    if (selectedFarmId) {
      loadFarmRisk(selectedFarmId);
    }
  }, [selectedFarmId]);

  const loadInitialFarms = async () => {
    try {
      setLoading(true);
      const res = await getFarms();
      const list = res.results || res || [];
      setFarms(list);
      if (list.length > 0) {
        setSelectedFarmId(list[0].id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to load farms:', err);
      setError('Could not load farms.');
      setLoading(false);
    }
  };

  const loadFarmRisk = async (farmId) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getFarmRisk(farmId);
      setRiskData(data);
    } catch (err) {
      console.error('Failed to load risk analysis:', err);
      setError('Could not compute farm risk profile.');
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'critical': return 'bg-red-50 text-red-700 border-red-200';
      case 'high': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'medium': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default: return 'bg-emerald-50 text-emerald-700 border-emerald-200';
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
              <Activity className="w-6 h-6 text-[#2fa874]" />
              <h1 className="font-editorial text-xl font-bold text-[#003629]">
                Stage 2 · 7-Day Agronomic Risk Forecast
              </h1>
            </div>
          </div>

          {farms.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#6C7D76]">Farm:</span>
              <select
                value={selectedFarmId}
                onChange={(e) => setSelectedFarmId(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-[#DCE8DF] text-xs bg-white font-medium"
              >
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.farm_name} ({f.crop || 'Crop'})
                  </option>
                ))}
              </select>
            </div>
          )}
        </header>

        <main className="flex-1 p-6 max-w-6xl w-full mx-auto space-y-6">
          {/* Top Banner / Disclaimer */}
          <div className="bg-white rounded-2xl p-4 border border-[#DCE8DF] shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Info className="w-4 h-4 text-[#2fa874]" />
              <span className="text-xs text-[#436357] font-medium">
                Prototype Decision-Support Risk Engine · Combines weather forecasts, scouting pest counts, soil indicators, and local geospatial disease pressure.
              </span>
            </div>
            <span className="text-[11px] bg-[#f0f7f3] text-[#248057] px-2.5 py-0.5 rounded-full font-semibold border border-[#d0e9db]">
              Deterministic Model
            </span>
          </div>

          {loading ? (
            <div className="py-24 text-center">
              <div className="w-8 h-8 border-3 border-[#2fa874] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-[#6C7D76]">Synthesizing environmental and epidemiological vectors...</p>
            </div>
          ) : error ? (
            <div className="p-6 bg-red-50 text-red-700 rounded-2xl border border-red-200 text-xs">
              {error}
            </div>
          ) : riskData ? (
            <>
              {/* Score & Drivers Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Overall Gauge Card */}
                <div className="bg-white rounded-3xl p-6 border border-[#DCE8DF] shadow-xs flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-semibold text-[#6C7D76] uppercase tracking-wider block mb-1">
                      Computed Farm Risk Score
                    </span>
                    <div className="flex items-baseline gap-3 my-2">
                      <span className="text-5xl font-editorial font-bold text-[#003629]">
                        {riskData.score}
                      </span>
                      <span className="text-sm text-[#6C7D76]">/ 100</span>
                    </div>

                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border capitalize ${getLevelColor(riskData.level)}`}>
                      {riskData.level === 'critical' || riskData.level === 'high' ? (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      {riskData.level_display || riskData.level} Threat Level
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#F7F8F3] mt-4 text-[11px] text-[#6C7D76] space-y-1">
                    <div>Plot: <strong>{riskData.farm_name}</strong></div>
                    <div>Crop: <strong>{riskData.crop}</strong> ({riskData.crop_variety || 'Improved Selection'})</div>
                    <div>Phenology: <strong>{riskData.crop_stage}</strong></div>
                  </div>
                </div>

                {/* Primary Drivers Card */}
                <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-[#DCE8DF] shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#003629] mb-3">
                      <TrendingUp className="w-4 h-4 text-[#2fa874]" />
                      Why is this farm assessed at this risk level?
                    </div>

                    {riskData.drivers && riskData.drivers.length > 0 ? (
                      <ul className="space-y-2 text-xs text-[#16352D]">
                        {riskData.drivers.map((driver, idx) => (
                          <li key={idx} className="flex items-start gap-2 bg-[#F7F8F3] p-2.5 rounded-xl">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#e65100] mt-1.5 shrink-0" />
                            <span className="capitalize">{driver}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="p-4 bg-[#ecfef3] text-[#13663b] rounded-xl text-xs">
                        {riskData.summary || 'Environmental conditions are currently unfavorable for pathogen incubation.'}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-4 border-t border-[#F7F8F3] mt-4 text-[11px]">
                    <span className="text-[#6C7D76]">Inputs evaluated:</span>
                    {(riskData.inputs_used || []).map((inp, i) => (
                      <span key={i} className="px-2 py-0.5 bg-[#eef7f2] text-[#248057] rounded-md font-medium">
                        {inp}
                      </span>
                    ))}
                    {(riskData.inputs_missing || []).map((inp, i) => (
                      <span key={i} className="px-2 py-0.5 bg-[#f5f5f5] text-[#888] rounded-md line-through">
                        {inp}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* 7-Day Weather Forecast Chart */}
              <div className="bg-white rounded-3xl p-6 border border-[#DCE8DF] shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#2fa874]" />
                    <h3 className="font-editorial text-lg font-bold text-[#003629]">
                      7-Day Predictive Risk Trajectory
                    </h3>
                  </div>
                  <span className="text-[11px] text-[#6C7D76]">
                    Weather Provider: Open-Meteo
                  </span>
                </div>

                <DiseaseForecast forecast={riskData.forecast} />
              </div>

              {/* Breakdown Table */}
              <div className="bg-white rounded-3xl p-6 border border-[#DCE8DF] shadow-xs">
                <h3 className="font-editorial text-lg font-bold text-[#003629] mb-4">
                  Multi-Factor Agronomic Weighting Matrix
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-[#DCE8DF] text-[#6C7D76]">
                        <th className="py-2.5 font-semibold">Risk Vector</th>
                        <th className="py-2.5 font-semibold">Observed / Recorded Input</th>
                        <th className="py-2.5 font-semibold text-right">Contribution (Points)</th>
                        <th className="py-2.5 font-semibold text-right">Max Weight</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F7F8F3]">
                      {riskData.breakdown && Object.entries(riskData.breakdown).map(([key, item]) => (
                        <tr key={key} className="hover:bg-[#fafdfb]">
                          <td className="py-2.5 font-medium text-[#16352D]">{item.label || key}</td>
                          <td className="py-2.5 text-[#556960]">{item.input || '—'}</td>
                          <td className="py-2.5 text-right font-bold text-[#003629]">{item.score}</td>
                          <td className="py-2.5 text-right text-[#6C7D76]">{item.max}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* IPM Actions Overview */}
              {riskData.ipm_actions && (
                <div className="bg-white rounded-3xl p-6 border border-[#DCE8DF] shadow-xs">
                  <div className="flex items-center gap-2 mb-4">
                    <ShieldAlert className="w-5 h-5 text-[#2fa874]" />
                    <h3 className="font-editorial text-lg font-bold text-[#003629]">
                      Integrated Pest & Disease Management (IPM) Advisory
                    </h3>
                  </div>

                  <div className="p-3 bg-[#eef7f2] rounded-xl text-xs text-[#1e583e] mb-4 font-medium">
                    {riskData.ipm_actions.intervention_urgency}
                  </div>

                  <div className="space-y-3">
                    {(riskData.ipm_actions.steps || []).map((step, idx) => (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-2xl border text-xs flex items-start gap-3 ${
                          step.tier === 'chemical' && step.safety_gate_cleared === false
                            ? 'bg-[#fff1f2] border-[#fecdd3] text-[#9f1239]'
                            : 'bg-[#fafdfb] border-[#DCE8DF] text-[#16352D]'
                        }`}
                      >
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 bg-white border border-[#DCE8DF]">
                          {step.tier}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium leading-relaxed">{step.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-20 text-center text-xs text-[#6C7D76]">
              Please add a farm plot to view risk forecasting.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
