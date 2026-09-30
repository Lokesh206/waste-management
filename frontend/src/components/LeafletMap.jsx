import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  Navigation,
  Locate,
  Compass,
  Layers,
  Key,
  Check,
  X,
  ExternalLink,
  Radio,
  BatteryCharging,
  Wind,
  ShieldCheck,
  MapPin,
  Clock,
  Sparkles,
  Footprints,
} from 'lucide-react';
import { fetchMultiStopRoadRoute } from '../services/roadRoutingService';
import {
  getCurrentUserLocation,
  watchLiveLocation,
  clearLiveLocationWatch,
  calculateDistanceKm,
  formatDistance,
  estimateWalkingTime,
  getGoogleMapsDirectionsUrl,
} from '../services/locationService';

// Default installed bins pre-loaded for fallback so map is never empty
export const DEFAULT_INSTALLED_BINS = [
  { id: 1, bin_code: 'BIN-001', location_name: 'Central Plaza North Wing', latitude: 12.9719, longitude: 77.5937, capacity: 100, current_fill_percentage: 92.0, waste_type: 'All-in-One Multi-Waste Bin', status: 'Critical', battery_level_pct: 95, gas_level_ppm: 78, ward: 'Ward 101' },
  { id: 2, bin_code: 'BIN-002', location_name: 'Science Quadrangle Garden', latitude: 12.9734, longitude: 77.5951, capacity: 100, current_fill_percentage: 78.0, waste_type: 'All-in-One Multi-Waste Bin', status: 'Almost Full', battery_level_pct: 88, gas_level_ppm: 42, ward: 'Ward 101' },
  { id: 3, bin_code: 'BIN-003', location_name: 'Library Building Entrance', latitude: 12.9698, longitude: 77.5912, capacity: 100, current_fill_percentage: 45.0, waste_type: 'All-in-One Multi-Waste Bin', status: 'Normal', battery_level_pct: 92, gas_level_ppm: 18, ward: 'Ward 102' },
  { id: 4, bin_code: 'BIN-004', location_name: 'Cafeteria Recycling Bay', latitude: 12.9705, longitude: 77.5968, capacity: 100, current_fill_percentage: 65.0, waste_type: 'All-in-One Multi-Waste Bin', status: 'Moderate', battery_level_pct: 84, gas_level_ppm: 34, ward: 'Ward 102' },
  { id: 5, bin_code: 'BIN-005', location_name: 'Engineering Workshop Area', latitude: 12.9742, longitude: 77.5925, capacity: 100, current_fill_percentage: 88.0, waste_type: 'All-in-One Multi-Waste Bin', status: 'Almost Full', battery_level_pct: 90, gas_level_ppm: 55, ward: 'Ward 103' },
  { id: 6, bin_code: 'BIN-006', location_name: 'IT Tech Park Block A', latitude: 12.9755, longitude: 77.5982, capacity: 100, current_fill_percentage: 20.0, waste_type: 'All-in-One Multi-Waste Bin', status: 'Normal', battery_level_pct: 98, gas_level_ppm: 12, ward: 'Ward 103' },
  { id: 7, bin_code: 'BIN-007', location_name: 'Student Center Courtyard', latitude: 12.9682, longitude: 77.5974, capacity: 100, current_fill_percentage: 55.0, waste_type: 'All-in-One Multi-Waste Bin', status: 'Moderate', battery_level_pct: 91, gas_level_ppm: 26, ward: 'Ward 104' },
  { id: 8, bin_code: 'BIN-008', location_name: 'Chemistry Research Labs', latitude: 12.9768, longitude: 77.5915, capacity: 100, current_fill_percentage: 15.0, waste_type: 'All-in-One Multi-Waste Bin', status: 'Normal', battery_level_pct: 96, gas_level_ppm: 14, ward: 'Ward 104' },
  { id: 9, bin_code: 'BIN-009', location_name: 'Sports Complex Main Gate', latitude: 12.9675, longitude: 77.5901, capacity: 100, current_fill_percentage: 82.0, waste_type: 'All-in-One Multi-Waste Bin', status: 'Almost Full', battery_level_pct: 82, gas_level_ppm: 62, ward: 'Ward 105' },
  { id: 10, bin_code: 'BIN-010', location_name: 'Botanical Park Walkway', latitude: 12.9728, longitude: 77.6002, capacity: 100, current_fill_percentage: 30.0, waste_type: 'All-in-One Multi-Waste Bin', status: 'Normal', battery_level_pct: 94, gas_level_ppm: 16, ward: 'Ward 105' },
];

// High-tech glowing SVG markers with fill percent badge
function createBinIcon(bin) {
  const fill = Math.round(bin.current_fill_percentage || 0);

  let borderColor = '#10b981'; // emerald
  let pulseGlow = '';
  let ringBg = '#065f46';

  if (bin.status === 'Critical' || fill >= 91) {
    borderColor = '#ef4444';
    ringBg = '#991b1b';
    pulseGlow = `
      <div style="position: absolute; inset: -10px; border-radius: 9999px; background: rgba(239, 68, 68, 0.45); animation: ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="position: absolute; inset: -4px; border-radius: 9999px; border: 2px solid #ef4444; animation: pulse 2s infinite;"></div>
    `;
  } else if (bin.status === 'Almost Full' || fill >= 76) {
    borderColor = '#f59e0b';
    ringBg = '#92400e';
    pulseGlow = `<div style="position: absolute; inset: -6px; border-radius: 9999px; background: rgba(245, 158, 11, 0.3); animation: ping 2.5s infinite;"></div>`;
  } else if (bin.status === 'Moderate' || fill >= 51) {
    borderColor = '#3b82f6';
    ringBg = '#1e40af';
  }

  const svgHtml = `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: translateZ(0);">
      ${pulseGlow}
      <div style="background: ${ringBg}; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2.5px solid ${borderColor}; box-shadow: 0 4px 14px rgba(0,0,0,0.6); position: relative; z-index: 20;">
        <span style="color: #ffffff; font-size: 11px; font-weight: 900; font-family: ui-sans-serif, system-ui, sans-serif;">${fill}%</span>
      </div>
      <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 7px solid ${borderColor}; margin-top: -1px; position: relative; z-index: 19;"></div>
      <div style="background: rgba(15, 23, 42, 0.95); color: #ffffff; padding: 2px 7px; border-radius: 8px; font-size: 9px; font-weight: 800; white-space: nowrap; margin-top: 3px; box-shadow: 0 4px 10px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.25); display: flex; align-items: center; gap: 3px;">
        <span>♻️</span>
        <span>${bin.bin_code}</span>
      </div>
    </div>
  `;

  return L.divIcon({
    html: svgHtml,
    className: 'custom-bin-pin',
    iconSize: [44, 58],
    iconAnchor: [22, 48],
    popupAnchor: [0, -42],
  });
}

// User current location pulsing radar marker with accuracy ripple
const userLocationIcon = L.divIcon({
  html: `
    <div style="position: relative; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(59, 130, 246, 0.4); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="width: 22px; height: 22px; border-radius: 50%; background: #2563eb; border: 3px solid #ffffff; box-shadow: 0 4px 14px rgba(0,0,0,0.6); position: relative; z-index: 2;"></div>
      <div style="position: absolute; top: 26px; background: #0f172a; color: #93c5fd; padding: 2px 8px; border-radius: 6px; font-size: 9px; font-weight: 800; white-space: nowrap; border: 1px solid rgba(59, 130, 246, 0.6); box-shadow: 0 2px 8px rgba(0,0,0,0.5);">
        📍 You Are Here
      </div>
    </div>
  `,
  className: 'user-location-pin',
  iconSize: [44, 44],
  iconAnchor: [22, 22],
  popupAnchor: [0, -22],
});

// Live Moving Garbage Collection Vehicle (Truck "Alpha-01")
const truckIcon = L.divIcon({
  html: `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
      <div style="position: absolute; inset: -8px; border-radius: 9999px; background: rgba(59, 130, 246, 0.45); animation: ping 1.8s infinite;"></div>
      <div style="background: linear-gradient(135deg, #1e40af, #2563eb); width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2.5px solid #ffffff; box-shadow: 0 6px 16px rgba(0,0,0,0.5); position: relative; z-index: 30;">
        <span style="font-size: 20px;">🚚</span>
      </div>
      <div style="background: #0f172a; color: #60a5fa; padding: 2px 8px; border-radius: 8px; font-size: 9px; font-weight: 800; white-space: nowrap; margin-top: 3px; box-shadow: 0 2px 8px rgba(0,0,0,0.5); border: 1px solid rgba(59, 130, 246, 0.5);">
        Alpha-01 • Active
      </div>
    </div>
  `,
  className: 'custom-truck-pin',
  iconSize: [44, 58],
  iconAnchor: [22, 46],
});

// Selected Incident Marker (Drop pin)
const incidentSelectedIcon = L.divIcon({
  html: `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
      <div style="position: absolute; inset: -6px; border-radius: 9999px; background: rgba(225, 29, 72, 0.4); animation: ping 1.5s infinite;"></div>
      <div style="background: #e11d48; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid #ffffff; box-shadow: 0 4px 14px rgba(225, 29, 72, 0.6); position: relative; z-index: 2;">
        <span style="font-size: 16px;">📍</span>
      </div>
      <div style="background: #0f172a; color: #fda4af; padding: 2px 8px; border-radius: 6px; font-size: 9px; font-weight: 800; white-space: nowrap; margin-top: 3px; border: 1px solid rgba(225, 29, 72, 0.6);">
        Incident Pin
      </div>
    </div>
  `,
  className: 'custom-selected-pin',
  iconSize: [40, 52],
  iconAnchor: [20, 42],
  popupAnchor: [0, -36],
});

// Complaint Incident Marker
const complaintIcon = L.divIcon({
  html: `
    <div style="background: #e11d48; width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center; border: 2.5px solid #ffffff; box-shadow: 0 4px 12px rgba(225, 29, 72, 0.5);">
      <svg style="width: 18px; height: 18px; fill: white;" viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
    </div>
  `,
  className: 'custom-complaint-pin',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -30],
});

// Auto-Fit Bounds helper - only fits when allowed
function AutoFitBounds({ bins, enabled = true }) {
  const map = useMap();
  useEffect(() => {
    if (enabled && bins && bins.length > 0) {
      try {
        const bounds = L.latLngBounds(bins.map((b) => [b.latitude, b.longitude]));
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
      } catch (e) {
        // Safe catch for invalid bounds
      }
    }
  }, [bins, map, enabled]);
  return null;
}

// Click to pick location
function LocationPicker({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      if (onLocationSelect) {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

// Recenter component with smooth flyTo animation
function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && Array.isArray(center) && center.length === 2 && !isNaN(center[0]) && !isNaN(center[1])) {
      map.flyTo(center, zoom || map.getZoom(), { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
}

export default function LeafletMap({
  bins = [],
  complaints = [],
  routeStops = [],
  truckPosition = null,
  selectedLocation,
  onLocationSelect,
  center = [12.9716, 77.5946],
  zoom = 14,
  height = '100%',
  onBinClick,
  onDispatchBin,
  dispatchTargetBin,
  isDispatching,
  activeRoadRoute = [],
  disableDefaultFallback = false,
  userLocation: externalUserLocation = null,
  onUserLocationChange,
}) {
  const [userLocation, setUserLocation] = useState(externalUserLocation);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [isWatchingLive, setIsWatchingLive] = useState(false);
  const [liveWatchId, setLiveWatchId] = useState(null);
  const [locationStatus, setLocationStatus] = useState('');
  const [activeCenter, setActiveCenter] = useState(center);
  const [roadRouteStops, setRoadRouteStops] = useState([]);

  // Sync external user location if provided
  useEffect(() => {
    if (externalUserLocation) {
      setUserLocation(externalUserLocation);
    }
  }, [externalUserLocation]);

  // Sync center prop if changed externally
  useEffect(() => {
    if (center) {
      setActiveCenter(center);
    }
  }, [center]);

  // Cleanup GPS watcher on unmount
  useEffect(() => {
    return () => {
      if (liveWatchId != null) {
        clearLiveLocationWatch(liveWatchId);
      }
    };
  }, [liveWatchId]);

  // Load road-following route for collector multi-stop route
  useEffect(() => {
    let isMounted = true;
    if (routeStops && routeStops.length > 1) {
      fetchMultiStopRoadRoute(routeStops).then((coords) => {
        if (isMounted && coords && coords.length > 0) {
          setRoadRouteStops(coords);
        }
      });
    } else {
      setRoadRouteStops([]);
    }
    return () => {
      isMounted = false;
    };
  }, [routeStops]);

  // Map Basemap Provider configuration (100% Free, Keyless, Watermark-Free)
  const [showLayersModal, setShowLayersModal] = useState(false);
  const [mapProvider, setMapProvider] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('swms_map_provider') : null;
    if (saved && saved !== 'carto' && saved !== 'dark') return saved;
    return 'esri';
  });

  // Automatically migrate legacy 'carto' or 'dark' setting to 'esri'
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('swms_map_provider');
      if (saved === 'carto' || saved === 'dark') {
        localStorage.setItem('swms_map_provider', 'esri');
        setMapProvider('esri');
      }
    }
  }, []);

  // Determine active bins: if caller explicitly supplied empty bins and disabled fallback or selectedLocation is active, do not force Bangalore bins
  const activeBins =
    bins && bins.length > 0
      ? bins
      : disableDefaultFallback || selectedLocation
      ? []
      : DEFAULT_INSTALLED_BINS;

  // Don't auto-fit bounds if user explicitly has a selectedLocation or has active GPS
  const shouldAutoFit = !selectedLocation && !userLocation && activeBins.length > 0;

  // Handle High-Accuracy Geolocation Lock
  const handleLocateMe = async () => {
    setLocationStatus('🛰️ Acquiring high-accuracy live GPS fix...');
    try {
      const pos = await getCurrentUserLocation({ enableHighAccuracy: true, timeout: 9000 });
      const coords = [pos.latitude, pos.longitude];
      setUserLocation(coords);
      setGpsAccuracy(pos.accuracy);
      setActiveCenter(coords);
      setLocationStatus(`✓ Live GPS Locked! (Accuracy: ±${pos.accuracy}m)`);

      if (onUserLocationChange) {
        onUserLocationChange(coords, pos);
      }
      if (onLocationSelect) {
        onLocationSelect(pos.latitude, pos.longitude);
      }
      setTimeout(() => setLocationStatus(''), 5000);
    } catch (err) {
      console.warn('Geolocation error:', err.message);
      const fallback = [12.9716, 77.5946];
      setUserLocation(fallback);
      setActiveCenter(fallback);
      setLocationStatus(`⚠️ ${err.message}. Centered to City Hub.`);
      if (onUserLocationChange) onUserLocationChange(fallback);
      if (onLocationSelect) onLocationSelect(fallback[0], fallback[1]);
      setTimeout(() => setLocationStatus(''), 6000);
    }
  };

  // Toggle Continuous Real-Time GPS Tracking
  const toggleLiveTracking = () => {
    if (isWatchingLive) {
      clearLiveLocationWatch(liveWatchId);
      setLiveWatchId(null);
      setIsWatchingLive(false);
      setLocationStatus('Live GPS tracking paused.');
      setTimeout(() => setLocationStatus(''), 3000);
    } else {
      setLocationStatus('🛰️ Live continuous GPS tracking engaged...');
      const id = watchLiveLocation(
        (pos) => {
          const coords = [pos.latitude, pos.longitude];
          setUserLocation(coords);
          setGpsAccuracy(pos.accuracy);
          setActiveCenter(coords);
          if (onUserLocationChange) onUserLocationChange(coords, pos);
          if (onLocationSelect) onLocationSelect(pos.latitude, pos.longitude);
        },
        (err) => {
          setLocationStatus(`⚠️ GPS Tracking error: ${err.message}`);
        },
        { enableHighAccuracy: true }
      );
      setLiveWatchId(id);
      setIsWatchingLive(true);
      setLocationStatus('🟢 Live GPS Follow Mode Active (Updating continuously)');
    }
  };

  const handleCenterCity = () => {
    setActiveCenter([12.9716, 77.5946]);
    setLocationStatus('Centered to City Operations Hub.');
    setTimeout(() => setLocationStatus(''), 3000);
  };

  const polylinePositions =
    routeStops.length > 1
      ? routeStops.map((stop) => [stop.latitude, stop.longitude])
      : [];

  return (
    <div style={{ height }} className="w-full relative overflow-hidden bg-slate-950 font-sans">
      {/* Floating Modern Map Controls */}
      <div className="absolute top-4 right-4 z-[400] flex flex-col items-end gap-2 pointer-events-auto">
        <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-700/80 shadow-xl text-xs">
          <button
            onClick={handleLocateMe}
            className="px-3 py-1.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white transition flex items-center gap-1.5 shadow-sm active:scale-95"
            title="Access High-Accuracy Live GPS Location"
          >
            <Locate className="w-3.5 h-3.5" />
            <span>Locate Me</span>
          </button>

          <button
            onClick={toggleLiveTracking}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95 ${
              isWatchingLive
                ? 'bg-emerald-600 text-white ring-2 ring-emerald-400/50'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
            title="Toggle Continuous Live GPS Tracking"
          >
            <Radio className={`w-3.5 h-3.5 ${isWatchingLive ? 'animate-pulse text-white' : 'text-slate-400'}`} />
            <span>{isWatchingLive ? 'Live Tracking On' : 'Live Follow'}</span>
          </button>

          <button
            onClick={handleCenterCity}
            className="px-3 py-1.5 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center gap-1.5"
            title="Center City Hub"
          >
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span>Center Hub</span>
          </button>

          <button
            onClick={() => setShowLayersModal(!showLayersModal)}
            className="px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 shadow-sm"
            title="Switch Map Basemap Layer (100% Free, Zero Key, No Watermark)"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>Map Layers</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950/60 font-mono text-emerald-400 uppercase">
              {mapProvider}
            </span>
          </button>
        </div>

        {/* 100% Free, Keyless Basemap Selector Modal */}
        {showLayersModal && (
          <div className="w-80 p-4 rounded-2xl bg-slate-900/95 backdrop-blur-xl text-white shadow-2xl border border-slate-700/80 animate-in fade-in slide-in-from-top-2 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-700/80 mb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-sm">Select Map Basemap</span>
              </div>
              <button
                onClick={() => setShowLayersModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] text-slate-400">
                All basemaps are 100% free, fast, keyless, and watermark-free.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMapProvider('esri');
                    if (typeof window !== 'undefined') localStorage.setItem('swms_map_provider', 'esri');
                    setShowLayersModal(false);
                  }}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition ${
                    mapProvider === 'esri'
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-200'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span className="font-bold text-[11px] text-white flex items-center gap-1.5">
                    <span>🏙️</span> ESRI Streets
                  </span>
                  <span className="text-[9px] text-emerald-400 font-semibold">Recommended • HD</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMapProvider('osm');
                    if (typeof window !== 'undefined') localStorage.setItem('swms_map_provider', 'osm');
                    setShowLayersModal(false);
                  }}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition ${
                    mapProvider === 'osm'
                      ? 'bg-blue-600/20 border-blue-500 text-blue-200'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span className="font-bold text-[11px] text-white flex items-center gap-1.5">
                    <span>🌍</span> OpenStreetMap
                  </span>
                  <span className="text-[9px] text-blue-300 font-semibold">Standard OSM</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMapProvider('hot');
                    if (typeof window !== 'undefined') localStorage.setItem('swms_map_provider', 'hot');
                    setShowLayersModal(false);
                  }}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition ${
                    mapProvider === 'hot'
                      ? 'bg-amber-600/20 border-amber-500 text-amber-200'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span className="font-bold text-[11px] text-white flex items-center gap-1.5">
                    <span>🚚</span> Municipal HOT
                  </span>
                  <span className="text-[9px] text-amber-400 font-semibold">High-Contrast Roads</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMapProvider('satellite');
                    if (typeof window !== 'undefined') localStorage.setItem('swms_map_provider', 'satellite');
                    setShowLayersModal(false);
                  }}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition ${
                    mapProvider === 'satellite'
                      ? 'bg-purple-600/20 border-purple-500 text-purple-200'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span className="font-bold text-[11px] text-white flex items-center gap-1.5">
                    <span>🛰️</span> Aerial Satellite
                  </span>
                  <span className="text-[9px] text-purple-300 font-semibold">True Imagery</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {locationStatus && (
          <div className="p-2.5 rounded-2xl bg-slate-900/95 backdrop-blur-md text-emerald-300 text-[11px] font-semibold shadow-2xl border border-emerald-500/30 max-w-xs animate-in fade-in">
            {locationStatus}
          </div>
        )}
      </div>

      <MapContainer
        center={activeCenter}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <MapController center={activeCenter} zoom={zoom} />
        <AutoFitBounds bins={activeBins} enabled={shouldAutoFit} />
        {onLocationSelect && <LocationPicker onLocationSelect={onLocationSelect} />}

        {/* 100% Free, Keyless, Watermark-Free High Performance Basemaps */}
        {mapProvider === 'osm' ? (
          <TileLayer
            key="osm-tiles-clean"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
        ) : mapProvider === 'hot' ? (
          <TileLayer
            key="osm-hot-tiles"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/">HOT</a>'
            url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
            maxZoom={19}
          />
        ) : mapProvider === 'satellite' ? (
          <TileLayer
            key="esri-satellite-tiles"
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
          />
        ) : (
          <TileLayer
            key="esri-street-tiles"
            attribution='Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, METI, TomTom'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
          />
        )}

        {/* Route Polyline for Collector navigation (follows physical road network) */}
        {roadRouteStops && roadRouteStops.length > 0 ? (
          <Polyline positions={roadRouteStops} color="#10b981" weight={6} opacity={0.85} />
        ) : polylinePositions.length > 0 ? (
          <Polyline positions={polylinePositions} color="#10b981" weight={5} dashArray="6, 8" />
        ) : null}

        {/* Dynamic Road Network Route Polyline (Truck navigates strictly in roads) */}
        {isDispatching && (
          activeRoadRoute && activeRoadRoute.length > 0 ? (
            <Polyline
              positions={activeRoadRoute}
              color="#2563eb"
              weight={6}
              opacity={0.9}
            />
          ) : (
            dispatchTargetBin && truckPosition && (
              <Polyline
                positions={[truckPosition, [dispatchTargetBin.latitude, dispatchTargetBin.longitude]]}
                color="#3b82f6"
                weight={5}
                dashArray="8, 10"
              />
            )
          )
        )}

        {/* Live Moving Garbage Truck Vehicle (Unit Alpha-01) */}
        {truckPosition && (
          <Marker position={truckPosition} icon={truckIcon}>
            <Popup>
              <div className="p-1 min-w-[200px] font-sans">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">🚚</span>
                  <strong className="text-blue-400 text-xs">Vehicle Alpha-01 (Municipal Fleet)</strong>
                </div>
                <p className="text-[11px] text-slate-300">Status: Dispatched to Priority Bins</p>
                <div className="mt-2 text-[10px] text-slate-400 font-mono">
                  Coordinates: {truckPosition[0].toFixed(4)}, {truckPosition[1].toFixed(4)}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* GPS Accuracy Circle */}
        {userLocation && gpsAccuracy && gpsAccuracy < 1500 && (
          <Circle
            center={userLocation}
            radius={gpsAccuracy}
            pathOptions={{
              color: '#3b82f6',
              fillColor: '#3b82f6',
              fillOpacity: 0.12,
              weight: 1.5,
              dashArray: '3, 4',
            }}
          />
        )}

        {/* User Current Location Marker */}
        {userLocation && (
          <Marker position={userLocation} icon={userLocationIcon}>
            <Popup>
              <div className="p-1.5 text-xs font-sans min-w-[180px]">
                <strong className="text-blue-400 block mb-1 text-xs">📍 Your Live GPS Location</strong>
                <p className="text-slate-300 font-mono text-[11px]">
                  {userLocation[0].toFixed(5)}, {userLocation[1].toFixed(5)}
                </p>
                {gpsAccuracy && (
                  <p className="text-[10px] text-emerald-400 mt-1 font-semibold">
                    GPS Accuracy: ±{gpsAccuracy} meters
                  </p>
                )}
                {isWatchingLive && (
                  <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Live Follow Mode Active
                  </span>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Smart Bin Hardware Nodes */}
        {activeBins.map((bin) => {
          const userDistKm = userLocation ? calculateDistanceKm(userLocation[0], userLocation[1], bin.latitude, bin.longitude) : null;
          const navUrl = getGoogleMapsDirectionsUrl({
            destinationLat: bin.latitude,
            destinationLng: bin.longitude,
            originLat: userLocation?.[0],
            originLng: userLocation?.[1],
            travelMode: 'walking',
          });

          return (
            <Marker
              key={`bin-${bin.id}`}
              position={[bin.latitude, bin.longitude]}
              icon={createBinIcon(bin)}
              eventHandlers={{
                click: () => onBinClick && onBinClick(bin),
              }}
            >
              <Popup>
                <div className="p-2 min-w-[260px] font-sans">
                  {/* Bin Header */}
                  <div className="flex items-center justify-between border-b border-slate-700/80 pb-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-black text-white">{bin.bin_code}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-950/80 text-purple-300 border border-purple-700/60">
                        All-in-One AI Bin
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        bin.current_fill_percentage >= 91
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          : bin.current_fill_percentage >= 76
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      }`}
                    >
                      {bin.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 font-medium mb-1.5">{bin.location_name}</p>

                  {/* Real-World Distance from User */}
                  {userDistKm != null && (
                    <div className="p-1.5 rounded-lg bg-blue-950/40 border border-blue-800/40 flex items-center justify-between text-[11px] mb-2 font-medium text-blue-200">
                      <span className="flex items-center gap-1">
                        <Footprints className="w-3.5 h-3.5 text-blue-400" />
                        <span>Distance: <strong>{formatDistance(userDistKm)}</strong></span>
                      </span>
                      <span className="text-slate-400 text-[10px] font-semibold">{estimateWalkingTime(userDistKm)}</span>
                    </div>
                  )}

                  {/* Fill Level Progress */}
                  <div className="mb-2">
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-400">Total Fill Level:</span>
                      <span
                        className={
                          bin.current_fill_percentage >= 91
                            ? 'text-rose-400'
                            : bin.current_fill_percentage >= 76
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }
                      >
                        {bin.current_fill_percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          bin.current_fill_percentage >= 91
                            ? 'bg-rose-500'
                            : bin.current_fill_percentage >= 76
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, bin.current_fill_percentage)}%` }}
                      />
                    </div>
                  </div>

                  {/* IoT Sensors Telemetry Badge Bar */}
                  <div className="grid grid-cols-2 gap-1.5 mb-2 text-[10px]">
                    <div className="p-1 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1">
                        <BatteryCharging className="w-3 h-3 text-emerald-400" />
                        <span>Battery</span>
                      </span>
                      <span className="font-bold text-slate-200">{bin.battery_level_pct || 92}% Solar</span>
                    </div>
                    <div className="p-1 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1">
                        <Wind className="w-3 h-3 text-amber-400" />
                        <span>Odor/Gas</span>
                      </span>
                      <span className="font-bold text-slate-200">{bin.gas_level_ppm || 24} ppm</span>
                    </div>
                  </div>

                  {/* 6-Stream Chambers Mini Bar */}
                  <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 mb-2">
                    <div className="flex justify-between items-center text-[10px] font-semibold text-slate-400 mb-1">
                      <span>Internal Chambers:</span>
                      <span className="text-emerald-400 font-bold">Auto-Sorted</span>
                    </div>
                    <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-slate-950 gap-0.5">
                      <div className="h-full bg-blue-500" style={{ width: '28%' }} title="Plastic" />
                      <div className="h-full bg-emerald-500" style={{ width: '25%' }} title="Organic" />
                      <div className="h-full bg-amber-500" style={{ width: '18%' }} title="Paper" />
                      <div className="h-full bg-teal-500" style={{ width: '14%' }} title="Glass" />
                      <div className="h-full bg-indigo-500" style={{ width: '10%' }} title="Metal" />
                      <div className="h-full bg-yellow-500" style={{ width: '5%' }} title="E-Waste" />
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-slate-400 mt-1 font-mono">
                      <span>🍏 🥤 📦 🍾 ⚙️ ⚡</span>
                      <span className="text-purple-300">All Streams Accepted</span>
                    </div>
                  </div>

                  {/* Google Maps External Directions Link */}
                  <a
                    href={navUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-1.5 px-3 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 text-xs font-bold transition flex items-center justify-center gap-1.5 border border-emerald-600/40 mb-1.5 active:scale-95 shadow-sm"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Navigate in Google Maps</span>
                  </a>

                  {onDispatchBin && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDispatchBin(bin);
                      }}
                      disabled={isDispatching}
                      className={`w-full py-2 px-3 rounded-xl font-black text-xs transition flex items-center justify-center gap-1.5 shadow-md active:scale-95 disabled:opacity-60 ${
                        isDispatching && dispatchTargetBin?.bin_code === bin.bin_code
                          ? 'bg-amber-500 text-slate-950 animate-pulse font-bold'
                          : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40'
                      }`}
                    >
                      <span>🚚</span>
                      <span>
                        {isDispatching && dispatchTargetBin?.bin_code === bin.bin_code
                          ? 'Alpha-01 En Route to this Bin...'
                          : 'Accept & Dispatch Truck'}
                      </span>
                    </button>
                  )}

                  {onBinClick && (
                    <button
                      type="button"
                      onClick={() => onBinClick(bin)}
                      className="mt-1.5 w-full py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-1 border border-slate-700 active:scale-95"
                    >
                      <span>Deposit & Inspect Multi-Chambers →</span>
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Complaints Markers */}
        {complaints.map((c) => (
          <Marker key={`complaint-${c.id}`} position={[c.latitude, c.longitude]} icon={complaintIcon}>
            <Popup>
              <div className="p-2 min-w-[200px]">
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wide">Reported Illegal Dumping</span>
                <p className="font-bold text-white text-xs mt-1">{c.title}</p>
                <p className="text-xs text-slate-300 mt-1 line-clamp-2">{c.description}</p>
                <div className="mt-2 text-xs">
                  <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-semibold">{c.status}</span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Interactive Selected Location Pin (when citizen clicks to report) */}
        {selectedLocation && (
          <Marker position={[selectedLocation.latitude, selectedLocation.longitude]} icon={incidentSelectedIcon}>
            <Popup>
              <div className="text-xs font-semibold p-1.5 text-slate-900">
                <span className="text-rose-600 font-bold block mb-1">📍 Incident Report Pin</span>
                <span className="text-slate-600 font-mono text-[11px]">
                  {selectedLocation.latitude.toFixed(4)}, {selectedLocation.longitude.toFixed(4)}
                </span>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
