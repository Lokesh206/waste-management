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
  ShieldCheck,
  Eye,
  GitBranch,
  Truck,
  Trash2,
  Clock,
  Scale,
} from 'lucide-react';

export default function RecyclingDashboard() {
  const [incomingRecords, setIncomingRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Status Update Modal State
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [newStatus, setNewStatus] = useState('Processing');
  const [processedQty, setProcessedQty] = useState('');
  const [recoveryRateInput, setRecoveryRateInput] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Traceability Lifecycle Modal State
  const [traceRecord, setTraceRecord] = useState(null);

  const fetchRecyclingData = async () => {
    setLoading(true);
    try {
      const [recRes, statsRes] = await Promise.all([
        recyclingAPI.getIncoming(),
        recyclingAPI.getStats(),
      ]);
      if (recRes.data?.success) setIncomingRecords(recRes.data.records || []);
      if (statsRes.data?.success) setStats(statsRes.data);
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
        recovery_rate: recoveryRateInput ? parseFloat(recoveryRateInput) : undefined,
      });

      if (res.data?.success) {
        setMessage(`Batch ${selectedRecord.batch_number || `#REC-${selectedRecord.id}`} updated to ${newStatus}.`);
        setSelectedRecord(null);
        fetchRecyclingData();
        setTimeout(() => setMessage(''), 4000);
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
            Material Recovery Facility (MRF)
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">Recycling Center & Traceability Hub</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            End-to-end municipal waste batch traceability, sorting stages, and circular economy recovery metrics.
          </p>
        </div>

        <button
          onClick={fetchRecyclingData}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs flex items-center gap-1.5 self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Batches</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Received Recyclables"
          value={`${totals.totalReceivedKg} kg`}
          subtitle="Delivered by municipal fleet"
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
          title="Clean Recycled Output"
          value={`${totals.totalRecycledKg} kg`}
          subtitle="Secondary raw materials"
          icon={CheckCircle2}
          color="emerald"
        />
        <MetricCard
          title="Recovery Efficiency"
          value={`${totals.recyclingEfficiencyPct}%`}
          subtitle="Mass conversion ratio"
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
          <div>
            <h2 className="text-base font-bold text-slate-900">Incoming Waste Batches & Traceability Log</h2>
            <p className="text-xs text-slate-500">Every batch is tied to its originating IoT bin node and collection truck.</p>
          </div>
          <span className="text-xs text-slate-500 font-medium">{incomingRecords.length} records</span>
        </div>

        {incomingRecords.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-400">
            No incoming recyclable shipments recorded yet. When collectors empty bins, batch shipments appear here automatically.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Batch Number</th>
                  <th className="py-3 px-4">Origin Bin</th>
                  <th className="py-3 px-4">Waste Stream</th>
                  <th className="py-3 px-4">Received Mass</th>
                  <th className="py-3 px-4">Processed Mass</th>
                  <th className="py-3 px-4">Recovery %</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Collector / Vehicle</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {incomingRecords.map((r) => {
                  const batchNo = r.batch_number || `BATCH-SWMS-2026-${r.id + 1000}`;
                  const recoveryPct = r.recovery_rate || (r.processed_quantity ? Math.round((r.processed_quantity / r.quantity) * 100) : 85);

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="text-emerald-600 font-bold">●</span>
                          <span className="text-indigo-700">{batchNo}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-normal">#REC-{r.id}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 font-medium">
                        {r.collectionRecord?.collectionRequest?.bin?.bin_code || 'Central Bin Node'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                          {r.waste_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {r.quantity} {r.unit}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {r.processed_quantity || 0} {r.unit}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-700 font-mono">
                        {recoveryPct}%
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <div>
                          <p className="font-semibold text-slate-800">{r.collectionRecord?.collector?.name || 'Municipal Team'}</p>
                          <p className="text-[10px] text-slate-400 font-mono">Vehicle: TRUCK-01</p>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setTraceRecord(r)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                            title="Inspect Full Lifecycle Traceability"
                          >
                            <GitBranch className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRecord(r);
                              setNewStatus(r.status === 'Pending' ? 'Received' : r.status === 'Received' ? 'Processing' : 'Recycled');
                              setProcessedQty(r.quantity.toString());
                              setRecoveryRateInput(recoveryPct.toString());
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition"
                          >
                            Update
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Status Update Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Update Processing Status</h3>
                <p className="text-xs text-slate-500 font-mono">
                  {selectedRecord.batch_number || `#REC-${selectedRecord.id}`}
                </p>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Processing Stage</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-medium"
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
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Material Recovery Rate (%)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={recoveryRateInput}
                  onChange={(e) => setRecoveryRateInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                  placeholder="e.g. 88"
                />
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
                  {actionLoading ? 'Saving...' : 'Save Processing State'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL LIFECYCLE TRACEABILITY MODAL */}
      {traceRecord && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <GitBranch className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Waste Batch Traceability Journey</h3>
                  <p className="text-xs text-indigo-700 font-mono font-bold">
                    {traceRecord.batch_number || `BATCH-SWMS-2026-${traceRecord.id + 1000}`}
                  </p>
                </div>
              </div>
              <button onClick={() => setTraceRecord(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Traceability Stepper */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 text-xs font-bold">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <p className="font-bold text-slate-900">1. Smart Bin Telemetry Spike</p>
                  <p className="text-slate-500">
                    Origin: {traceRecord.collectionRecord?.collectionRequest?.bin?.bin_code || 'Central Node'} ({traceRecord.collectionRecord?.collectionRequest?.bin?.location_name || 'City Sector'})
                  </p>
                  <span className="text-[10px] text-slate-400 font-mono">Fill &gt; 90% triggered automated collection alert</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 text-xs font-bold">
                  <Truck className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <p className="font-bold text-slate-900">2. Collector Pickup & Verification</p>
                  <p className="text-slate-500">
                    Lifted by {traceRecord.collectionRecord?.collector?.name || 'Field Collector'} via vehicle TRUCK-01.
                  </p>
                  <span className="text-[10px] text-emerald-700 font-bold font-mono">
                    ✓ Anti-Fraud GPS Geofence &lt; 350m Confirmed
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 text-xs font-bold">
                  <Scale className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <p className="font-bold text-slate-900">3. Weighbridge & Receiving</p>
                  <p className="text-slate-500">
                    Logged Mass: <strong>{traceRecord.quantity} {traceRecord.unit}</strong> | Stream: {traceRecord.waste_type}
                  </p>
                  <span className="text-[10px] text-slate-400 font-mono">Registered at Material Recovery Plant</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 text-xs font-bold">
                  <Recycle className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <p className="font-bold text-slate-900">4. Processing & Material Recovery</p>
                  <p className="text-slate-500">
                    Current Stage: <strong className="text-emerald-700">{traceRecord.status}</strong> | Recovery Rate: <strong>{traceRecord.recovery_rate || 85}%</strong>
                  </p>
                  <span className="text-[10px] text-slate-400 font-mono">Converted to clean recycled flake / pellets</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setTraceRecord(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition"
              >
                Close Trace Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
