import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
  Thermometer,
  Droplets,
  Activity,
  Calendar,
  Clock,
  RefreshCw,
  Info,
  ExternalLink,
  Layers,
  Camera
} from 'lucide-react';
import {
  getFarmEnvironmentRisk,
  getFarmEnvironmentLatest,
  getFarmEnvironmentHistory,
  getFarmEnvironmentRiskHistory
} from '../../api/farms';

export default function EnvironmentalStressSection({ farmId, farmName }) {
  const navigate = useNavigate();
  const [riskAssessment, setRiskAssessment] = useState(null);
  const [latestData, setLatestData] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [riskHistory, setRiskHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('lst'); // 'lst' | 'et' | 'esi' | 'weather'

  const loadData = useCallback(async (isRefresh = false) => {
    if (!farmId) {
      setLoading(false);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
      // Reset data on farm change to guarantee complete farm isolation
      setRiskAssessment(null);
      setLatestData(null);
      setHistoryData(null);
      setRiskHistory([]);
    }
    setError(null);

    try {
      const [riskRes, latestRes, historyRes, riskHistRes] = await Promise.allSettled([
        getFarmEnvironmentRisk(farmId, isRefresh),
        getFarmEnvironmentLatest(farmId),
        getFarmEnvironmentHistory(farmId),
        getFarmEnvironmentRiskHistory(farmId)
      ]);

      if (riskRes.status === 'fulfilled') {
        setRiskAssessment(riskRes.value);
      } else {
        console.warn('Risk assessment load failed:', riskRes.reason);
      }

      if (latestRes.status === 'fulfilled') {
        setLatestData(latestRes.value);
      } else {
        console.warn('Latest environment load failed:', latestRes.reason);
      }

      if (historyRes.status === 'fulfilled') {
        setHistoryData(historyRes.value);
      } else {
        console.warn('Environment history load failed:', historyRes.reason);
      }

      if (riskHistRes.status === 'fulfilled') {
        setRiskHistory(riskHistRes.value || []);
      } else {
        console.warn('Risk history load failed:', riskHistRes.reason);
      }
    } catch (err) {
      console.error('Failed to load environmental analysis:', err);
      setError('Could not retrieve environmental observations.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [farmId]);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  const getStressBadge = (level) => {
    switch (level?.toLowerCase()) {
      case 'high':
        return {
          bg: 'bg-rose-50 text-rose-800 border-rose-200',
          icon: <AlertTriangle className="w-4 h-4 text-rose-600" />,
          label: 'HIGH ENVIRONMENTAL STRESS'
        };
      case 'elevated':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
          label: 'ELEVATED ENVIRONMENTAL STRESS'
        };
      case 'mild':
        return {
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          icon: <Info className="w-4 h-4 text-blue-600" />,
          label: 'MILD ENVIRONMENTAL STRESS'
        };
      case 'normal':
      default:
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
          label: 'NORMAL ENVIRONMENTAL CONDITION'
        };
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Unavailable';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch {
      return isoString;
    }
  };

  const formatShortDate = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    } catch {
      return '';
    }
  };

  // Helper to render clean SVG trend chart
  const renderTrendChart = () => {
    if (!historyData) return null;

    let points = [];
    let baselineValue = null;
    let unit = '';
    let metricLabel = '';
    let color = '#2fa874';

    if (activeTab === 'lst') {
      unit = '°C';
      metricLabel = 'Land Surface Temp (LST)';
      color = '#e65100';
      baselineValue = historyData.baselines?.lst?.baseline_mean;
      points = (historyData.lst_history || [])
        .filter((o) => o.mean_lst_c !== null)
        .map((o) => ({
          date: o.observation_datetime,
          value: parseFloat(o.mean_lst_c),
          meta: o.ecostress_product_id || o.product_name
        }));
    } else if (activeTab === 'et') {
      unit = ' mm/d';
      metricLabel = 'Evapotranspiration (ET)';
      color = '#0284c7';
      baselineValue = historyData.baselines?.et?.baseline_mean;
      points = (historyData.et_history || [])
        .filter((o) => o.mean_et !== null)
        .map((o) => ({
          date: o.observation_datetime,
          value: parseFloat(o.mean_et),
          meta: o.ecostress_product_id || o.product_name
        }));
    } else if (activeTab === 'esi') {
      unit = '';
      metricLabel = 'Evaporative Stress Index (ESI)';
      color = '#7c3aed';
      baselineValue = historyData.baselines?.esi?.baseline_mean;
      points = (historyData.esi_history || [])
        .filter((o) => o.mean_esi !== null)
        .map((o) => ({
          date: o.observation_datetime,
          value: parseFloat(o.mean_esi),
          meta: o.ecostress_product_id || o.product_name
        }));
    } else if (activeTab === 'weather') {
      unit = '°C';
      metricLabel = 'Recorded Weather Temp';
      color = '#059669';
      points = (historyData.weather_history || [])
        .filter((o) => o.temperature !== null)
        .map((o) => ({
          date: o.observation_datetime,
          value: parseFloat(o.temperature),
          humidity: o.relative_humidity,
          meta: o.data_source
        }));
    }

    if (points.length === 0) {
      return (
        <div className="py-12 text-center bg-[#fafdfb] rounded-2xl border border-dashed border-[#DCE8DF]">
          <Info className="w-6 h-6 text-[#6C7D76] mx-auto mb-2" />
          <p className="text-xs font-semibold text-[#16352D]">
            No {metricLabel} observations recorded yet
          </p>
          <p className="text-[11px] text-[#6C7D76] mt-1 max-w-sm mx-auto">
            Observations are captured automatically as NASA satellite overpasses or weather observations are recorded for this farm.
          </p>
        </div>
      );
    }

    if (points.length === 1) {
      const p = points[0];
      return (
        <div className="py-8 px-6 bg-[#fafdfb] rounded-2xl border border-[#DCE8DF] flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-white shadow-xs border border-[#DCE8DF] flex items-center justify-center mb-3">
            <Calendar className="w-5 h-5 text-[#2fa874]" />
          </div>
          <h4 className="text-xs font-bold text-[#16352D] uppercase tracking-wider mb-1">
            Single Observation Recorded
          </h4>
          <div className="text-2xl font-bold font-editorial text-[#003629] my-1">
            {p.value.toFixed(2)}{unit}
          </div>
          <div className="text-xs text-[#6C7D76] mb-3">
            Observed at: <strong>{formatDate(p.date)}</strong>
          </div>
          <div className="text-[11px] bg-white px-3 py-1.5 rounded-lg border border-[#DCE8DF] text-[#436357] max-w-md">
            <strong>Trend unavailable:</strong> Temporal change comparison strictly requires at least 2 separate observations. Baseline calculation will update dynamically as subsequent satellite passes occur.
          </div>
        </div>
      );
    }

    // SVG coordinates computation for 2+ observations
    const values = points.map((p) => p.value);
    const minVal = Math.min(...values, baselineValue !== null ? baselineValue : values[0]);
    const maxVal = Math.max(...values, baselineValue !== null ? baselineValue : values[0]);
    const valRange = maxVal - minVal === 0 ? 1 : maxVal - minVal;

    const svgWidth = 600;
    const svgHeight = 220;
    const padTop = 30;
    const padBottom = 45;
    const padLeft = 55;
    const padRight = 35;
    const chartWidth = svgWidth - padLeft - padRight;
    const chartHeight = svgHeight - padTop - padBottom;

    const coords = points.map((p, i) => {
      const x = padLeft + (i / (points.length - 1)) * chartWidth;
      const y = padTop + chartHeight - ((p.value - minVal) / valRange) * chartHeight;
      return { ...p, x, y };
    });

    const baselineY =
      baselineValue !== null
        ? padTop + chartHeight - ((baselineValue - minVal) / valRange) * chartHeight
        : null;

    const pathD = coords.reduce((acc, c, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`, '');
    const areaD = `${pathD} L ${coords[coords.length - 1].x} ${padTop + chartHeight} L ${coords[0].x} ${padTop + chartHeight} Z`;

    return (
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full min-w-[500px] h-52">
          <defs>
            <linearGradient id={`grad_${activeTab}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.5, 1].map((ratio, idx) => {
            const y = padTop + chartHeight * ratio;
            const val = maxVal - ratio * valRange;
            return (
              <g key={idx}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  stroke="#E8ECE9"
                  strokeDasharray="4 4"
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  fill="#8C9A94"
                  fontSize="10"
                  textAnchor="end"
                  fontFamily="sans-serif"
                >
                  {val.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path d={areaD} fill={`url(#grad_${activeTab})`} />

          {/* Trend line */}
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Baseline reference line if available */}
          {baselineY !== null && (
            <g>
              <line
                x1={padLeft}
                y1={baselineY}
                x2={svgWidth - padRight}
                y2={baselineY}
                stroke="#6C7D76"
                strokeWidth="1.5"
                strokeDasharray="6 3"
              />
              <text
                x={svgWidth - padRight}
                y={baselineY - 5}
                fill="#6C7D76"
                fontSize="9"
                textAnchor="end"
                fontWeight="600"
              >
                Farm Baseline ({baselineValue.toFixed(1)}{unit})
              </text>
            </g>
          )}

          {/* Data point markers */}
          {coords.map((c, i) => (
            <g key={i} className="cursor-pointer group">
              <circle
                cx={c.x}
                cy={c.y}
                r="4.5"
                fill="#ffffff"
                stroke={color}
                strokeWidth="2.5"
                className="transition-all hover:r-6"
              />
              <text
                x={c.x}
                y={c.y - 9}
                fill="#003629"
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
              >
                {c.value.toFixed(1)}
              </text>
              <text
                x={c.x}
                y={padTop + chartHeight + 18}
                fill="#6C7D76"
                fontSize="10"
                textAnchor="middle"
              >
                {formatShortDate(c.date)}
              </text>
            </g>
          ))}
        </svg>

        <div className="flex items-center justify-between px-2 pt-2 text-[11px] text-[#6C7D76] border-t border-[#F0F4F1]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: color }} />
              Observed Time Series
            </span>
            {baselineValue !== null && (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-t border-dashed border-[#6C7D76]" />
                Farm Historical Baseline
              </span>
            )}
          </div>
          <span>Total Observations: <strong>{points.length}</strong></span>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-[#DCE8DF] shadow-xs text-center py-12">
        <div className="w-7 h-7 border-3 border-[#2fa874] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs text-[#6C7D76]">Loading historical environmental signals for {farmName}...</p>
      </div>
    );
  }

  const stressInfo = getStressBadge(riskAssessment?.stress_level);
  const isHighOrElevated = ['elevated', 'high'].includes(riskAssessment?.stress_level?.toLowerCase());

  return (
    <div className="space-y-6">
      {/* ── Main Environmental Risk Status Card ── */}
      <div className="bg-white rounded-3xl p-6 border border-[#DCE8DF] shadow-xs">
        {/* Header with Title and Re-evaluate Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#F0F4F1]">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#2fa874]" />
              <h3 className="font-editorial text-lg font-bold text-[#003629]">
                Rule-Based Environmental Stress Analysis
              </h3>
            </div>
            <p className="text-xs text-[#6C7D76] mt-0.5">
              Deterministic, multi-signal early warning evaluated against {farmName}'s historical baselines.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#DCE8DF] text-xs font-semibold text-[#16352D] bg-[#fafdfb] hover:bg-[#F7F8F3] transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#2fa874] ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Re-evaluating...' : 'Re-evaluate'}
            </button>
          </div>
        </div>

        {/* Stress Level & Early Warning Banner */}
        <div className="mt-5 space-y-4">
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${stressInfo.bg}`}>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-white/80 border border-current shrink-0">
                {stressInfo.icon}
              </div>
              <div>
                <span className="text-[10px] font-bold tracking-wider uppercase block opacity-80">
                  Current Environmental Status
                </span>
                <div className="text-sm font-bold tracking-wide mt-0.5">
                  {stressInfo.label}
                </div>
                <p className="text-xs mt-1 opacity-90 max-w-2xl">
                  {riskAssessment?.summary || 'Environmental conditions are currently stable.'}
                </p>
              </div>
            </div>

            <div className="shrink-0 self-start sm:self-center">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-white/90 border border-current shadow-2xs">
                Zero ML Models · Deterministic
              </span>
            </div>
          </div>

          {/* Elevated Stress Action Notice (Inspection Trigger for ConvNeXt) */}
          {isHighOrElevated && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-300 text-amber-950 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <strong className="font-bold text-amber-900 block mb-0.5">
                    Field Inspection Trigger Active
                  </strong>
                  Environmental stress detected for {farmName}. Satellite and weather signals differ from historical baseline conditions. Environmental stress increases crop vulnerability.
                  <span className="block mt-1 font-semibold text-amber-800">
                    Recommended Action: Conduct a field walk and scan symptomatic leaves using the ConvNeXt disease scanner.
                  </span>
                </div>
              </div>

              <button
                onClick={() => navigate('/disease')}
                className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#003629] text-white text-xs font-bold hover:bg-[#00281e] shadow-sm transition-all"
              >
                <Camera className="w-3.5 h-3.5" />
                Scan Crop Leaves (ConvNeXt)
              </button>
            </div>
          )}

          {/* Plain-Language Rule Reasons */}
          <div className="p-4 rounded-2xl bg-[#fafdfb] border border-[#DCE8DF]">
            <div className="flex items-center gap-2 mb-2 text-xs font-bold text-[#003629]">
              <TrendingUp className="w-3.5 h-3.5 text-[#2fa874]" />
              Deterministic Rule Triggers & Interpretability:
            </div>
            {riskAssessment?.reasons && riskAssessment.reasons.length > 0 ? (
              <ul className="space-y-1.5 text-xs text-[#16352D]">
                {riskAssessment.reasons.map((reason, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2fa874] mt-1.5 shrink-0" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[#6C7D76]">
                All indicators are within historical baseline ranges.
              </p>
            )}
          </div>
        </div>

        {/* ── Latest Observations vs Farm Baseline Grid ── */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-[#6C7D76] uppercase tracking-wider">
              Farm Baselines & Latest Observations
            </h4>
            <span className="text-[11px] text-[#6C7D76]">
              {riskAssessment?.data_sufficiency?.is_sufficient_for_trends
                ? 'Historical baseline active'
                : 'Insufficient historical observations for trend calculation'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* LST Metric */}
            <div className="p-4 rounded-2xl bg-[#F7F8F3] border border-[#DCE8DF] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#6C7D76] uppercase">LST (ECOSTRESS)</span>
                  <Thermometer className="w-4 h-4 text-[#e65100]" />
                </div>
                <div className="mt-2 text-xl font-bold font-editorial text-[#003629]">
                  {latestData?.lst?.available && latestData.lst.data?.mean_lst_c !== null
                    ? `${parseFloat(latestData.lst.data.mean_lst_c).toFixed(1)}°C`
                    : 'Unavailable'}
                </div>
                <div className="text-[10px] text-[#6C7D76] mt-0.5">
                  Farm Baseline:{' '}
                  <strong>
                    {riskAssessment?.lst_status?.baseline_mean_c !== null
                      ? `${riskAssessment?.lst_status?.baseline_mean_c}°C`
                      : 'Pending'}
                  </strong>
                </div>
              </div>
              <div className="pt-3 mt-3 border-t border-[#E8ECE9] text-[10px] text-[#436357]">
                Observed: {formatDate(latestData?.lst?.observed_at)}
              </div>
            </div>

            {/* ET Metric */}
            <div className="p-4 rounded-2xl bg-[#F7F8F3] border border-[#DCE8DF] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#6C7D76] uppercase">ET (ECOSTRESS)</span>
                  <Droplets className="w-4 h-4 text-[#0284c7]" />
                </div>
                <div className="mt-2 text-xl font-bold font-editorial text-[#003629]">
                  {latestData?.et?.available && latestData.et.data?.mean_et !== null
                    ? `${parseFloat(latestData.et.data.mean_et).toFixed(2)} mm/d`
                    : 'Unavailable'}
                </div>
                <div className="text-[10px] text-[#6C7D76] mt-0.5">
                  Farm Baseline:{' '}
                  <strong>
                    {riskAssessment?.et_status?.baseline_mean !== null
                      ? `${riskAssessment?.et_status?.baseline_mean} mm/d`
                      : 'Pending'}
                  </strong>
                </div>
              </div>
              <div className="pt-3 mt-3 border-t border-[#E8ECE9] text-[10px] text-[#436357]">
                Observed: {formatDate(latestData?.et?.observed_at)}
              </div>
            </div>

            {/* ESI Metric */}
            <div className="p-4 rounded-2xl bg-[#F7F8F3] border border-[#DCE8DF] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#6C7D76] uppercase">ESI (ECOSTRESS)</span>
                  <Activity className="w-4 h-4 text-[#7c3aed]" />
                </div>
                <div className="mt-2 text-xl font-bold font-editorial text-[#003629]">
                  {latestData?.esi?.available && latestData.esi.data?.mean_esi !== null
                    ? `${parseFloat(latestData.esi.data.mean_esi).toFixed(2)}`
                    : 'Unavailable'}
                </div>
                <div className="text-[10px] text-[#6C7D76] mt-0.5">
                  Farm Baseline:{' '}
                  <strong>
                    {riskAssessment?.esi_status?.baseline_mean !== null
                      ? `${riskAssessment?.esi_status?.baseline_mean}`
                      : 'Pending'}
                  </strong>
                </div>
              </div>
              <div className="pt-3 mt-3 border-t border-[#E8ECE9] text-[10px] text-[#436357]">
                Observed: {formatDate(latestData?.esi?.observed_at)}
              </div>
            </div>

            {/* Weather Metric */}
            <div className="p-4 rounded-2xl bg-[#F7F8F3] border border-[#DCE8DF] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#6C7D76] uppercase">Weather (Open-Meteo)</span>
                  <Calendar className="w-4 h-4 text-[#059669]" />
                </div>
                <div className="mt-2 text-xl font-bold font-editorial text-[#003629]">
                  {latestData?.weather?.available && latestData.weather.data?.temperature !== null
                    ? `${parseFloat(latestData.weather.data.temperature).toFixed(1)}°C`
                    : 'Unavailable'}
                </div>
                <div className="text-[10px] text-[#6C7D76] mt-0.5">
                  Humidity:{' '}
                  <strong>
                    {latestData?.weather?.data?.relative_humidity !== null
                      ? `${latestData?.weather?.data?.relative_humidity}%`
                      : '—'}
                  </strong>
                </div>
              </div>
              <div className="pt-3 mt-3 border-t border-[#E8ECE9] text-[10px] text-[#436357]">
                Observed: {formatDate(latestData?.weather?.observed_at)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Historical Time Series Trends Card ── */}
      <div className="bg-white rounded-3xl p-6 border border-[#DCE8DF] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#2fa874]" />
              <h3 className="font-editorial text-lg font-bold text-[#003629]">
                Historical Environmental Time Series
              </h3>
            </div>
            <p className="text-xs text-[#6C7D76] mt-0.5">
              Historical observations recorded exclusively for {farmName}. Plotted with actual observation timestamps.
            </p>
          </div>

          {/* Metric Selector Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-[#F7F8F3] rounded-xl border border-[#DCE8DF]">
            <button
              onClick={() => setActiveTab('lst')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'lst'
                  ? 'bg-white text-[#e65100] shadow-2xs font-bold'
                  : 'text-[#6C7D76] hover:text-[#16352D]'
              }`}
            >
              LST
            </button>
            <button
              onClick={() => setActiveTab('et')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'et'
                  ? 'bg-white text-[#0284c7] shadow-2xs font-bold'
                  : 'text-[#6C7D76] hover:text-[#16352D]'
              }`}
            >
              ET
            </button>
            <button
              onClick={() => setActiveTab('esi')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'esi'
                  ? 'bg-white text-[#7c3aed] shadow-2xs font-bold'
                  : 'text-[#6C7D76] hover:text-[#16352D]'
              }`}
            >
              ESI
            </button>
            <button
              onClick={() => setActiveTab('weather')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'weather'
                  ? 'bg-white text-[#059669] shadow-2xs font-bold'
                  : 'text-[#6C7D76] hover:text-[#16352D]'
              }`}
            >
              Weather
            </button>
          </div>
        </div>

        {/* Chart Visualization */}
        {renderTrendChart()}
      </div>

      {/* ── Risk Assessment History Log ── */}
      {riskHistory.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-[#DCE8DF] shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-[#2fa874]" />
            <h3 className="font-editorial text-lg font-bold text-[#003629]">
              Environmental Assessment History
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#DCE8DF] text-[#6C7D76]">
                  <th className="py-2.5 font-semibold">Assessment Date</th>
                  <th className="py-2.5 font-semibold">Stress Level</th>
                  <th className="py-2.5 font-semibold">Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F7F8F3]">
                {riskHistory.slice(0, 5).map((item) => {
                  const b = getStressBadge(item.stress_level);
                  return (
                    <tr key={item.id} className="hover:bg-[#fafdfb]">
                      <td className="py-2.5 font-medium text-[#16352D]">
                        {formatDate(item.assessment_datetime)}
                      </td>
                      <td className="py-2.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${b.bg}`}>
                          {item.stress_level?.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 text-[#556960] max-w-md truncate">
                        {item.summary}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
