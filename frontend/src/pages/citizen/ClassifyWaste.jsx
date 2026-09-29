import React, { useState } from 'react';
import { wasteAPI } from '../../services/api';
import {
  UploadCloud,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Info,
  RefreshCw,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export default function ClassifyWaste() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (!selected.type.startsWith('image/')) {
        return setError('Please select a valid image file (JPG or PNG).');
      }
      if (selected.size > 5 * 1024 * 1024) {
        return setError('Image size exceeds 5MB limit.');
      }
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      setResult(null);
      setError('');
    }
  };

  const handleClassify = async () => {
    if (!file) {
      return setError('Please select an image of waste to classify.');
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await wasteAPI.classify(formData);
      if (res.data.success) {
        setResult(res.data.data);
      } else {
        setError(res.data.message || 'Failed to classify image.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error communicating with AI vision service.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>MobileNetV2 Vision Transfer Learning</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">AI Waste Classifier</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Upload an image of a waste item to identify its category, recyclability status, and proper disposal channel.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Upload Column */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-base font-bold text-slate-900">Upload Waste Image</h2>

          {!preview ? (
            <label className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition bg-slate-50/50 hover:bg-emerald-50/30">
              <UploadCloud className="w-12 h-12 text-slate-400 mb-3" />
              <p className="text-xs font-bold text-slate-700">Click to upload or drag & drop</p>
              <p className="text-[11px] text-slate-400 mt-1">Supports JPG, JPEG, PNG, WEBP (Max 5MB)</p>
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
          ) : (
            <div className="space-y-4">
              <div className="w-full h-64 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 relative group">
                <img src={preview} alt="Upload Preview" className="w-full h-full object-contain" />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Choose Another</span>
                </button>
                <button
                  type="button"
                  onClick={handleClassify}
                  disabled={loading}
                  className="flex-1 py-2 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-sm flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Classifying with Vision AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Classify Item</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Guidelines */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-1.5">
            <p className="font-semibold text-slate-800">Supported Waste Classes:</p>
            <p className="text-[11px] text-slate-500">
              Plastic, Paper & Cardboard, Glass, Metal/Aluminum, Organic/Food Scraps, E-Waste, Hazardous, and General Other.
            </p>
          </div>
        </div>

        {/* Prediction Results Column */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-6">
              <h2 className="text-base font-bold text-slate-900">AI Classification Output</h2>
              {result && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                  {result.model_version}
                </span>
              )}
            </div>

            {result ? (
              <div className="space-y-6">
                {/* Primary Category Banner */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Identified Category</p>
                      <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">{result.category}</h3>
                    </div>
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full ${
                        result.recyclable
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {result.recyclable ? 'Recyclable Material' : 'Non-Recyclable Material'}
                    </span>
                  </div>

                  {/* Confidence Meter */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                      <span>Prediction Confidence</span>
                      <span className="font-bold text-emerald-700">{result.confidence}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-emerald-600 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${result.confidence}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Disposal Stream & Recommendation */}
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100 text-xs">
                    <p className="font-bold text-emerald-900 mb-1">Recommended Action:</p>
                    <p className="text-emerald-800 leading-relaxed">{result.recommendation}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 text-xs">
                    <p className="font-bold text-blue-900 mb-1">Designated Disposal Stream:</p>
                    <p className="text-blue-800">{result.disposal_stream}</p>
                  </div>
                </div>

                {/* Accuracy Note (Mandated by Section 11) */}
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Evaluation Distinction: </span>
                    <span>
                      {result.accuracy_note ||
                        'Prediction confidence reflects certainty on this specific image. Model accuracy is evaluated separately across the benchmark validation set.'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400 p-6">
                <Camera className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-xs font-semibold text-slate-600">No Classification Active</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                  Upload an image on the left and click "Classify Item" to view the AI inference breakdown.
                </p>
              </div>
            )}
          </div>

          {result?.is_demo_mode && (
            <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400 text-center font-mono">
              Mode: {result.mode_label}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

