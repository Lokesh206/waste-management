import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { binsAPI } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import { getCurrentUserLocation } from '../../services/locationService';
import {
  Trash2,
  Plus,
  Edit3,
  TrendingUp,
  X,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  MapPin,
  Locate,
  Save,
  Compass,
} from 'lucide-react';

// Custom Glowing Pin for Interactive Relocation Picker
const customPinIcon = L.divIcon({
  html: `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
      <div style="position: absolute; inset: -8px; border-radius: 9999px; background: rgba(16, 185, 129, 0.4); animation: ping 1.8s infinite;"></div>
      <div style="background: #10b981; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2.5px solid #ffffff; box-shadow: 0 4px 14px rgba(0,0,0,0.5); position: relative; z-index: 2;">
        <span style="font-size: 16px;">📍</span>
      </div>
      <div style="background: #0f172a; color: #a7f3d0; padding: 2px 8px; border-radius: 6px; font-size: 9px; font-weight: 800; white-space: nowrap; margin-top: 3px; border: 1px solid rgba(16, 185, 129, 0.6); box-shadow: 0 2px 8px rgba(0,0,0,0.5);">
        Bin Location
      </div>
    </div>
  `,
  className: 'custom-relocate-pin',
  iconSize: [40, 52],
  iconAnchor: [20, 42],
});

// Interactive Mini-Map Component for Picking Coordinates
function RelocateMapPicker({ position, onPositionChange }) {
  function MapEvents() {
    const map = useMap();
    useMapEvents({
      click(e) {
        onPositionChange([
          parseFloat(e.latlng.lat.toFixed(6)),
          parseFloat(e.latlng.lng.toFixed(6)),
        ]);
      },
    });

    useEffect(() => {
      if (position && !isNaN(position[0]) && !isNaN(position[1])) {
        map.flyTo(position, map.getZoom(), { duration: 0.4 });
      }
    }, [position, map]);

    return null;
  }

  const validPosition =
    position && !isNaN(position[0]) && !isNaN(position[1])
      ? position
      : [12.9716, 77.5946];

  return (
    <div className="h-60 w-full rounded-2xl overflow-hidden border border-slate-200 relative shadow-inner">
      <MapContainer
        center={validPosition}
        zoom={15}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
        />
        <Marker position={validPosition} icon={customPinIcon} />
        <MapEvents />
      </MapContainer>
      <div className="absolute bottom-2 left-2 z-[400] bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-xl text-[10px] text-emerald-400 font-mono border border-slate-700 pointer-events-none shadow-md flex items-center gap-1.5">
        <Compass className="w-3 h-3 text-emerald-400 animate-spin" />
        <span>Click anywhere on the map to place bin</span>
      </div>
    </div>
  );
}

export default function BinsManager() {
  const [bins, setBins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editModalBin, setEditModalBin] = useState(null);
  const [isLocatingGps, setIsLocatingGps] = useState(false);

  const [predictionModal, setPredictionModal] = useState(null);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [predictionData, setPredictionData] = useState(null);

  const [formData, setFormData] = useState({
    bin_code: '',
    location_name: '',
    latitude: 12.9716,
    longitude: 77.5946,
    capacity: 100,
    waste_type: 'Plastic',
  });

  const [editFormData, setEditFormData] = useState({
    location_name: '',
    latitude: 12.9716,
    longitude: 77.5946,
    capacity: 100,
    waste_type: 'Plastic',
  });

  const [formError, setFormError] = useState('');
  const [message, setMessage] = useState('');

  const fetchBins = async () => {
    setLoading(true);
    try {
      const res = await binsAPI.getAll();
      if (res.data.success) {
        setBins(res.data.bins || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBins();
  }, []);

  // Open Edit/Relocate Modal
  const handleOpenEditModal = (bin) => {
    setEditModalBin(bin);
    setEditFormData({
      location_name: bin.location_name || '',
      latitude: bin.latitude || 12.9716,
      longitude: bin.longitude || 77.5946,
      capacity: bin.capacity || 100,
      waste_type: bin.waste_type || 'Plastic',
    });
    setFormError('');
  };

  // Submit Bin Update & Relocation
  const handleSaveEditBin = async (e) => {
    e.preventDefault();
    if (!editModalBin) return;
    setFormError('');

    try {
      const res = await binsAPI.update(editModalBin.id, editFormData);
      if (res.data.success) {
        const updatedBin = res.data.bin;
        setMessage(
          `✓ Smart Bin ${editModalBin.bin_code} relocated & updated successfully.`
        );
        setEditModalBin(null);
        // Update bin list in place
        setBins((prev) =>
          prev.map((b) => (b.id === editModalBin.id ? { ...b, ...updatedBin, ...editFormData } : b))
        );
        fetchBins();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to update smart bin location.');
    }
  };

  // Lock Admin Current GPS for Add Form
  const handleGpsForNewBin = async () => {
    setIsLocatingGps(true);
    try {
      const pos = await getCurrentUserLocation();
      setFormData((prev) => ({
        ...prev,
        latitude: pos.latitude,
        longitude: pos.longitude,
      }));
      setMessage(`Locked to live GPS: ${pos.latitude}, ${pos.longitude}`);
    } catch (err) {
      alert(`GPS Lock error: ${err.message}`);
    } finally {
      setIsLocatingGps(false);
    }
  };

  // Lock Admin Current GPS for Relocate Form
  const handleGpsForEditBin = async () => {
    setIsLocatingGps(true);
    try {
      const pos = await getCurrentUserLocation();
      setEditFormData((prev) => ({
        ...prev,
        latitude: pos.latitude,
        longitude: pos.longitude,
      }));
      setMessage(`Locked to live GPS: ${pos.latitude}, ${pos.longitude}`);
    } catch (err) {
      alert(`GPS Lock error: ${err.message}`);
    } finally {
      setIsLocatingGps(false);
    }
  };

  const handleCreateBin = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      const res = await binsAPI.create(formData);
      if (res.data.success) {
        setMessage(`Smart Bin ${formData.bin_code} registered successfully.`);
        setShowAddModal(false);
        setFormData({
          bin_code: '',
          location_name: '',
          latitude: 12.9716,
          longitude: 77.5946,
          capacity: 100,
          waste_type: 'Plastic',
        });
        fetchBins();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create bin.');
    }
  };

  const handleDeleteBin = async (id, code) => {
    if (!window.confirm(`Are you sure you want to remove bin ${code}?`)) return;
    try {
      await binsAPI.delete(id);
      setMessage(`Bin ${code} deleted.`);
      fetchBins();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePredict = async (bin) => {
    setPredictionModal(bin);
    setPredictionLoading(true);
    setPredictionData(null);
    try {
      const res = await binsAPI.getPrediction(bin.id);
      if (res.data.success) {
        setPredictionData(res.data.prediction);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPredictionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Smart Bins Registry & Location Manager</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Relocate smart bins dynamically on interactive maps, calibrate physical capacities, and review fill forecasts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Smart Bin</span>
          </button>
          <button
            onClick={fetchBins}
            className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            title="Refresh Bins"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{message}</span>
          </div>
          <button onClick={() => setMessage('')} className="text-emerald-700 font-bold hover:text-emerald-900">&times;</button>
        </div>
      )}

      {/* Bins Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Bin Code</th>
                <th className="py-3 px-4">Location Name</th>
                <th className="py-3 px-4">Waste Stream</th>
                <th className="py-3 px-4">Height / Capacity</th>
                <th className="py-3 px-4">Current Fill</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">GPS Coordinates</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bins.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                    <span>{b.bin_code}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-800 font-medium">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{b.location_name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px] border border-slate-200">
                      {b.waste_type}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 font-mono">{b.capacity} cm</td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full ${
                            b.current_fill_percentage >= 90
                              ? 'bg-rose-500'
                              : b.current_fill_percentage >= 75
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, b.current_fill_percentage || 0)}%` }}
                        />
                      </div>
                      <span className="font-bold text-slate-900">{b.current_fill_percentage}%</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                    {Number(b.latitude).toFixed(4)}, {Number(b.longitude).toFixed(4)}
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                    {/* Relocate & Edit Button */}
                    <button
                      onClick={() => handleOpenEditModal(b)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition inline-flex items-center gap-1 shadow-2xs"
                      title="Relocate & Edit Smart Bin Coordinates"
                    >
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      <span>Relocate</span>
                    </button>

                    {/* Forecast Button */}
                    <button
                      onClick={() => handlePredict(b)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition inline-flex items-center gap-1"
                      title="Run Predictive Analytics"
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Forecast</span>
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeleteBin(b.id, b.bin_code)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition rounded-lg hover:bg-rose-50"
                      title="Delete Bin"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Relocate & Edit Smart Bin Modal */}
      {editModalBin && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-slate-200 space-y-4 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Relocate Smart Bin: {editModalBin.bin_code}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Click on the map or use GPS to reposition this smart bin. Changes broadcast live.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditModalBin(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditBin} className="space-y-4 text-xs">
              {/* Interactive Relocation Map */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-700 flex items-center gap-1.5">
                    <span>Interactive Location Picker</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      (Coordinates auto-update on pin click)
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGpsForEditBin}
                    disabled={isLocatingGps}
                    className="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold border border-blue-200 transition flex items-center gap-1"
                  >
                    <Locate className={`w-3.5 h-3.5 ${isLocatingGps ? 'animate-spin' : ''}`} />
                    <span>{isLocatingGps ? 'Locking GPS...' : 'Lock My GPS'}</span>
                  </button>
                </div>

                <RelocateMapPicker
                  position={[editFormData.latitude, editFormData.longitude]}
                  onPositionChange={([lat, lng]) => {
                    setEditFormData((prev) => ({
                      ...prev,
                      latitude: lat,
                      longitude: lng,
                    }));
                  }}
                />
              </div>

              {/* Form Input Fields */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Location Name / Physical Landmark
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.location_name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, location_name: e.target.value })
                  }
                  placeholder="e.g., Central Library West Entrance"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block font-semibold text-slate-700 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={editFormData.latitude}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        latitude: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-[11px]"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block font-semibold text-slate-700 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={editFormData.longitude}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        longitude: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-[11px]"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block font-semibold text-slate-700 mb-1">Waste Stream</label>
                  <select
                    value={editFormData.waste_type}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, waste_type: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="Plastic">Plastic</option>
                    <option value="Organic">Organic</option>
                    <option value="Paper">Paper</option>
                    <option value="Glass">Glass</option>
                    <option value="Metal">Metal</option>
                    <option value="E-Waste">E-Waste</option>
                    <option value="Hazardous">Hazardous</option>
                    <option value="General">General</option>
                    <option value="All-in-One Multi-Waste Bin">All-in-One</option>
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block font-semibold text-slate-700 mb-1">Height (cm)</label>
                  <input
                    type="number"
                    required
                    value={editFormData.capacity}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        capacity: parseInt(e.target.value, 10) || 100,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalBin(null)}
                  className="w-1/3 py-2.5 rounded-xl font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Location & Bin Configuration</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Smart Bin Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-slate-200 space-y-4 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Register New Smart Bin</h3>
                  <p className="text-[11px] text-slate-500">Pick coordinates directly on the interactive map</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateBin} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bin Code</label>
                  <input
                    type="text"
                    required
                    value={formData.bin_code}
                    onChange={(e) => setFormData({ ...formData, bin_code: e.target.value })}
                    placeholder="BIN-011"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Waste Stream</label>
                  <select
                    value={formData.waste_type}
                    onChange={(e) => setFormData({ ...formData, waste_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="Plastic">Plastic</option>
                    <option value="Organic">Organic</option>
                    <option value="Paper">Paper</option>
                    <option value="Glass">Glass</option>
                    <option value="Metal">Metal</option>
                    <option value="E-Waste">E-Waste</option>
                    <option value="Hazardous">Hazardous</option>
                    <option value="General">General</option>
                    <option value="All-in-One Multi-Waste Bin">All-in-One</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Location Name / Landmark</label>
                <input
                  type="text"
                  required
                  value={formData.location_name}
                  onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                  placeholder="e.g., East Campus Dining Hall"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              {/* Map Coordinate Picker for New Bin */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-700 flex items-center gap-1.5">
                    <span>Position on Map</span>
                    <span className="text-[10px] text-slate-400 font-normal">(Click anywhere on map)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGpsForNewBin}
                    disabled={isLocatingGps}
                    className="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold border border-blue-200 transition flex items-center gap-1"
                  >
                    <Locate className={`w-3.5 h-3.5 ${isLocatingGps ? 'animate-spin' : ''}`} />
                    <span>{isLocatingGps ? 'Locking GPS...' : 'Use My GPS'}</span>
                  </button>
                </div>
                <RelocateMapPicker
                  position={[formData.latitude, formData.longitude]}
                  onPositionChange={([lat, lng]) => {
                    setFormData((prev) => ({
                      ...prev,
                      latitude: lat,
                      longitude: lng,
                    }));
                  }}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Capacity (cm)</label>
                  <input
                    type="number"
                    required
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value, 10) || 100 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-1/3 py-2.5 rounded-xl font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition"
                >
                  Register Bin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Predictive Analytics Forecasting Modal */}
      {predictionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Predictive Fill Analytics</h3>
                <p className="text-xs text-slate-500">
                  {predictionModal.bin_code} — {predictionModal.location_name}
                </p>
              </div>
              <button onClick={() => setPredictionModal(null)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {predictionLoading ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                <span>Running regression analysis on historical time-series...</span>
              </div>
            ) : predictionData ? (
              <div className="space-y-4">
                {/* Summary Forecast Box */}
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-xs">
                  <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">Forecast Summary</p>
                  <p className="text-sm font-bold text-emerald-950 mt-1">{predictionData.message}</p>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-500 block">Current Fill Level</span>
                    <span className="text-xl font-bold text-slate-900">{predictionData.current_fill_percentage}%</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-500 block">Fill Velocity</span>
                    <span className="text-xl font-bold text-slate-900">+{predictionData.fill_rate_per_hour}% / hr</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-500 block">Projected in 6 Hours</span>
                    <span className="text-xl font-bold text-slate-900">{predictionData.predicted_fill_6h}%</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-500 block">Time to 90% Threshold</span>
                    <span className="text-xl font-bold text-rose-600">
                      {predictionData.predicted_time_to_threshold_hours != null
                        ? `~${predictionData.predicted_time_to_threshold_hours} hrs`
                        : 'Exceeded'}
                    </span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-2 flex justify-between">
                  <span>Model: {predictionData.model_version}</span>
                  <span>Target Threshold: {predictionData.target_threshold}%</span>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                Insufficient readings to compute prediction.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
