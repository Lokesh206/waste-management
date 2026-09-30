import React, { useState, useEffect } from 'react';
import { collectionsAPI } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import {
  ListOrdered,
  CheckCircle2,
  Truck,
  UploadCloud,
  X,
  AlertCircle,
  RefreshCw,
  MapPin,
  Layers,
  BatteryCharging,
  Cpu,
  Trash2,
  Sparkles,
  Radio,
  AlertTriangle,
  Scale,
} from 'lucide-react';

// Computes or enriches 4-chamber segregation layout for a Smart Dustbin
function getDustbinChambers(bin) {
  if (bin?.chambers && Array.isArray(bin.chambers) && bin.chambers.length > 0) {
    return bin.chambers;
  }
  const fill = Math.round(bin?.current_fill_percentage || 0);
  const primary = (bin?.primary_stream || bin?.waste_type || 'General').toLowerCase();
  const seed = ((bin?.id || 1) * 31) % 100;

  const isPrimary = (type) => primary.includes(type.toLowerCase());

  const organic = isPrimary('organic') ? Math.max(fill, 85) : Math.round(20 + ((seed * 3) % 25));
  const paper = isPrimary('paper') ? Math.max(fill, 85) : Math.round(18 + ((seed * 7) % 22));
  const plastic = isPrimary('plastic') ? Math.max(fill, 85) : Math.round(25 + (seed % 24));
  const metal = isPrimary('metal') || isPrimary('glass') || isPrimary('hazard') ? Math.max(fill, 85) : Math.round(12 + ((seed * 5) % 18));

  return [
    {
      type: 'Organic',
      name: 'Wet / Organic',
      icon: '🍏',
      percentage: Math.min(100, organic),
      color: '#10b981',
      is_primary: isPrimary('organic'),
    },
    {
      type: 'Paper',
      name: 'Dry / Paper',
      icon: '📦',
      percentage: Math.min(100, paper),
      color: '#f59e0b',
      is_primary: isPrimary('paper'),
    },
    {
      type: 'Plastic',
      name: 'Plastic',
      icon: '🥤',
      percentage: Math.min(100, plastic),
      color: '#3b82f6',
      is_primary: isPrimary('plastic'),
    },
    {
      type: 'Metal',
      name: 'Metal & Glass',
      icon: '⚙️',
      percentage: Math.min(100, metal),
      color: '#6366f1',
      is_primary: isPrimary('metal') || isPrimary('glass'),
    },
  ];
}

export default function TasksView() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active'); // active or all
  const [selectedTaskForCollect, setSelectedTaskForCollect] = useState(null);
  const [collectQuantity, setCollectQuantity] = useState('25');
  const [proofImage, setProofImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await collectionsAPI.getAll();
      if (res.data.success) {
        setTasks(res.data.requests || []);
      }
    } catch (err) {
      console.error('Error fetching tasks', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleStatusUpdate = async (taskId, newStatus) => {
    try {
      setActionLoading(true);
      const res = await collectionsAPI.updateStatus(taskId, { status: newStatus });
      if (res.data.success) {
        setMessage(`Task #${taskId} status updated to ${newStatus}`);
        fetchTasks();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteCollection = async (e) => {
    e.preventDefault();
    if (!selectedTaskForCollect) return;

    setActionLoading(true);
    try {
      const formData = new FormData();
      formData.append('collected_quantity', collectQuantity);
      formData.append('unit', 'kg');
      if (proofImage) {
        formData.append('proof_image', proofImage);
      }

      const res = await collectionsAPI.recordCollection(selectedTaskForCollect.id, formData);
      if (res.data.success) {
        setMessage(`Smart Dustbin ${selectedTaskForCollect.bin.bin_code} all chambers emptied (${collectQuantity} kg) and reset to 0%.`);
        setSelectedTaskForCollect(null);
        setProofImage(null);
        setPreview(null);
        fetchTasks();
      }
    } catch (err) {
      console.error('Error completing collection', err);
    } finally {
      setActionLoading(false);
    }
  };

  const displayedTasks = tasks.filter((t) => {
    if (filter === 'active') {
      return ['Assigned', 'Accepted', 'On the Way'].includes(t.status);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Municipal Dustbin Task Queue</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor real-time multi-chamber smart dustbins, dispatch pickups, and record collection mass.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-1 rounded-xl flex text-xs font-semibold">
            <button
              onClick={() => setFilter('active')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filter === 'active' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              Active Tasks
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              All History
            </button>
          </div>
          <button
            onClick={fetchTasks}
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            title="Refresh Task Queue"
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
          <button onClick={() => setMessage('')} className="text-emerald-600 hover:text-emerald-800 font-bold">
            &times;
          </button>
        </div>
      )}

      {/* Task Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {displayedTasks.map((t) => {
          const chambers = getDustbinChambers(t.bin);
          const fill = Math.round(t.bin?.current_fill_percentage || 0);
          const primaryStream = t.bin?.primary_stream || t.bin?.waste_type || 'General';
          const triggerChamber = chambers.find((c) => c.is_primary) || chambers.find((c) => c.percentage >= 85);

          return (
            <div
              key={t.id}
              className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition relative group"
            >
              <div className="space-y-3.5">
                {/* Dustbin Header with Visual Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500/15 to-teal-500/15 border border-emerald-500/30 text-emerald-700 flex items-center justify-center font-bold text-xl shadow-2xs shrink-0">
                      🗑️
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-black text-slate-900 font-mono">{t.bin?.bin_code}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          Smart Dustbin
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium line-clamp-1 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{t.bin?.location_name}</span>
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={t.priority} />
                </div>

                {/* Overall Dustbin Fill Gauge */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
                      <span>Total Dustbin Volume:</span>
                    </span>
                    <span className={`font-black ${fill >= 85 ? 'text-rose-600' : fill >= 65 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {fill}% Full
                    </span>
                  </div>

                  <div className="w-full bg-slate-200/80 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all ${
                        fill >= 85
                          ? 'bg-rose-500'
                          : fill >= 65
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, fill)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>IoT Sensor: Ultrasonic Online</span>
                    <span>Battery: {t.bin?.battery_level || 92}% 🔋</span>
                  </div>
                </div>

                {/* 4-Chamber Segregation Compartments Box (Multi-Waste Dustbin Unit) */}
                <div className="p-3 rounded-2xl bg-slate-900 text-white space-y-2 shadow-xs">
                  <div className="flex items-center justify-between text-[11px] pb-1 border-b border-slate-800">
                    <span className="font-bold flex items-center gap-1.5 text-slate-200">
                      <span>🗄️</span>
                      <span>Dustbin Chambers</span>
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                      4-Stream Segregation
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {chambers.map((c) => {
                      const isTrigger = c.is_primary || (triggerChamber && triggerChamber.type === c.type);
                      return (
                        <div
                          key={c.type}
                          className={`p-2 rounded-xl border flex flex-col justify-between transition ${
                            isTrigger
                              ? 'bg-rose-950/40 border-rose-500/60 ring-1 ring-rose-500/30'
                              : 'bg-slate-800/80 border-slate-700/60'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-200 text-[11px] flex items-center gap-1">
                              <span>{c.icon}</span>
                              <span className="truncate">{c.name}</span>
                            </span>
                            <span
                              className={`font-mono font-bold text-[10px] ${
                                isTrigger ? 'text-rose-400' : 'text-slate-400'
                              }`}
                            >
                              {c.percentage}%
                            </span>
                          </div>

                          <div className="w-full bg-slate-950 rounded-full h-1.5 mt-1.5 overflow-hidden">
                            <div
                              className="h-1.5 rounded-full"
                              style={{
                                width: `${Math.min(100, c.percentage)}%`,
                                backgroundColor: isTrigger ? '#f43f5e' : c.color,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {triggerChamber && (
                    <div className="text-[10px] pt-1 text-rose-300 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                      <span className="truncate">
                        Primary Overflow: {triggerChamber.name} ({triggerChamber.percentage}%)
                      </span>
                    </div>
                  )}
                </div>

                {/* Dispatch Notes / Reason */}
                {t.notes && (
                  <p className="text-[11px] text-slate-600 bg-amber-50/80 p-2.5 rounded-xl border border-amber-200/60 italic leading-relaxed">
                    "{t.notes}"
                  </p>
                )}
              </div>

              {/* Task Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-500">Current Task Status:</span>
                  <StatusBadge status={t.status} />
                </div>

                {t.status === 'Assigned' && (
                  <button
                    onClick={() => handleStatusUpdate(t.id, 'Accepted')}
                    disabled={actionLoading}
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <span>Accept Task</span>
                  </button>
                )}

                {t.status === 'Accepted' && (
                  <button
                    onClick={() => handleStatusUpdate(t.id, 'On the Way')}
                    disabled={actionLoading}
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Start Pickup (On the Way)</span>
                  </button>
                )}

                {(t.status === 'Accepted' || t.status === 'On the Way') && (
                  <button
                    onClick={() => {
                      setSelectedTaskForCollect(t);
                      setCollectQuantity('25');
                    }}
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Mark Waste Collected (Empty All Chambers)</span>
                  </button>
                )}

                {t.status === 'Completed' && (
                  <div className="text-center py-2 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>✓ Successfully Emptied & Cleaned</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Collection Recording Modal */}
      {selectedTaskForCollect && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  🗑️
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Empty Smart Dustbin</h3>
                  <p className="text-xs text-slate-500">
                    {selectedTaskForCollect.bin?.bin_code} — {selectedTaskForCollect.bin?.location_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTaskForCollect(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteCollection} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Total Collected Mass (kg) across Chambers
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={collectQuantity}
                    onChange={(e) => setCollectQuantity(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <span className="absolute right-3 top-3 text-xs font-bold text-slate-400">kg</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Cumulative segregated waste emptied into truck payload.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Proof Photo (Optional)
                </label>
                {!preview ? (
                  <label className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition bg-slate-50">
                    <UploadCloud className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-xs font-semibold text-slate-600">Upload Cleanup Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setProofImage(file);
                          setPreview(URL.createObjectURL(file));
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="relative rounded-xl overflow-hidden bg-slate-100 border border-slate-200 h-28">
                    <img src={preview} alt="Proof" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setProofImage(null);
                        setPreview(null);
                      }}
                      className="absolute top-2 right-2 px-2 py-0.5 bg-black/60 text-white text-[10px] rounded"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-[11px] text-emerald-800">
                Notice: Submitting marks this task as Completed, empties all chambers (0%), updates municipal waste ledgers, and logs GPS coordinates.
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTaskForCollect(null)}
                  className="w-1/3 py-2.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                >
                  {actionLoading ? 'Recording...' : 'Confirm & Empty Dustbin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
