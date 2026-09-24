import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Map as MapIcon,
  AlertTriangle,
  Flame,
  ShieldCheck,
  Layers,
  Filter,
  ZoomIn,
  ZoomOut,
  Navigation,
  Info,
  Menu,
  ChevronRight
} from 'lucide-react';
import AppSidebar from '../components/common/AppSidebar';
import { getHotspotsMap, getRegionalSummary } from '../api/hotspots';

export default function HotspotMapPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hotspotData, setHotspotData] = useState({ clusters: [], farms: [] });
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [daysFilter, setDaysFilter] = useState(30);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);

  useEffect(() => {
    loadMapData();
  }, [daysFilter]);

  const loadMapData = async () => {
    try {
      setLoading(true);
      const data = await getHotspotsMap(daysFilter);
      setHotspotData(data);
      const reg = await getRegionalSummary();
      setSummary(reg);
    } catch (err) {
      console.error('Failed to load hotspot data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [22.5645, 72.9289], // Central Gujarat / Anand
        zoom: 8,
        zoomControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      layerGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      // Cleanup on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map markers and cluster circles when data changes
  useEffect(() => {
    if (!mapInstanceRef.current || !layerGroupRef.current) return;

    layerGroupRef.current.clearLayers();
    const map = mapInstanceRef.current;

    // 1. Draw Hotspot Cluster Circles
    (hotspotData.clusters || []).forEach((cluster) => {
      const isCritical = cluster.severity === 'critical';
      const color = isCritical ? '#dc2626' : cluster.severity === 'high' ? '#ea580c' : '#eab308';
      const fillColor = isCritical ? '#ef4444' : cluster.severity === 'high' ? '#f97316' : '#facc15';

      const circle = L.circle([cluster.center_latitude, cluster.center_longitude], {
        color: color,
        fillColor: fillColor,
        fillOpacity: 0.22,
        weight: 2,
        radius: (cluster.radius_km || 15) * 1000,
      }).addTo(layerGroupRef.current);

      const threatsHtml = (cluster.primary_threats || [])
        .map((t) => `<li style="margin-top:2px; font-weight:600;">• ${t}</li>`)
        .join('');

      circle.bindPopup(`
        <div style="font-family:sans-serif; min-width:200px; padding:4px;">
          <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
            <span style="font-size:10px; font-weight:800; text-transform:uppercase; background:${fillColor}33; color:${color}; padding:2px 6px; border-radius:4px;">
              ${cluster.severity.toUpperCase()} HOTSPOT
            </span>
          </div>
          <strong style="font-size:13px; color:#111827;">${cluster.zone_name}</strong>
          <div style="font-size:11px; color:#4b5563; margin-top:4px;">
            Active Incidents: <b>${cluster.incident_count}</b><br/>
            Affected Parcels: <b>${cluster.affected_farms_count}</b><br/>
            Crops: <b>${(cluster.affected_crops || []).join(', ')}</b>
          </div>
          <div style="margin-top:6px; font-size:11px; color:#374151;">
            <b>Dominant Pathogens / Pests:</b>
            <ul style="margin:2px 0 0 0; padding-left:4px; list-style:none;">${threatsHtml}</ul>
          </div>
        </div>
      `);
    });

    // 2. Draw Farm Markers
    (hotspotData.farms || []).forEach((farm) => {
      let iconColor = '#10b981'; // healthy
      if (farm.status === 'diseased') iconColor = '#ef4444';
      else if (farm.status === 'pest_alert') iconColor = '#f59e0b';

      const customIcon = L.divIcon({
        className: 'custom-farm-marker',
        html: `
          <div style="
            width: 22px;
            height: 22px;
            background: white;
            border: 3px solid ${iconColor};
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="width:6px; height:6px; background:${iconColor}; border-radius:50%;"></div>
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      const marker = L.marker([farm.latitude, farm.longitude], { icon: customIcon }).addTo(
        layerGroupRef.current
      );

      marker.bindPopup(`
        <div style="font-family:sans-serif; min-width:180px;">
          <strong style="font-size:13px; color:#111827;">${farm.name}</strong>
          <div style="font-size:11px; color:#4b5563; margin-top:2px;">
            📍 ${farm.location_name}<br/>
            🌱 Crop: <b>${farm.crop || 'Field'} (${farm.crop_stage || 'vegetative'})</b><br/>
            🛡️ Disease Status: <b>${farm.disease_info}</b><br/>
            🐛 Pest Pressure: <b>${farm.pest_info}</b>
          </div>
        </div>
      `);
    });
  }, [hotspotData]);

  const handleFocusCluster = (cluster) => {
    setSelectedCluster(cluster);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(
        [cluster.center_latitude, cluster.center_longitude],
        11,
        { duration: 1.2 }
      );
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAF8] text-gray-800">
      <AppSidebar activeItem="hotspots" mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="z-10 bg-white/95 backdrop-blur-xs border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-1.5 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-50"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-800 flex items-center justify-center">
              <Flame className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-gray-900 leading-none">
                  Geospatial Outbreak Hotspots
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200">
                  Regional GIS
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Haversine proximity clustering across Gujarat agricultural surveillance belts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={daysFilter}
              onChange={(e) => setDaysFilter(Number(e.target.value))}
              className="text-xs font-semibold bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-700 focus:outline-none focus:border-emerald-600 shadow-2xs"
            >
              <option value="7">Last 7 Days Activity</option>
              <option value="14">Last 14 Days Activity</option>
              <option value="30">Last 30 Days Activity</option>
            </select>
          </div>
        </header>

        {/* Content Area: Map + Cluster Sidebar */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          {/* Leaflet Map Canvas */}
          <div className="flex-1 relative h-[50vh] lg:h-full">
            <div ref={mapContainerRef} className="w-full h-full" />

            {/* Map Legend Overlay */}
            <div className="absolute top-4 left-4 z-[400] bg-white/90 backdrop-blur-md p-3 rounded-2xl border border-gray-100 shadow-md text-xs space-y-1.5 pointer-events-auto">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">
                Surveillance Legend
              </span>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500 border border-red-700"></span>
                <span className="text-[11px] font-bold text-gray-700">Critical Cluster (&ge;35 pts)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-500 border border-orange-700"></span>
                <span className="text-[11px] font-bold text-gray-700">High Risk Cluster</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full border-2 border-emerald-500 bg-white"></span>
                <span className="text-[11px] text-gray-600">Healthy Plot</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full border-2 border-red-500 bg-white"></span>
                <span className="text-[11px] text-gray-600">Active Disease Incident</span>
              </div>
            </div>
          </div>

          {/* Clusters List Panel */}
          <div className="w-full lg:w-96 bg-white border-t lg:border-t-0 lg:border-l border-gray-100 flex flex-col h-[50vh] lg:h-full overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                  Active Hotspot Zones ({hotspotData.clusters?.length || 0})
                </h3>
                <span className="text-[11px] text-gray-400">Click a zone to center map</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {hotspotData.clusters?.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-xs">
                  No active outbreak clusters detected in the selected timeframe.
                </div>
              ) : (
                hotspotData.clusters.map((cluster) => {
                  const isSelected = selectedCluster?.id === cluster.id;
                  const isCritical = cluster.severity === 'critical';

                  return (
                    <div
                      key={cluster.id}
                      onClick={() => handleFocusCluster(cluster)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                          : 'border-gray-100 bg-gray-50/50 hover:bg-gray-50 hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span
                            className={`inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              isCritical
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : 'bg-orange-100 text-orange-800 border border-orange-200'
                            }`}
                          >
                            {cluster.severity} severity
                          </span>
                          <h4 className="text-xs font-black text-gray-900 mt-1">
                            {cluster.zone_name}
                          </h4>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 mt-1" />
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-100 text-[11px] text-gray-600">
                        <div>
                          <span className="text-gray-400">Incidents:</span>{' '}
                          <strong>{cluster.incident_count}</strong>
                        </div>
                        <div>
                          <span className="text-gray-400">Parcels:</span>{' '}
                          <strong>{cluster.affected_farms_count}</strong>
                        </div>
                      </div>

                      <div className="mt-2 text-[11px]">
                        <span className="text-gray-400">Primary Threats:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(cluster.primary_threats || []).map((t, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 rounded bg-white border border-gray-200 text-gray-800 text-[10px] font-semibold"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Regional KPI Strip */}
            {summary && (
              <div className="p-4 bg-gray-50 border-t border-gray-100 text-xs space-y-1">
                <div className="flex justify-between text-gray-600 text-[11px]">
                  <span>Monitored Acreage:</span>
                  <strong>{summary.total_acreage_monitored} Acres</strong>
                </div>
                <div className="flex justify-between text-gray-600 text-[11px]">
                  <span>Dominant Pathogen:</span>
                  <strong className="text-red-600">{summary.top_dominant_disease}</strong>
                </div>
                <div className="flex justify-between text-gray-600 text-[11px]">
                  <span>Dominant Vector:</span>
                  <strong className="text-amber-600">{summary.top_pest_vector}</strong>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
