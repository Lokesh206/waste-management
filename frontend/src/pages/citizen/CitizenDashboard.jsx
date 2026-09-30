import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { wasteAPI, complaintsAPI, binsAPI, rewardsAPI, getImageUrl } from '../../services/api';
import MetricCard from '../../components/MetricCard';
import StatusBadge from '../../components/StatusBadge';
import {
  Camera,
  AlertTriangle,
  MapPin,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Award,
  Footprints,
  Trophy,
  Shield,
  Medal,
  TrendingUp,
  ExternalLink,
} from 'lucide-react';

import { onComplaintEvent, onBinUpdate } from '../../services/socket';

export default function CitizenDashboard() {
  const { user } = useAuth();
  const [classifications, setClassifications] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [binsCount, setBinsCount] = useState(0);
  const [rewardsData, setRewardsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liveToast, setLiveToast] = useState('');

  const refreshRewards = async () => {
    try {
      const rRes = await rewardsAPI.getCitizenRewards();
      if (rRes.data?.success) setRewardsData(rRes.data);
    } catch {}
  };

  useEffect(() => {
    async function loadData() {
      try {
        const [cRes, cmpRes, bRes, rRes] = await Promise.all([
          wasteAPI.getHistory(),
          complaintsAPI.getMy(),
          binsAPI.getAll(),
          rewardsAPI.getCitizenRewards().catch(() => ({ data: null })),
        ]);
        if (cRes.data?.success) setClassifications(cRes.data.history || []);
        if (cmpRes.data?.success) setComplaints(cmpRes.data.complaints || []);
        if (bRes.data?.success) setBinsCount(bRes.data.count || 0);
        if (rRes.data?.success) setRewardsData(rRes.data);
      } catch (err) {
        console.error('Error loading citizen data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    // Real-Time Socket Subscriptions
    const unsubComplaint = onComplaintEvent((comp) => {
      setComplaints((prev) => {
        const idx = prev.findIndex((c) => c.id === comp.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], ...comp };
          return updated;
        }
        return [comp, ...prev];
      });
      setLiveToast(`📢 Complaint status updated: #${comp.id} (${comp.status})`);
      refreshRewards();
      setTimeout(() => setLiveToast(''), 6000);
    });

    const unsubBins = onBinUpdate(() => {
      binsAPI.getAll().then((res) => {
        if (res.data?.success) setBinsCount(res.data.count || res.data.bins?.length || 0);
      }).catch(() => {});
    });

    return () => {
      unsubComplaint?.();
      unsubBins?.();
    };
  }, []);

  const resolvedComplaints = complaints.filter((c) => c.status === 'Resolved').length;
  const userPoints = rewardsData?.totalPoints ?? (classifications.length * 15 + resolvedComplaints * 50 + complaints.length * 20);

  return (
    <div className="space-y-8">
      {liveToast && (
        <div className="p-3.5 bg-emerald-600 text-white rounded-2xl text-xs font-bold shadow-lg flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>{liveToast}</span>
          </div>
          <button onClick={() => setLiveToast('')} className="text-white hover:text-emerald-200 font-bold">✕</button>
        </div>
      )}
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-6 sm:p-8 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1 max-w-xl">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/20 text-emerald-100">
            Citizen Environmental Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Welcome, {user?.name}!</h1>
          <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
            Scan waste using AI to sort responsibly, report illegal neighborhood dumping, and locate nearby smart bins with live walking directions.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Link
            to="/citizen/nearby-bins"
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
          value={userPoints}
          subtitle={rewardsData?.level || 'Level 1: Eco Scout'}
          icon={Sparkles}
          color="emerald"
        />
        <MetricCard
          title="Scanned Items"
          value={classifications.length}
          subtitle="AI waste scans (+10 pts each)"
          icon={Camera}
          color="purple"
        />
        <MetricCard
          title="Dumping Reports"
          value={complaints.length}
          subtitle="Filed (+50 pts on verify)"
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

      {/* Eco-Rewards & Citizen Leaderboard Row */}
      {rewardsData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Level Progress & Badges */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h2 className="text-base font-bold text-slate-900">Your Eco-Reward Tier & Progress</h2>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                {rewardsData.level}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-600">Points to next milestone:</span>
                <span className="text-emerald-700">{rewardsData.totalPoints} / {rewardsData.nextThreshold} pts</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${rewardsData.progressPercent}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Earn +10 pts for each AI waste scan and +50 pts for verified dumping incident cleanups.
              </p>
            </div>

            {/* Badges Grid */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700">Earned Badges:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {rewardsData.badges?.map((b) => (
                  <div
                    key={b.id}
                    className={`p-3 rounded-2xl border text-center transition ${
                      b.unlocked
                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                        : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                    }`}
                  >
                    <span className="text-2xl block mb-1">{b.icon}</span>
                    <p className="font-extrabold text-xs">{b.name}</p>
                    <p className="text-[10px] mt-0.5 leading-tight">{b.desc}</p>
                    <span className="text-[9px] font-bold mt-1 inline-block uppercase tracking-wider">
                      {b.unlocked ? '✓ Unlocked' : 'Locked'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top 5 Citizen Leaderboard */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2">
                  <Medal className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-base font-bold text-slate-900">City Green Leaderboard</h2>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700">
                  Monthly
                </span>
              </div>

              <div className="space-y-2.5">
                {rewardsData.leaderboard?.map((citizen, idx) => (
                  <div
                    key={citizen.id}
                    className={`p-3 rounded-2xl border flex items-center justify-between transition ${
                      citizen.isCurrentUser
                        ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-200'
                        : 'bg-slate-50 border-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs ${
                        idx === 0 ? 'bg-amber-400 text-slate-950' : idx === 1 ? 'bg-slate-300 text-slate-950' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-bold text-xs text-slate-900">
                          {citizen.name} {citizen.isCurrentUser && '(You)'}
                        </p>
                        <p className="text-[10px] text-slate-400">Verified Citizen</p>
                      </div>
                    </div>
                    <span className="font-black text-xs text-emerald-700 font-mono">
                      {citizen.points} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-center">
              <Link
                to="/citizen/classify"
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center justify-center gap-1"
              >
                <span>Scan Waste to Climb Ranks</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent AI Scans */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
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
                <div key={item.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-200 shrink-0">
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
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
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
                <div key={c.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {c.image_path ? (
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100 shadow-xs">
                        <img
                          src={getImageUrl(c.image_path)}
                          alt="Report Evidence"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0 text-rose-500">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{c.title}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1 font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                          📍 {c.latitude.toFixed(4)}, {c.longitude.toFixed(4)}
                        </span>
                        <a
                          href={`https://www.google.com/maps?q=${c.latitude},${c.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Open coordinates in Google Maps"
                          className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-0.5"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3 h-3" />
                          {new Date(c.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <StatusBadge status={c.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
