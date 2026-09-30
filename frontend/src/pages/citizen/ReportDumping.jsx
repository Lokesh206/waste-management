import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { complaintsAPI } from '../../services/api';
import LeafletMap from '../../components/LeafletMap';
import {
  AlertTriangle,
  UploadCloud,
  MapPin,
  CheckCircle2,
  Navigation,
  ArrowRight,
  Locate,
  Flame,
  Radio,
  FileText,
  Clock,
  Building,
  Camera,
  ExternalLink,
} from 'lucide-react';
import {
  getCurrentUserLocation,
  reverseGeocode,
} from '../../services/locationService';

const INCIDENT_CATEGORIES = [
  { id: 'overflow', label: 'Overflowing Public Bin', icon: '🗑️' },
  { id: 'plastic_heap', label: 'Roadside Plastic & Waste Heap', icon: '🥤' },
  { id: 'construction', label: 'Construction & Demolition Debris', icon: '🧱' },
  { id: 'hazardous', label: 'Hazardous / Chemical Spill', icon: '☣️' },
  { id: 'drain_block', label: 'Drain / Waterway Blockage', icon: '🌊' },
  { id: 'dead_animal', label: 'Biohazard / Animal Waste', icon: '⚠️' },
];

export default function ReportDumping() {
  const [formData, setFormData] = useState({
    title: '',
    category: INCIDENT_CATEGORIES[0].label,
    urgency: 'Medium',
    estimated_volume: '3-8 Bags (Medium Pile)',
    address: '',
    description: '',
    latitude: 12.9716,
    longitude: 77.5946,
  });

  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const navigate = useNavigate();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        return setError('Photo size exceeds 5MB limit.');
      }
      setImageFile(file);
      setPreview(URL.createObjectURL(file));
      setError('');
    }
  };

  // High-accuracy live GPS locate with reverse geocoding
  const handleUseCurrentLocation = async () => {
    setError('');
    setLocating(true);
    try {
      const pos = await getCurrentUserLocation({ enableHighAccuracy: true, timeout: 9000 });
      setFormData((prev) => ({
        ...prev,
        latitude: pos.latitude,
        longitude: pos.longitude,
      }));

      // Resolve human-readable address
      setGeocoding(true);
      const geo = await reverseGeocode(pos.latitude, pos.longitude);
      if (geo && geo.formattedAddress) {
        setFormData((prev) => ({
          ...prev,
          address: geo.formattedAddress,
        }));
      }
    } catch (err) {
      setError(err.message || 'GPS signal unavailable. You can click anywhere on the map to place the incident pin.');
    } finally {
      setLocating(false);
      setGeocoding(false);
    }
  };

  // Handle manual map click with reverse geocode
  const handleMapClick = async (lat, lng) => {
    const fixedLat = parseFloat(lat.toFixed(5));
    const fixedLng = parseFloat(lng.toFixed(5));

    setFormData((prev) => ({
      ...prev,
      latitude: fixedLat,
      longitude: fixedLng,
    }));

    setGeocoding(true);
    try {
      const geo = await reverseGeocode(fixedLat, fixedLng);
      if (geo && geo.formattedAddress) {
        setFormData((prev) => ({
          ...prev,
          address: geo.formattedAddress,
        }));
      }
    } catch (e) {
      // Ignored
    } finally {
      setGeocoding(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      return setError('Title and detailed description are required.');
    }

    setLoading(true);
    setError('');

    try {
      const data = new FormData();
      data.append('title', formData.title);
      
      // Structure real-world incident details into description
      const fullDescription = [
        `[Category: ${formData.category}]`,
        `[Urgency: ${formData.urgency}]`,
        `[Volume: ${formData.estimated_volume}]`,
        formData.address ? `[Location: ${formData.address}]` : '',
        formData.description.trim(),
      ].filter(Boolean).join('\n\n');

      data.append('description', fullDescription);
      data.append('latitude', formData.latitude);
      data.append('longitude', formData.longitude);
      if (imageFile) {
        data.append('image', imageFile);
      }

      const res = await complaintsAPI.create(data);
      if (res.data.success) {
        setSuccess(res.data.complaint);
      } else {
        setError(res.data.message || 'Failed to submit dumping report.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error transmitting report to municipal servers.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold mb-2">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Real-World Citizen Enforcement</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Report Illegal Waste Dumping</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Help maintain municipal cleanliness and public health. Upload photo evidence and pin the exact GPS coordinates for municipal sanitation dispatch.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-2 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success ? (
        <div className="bg-white rounded-3xl p-8 border border-emerald-200 text-center space-y-5 shadow-sm animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Incident Dispatched to Municipal Authorities!</h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed mt-1">
              Your complaint <span className="font-bold text-slate-900">#{success.id}</span> has been geotagged and routed to the ward sanitation supervisor.
            </p>
          </div>

          {/* Photo & GPS Geotag Stored Card */}
          <div className="max-w-md mx-auto rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50 text-left">
            {preview ? (
              <div className="relative h-48 w-full bg-slate-900 overflow-hidden">
                <img src={preview} alt="Submitted Evidence" className="w-full h-full object-cover" />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-emerald-600/90 text-white text-[10px] font-bold flex items-center gap-1">
                  <span>✓ Photo Uploaded</span>
                </div>
              </div>
            ) : null}

            <div className="p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-500 font-sans font-semibold">Incident Coordinates:</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                  📍 {formData.latitude.toFixed(5)}, {formData.longitude.toFixed(5)}
                </span>
              </div>

              {formData.address && (
                <div className="text-[11px] text-slate-600 flex items-start gap-1">
                  <span className="text-slate-400">Street:</span>
                  <span className="font-medium text-slate-800">{formData.address}</span>
                </div>
              )}

              <div className="pt-1 flex justify-end">
                <a
                  href={`https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-700 font-bold inline-flex items-center gap-1"
                >
                  <span>Open in Google Maps</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => {
                setSuccess(null);
                setFormData({
                  title: '',
                  category: INCIDENT_CATEGORIES[0].label,
                  urgency: 'Medium',
                  estimated_volume: '3-8 Bags (Medium Pile)',
                  address: '',
                  description: '',
                  latitude: 12.9716,
                  longitude: 77.5946,
                });
                setImageFile(null);
                setPreview(null);
              }}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
            >
              Report Another Incident
            </button>
            <button
              onClick={() => navigate('/citizen')}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition"
            >
              Return to Citizen Portal
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column: Form Details & Image */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Incident Category:
              </label>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {INCIDENT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, category: cat.label })}
                    className={`p-2 rounded-xl border text-left transition flex items-center gap-1.5 ${
                      formData.category === cat.label
                        ? 'bg-rose-50 border-rose-400 text-rose-900 font-bold shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span className="truncate text-[11px]">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Incident Headline</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Overflowing plastic garbage blocking road"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Urgency Level</label>
                <select
                  value={formData.urgency}
                  onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-700 focus:outline-none focus:border-rose-500"
                >
                  <option value="Low">Low (Routine Pickup)</option>
                  <option value="Medium">Medium (Within 24 hrs)</option>
                  <option value="Critical">Critical (Immediate Hazard)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Estimated Volume</label>
                <select
                  value={formData.estimated_volume}
                  onChange={(e) => setFormData({ ...formData, estimated_volume: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-700 focus:outline-none focus:border-rose-500"
                >
                  <option value="1-2 Bags (Small)">1-2 Bags (Small)</option>
                  <option value="3-8 Bags (Medium Pile)">3-8 Bags (Medium Pile)</option>
                  <option value="Truckload / Heavy Dump">Truckload / Heavy Dump</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Resolved Street Address / Landmark:
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Click map or 'Use My Location' to auto-detect street address..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Detailed Description</label>
              <textarea
                required
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Mention specific landmarks, foul odors, presence of sharp objects, or public obstruction..."
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            {/* Photo Evidence & Geotag Upload */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">Photo Evidence with GPS Geotag</label>
                <span className="text-[10px] text-slate-400 font-medium">Camera or Gallery</span>
              </div>
              {!preview ? (
                <div className="grid grid-cols-2 gap-2">
                  <label className="border-2 border-dashed border-rose-200 hover:border-rose-500 bg-rose-50/40 hover:bg-rose-50/80 rounded-xl p-3.5 flex flex-col items-center justify-center text-center cursor-pointer transition shadow-xs">
                    <Camera className="w-5 h-5 text-rose-500 mb-1" />
                    <span className="text-xs font-bold text-slate-800">Take Photo</span>
                    <span className="text-[10px] text-slate-400">Direct camera capture</span>
                    <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="hidden" />
                  </label>
                  <label className="border-2 border-dashed border-slate-200 hover:border-slate-400 bg-slate-50/60 hover:bg-slate-50 rounded-xl p-3.5 flex flex-col items-center justify-center text-center cursor-pointer transition shadow-xs">
                    <UploadCloud className="w-5 h-5 text-slate-500 mb-1" />
                    <span className="text-xs font-bold text-slate-800">Browse Files</span>
                    <span className="text-[10px] text-slate-400">JPG, PNG up to 5MB</span>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </label>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 shadow-md">
                  <img src={preview} alt="Evidence Preview" className="w-full h-44 object-cover" />
                  {/* Geotag Watermark Overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/95 via-slate-950/70 to-transparent p-3 text-white">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-400 mb-0.5">
                      <Camera className="w-3.5 h-3.5" />
                      <span>GEOTAGGED EVIDENCE ATTACHED</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-200 flex items-center justify-between">
                      <span>📍 {formData.latitude.toFixed(5)}, {formData.longitude.toFixed(5)}</span>
                      <span>{new Date().toLocaleTimeString()}</span>
                    </div>
                    {formData.address && (
                      <p className="text-[10px] text-slate-300 truncate mt-0.5 font-sans">
                        {formData.address}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setPreview(null);
                    }}
                    className="absolute top-2 right-2 px-2.5 py-1 bg-black/70 hover:bg-black text-white text-[10px] font-bold rounded-lg"
                  >
                    Change Photo
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-500 active:scale-98 transition shadow-md shadow-rose-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Transmitting Incident...' : 'Submit Incident Report to Municipality'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Right Column: Interactive Map Picker with Geocoding */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Pinpoint GPS Location</h2>
                <p className="text-xs text-slate-500">Click anywhere on the map to place the incident pin.</p>
              </div>

              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={locating}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
              >
                <Locate className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
                <span>{locating ? 'Acquiring GPS...' : 'Use My Location'}</span>
              </button>
            </div>

            {/* Live Coordinates Display */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 text-slate-700">
                <span className="text-[10px] text-slate-400 block font-sans">Latitude</span>
                <strong>{formData.latitude.toFixed(5)}</strong>
              </div>
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 text-slate-700">
                <span className="text-[10px] text-slate-400 block font-sans">Longitude</span>
                <strong>{formData.longitude.toFixed(5)}</strong>
              </div>
            </div>

            {geocoding && (
              <div className="text-[11px] text-blue-600 font-medium flex items-center gap-1.5 animate-pulse">
                <span>🛰️</span>
                <span>Reverse geocoding street address from coordinates...</span>
              </div>
            )}

            <div className="flex-1 min-h-[360px] rounded-2xl overflow-hidden border border-slate-200">
              <LeafletMap
                center={[formData.latitude, formData.longitude]}
                selectedLocation={{ latitude: formData.latitude, longitude: formData.longitude }}
                onLocationSelect={handleMapClick}
                height="380px"
                disableDefaultFallback={true}
              />
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
