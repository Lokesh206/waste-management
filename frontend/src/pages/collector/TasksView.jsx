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
} from 'lucide-react';

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
        setMessage(`Bin ${selectedTaskForCollect.bin.bin_code} collected (${collectQuantity} kg) and reset to Normal.`);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Collection Task Queue</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your daily pickup schedule, navigate to bins, and log proof of collection.
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
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage('')} className="text-emerald-600 hover:text-emerald-800 font-bold">
            &times;
          </button>
        </div>
      )}

      {/* Task Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {displayedTasks.map((t) => (
          <div
            key={t.id}
            className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:shadow transition"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <span className="text-xs font-bold text-slate-900">{t.bin?.bin_code}</span>
                  <p className="text-xs text-slate-600 font-medium line-clamp-1">{t.bin?.location_name}</p>
                </div>
                <StatusBadge status={t.priority} />
              </div>

              <div className="space-y-2 py-3 border-y border-slate-100 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Fill Level:</span>
                  <span className="font-bold text-slate-900">{t.bin?.current_fill_percentage}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Waste Stream:</span>
                  <span className="font-semibold text-slate-700">{t.bin?.waste_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Task Status:</span>
                  <StatusBadge status={t.status} />
                </div>
                {t.notes && (
                  <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg italic">
                    "{t.notes}"
                  </p>
                )}
              </div>
            </div>

            {/* Task Action Buttons */}
            <div className="space-y-2">
              {t.status === 'Assigned' && (
                <button
                  onClick={() => handleStatusUpdate(t.id, 'Accepted')}
                  disabled={actionLoading}
                  className="w-full py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition"
                >
                  Accept Task
                </button>
              )}

              {t.status === 'Accepted' && (
                <button
                  onClick={() => handleStatusUpdate(t.id, 'On the Way')}
                  disabled={actionLoading}
                  className="w-full py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition flex items-center justify-center gap-1.5"
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
                  className="w-full py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark Waste Collected</span>
                </button>
              )}

              {t.status === 'Completed' && (
                <div className="text-center py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg">
                  ✓ Successfully Collected
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Collection Recording Modal */}
      {selectedTaskForCollect && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Record Collection Proof</h3>
                <p className="text-xs text-slate-500">Bin {selectedTaskForCollect.bin?.bin_code} ({selectedTaskForCollect.bin?.waste_type})</p>
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
                  Collected Weight (kg)
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
                <p className="text-[10px] text-slate-400 mt-1">Measured mass of segregated waste loaded into truck.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Proof Image (Optional)
                </label>
                {!preview ? (
                  <label className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition bg-slate-50">
                    <UploadCloud className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-xs font-semibold text-slate-600">Upload Photo Evidence</span>
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
                Notice: Submitting will mark this task as Completed, reset the bin fill percentage back to 0%, and notify the recycling facility.
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
                  {actionLoading ? 'Recording...' : 'Confirm & Empty Bin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

