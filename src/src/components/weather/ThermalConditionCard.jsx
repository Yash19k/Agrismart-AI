import React, { useState, useEffect, useCallback } from 'react';
import {
  Thermometer,
  Satellite,
  Clock,
  RefreshCw,
  AlertTriangle,
  Info,
  Droplets,
  Activity
} from 'lucide-react';
import {
  getFarmThermal,
  fetchFarmThermal,
  getFarmET,
  fetchFarmET,
  getFarmESI,
  fetchFarmESI
} from '../../api/farms';

/**
 * ThermalConditionCard Component
 *
 * Displays official NASA ECOSTRESS observations for the selected farm:
 * 1. Land Surface Temperature (LST - ECO_L2T_LSTE)
 * 2. Evapotranspiration (ET - ECO_L3T_JET)
 * 3. Evaporative Stress Index (ESI - ECO_L4T_ESI)
 *
 * Adheres strictly to scientific boundaries:
 * - Environmental, thermal & vegetation water-stress indicators only (NEVER claims disease detection).
 * - "Latest available ECOSTRESS observation" (NEVER "Live" or "Real-time").
 * - Actual observed values (zero mock / demo data).
 * - Clear source attribution: NASA ECOSTRESS (70 m LSTE, JET, and ESI products).
 * - Signals that contribute to Sanket early-risk analysis.
 */
export default function ThermalConditionCard({ farmId, farmName }) {
  const [thermalData, setThermalData] = useState(null);
  const [etData, setEtData] = useState(null);
  const [esiData, setEsiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [thermalError, setThermalError] = useState(null);
  const [etError, setEtError] = useState(null);
  const [esiError, setEsiError] = useState(null);

  const loadObservations = useCallback(async (isRefresh = false) => {
    if (!farmId) {
      setLoading(false);
      setSyncing(false);
      return;
    }

    if (isRefresh) {
      setSyncing(true);
    } else {
      setLoading(true);
    }
    setThermalError(null);
    setEtError(null);
    setEsiError(null);

    // Fetch LST, ET, and ESI observations concurrently
    const [lstResult, etResult, esiResult] = await Promise.allSettled([
      isRefresh ? fetchFarmThermal(farmId) : getFarmThermal(farmId),
      isRefresh ? fetchFarmET(farmId) : getFarmET(farmId),
      isRefresh ? fetchFarmESI(farmId) : getFarmESI(farmId)
    ]);

    // Handle LST result
    if (lstResult.status === 'fulfilled') {
      setThermalData(lstResult.value);
    } else {
      const err = lstResult.reason;
      console.warn('ECOSTRESS LST observation error:', err);
      const detail =
        err.response?.data?.detail ||
        (err.response?.status === 404
          ? 'No ECOSTRESS LST observation is currently available for this farm.'
          : err.response?.status === 400
          ? 'Farm location is unavailable.'
          : err.response?.status === 422
          ? 'The latest LST observation does not contain enough valid thermal data for this farm.'
          : 'Unable to retrieve ECOSTRESS LST data right now.');
      setThermalError(detail);
      if (!isRefresh) {
        setThermalData(null);
      }
    }

    // Handle ET result
    if (etResult.status === 'fulfilled') {
      setEtData(etResult.value);
    } else {
      const err = etResult.reason;
      console.warn('ECOSTRESS ET observation error:', err);
      const detail =
        err.response?.data?.detail ||
        (err.response?.status === 404
          ? 'No ECOSTRESS ET observation is currently available for this farm.'
          : err.response?.status === 400
          ? 'Farm location is unavailable.'
          : err.response?.status === 422
          ? 'The latest ET observation does not contain enough valid data for this farm.'
          : 'Unable to retrieve ECOSTRESS ET data right now.');
      setEtError(detail);
      if (!isRefresh) {
        setEtData(null);
      }
    }

    // Handle ESI result
    if (esiResult.status === 'fulfilled') {
      setEsiData(esiResult.value);
    } else {
      const err = esiResult.reason;
      console.warn('ECOSTRESS ESI observation error:', err);
      const detail =
        err.response?.data?.detail ||
        (err.response?.status === 404
          ? 'No ECOSTRESS ESI observation is currently available for this farm.'
          : err.response?.status === 400
          ? 'Farm location is unavailable.'
          : err.response?.status === 422
          ? 'The latest ESI observation does not contain enough valid data for this farm.'
          : 'Unable to retrieve ECOSTRESS ESI data right now.');
      setEsiError(detail);
      if (!isRefresh) {
        setEsiData(null);
      }
    }

    setLoading(false);
    setSyncing(false);
  }, [farmId]);

  useEffect(() => {
    loadObservations(false);
  }, [loadObservations]);

  // Format observation timestamps
  const formattedLstDate = thermalData?.observation_datetime
    ? new Date(thermalData.observation_datetime).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      })
    : null;

  const formattedEtDate = etData?.observation_datetime
    ? new Date(etData.observation_datetime).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      })
    : null;

  const formattedEsiDate = esiData?.observation_datetime
    ? new Date(esiData.observation_datetime).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      })
    : null;

  const hasAnyData = thermalData || etData || esiData;
  const allFailed = thermalError && etError && esiError && !hasAnyData;

  return (
    <div className="bg-white rounded-xl border border-stone-200/90 shadow-2xs overflow-hidden transition-all">
      {/* Header Banner */}
      <div className="px-5 py-4 border-b border-stone-100 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-stone-50/70 to-emerald-50/30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-100/70 text-[#1b4332] flex items-center justify-center flex-shrink-0">
            <Satellite className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-base font-bold text-stone-900 tracking-tight">
                Thermal & Environmental Condition
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/60 px-2 py-0.5 rounded border border-emerald-200/60">
                NASA ECOSTRESS
              </span>
            </div>
            <p className="text-[11px] text-stone-500 font-medium">
              Land Surface Temperature (LST), Evapotranspiration (ET) & Evaporative Stress Index (ESI) · 70 m Observation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadObservations(true)}
            disabled={syncing || loading || !farmId}
            title="Check NASA ECOSTRESS catalog for the latest observations"
            className="flex items-center gap-1.5 text-xs font-bold text-[#1b4332] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-lg px-2.5 py-1 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Checking NASA...' : 'Update Observations'}</span>
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-5 space-y-6">
        {loading ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
            <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" />
            <p className="text-xs font-semibold text-stone-600">
              Querying NASA ECOSTRESS catalog for {farmName || 'farm'}...
            </p>
          </div>
        ) : allFailed ? (
          <div className="py-6 px-4 rounded-xl bg-amber-50/60 border border-amber-200/80 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-stone-800">
                  {thermalError || etError || esiError || 'No ECOSTRESS observations available.'}
                </p>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  ECOSTRESS is an episodic satellite sensor on the International Space Station. Observations depend on orbital passes over your farm coordinates.
                </p>
              </div>
            </div>
            {farmId && (
              <button
                type="button"
                onClick={() => loadObservations(true)}
                className="self-start sm:self-auto text-xs font-bold text-[#1b4332] bg-white border border-stone-200 hover:bg-stone-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex-shrink-0"
              >
                Retry
              </button>
            )}
          </div>
        ) : (
          <>
            {/* ===================== SECTION 1: LST ===================== */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Thermometer className="w-4 h-4 text-emerald-700" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                    Land Surface Temperature (LST)
                  </h4>
                </div>

                {formattedLstDate && (
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-stone-500 bg-stone-50 border border-stone-200 px-2 py-0.5 rounded">
                    <Clock className="w-3 h-3 text-stone-400" />
                    <span>Observed: {formattedLstDate}</span>
                  </div>
                )}
              </div>

              {thermalData ? (
                <div className="space-y-3">
                  {/* LST Granule notice */}
                  <div className="flex flex-wrap items-center justify-between text-xs bg-stone-50 border border-stone-200/60 rounded-lg px-3 py-1.5">
                    <span className="font-medium text-stone-600 text-[11px]">
                      Latest available ECOSTRESS LST observation
                    </span>
                    <span className="text-[11px] font-mono text-stone-500 truncate max-w-xs" title={thermalData.ecostress_product_id}>
                      Granule: {thermalData.ecostress_product_id || thermalData.product_name}
                    </span>
                  </div>

                  {/* LST Statistics Grid (Unchanged 5-card layout) */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {/* Mean LST */}
                    <div className="bg-[#FAFBF9] border border-stone-200/70 rounded-xl p-3.5 text-center">
                      <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                        Mean Surface Temperature
                      </span>
                      <div className="flex items-baseline justify-center gap-0.5">
                        <span className="font-serif text-2xl sm:text-3xl font-bold text-[#1b4332]">
                          {thermalData.mean_lst_c}
                        </span>
                        <span className="text-sm font-semibold text-stone-600">°C</span>
                      </div>
                      <span className="text-[10px] text-stone-400 font-medium block mt-1">
                        Farm Average LST
                      </span>
                    </div>

                    {/* Minimum LST */}
                    <div className="bg-[#FAFBF9] border border-stone-200/70 rounded-xl p-3.5 text-center">
                      <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                        Minimum
                      </span>
                      <div className="flex items-baseline justify-center gap-0.5">
                        <span className="font-serif text-2xl sm:text-3xl font-bold text-blue-700">
                          {thermalData.min_lst_c}
                        </span>
                        <span className="text-sm font-semibold text-stone-600">°C</span>
                      </div>
                      <span className="text-[10px] text-stone-400 font-medium block mt-1">
                        Coolest Canopy / Soil
                      </span>
                    </div>

                    {/* Maximum LST */}
                    <div className="bg-[#FAFBF9] border border-stone-200/70 rounded-xl p-3.5 text-center">
                      <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                        Maximum
                      </span>
                      <div className="flex items-baseline justify-center gap-0.5">
                        <span className="font-serif text-2xl sm:text-3xl font-bold text-amber-700">
                          {thermalData.max_lst_c}
                        </span>
                        <span className="text-sm font-semibold text-stone-600">°C</span>
                      </div>
                      <span className="text-[10px] text-stone-400 font-medium block mt-1">
                        Warmest Exposure
                      </span>
                    </div>

                    {/* Thermal Variability */}
                    <div className="bg-[#FAFBF9] border border-stone-200/70 rounded-xl p-3.5 text-center">
                      <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                        Thermal Variability
                      </span>
                      <div className="flex items-baseline justify-center gap-0.5">
                        <span className="font-serif text-2xl sm:text-3xl font-bold text-stone-800">
                          {thermalData.lst_std_c}
                        </span>
                        <span className="text-sm font-semibold text-stone-600">°C</span>
                      </div>
                      <span className="text-[10px] text-stone-400 font-medium block mt-1">
                        Within-field Std Dev
                      </span>
                    </div>

                    {/* Valid Pixels */}
                    <div className="bg-[#FAFBF9] border border-stone-200/70 rounded-xl p-3.5 text-center col-span-2 sm:col-span-1">
                      <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                        Valid Pixels
                      </span>
                      <div className="flex items-baseline justify-center gap-0.5">
                        <span className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
                          {thermalData.valid_pixel_count}
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-400 font-medium block mt-1">
                        70 m Resolved Pixels
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-4 px-3 bg-stone-50 rounded-lg border border-stone-200 text-xs text-stone-500">
                  {thermalError || 'No LST observation loaded for this farm.'}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-stone-200/70" />

            {/* ===================== SECTION 2: ET ===================== */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Droplets className="w-4 h-4 text-emerald-700" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                    Evapotranspiration (ET) · Plant Water Use
                  </h4>
                </div>

                {formattedEtDate && (
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-stone-500 bg-stone-50 border border-stone-200 px-2 py-0.5 rounded">
                    <Clock className="w-3 h-3 text-stone-400" />
                    <span>Observed: {formattedEtDate}</span>
                  </div>
                )}
              </div>

              {etData ? (
                <div className="space-y-3">
                  {/* ET Granule notice */}
                  <div className="flex flex-wrap items-center justify-between text-xs bg-stone-50 border border-stone-200/60 rounded-lg px-3 py-1.5">
                    <span className="font-medium text-stone-600 text-[11px]">
                      Latest available ECOSTRESS ET observation
                    </span>
                    <span className="text-[11px] font-mono text-stone-500 truncate max-w-xs" title={etData.ecostress_product_id || etData.product_id}>
                      Granule: {etData.ecostress_product_id || etData.product_id || etData.product_name}
                    </span>
                  </div>

                  {/* ET Statistics Grid (6-card layout) */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {/* Mean ET */}
                    <div className="bg-[#FAFBF9] border border-stone-200/70 rounded-xl p-3.5 text-center">
                      <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                        Mean ET
                      </span>
                      <div className="flex items-baseline justify-center gap-0.5">
                        <span className="font-serif text-2xl sm:text-3xl font-bold text-[#1b4332]">
                          {etData.mean_et}
                        </span>
                        <span className="text-xs font-semibold text-stone-600">
                          {etData.unit || 'mm/day'}
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-400 font-medium block mt-1">
                        Farm Average ET
                      </span>
                    </div>

                    {/* Median ET */}
                    <div className="bg-[#FAFBF9] border border-stone-200/70 rounded-xl p-3.5 text-center">
                      <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                        Median ET
                      </span>
                      <div className="flex items-baseline justify-center gap-0.5">
                        <span className="font-serif text-2xl sm:text-3xl font-bold text-teal-700">
                          {etData.median_et}
                        </span>
                        <span className="text-xs font-semibold text-stone-600">
                          {etData.unit || 'mm/day'}
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-400 font-medium block mt-1">
                        Median Water Use
                      </span>
                    </div>

                    {/* Minimum ET */}
                    <div className="bg-[#FAFBF9] border border-stone-200/70 rounded-xl p-3.5 text-center">
                      <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                        Minimum
                      </span>
                      <div className="flex items-baseline justify-center gap-0.5">
                        <span className="font-serif text-2xl sm:text-3xl font-bold text-sky-700">
                          {etData.min_et}
                        </span>
                        <span className="text-xs font-semibold text-stone-600">
                          {etData.unit || 'mm/day'}
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-400 font-medium block mt-1">
                        Lowest Transpiration
                      </span>
                    </div>

                    {/* Maximum ET */}
                    <div className="bg-[#FAFBF9] border border-stone-200/70 rounded-xl p-3.5 text-center">
                      <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                        Maximum
                      </span>
                      <div className="flex items-baseline justify-center gap-0.5">
                        <span className="font-serif text-2xl sm:text-3xl font-bold text-emerald-700">
                          {etData.max_et}
                        </span>
                        <span className="text-xs font-semibold text-stone-600">
                          {etData.unit || 'mm/day'}
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-400 font-medium block mt-1">
                        Peak Transpiration
                      </span>
                    </div>

                    {/* ET Variability */}
                    <div className="bg-[#FAFBF9] border border-stone-200/70 rounded-xl p-3.5 text-center">
                      <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                        ET Variability
                      </span>
                      <div className="flex items-baseline justify-center gap-0.5">
                        <span className="font-serif text-2xl sm:text-3xl font-bold text-stone-800">
                          {etData.et_std}
                        </span>
                        <span className="text-xs font-semibold text-stone-600">
                          {etData.unit || 'mm/day'}
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-400 font-medium block mt-1">
                        Within-field Std Dev
                      </span>
                    </div>

                    {/* Valid ET Pixels */}
                    <div className="bg-[#FAFBF9] border border-stone-200/70 rounded-xl p-3.5 text-center col-span-2 sm:col-span-1">
                      <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                        Valid Pixels
                      </span>
                      <div className="flex items-baseline justify-center gap-0.5">
                        <span className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
                          {etData.valid_pixel_count}
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-400 font-medium block mt-1">
                        70 m Resolved Pixels
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-4 px-3 bg-stone-50 rounded-lg border border-stone-200 text-xs text-stone-500">
                  {etError || 'No ET observation loaded for this farm.'}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-stone-200/70" />

            {/* ===================== SECTION 3: ESI ===================== */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-700" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                    Evaporative Stress Index (ESI) · Vegetation Water Stress
                  </h4>
                </div>

                {formattedEsiDate && (
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-stone-500 bg-stone-50 border border-stone-200 px-2 py-0.5 rounded">
                    <Clock className="w-3 h-3 text-stone-400" />
                    <span>Observed: {formattedEsiDate}</span>
                  </div>
                )}
              </div>

              {esiData ? (
                <div className="space-y-3">
                  {/* ESI Granule notice */}
                  <div className="flex flex-wrap items-center justify-between text-xs bg-stone-50 border border-stone-200/60 rounded-lg px-3 py-1.5">
                    <span className="font-medium text-stone-600 text-[11px]">
                      Latest available ECOSTRESS ESI observation
                    </span>
                    <span className="text-[11px] font-mono text-stone-500 truncate max-w-xs" title={esiData.ecostress_product_id || esiData.product_id}>
                      Granule: {esiData.ecostress_product_id || esiData.product_id || esiData.product_name}
                    </span>
                  </div>

                  {/* ESI Statistics Grid (6-card layout) */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {/* Mean ESI */}
                    <div className="bg-[#FAFBF9] border border-stone-200/70 rounded-xl p-3.5 text-center">
                      <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                        Mean ESI
                      </span>
                      <div className="flex items-baseline justify-center gap-0.5">
                        <span className="font-serif text-2xl sm:text-3xl font-bold text-[#1b4332]">
                          {esiData.mean_esi}
                        </span>
                        <span className="text-[11px] font-semibold text-stone-500 ml-1">
                          ratio
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-400 font-medium block mt-1">
                        Farm Average Stress Ratio
                      </span>
                    </div>

                    {/* Median ESI */}
                    <div className="bg-[#FAFBF9] border border-stone-200/70 rounded-xl p-3.5 text-center">
                      <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                        Median ESI
                      </span>
                      <div className="flex items-baseline justify-center gap-0.5">
                        <span className="font-serif text-2xl sm:text-3xl font-bold text-teal-700">
                          {esiData.median_esi}
                        </span>
                        <span className="text-[11px] font-semibold text-stone-500 ml-1">
                          ratio
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-400 font-medium block mt-1">
                        Median Water Stress
                      </span>
                    </div>

                    {/* Minimum ESI */}
                    <div className="bg-[#FAFBF9] border border-stone-200/70 rounded-xl p-3.5 text-center">
                      <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                        Minimum
                      </span>
                      <div className="flex items-baseline justify-center gap-0.5">
                        <span className="font-serif text-2xl sm:text-3xl font-bold text-rose-700">
                          {esiData.min_esi}
                        </span>
                        <span className="text-[11px] font-semibold text-stone-500 ml-1">
                          ratio
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-400 font-medium block mt-1">
                        Highest Water Stress
                      </span>
                    </div>

                    {/* Maximum ESI */}
                    <div className="bg-[#FAFBF9] border border-stone-200/70 rounded-xl p-3.5 text-center">
                      <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                        Maximum
                      </span>
                      <div className="flex items-baseline justify-center gap-0.5">
                        <span className="font-serif text-2xl sm:text-3xl font-bold text-emerald-700">
                          {esiData.max_esi}
                        </span>
                        <span className="text-[11px] font-semibold text-stone-500 ml-1">
                          ratio
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-400 font-medium block mt-1">
                        Lowest Water Stress
                      </span>
                    </div>

                    {/* ESI Variability */}
                    <div className="bg-[#FAFBF9] border border-stone-200/70 rounded-xl p-3.5 text-center">
                      <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                        ESI Variability
                      </span>
                      <div className="flex items-baseline justify-center gap-0.5">
                        <span className="font-serif text-2xl sm:text-3xl font-bold text-stone-800">
                          {esiData.esi_std}
                        </span>
                        <span className="text-[11px] font-semibold text-stone-500 ml-1">
                          ratio
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-400 font-medium block mt-1">
                        Within-field Std Dev
                      </span>
                    </div>

                    {/* Valid ESI Pixels */}
                    <div className="bg-[#FAFBF9] border border-stone-200/70 rounded-xl p-3.5 text-center col-span-2 sm:col-span-1">
                      <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                        Valid Pixels
                      </span>
                      <div className="flex items-baseline justify-center gap-0.5">
                        <span className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
                          {esiData.valid_pixel_count}
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-400 font-medium block mt-1">
                        70 m Resolved Pixels
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-4 px-3 bg-stone-50 rounded-lg border border-stone-200 text-xs text-stone-500">
                  {esiError || 'No ESI observation loaded for this farm.'}
                </div>
              )}
            </div>

            {/* Scientific Guidance Footer */}
            <div className="p-3.5 bg-stone-50/80 rounded-lg border border-stone-200/60 flex items-start gap-2.5 text-[11px] text-stone-600">
              <Info className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p>
                  <strong>Source: NASA ECOSTRESS:</strong> Land Surface Temperature (LST), Evapotranspiration (ET), and Evaporative Stress Index (ESI) provide high-resolution thermal and canopy water-stress observations at 70 m resolution from the International Space Station.
                </p>
                <p className="text-stone-500">
                  ESI is the ratio of actual evapotranspiration to potential evapotranspiration (ET / PET), providing an indicator of vegetation water stress. These environmental signals contribute to the Sanket early-risk analysis (ESI alone does not indicate disease presence).
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
