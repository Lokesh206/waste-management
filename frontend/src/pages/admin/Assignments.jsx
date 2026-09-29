import React, { useState, useEffect } from 'react';
import { collectionsAPI, authAPI } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import {
  CheckSquare,
  Truck,
  UserCheck,
  AlertCircle,
  X,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

export default function Assignments() {
  const [requests, setRequests] = useState([]);
  const [collectors, setCollectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignModal, setAssignModal] = useState(null);
  const [selectedCollector, setSelectedCollector] = useState('');
  const [priority, setPriority] = useState('Critical');
  const [notes, setNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rRes, cRes] = await Promise.all([
        collectionsAPI.getAll(),
        authAPI.getCollectors(),
      ]);
      if (rRes.data.success) setRequests(rRes.data.requests || []);
      if (cRes.data.success) setCollectors(cRes.data.collectors || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!assignModal || !selectedCollector) return;

    setActionLoading(true);
    try {
      const res = await collectionsAPI.assign(assignModal.id, {
        collector_id: selectedCollector,
        priority,
        notes,
      });

      if (res.data.success) {
        setMessage(`Task #${assignModal.id} assigned to collector successfully.`);
        setAssignModal(null);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Collection Task Assignments</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review automatic sensor threshold alerts and assign pending collection tasks to field collectors.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs flex items-center gap-1.5 self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage('')} className="text-emerald-700 font-bold">&times;</button>
        </div>
      )}

      {/* Task Queue Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Task ID</th>
                <th className="py-3 px-4">Bin Code</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Fill Level</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Task Status</th>
                <th className="py-3 px-4">Assigned Collector</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3.5 px-4 font-bold text-slate-900">#REQ-{r.id}</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{r.bin?.bin_code}</td>
                  <td className="py-3.5 px-4 text-slate-600">{r.bin?.location_name}</td>
                  <td className="py-3.5 px-4 font-bold text-rose-600">
                    {r.bin?.current_fill_percentage}%
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={r.priority} />
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="py-3.5 px-4 text-slate-700">
                    {r.assignedCollector ? (
                      <span className="font-semibold text-slate-900">{r.assignedCollector.name}</span>
                    ) : (
                      <span className="text-amber-600 font-semibold italic">Unassigned</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => {
                        setAssignModal(r);
                        setSelectedCollector(r.assigned_collector_id || (collectors[0]?.id || ''));
                        setPriority(r.priority || 'Critical');
                        setNotes(r.notes || '');
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition inline-flex items-center gap-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{r.assignedCollector ? 'Reassign' : 'Assign'}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assignment Modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Assign Collector to Task</h3>
                <p className="text-xs text-slate-500">
                  {assignModal.bin?.bin_code} ({assignModal.bin?.current_fill_percentage}% Fill)
                </p>
              </div>
              <button onClick={() => setAssignModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssign} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Collector</label>
                <select
                  required
                  value={selectedCollector}
                  onChange={(e) => setSelectedCollector(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white font-semibold"
                >
                  <option value="">-- Choose Field Personnel --</option>
                  {collectors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Priority Override</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="Critical">Critical (Immediate Pickup)</option>
                  <option value="High">High (Almost Full)</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Dispatch Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Instructions for collector..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAssignModal(null)}
                  className="w-1/3 py-2.5 rounded-xl font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                >
                  {actionLoading ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

