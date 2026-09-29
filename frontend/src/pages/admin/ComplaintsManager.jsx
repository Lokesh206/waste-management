import React, { useState, useEffect } from 'react';
import { complaintsAPI, getImageUrl } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import {
  AlertTriangle,
  Eye,
  CheckCircle2,
  X,
  MapPin,
  RefreshCw,
} from 'lucide-react';

export default function ComplaintsManager() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [status, setStatus] = useState('Resolved');
  const [adminNotes, setAdminNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await complaintsAPI.getAll();
      if (res.data.success) {
        setComplaints(res.data.complaints || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    setActionLoading(true);
    try {
      const res = await complaintsAPI.updateStatus(selectedComplaint.id, {
        status,
        admin_notes: adminNotes,
      });

      if (res.data.success) {
        setMessage(`Complaint #${selectedComplaint.id} updated to ${status}.`);
        setSelectedComplaint(null);
        fetchComplaints();
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
          <h1 className="text-2xl font-bold text-slate-900">Illegal Dumping Complaints</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review citizen incident reports, inspect photo evidence, and coordinate cleanup enforcement.
          </p>
        </div>

        <button
          onClick={fetchComplaints}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs flex items-center gap-1.5 self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Reports</span>
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

      {/* Complaints Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Report ID</th>
                <th className="py-3 px-4">Citizen</th>
                <th className="py-3 px-4">Incident Title</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">GPS Coordinates</th>
                <th className="py-3 px-4">Filed At</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {complaints.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3.5 px-4 font-bold text-slate-900">#CMP-{c.id}</td>
                  <td className="py-3.5 px-4 text-slate-700">{c.user?.name || 'Citizen'}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-800">{c.title}</td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                    {c.latitude.toFixed(4)}, {c.longitude.toFixed(4)}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedComplaint(c);
                        setStatus(c.status === 'Pending' ? 'Under Review' : 'Resolved');
                        setAdminNotes(c.admin_notes || '');
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition inline-flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Review</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Complaint #{selectedComplaint.id}</h3>
                <p className="text-xs text-slate-500">Filed by {selectedComplaint.user?.name} ({selectedComplaint.user?.email})</p>
              </div>
              <button onClick={() => setSelectedComplaint(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-bold text-slate-700 block">Description:</span>
                <p className="text-slate-600 mt-1 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {selectedComplaint.description}
                </p>
              </div>

              {selectedComplaint.image_path && (
                <div>
                  <span className="font-bold text-slate-700 block mb-1">Evidence Photo:</span>
                  <div className="h-44 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                    <img
                      src={getImageUrl(selectedComplaint.image_path)}
                      alt="Evidence"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              <form onSubmit={handleUpdateStatus} className="space-y-3 pt-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status Transition</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="Under Review">Under Review</option>
                    <option value="Assigned">Assigned to Sanitation Crew</option>
                    <option value="Resolved">Resolved (Cleared)</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Admin Notes / Resolution Action</label>
                  <textarea
                    rows={2}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="e.g., Sanitation crew dispatched; dumping cleared and site sanitized."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedComplaint(null)}
                    className="w-1/3 py-2.5 rounded-xl font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="flex-1 py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                  >
                    {actionLoading ? 'Saving...' : 'Update & Notify Citizen'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

