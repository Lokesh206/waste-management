import React, { useState, useEffect } from 'react';
import { recyclingAPI } from '../../services/api';
import MetricCard from '../../components/MetricCard';
import StatusBadge from '../../components/StatusBadge';
import {
  Recycle,
  PackageCheck,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  X,
  AlertCircle,
} from 'lucide-react';

export default function RecyclingDashboard() {
  const [incomingRecords, setIncomingRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [newStatus, setNewStatus] = useState('Processing');
  const [processedQty, setProcessedQty] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchRecyclingData = async () => {
    setLoading(true);
    try {
      const [recRes, statsRes] = await Promise.all([
        recyclingAPI.getIncoming(),
        recyclingAPI.getStats(),
      ]);
      if (recRes.data.success) setIncomingRecords(recRes.data.records || []);
      if (statsRes.data.success) setStats(statsRes.data);
    } catch (err) {
      console.error('Error loading recycling data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecyclingData();
  }, []);

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedRecord) return;

    setActionLoading(true);
    try {
      const res = await recyclingAPI.updateStatus(selectedRecord.id, {
        status: newStatus,
        processed_quantity: processedQty ? parseFloat(processedQty) : selectedRecord.quantity,
      });

      if (res.data.success) {
        setMessage(`Batch #${selectedRecord.id} (${selectedRecord.waste_type}) updated to ${newStatus}.`);
        setSelectedRecord(null);
        fetchRecyclingData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const totals = stats?.totals || {
    totalReceivedKg: 0,
    totalProcessedKg: 0,
    totalRecycledKg: 0,
    recyclingEfficiencyPct: 0,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
            Material Recovery Facility
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">Recycling Center Portal</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Track incoming segregated waste shipments, update processing status, and quantify recovery rates.
          </p>
        </div>

        <button
          onClick={fetchRecyclingData}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs flex items-center gap-1.5 self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Records</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Received Recyclables"
          value={`${totals.totalReceivedKg} kg`}
          subtitle="Delivered by collectors"
          icon={Recycle}
          color="blue"
        />
        <MetricCard
          title="Processed Mass"
          value={`${totals.totalProcessedKg} kg`}
          subtitle="Segregated & crushed"
          icon={PackageCheck}
          color="amber"
        />
        <MetricCard
          title="Successfully Recycled"
          value={`${totals.totalRecycledKg} kg`}
          subtitle="Clean recycled output"
          icon={CheckCircle2}
          color="emerald"
        />
        <MetricCard
          title="Recovery Efficiency"
          value={`${totals.recyclingEfficiencyPct}%`}
          subtitle="Mass recovery ratio"
          icon={TrendingUp}
          color="purple"
        />
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage('')} className="text-emerald-700 font-bold">
            &times;
          </button>
        </div>
      )}

      {/* Incoming Recyclable Waste Batches Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Incoming Segregated Waste Batches</h2>
          <span className="text-xs text-slate-500 font-medium">{incomingRecords.length} records</span>
        </div>

        {incomingRecords.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-400">
            No incoming recyclable shipments recorded yet. When collectors empty recyclable bins, shipments appear here automatically.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Batch ID</th>
                  <th className="py-3 px-4">Origin Bin</th>
                  <th className="py-3 px-4">Waste Category</th>
                  <th className="py-3 px-4">Received Mass</th>
                  <th className="py-3 px-4">Processed Mass</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Collector</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {incomingRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900">#REC-{r.id}</td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {r.collectionRecord?.collectionRequest?.bin?.bin_code || 'Depot'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                        {r.waste_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {r.quantity} {r.unit}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {r.processed_quantity || 0} {r.unit}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {r.collectionRecord?.collector?.name || 'Assigned Collector'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedRecord(r);
                          setNewStatus(r.status === 'Pending' ? 'Received' : r.status === 'Received' ? 'Processing' : 'Recycled');
                          setProcessedQty(r.quantity.toString());
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition"
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Status Update Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Update Processing Status</h3>
              <button onClick={() => setSelectedRecord(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status Transition</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                >
                  <option value="Received">Received at Plant</option>
                  <option value="Processing">Processing / Sorting</option>
                  <option value="Recycled">Recycled (Clean Secondary Material)</option>
                  <option value="Rejected">Rejected (Contaminated)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Processed Mass (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={processedQty}
                  onChange={(e) => setProcessedQty(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                />
                <p className="text-[10px] text-slate-400 mt-1">Default is equal to received mass ({selectedRecord.quantity} kg).</p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="w-1/3 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700"
                >
                  {actionLoading ? 'Saving...' : 'Save Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

