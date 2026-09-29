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
} from 'lucide-react';

export default function ReportDumping() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    latitude: 12.9716,
    longitude: 77.5946,
  });
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
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

  const handleUseCurrentLocation = () => {
    setError('');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setFormData((prev) => ({
            ...prev,
            latitude: parseFloat(pos.coords.latitude.toFixed(5)),
            longitude: parseFloat(pos.coords.longitude.toFixed(5)),
          }));
        },
        (err) => {
          setFormData((prev) => ({
            ...prev,
            latitude: 12.9716,
            longitude: 77.5946,
          }));
          setError('Live GPS restricted by browser on plain HTTP origin. Centered to City Zone [12.9716, 77.5946] - click anywhere on the map to place the incident pin.');
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      setFormData((prev) => ({ ...prev, latitude: 12.9716, longitude: 77.5946 }));
      setError('Geolocation not supported. Centered to City Zone [12.9716, 77.5946]. Click map to place pin.');
    }
  };

  const handleMapClick = (lat, lng) => {
    setFormData((prev) => ({
      ...prev,
      latitude: parseFloat(lat.toFixed(5)),
      longitude: parseFloat(lng.toFixed(5)),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      return setError('Title and description are required.');
    }

    setLoading(true);
    setError('');

    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('description', formData.description);
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
      setError(err.response?.data?.message || 'Error submitting report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold mb-2">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Illegal Dumping Enforcement</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Report Illegal Waste Dumping</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Help maintain municipal cleanliness. Upload evidence and precise GPS coordinates for municipal action.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success ? (
        <div className="bg-white rounded-3xl p-8 border border-emerald-200 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Complaint Logged Successfully!</h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
            Your complaint <span className="font-bold text-slate-900">#{success.id}</span> has been dispatched to municipal administrators.
            You will receive in-app notifications as the status progresses.
          </p>
          <div className="pt-4 flex justify-center gap-3">
            <button
              onClick={() => {
                setSuccess(null);
                setFormData({ title: '', description: '', latitude: 12.9716, longitude: 77.5946 });
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
              Return to Dashboard
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column: Form Details & Image */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Incident Title</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Plastic heap blocking walkway"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Detailed Description</label>
              <textarea
                required
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the waste type, approximate volume, and any immediate hazards..."
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {/* Photo Evidence Upload */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Photo Evidence (Optional)</label>
              {!preview ? (
                <label className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition bg-slate-50/50">
                  <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                  <span className="text-xs font-semibold text-slate-600">Upload Evidence Photo</span>
                  <span className="text-[10px] text-slate-400">JPG, PNG up to 5MB</span>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              ) : (
                <div className="relative rounded-xl overflow-hidden bg-slate-100 border border-slate-200 h-36">
                  <img src={preview} alt="Evidence Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setPreview(null);
                    }}
                    className="absolute top-2 right-2 px-2 py-1 bg-black/60 hover:bg-black text-white text-[10px] rounded font-semibold"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>

            {/* Coordinates display & GPS Fetch */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">GPS Coordinates:</span>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Use My Location</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-white p-2 rounded border border-slate-200">
                  Lat: {formData.latitude}
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  Lng: {formData.longitude}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-98 transition shadow-sm flex items-center justify-center gap-2"
            >
              {loading ? 'Transmitting Report...' : 'Submit Dumping Report'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Right Column: Interactive Map Picker */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col space-y-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Pinpoint Location on Map</h2>
              <p className="text-xs text-slate-500">Click anywhere on the map to place the incident pin.</p>
            </div>

            <div className="flex-1 min-h-[350px]">
              <LeafletMap
                center={[formData.latitude, formData.longitude]}
                selectedLocation={{ latitude: formData.latitude, longitude: formData.longitude }}
                onLocationSelect={handleMapClick}
                height="380px"
              />
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

