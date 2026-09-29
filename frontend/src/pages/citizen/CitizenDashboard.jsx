import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { wasteAPI, complaintsAPI, binsAPI, getImageUrl } from '../../services/api';
import MetricCard from '../../components/MetricCard';
import StatusBadge from '../../components/StatusBadge';
import { Camera, AlertTriangle, MapPin, CheckCircle2, Clock, ArrowRight, Sparkles, Award, Footprints } from 'lucide-react';

export default function CitizenDashboard() {
  const { user } = useAuth();
  const [classifications, setClassifications] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [binsCount, setBinsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [cRes, cmpRes, bRes] = await Promise.all([
          wasteAPI.getHistory(),
          complaintsAPI.getMy(),
          binsAPI.getAll(),
        ]);
        if (cRes.data.success) setClassifications(cRes.data.history || []);
        if (cmpRes.data.success) setComplaints(cmpRes.data.complaints || []);
        if (bRes.data.success) setBinsCount(bRes.data.count || 0);
      } catch (err) {
        console.error('Error loading citizen data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const resolvedComplaints = complaints.filter((c) => c.status === 'Resolved').length;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-6 sm:p-8 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1 max-w-xl">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/20 text-emerald-100">
            Citizen Environmental Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Welcome, {user?.name}!</h1>
          <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
            Scan waste using AI to sort responsibly, report illegal neighborhood dumping, and locate nearby smart bins.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Link
            to="/citizen/bins"
            className="px-4 py-2.5 rounded-xl font-bold text-xs bg-white text-emerald-900 hover:bg-emerald-50 shadow-sm transition flex items-center gap-2"
          >
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>Nearby Bins (Live GPS)</span>
          </Link>
          <Link
            to="/citizen/classify"
            className="px-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-800 text-white hover:bg-emerald-900 border border-emerald-500/30 transition flex items-center gap-2"
          >
            <Camera className="w-4 h-4" />
            <span>AI Waste Scanner</span>
          </Link>
          <Link
            to="/citizen/report-dumping"
            className="px-4 py-2.5 rounded-xl font-bold text-xs bg-rose-700 text-white hover:bg-rose-800 transition flex items-center gap-2 shadow-sm"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Report Dumping</span>
          </Link>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <MetricCard
          title="Eco-Reward Points"
          value={(classifications.length * 15) + (resolvedComplaints * 50) + (complaints.length * 20)}
          subtitle="Green citizen credits"
          icon={Sparkles}
          color="emerald"
        />
        <MetricCard
          title="Scanned Items"
          value={classifications.length}
          subtitle="AI waste scans"
          icon={Camera}
          color="purple"
        />
        <MetricCard
          title="Dumping Reports"
          value={complaints.length}
          subtitle="Total reports filed"
          icon={AlertTriangle}
          color="rose"
        />
        <MetricCard
          title="Reports Resolved"
          value={resolvedComplaints}
          subtitle="Cleaned by city"
          icon={CheckCircle2}
          color="blue"
        />
        <MetricCard
          title="Smart Bins"
          value={binsCount}
          subtitle="Active sensor nodes"
          icon={MapPin}
          color="slate"
        />
      </div>

      {/* Recent Activity Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent AI Scans */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent AI Classifications</h2>
              <p className="text-xs text-slate-500">Your recent item scans and recyclability results</p>
            </div>
            <Link to="/citizen/classify" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              <span>Scan New</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {classifications.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              No waste items scanned yet. Upload an image to test the AI classifier.
            </div>
          ) : (
            <div className="space-y-3">
              {classifications.slice(0, 4).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-200 shrink-0">
                      <img
                        src={getImageUrl(item.image_path)}
                        alt={item.predicted_class}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2394a3b8"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5-7-3 3.72L9 13l-3 4h12l-4-5z"/></svg>';
                        }}
                      />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{item.predicted_class}</p>
                      <p className="text-[11px] text-slate-500">Confidence: {item.confidence}%</p>
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      item.recyclable
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {item.recyclable ? 'Recyclable' : 'Non-Recyclable'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Dumping Reports */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Your Dumping Reports</h2>
              <p className="text-xs text-slate-500">Live municipal tracking and resolution</p>
            </div>
            <Link to="/citizen/report-dumping" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              <span>File Report</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {complaints.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              You have not filed any dumping reports.
            </div>
          ) : (
            <div className="space-y-3">
              {complaints.slice(0, 4).map((c) => (
                <div key={c.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-900 line-clamp-1">{c.title}</p>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {new Date(c.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

