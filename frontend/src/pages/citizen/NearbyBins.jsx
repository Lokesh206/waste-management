import React, { useState, useEffect } from 'react';
import { binsAPI } from '../../services/api';
import LeafletMap from '../../components/LeafletMap';
import StatusBadge from '../../components/StatusBadge';
import BinInspectorModal from '../../components/BinInspectorModal';
import {
  MapPin,
  Search,
  Filter,
  RefreshCw,
  Locate,
  Footprints,
  ExternalLink,
  Navigation,
  Sparkles,
  Layers,
  ArrowUpDown,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Compass,
} from 'lucide-react';
import {
  getCurrentUserLocation,
  reverseGeocode,
  calculateDistanceKm,
  formatDistance,
  estimateWalkingTime,
  getGoogleMapsDirectionsUrl,
  generateLocalSmartBins,
} from '../../services/locationService';

export default function NearbyBins() {
  const [bins, setBins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [wasteFilter, setWasteFilter] = useState('');
  const [sortBy, setSortBy] = useState('nearest'); // 'nearest' | 'fullest' | 'emptiest' | 'code'

  // User Live Geolocation State
  const [userCoords, setUserCoords] = useState(null);
  const [userAddress, setUserAddress] = useState('');
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [isLocalDeployed, setIsLocalDeployed] = useState(false);

  // Inspector Modal State
  const [selectedBin, setSelectedBin] = useState(null);

  const fetchBins = async () => {
    setLoading(true);
    try {
      const res = await binsAPI.getAll();
      if (res.data.success && res.data.bins && res.data.bins.length > 0) {
        setBins(res.data.bins);
      }
    } catch (err) {
      console.error('Error loading bins', err);
    } finally {
      setLoading(false);
    }
  };

  // Acquire Live GPS location on mount
  const handleDetectLocation = async () => {
    setLocating(true);
    setLocationError('');
    try {
      const pos = await getCurrentUserLocation({ enableHighAccuracy: true, timeout: 8000 });
      const coords = [pos.latitude, pos.longitude];
      setUserCoords(coords);

      // Reverse geocode to real address
      reverseGeocode(pos.latitude, pos.longitude).then((geo) => {
        if (geo && geo.formattedAddress) {
          setUserAddress(geo.formattedAddress);
        }
      });
    } catch (err) {
      setLocationError(err.message);
    } finally {
      setLocating(false);
    }
  };

  useEffect(() => {
    fetchBins();
    // Try to auto-detect location gently
    handleDetectLocation();
  }, []);

  // Deploy Local Smart Bins around User's current location
  const handleDeployLocalBins = () => {
    if (!userCoords) return;
    const localBins = generateLocalSmartBins(userCoords[0], userCoords[1], 8);
    setBins(localBins);
    setIsLocalDeployed(true);
    setSortBy('nearest');
  };

  // Calculate distance for all bins if userCoords available
  const enrichedBins = bins.map((b) => {
    const distKm = userCoords ? calculateDistanceKm(userCoords[0], userCoords[1], b.latitude, b.longitude) : null;
    return {
      ...b,
      distanceKm: distKm,
    };
  });

  // Check if user is very far from default bins (e.g. > 20 km)
  const isFarFromDefaultBins =
    userCoords &&
    !isLocalDeployed &&
    enrichedBins.length > 0 &&
    enrichedBins.every((b) => b.distanceKm == null || b.distanceKm > 20);

  // Filter & Sort
  const filteredBins = enrichedBins
    .filter((b) => {
      const matchesSearch =
        b.bin_code.toLowerCase().includes(search.toLowerCase()) ||
        b.location_name.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = wasteFilter ? (b.waste_type === wasteFilter || b.all_types_available) : true;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'nearest') {
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      }
      if (sortBy === 'fullest') {
        return (b.current_fill_percentage || 0) - (a.current_fill_percentage || 0);
      }
      if (sortBy === 'emptiest') {
        return (a.current_fill_percentage || 0) - (b.current_fill_percentage || 0);
      }
      return a.bin_code.localeCompare(b.bin_code);
    });

  const closestBin = userCoords && filteredBins.length > 0 && filteredBins[0].distanceKm != null ? filteredBins[0] : null;

  return (
    <div className="space-y-6">
      {/* Header & Live GPS Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold mb-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>Real-Time Citizen Waste Guidance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Nearby Smart Bins</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Find closest segregation chambers, view real-time fill capacity, and get walking directions.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleDetectLocation}
            disabled={locating}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-sm flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
          >
            <Locate className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
            <span>{locating ? 'Locating...' : 'Use My GPS'}</span>
          </button>

          <button
            onClick={fetchBins}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Live Location Status Card */}
      {userCoords && (
        <div className="bg-gradient-to-r from-blue-900/10 via-emerald-900/5 to-slate-900/5 p-4 rounded-3xl border border-blue-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-600/20 shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900">Your Current GPS:</span>
                <span className="font-mono text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  {userCoords[0].toFixed(4)}, {userCoords[1].toFixed(4)}
                </span>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  ✓ Active
                </span>
              </div>
              <p className="text-slate-600 text-[11px] mt-0.5 line-clamp-1">
                {userAddress || 'Locating nearest street address...'}
              </p>
            </div>
          </div>

          {closestBin && (
            <div className="flex items-center gap-2 shrink-0 bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs">
              <Footprints className="w-4 h-4 text-emerald-600" />
              <div className="text-right sm:text-left">
                <span className="text-[10px] text-slate-400 block font-semibold">Closest Smart Bin</span>
                <span className="font-bold text-slate-900">{closestBin.bin_code}</span>
                <span className="ml-1.5 text-emerald-600 font-bold">({formatDistance(closestBin.distanceKm)})</span>
              </div>
            </div>
          )}
        </div>
      )}

      {locationError && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{locationError}</span>
        </div>
      )}

      {/* Global Testing Helper Banner: Deploy Smart Bins in User's Area if outside default city */}
      {isFarFromDefaultBins && (
        <div className="p-4 bg-gradient-to-r from-purple-950/90 to-slate-900 text-white rounded-3xl border border-purple-500/40 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-bold shrink-0">
              <Sparkles className="w-5 h-5 text-purple-200" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-purple-100">Live Location Outside Bengaluru?</h3>
              <p className="text-xs text-purple-300">
                Default demonstration bins are in Bengaluru. Click to deploy 8 simulated IoT smart bins directly in your neighborhood ({userAddress ? userAddress.split(',')[0] : 'Your Live Coordinates'}).
              </p>
            </div>
          </div>

          <button
            onClick={handleDeployLocalBins}
            className="px-4 py-2.5 rounded-xl font-black text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition shadow-md shrink-0 flex items-center gap-1.5 active:scale-95"
          >
            <span>Deploy Smart Bins Around Me</span>
            <span>→</span>
          </button>
        </div>
      )}

      {/* Interactive Map View */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-900 text-sm">Real-Time City Map</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600">
              {filteredBins.length} Bins Visible
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1 text-[11px] text-slate-600 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Normal (0-50%)
            </span>
            <span className="flex items-center gap-1 text-[11px] text-slate-600 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Moderate (51-75%)
            </span>
            <span className="flex items-center gap-1 text-[11px] text-slate-600 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Almost Full (76-90%)
            </span>
            <span className="flex items-center gap-1 text-[11px] text-slate-600 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Critical (91-100%)
            </span>
          </div>
        </div>

        <LeafletMap
          bins={filteredBins}
          height="420px"
          userLocation={userCoords}
          center={userCoords || [12.9716, 77.5946]}
          onBinClick={(b) => setSelectedBin(b)}
          onUserLocationChange={(coords) => {
            setUserCoords(coords);
            reverseGeocode(coords[0], coords[1]).then((geo) => {
              if (geo?.formattedAddress) setUserAddress(geo.formattedAddress);
            });
          }}
        />
      </div>

      {/* Filter, Sort & Search Toolbar */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by bin code, street, or landmark..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={wasteFilter}
              onChange={(e) => setWasteFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 font-semibold focus:outline-none focus:border-emerald-500"
            >
              <option value="">All Waste Streams</option>
              <option value="Plastic">Plastic</option>
              <option value="Organic">Organic</option>
              <option value="Paper">Paper</option>
              <option value="Glass">Glass</option>
              <option value="Metal">Metal</option>
              <option value="E-Waste">E-Waste</option>
              <option value="Hazardous">Hazardous</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 font-semibold focus:outline-none focus:border-blue-500"
            >
              <option value="nearest">📍 Nearest First</option>
              <option value="emptiest">🟢 Least Full (Easy Deposit)</option>
              <option value="fullest">🚨 Highest Fill Level</option>
              <option value="code">🏷️ Bin Code</option>
            </select>
          </div>
        </div>

        {/* Bins Table / Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Bin Code</th>
                <th className="py-3 px-4">Location & Ward</th>
                <th className="py-3 px-4">Live Distance</th>
                <th className="py-3 px-4">Fill Level</th>
                <th className="py-3 px-4">Internal Chambers</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Navigation & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBins.map((b) => {
                const navUrl = getGoogleMapsDirectionsUrl({
                  destinationLat: b.latitude,
                  destinationLng: b.longitude,
                  originLat: userCoords?.[0],
                  originLng: userCoords?.[1],
                  travelMode: 'walking',
                });

                return (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-black text-slate-900 text-sm">{b.bin_code}</div>
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                        All-in-One Multi-Stream
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-800 text-xs">{b.location_name}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 font-mono">
                        <span>{b.ward || 'Municipal Ward'}</span>
                        <span>•</span>
                        <span>{b.latitude.toFixed(4)}, {b.longitude.toFixed(4)}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {b.distanceKm != null ? (
                        <div>
                          <span className="font-extrabold text-blue-700 flex items-center gap-1 text-xs">
                            <Footprints className="w-3.5 h-3.5 text-blue-500" />
                            <span>{formatDistance(b.distanceKm)}</span>
                          </span>
                          <span className="text-[10px] text-slate-400 block font-semibold">
                            {estimateWalkingTime(b.distanceKm)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 min-w-[130px]">
                      <div className="flex items-center justify-between text-xs font-bold mb-1">
                        <span
                          className={
                            b.current_fill_percentage >= 91
                              ? 'text-rose-600'
                              : b.current_fill_percentage >= 76
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          }
                        >
                          {b.current_fill_percentage}% Full
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            b.current_fill_percentage >= 91
                              ? 'bg-rose-500'
                              : b.current_fill_percentage >= 76
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, b.current_fill_percentage)}%` }}
                        />
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 text-base" title="Plastic, Organic, Paper, Glass, Metal, E-Waste">
                        <span>🍏</span>
                        <span>🥤</span>
                        <span>📦</span>
                        <span>🍾</span>
                        <span>⚙️</span>
                        <span>⚡</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Optical Segregated</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={b.status} />
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={navUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-xl font-bold text-[11px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition flex items-center gap-1 shadow-2xs"
                          title="Open Walking Navigation in Google Maps"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Directions</span>
                        </a>

                        <button
                          onClick={() => setSelectedBin(b)}
                          className="px-2.5 py-1.5 rounded-xl font-bold text-[11px] bg-slate-900 text-white hover:bg-slate-800 transition flex items-center gap-1 shadow-2xs"
                        >
                          <span>Deposit & Inspect</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bin Inspector Modal */}
      {selectedBin && (
        <BinInspectorModal
          bin={selectedBin}
          onClose={() => setSelectedBin(null)}
          onRefresh={fetchBins}
        />
      )}
    </div>
  );
}
