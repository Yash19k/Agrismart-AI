import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import turfArea from '@turf/area';
import {
  Navigation,
  PenTool,
  Edit3,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

const SQ_METERS_PER_ACRE = 4046.8564224;

// Custom high-contrast SVG pin marker for the farm location
const farmLocationIcon = L.divIcon({
  className: 'farm-location-pin',
  html: `
    <div style="position: relative; width: 34px; height: 34px; display: flex; items: center; justify-content: center; cursor: grab;">
      <div style="position: absolute; inset: 0; border-radius: 9999px; background: rgba(16, 185, 129, 0.35); animation: pulse 2s infinite;"></div>
      <div style="position: absolute; top: 3px; left: 3px; width: 28px; height: 28px; border-radius: 9999px; background: #047857; border: 3px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: white;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
  popupAnchor: [0, -34],
});

export default function FarmLocationMap({
  latitude,
  longitude,
  onLocationChange,
  farmBoundary,
  onBoundaryChange,
  calculatedAreaAcres,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const polygonLayerRef = useRef(null);
  const baseLayersRef = useRef({});
  const isInternalUpdateRef = useRef(false);

  const onLocationChangeRef = useRef(onLocationChange);
  const onBoundaryChangeRef = useRef(onBoundaryChange);

  useEffect(() => {
    onLocationChangeRef.current = onLocationChange;
    onBoundaryChangeRef.current = onBoundaryChange;
  }, [onLocationChange, onBoundaryChange]);

  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const [geoSuccess, setGeoSuccess] = useState(false);
  const [activeLayer, setActiveLayer] = useState('streets');
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const getBoundaryCoordinates = (boundary) => {
    if (!boundary) return null;
    if (boundary.coordinates && Array.isArray(boundary.coordinates)) return boundary.coordinates;
    if (boundary.geometry?.coordinates && Array.isArray(boundary.geometry.coordinates)) {
      return boundary.geometry.coordinates;
    }
    return null;
  };

  const hasBoundary = Boolean(getBoundaryCoordinates(farmBoundary));

  // Initialize Leaflet Map once
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initialLat = latitude && !isNaN(latitude) ? latitude : 22.5645;
    const initialLng = longitude && !isNaN(longitude) ? longitude : 72.9289;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 15,
      zoomControl: true,
    });
    mapInstanceRef.current = map;

    // 1. Street Map Tiles (OpenStreetMap)
    const streetTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    });

    // 2. Satellite Aerial Tiles (Esri World Imagery) — assists in identifying field boundaries
    const satelliteTileLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      }
    );

    streetTileLayer.addTo(map);
    baseLayersRef.current = {
      streets: streetTileLayer,
      satellite: satelliteTileLayer,
    };

    // Initialize Geoman Controls
    map.pm.setPathOptions({
      color: '#059669',
      fillColor: '#10b981',
      fillOpacity: 0.35,
      weight: 3,
    });

    map.pm.addControls({
      position: 'topleft',
      drawMarker: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawRectangle: true,
      drawPolygon: true,
      drawCircle: false,
      drawText: false,
      editMode: true,
      dragMode: true,
      cutPolygon: false,
      removalMode: true,
    });

    // Add draggable location marker
    const marker = L.marker([initialLat, initialLng], {
      icon: farmLocationIcon,
      draggable: true,
    }).addTo(map);
    markerRef.current = marker;

    marker.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      if (onLocationChangeRef.current) {
        onLocationChangeRef.current(pos.lat, pos.lng);
      }
    });

    // Map click to place/move marker (when not drawing or editing polygons)
    map.on('click', (e) => {
      if (map.pm.globalDrawModeEnabled() || map.pm.globalEditModeEnabled()) {
        return;
      }
      marker.setLatLng(e.latlng);
      if (onLocationChangeRef.current) {
        onLocationChangeRef.current(e.latlng.lat, e.latlng.lng);
      }
    });

    // Helper to calculate area and trigger callback with normalized GeoJSON
    const calculateAndSetArea = (layer) => {
      try {
        const rawGeojson = layer.toGeoJSON();
        // Canonical GeoJSON Polygon structure
        const polygonGeojson =
          rawGeojson.type === 'Feature' && rawGeojson.geometry ? rawGeojson.geometry : rawGeojson;
        const m2 = turfArea(rawGeojson);
        const acres = Number((m2 / SQ_METERS_PER_ACRE).toFixed(2));

        // Mark internal update so the useEffect([farmBoundary]) does NOT clear this layer
        isInternalUpdateRef.current = true;

        if (onBoundaryChangeRef.current) {
          onBoundaryChangeRef.current(polygonGeojson, acres);
        }
      } catch (err) {
        console.error('Error calculating area:', err);
      }
    };

    // Geoman event listeners
    map.on('pm:create', (e) => {
      setIsDrawing(false);
      // Remove any existing polygon so there is only one farm boundary
      if (polygonLayerRef.current && polygonLayerRef.current !== e.layer) {
        map.removeLayer(polygonLayerRef.current);
      }
      polygonLayerRef.current = e.layer;
      calculateAndSetArea(e.layer);

      // Listen for edit & drag events on the layer
      e.layer.on('pm:edit pm:dragend pm:vertexadded pm:vertexremoved', () => {
        calculateAndSetArea(e.layer);
      });
    });

    map.on('pm:remove', (e) => {
      if (polygonLayerRef.current === e.layer) {
        polygonLayerRef.current = null;
        if (onBoundaryChangeRef.current) {
          onBoundaryChangeRef.current(null, null);
        }
      }
    });

    map.on('pm:drawstart', () => setIsDrawing(true));
    map.on('pm:drawend', () => setIsDrawing(false));

    // Invalidate size to ensure proper rendering inside flex containers
    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      clearTimeout(resizeTimer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update marker position when latitude/longitude props change externally
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current) return;
    if (latitude && longitude && !isNaN(latitude) && !isNaN(longitude)) {
      const currentPos = markerRef.current.getLatLng();
      if (
        Math.abs(currentPos.lat - latitude) > 0.00001 ||
        Math.abs(currentPos.lng - longitude) > 0.00001
      ) {
        markerRef.current.setLatLng([latitude, longitude]);
        mapInstanceRef.current.panTo([latitude, longitude]);
      }
    }
  }, [latitude, longitude]);

  // Load and display saved farm boundary when editing an existing farm or switching farms
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // If update originated internally from the user drawing/editing right now, skip re-creating layer
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }

    const coords = getBoundaryCoordinates(farmBoundary);
    if (!coords || !Array.isArray(coords) || coords.length === 0) {
      if (polygonLayerRef.current) {
        map.removeLayer(polygonLayerRef.current);
        polygonLayerRef.current = null;
      }
      return;
    }

    // Clear previous layer
    if (polygonLayerRef.current) {
      map.removeLayer(polygonLayerRef.current);
      polygonLayerRef.current = null;
    }

    try {
      const geoJsonLayer = L.geoJSON(farmBoundary, {
        style: {
          color: '#059669',
          fillColor: '#10b981',
          fillOpacity: 0.35,
          weight: 3,
        },
      });

      geoJsonLayer.eachLayer((layer) => {
        polygonLayerRef.current = layer;
        layer.addTo(map);

        layer.on('pm:edit pm:dragend pm:vertexadded pm:vertexremoved', () => {
          try {
            const rawGeojson = layer.toGeoJSON();
            const polygonGeojson =
              rawGeojson.type === 'Feature' && rawGeojson.geometry ? rawGeojson.geometry : rawGeojson;
            const m2 = turfArea(rawGeojson);
            const acres = Number((m2 / SQ_METERS_PER_ACRE).toFixed(2));
            isInternalUpdateRef.current = true;
            if (onBoundaryChangeRef.current) {
              onBoundaryChangeRef.current(polygonGeojson, acres);
            }
          } catch (err) {
            console.error('Error recalculating area:', err);
          }
        });
      });

      const bounds = geoJsonLayer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    } catch (err) {
      console.warn('Could not parse farm boundary GeoJSON:', err);
    }
  }, [farmBoundary]);

  // Use My Current Location Handler (Browser Geolocation API)
  const handleUseCurrentLocation = () => {
    setGeoError(null);
    setGeoSuccess(false);

    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const { latitude: lat, longitude: lng } = position.coords;
        onLocationChange(lat, lng);
        setGeoSuccess(true);
        setTimeout(() => setGeoSuccess(false), 4000);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], 17);
        }
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        }
      },
      (err) => {
        setLocating(false);
        let msg = 'Unable to retrieve location. Please click on the map to set your farm location.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location access was denied. You can click anywhere on the map or drag the pin to set your farm location.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Location request timed out. Please click on the map to select your farm location.';
        }
        setGeoError(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Toggle Street vs Satellite layer
  const toggleTileLayer = (layerType) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (layerType === 'satellite' && activeLayer !== 'satellite') {
      map.removeLayer(baseLayersRef.current.streets);
      baseLayersRef.current.satellite.addTo(map);
      setActiveLayer('satellite');
    } else if (layerType === 'streets' && activeLayer !== 'streets') {
      map.removeLayer(baseLayersRef.current.satellite);
      baseLayersRef.current.streets.addTo(map);
      setActiveLayer('streets');
    }
  };

  // Trigger Geoman Polygon Draw
  const startDrawingPolygon = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (isEditing) {
      map.pm.disableGlobalEditMode();
      setIsEditing(false);
    }
    map.pm.enableDraw('Polygon', {
      snappable: true,
      snapDistance: 25,
      allowSelfIntersection: false,
      finishOn: 'dblclick',
      finishOnEnter: true,
      tooltips: true,
      templineStyle: { color: '#059669', dashArray: [5, 5] },
      hintlineStyle: { color: '#059669', dashArray: [5, 5] },
      pathOptions: {
        color: '#059669',
        fillColor: '#10b981',
        fillOpacity: 0.35,
        weight: 3,
      },
    });
    setIsDrawing(true);
  };

  // Complete drawing polygon
  const finishDrawing = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (map.pm.Draw?.Polygon && typeof map.pm.Draw.Polygon._finishShape === 'function') {
      map.pm.Draw.Polygon._finishShape();
    } else {
      map.pm.disableDraw();
    }
    setIsDrawing(false);
  };

  // Cancel drawing polygon
  const cancelDrawing = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.pm.disableDraw();
    setIsDrawing(false);
  };

  // Toggle Edit Mode
  const toggleEditMode = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (isDrawing) {
      map.pm.disableDraw();
      setIsDrawing(false);
    }
    map.pm.toggleGlobalEditMode();
    setIsEditing(map.pm.globalEditModeEnabled());
  };

  // Clear / Redraw Boundary
  const clearBoundary = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (polygonLayerRef.current) {
      map.removeLayer(polygonLayerRef.current);
      polygonLayerRef.current = null;
    }
    if (onBoundaryChangeRef.current) {
      onBoundaryChangeRef.current(null, null);
    }
    if (isEditing) {
      map.pm.disableGlobalEditMode();
      setIsEditing(false);
    }
    startDrawingPolygon();
  };

  return (
    <div className="space-y-3">
      {/* Top Map Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#f0f9f4] p-3 rounded-xl border border-[#c4e5d4]">
        <div className="flex items-center gap-2">
          {/* Current Location Button */}
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={locating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#047857] hover:bg-[#065f46] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
          >
            <Navigation className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
            <span>{locating ? 'Detecting Location...' : 'Use My Current Location'}</span>
          </button>

          {/* Satellite / Street Switcher */}
          <div className="inline-flex rounded-lg border border-[#DCE8DF] bg-white p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => toggleTileLayer('streets')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                activeLayer === 'streets' ? 'bg-[#047857] text-white font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Streets
            </button>
            <button
              type="button"
              onClick={() => toggleTileLayer('satellite')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                activeLayer === 'satellite' ? 'bg-[#047857] text-white font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Satellite
            </button>
          </div>
        </div>

        {/* Boundary Tools Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={startDrawingPolygon}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              isDrawing
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
            title="Click corners on the map to draw your farm boundary polygon"
          >
            <PenTool className="w-3.5 h-3.5 text-[#047857]" />
            <span>{isDrawing ? 'Drawing Boundary...' : 'Draw Boundary'}</span>
          </button>

          {hasBoundary && (
            <>
              <button
                type="button"
                onClick={toggleEditMode}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  isEditing
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
                title="Drag polygon vertices to adjust boundary"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#047857]" />
                <span>{isEditing ? 'Editing...' : 'Edit Boundary'}</span>
              </button>

              <button
                type="button"
                onClick={clearBoundary}
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-white text-red-700 border border-red-200 hover:bg-red-50 transition-colors cursor-pointer"
                title="Delete polygon and redraw"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Redraw</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Active Boundary Drawing Banner */}
      {isDrawing && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950 shadow-xs">
          <div className="flex items-center gap-2 font-medium">
            <PenTool className="w-4 h-4 text-amber-700 animate-pulse flex-shrink-0" />
            <span>
              Click corners around your farm field. <strong>Click the first vertex</strong>, <strong>double-click</strong>, or <strong>press Enter</strong> to close boundary.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={finishDrawing}
              className="px-3 py-1.5 rounded-lg bg-[#047857] hover:bg-[#065f46] text-white font-bold cursor-pointer shadow-xs transition-colors"
            >
              Complete Boundary
            </button>
            <button
              type="button"
              onClick={cancelDrawing}
              className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium cursor-pointer transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Geolocation feedback notices */}
      {geoSuccess && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs border border-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Current coordinates placed on the map.</span>
        </div>
      )}

      {geoError && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 text-amber-900 text-xs border border-amber-200">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>{geoError}</span>
        </div>
      )}

      {/* Leaflet Map Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-[#DCE8DF] shadow-xs">
        <div ref={mapContainerRef} className="w-full h-[360px] sm:h-[400px] z-0" />

        {/* Floating Instruction Overlay at Bottom */}
        <div className="absolute bottom-2 left-2 right-2 sm:right-auto sm:max-w-md bg-white/95 backdrop-blur-xs p-2.5 rounded-xl border border-slate-200 shadow-md text-[11px] text-slate-700 pointer-events-none z-10 flex items-start gap-2">
          <HelpCircle className="w-4 h-4 text-[#047857] flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-900">Map Guide:</span> Click anywhere or drag the green pin to set farm center. Use the <strong>Draw Boundary</strong> tool to outline your farm field corners. Area in acres is calculated automatically!
          </div>
        </div>
      </div>

      {/* Read-Only Coordinate & Calculated Area Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 bg-white rounded-xl border border-[#DCE8DF]">
          <span className="block text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">
            Selected Latitude (Read-Only)
          </span>
          <div className="font-mono text-xs sm:text-sm font-bold text-slate-900">
            {latitude && !isNaN(latitude) ? Number(latitude).toFixed(6) : '—'}
          </div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-[#DCE8DF]">
          <span className="block text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">
            Selected Longitude (Read-Only)
          </span>
          <div className="font-mono text-xs sm:text-sm font-bold text-slate-900">
            {longitude && !isNaN(longitude) ? Number(longitude).toFixed(6) : '—'}
          </div>
        </div>

        <div className="p-3 bg-gradient-to-br from-[#ecfef3] to-[#e1f7e9] rounded-xl border border-[#a7f3d0]">
          <span className="block text-[10.5px] font-semibold uppercase tracking-wider text-[#065f46] mb-0.5">
            Calculated Farm Area (Acres)
          </span>
          <div className="font-mono text-xs sm:text-sm font-extrabold text-[#047857] flex items-center gap-1.5">
            {calculatedAreaAcres !== null && calculatedAreaAcres !== undefined && calculatedAreaAcres > 0 ? (
              <>
                <span>{calculatedAreaAcres} Acres</span>
                <span className="text-[10px] font-normal text-[#065f46] bg-white/70 px-1.5 py-0.5 rounded-full border border-[#a7f3d0]">
                  Geodesic
                </span>
              </>
            ) : (
              <span className="text-slate-400 font-normal italic">Draw boundary on map</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
