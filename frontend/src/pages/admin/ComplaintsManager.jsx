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
  Camera,
  ExternalLink,
  ImageIcon,
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
                <th className="py-3 px-4">Evidence Photo</th>
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
                  <td className="py-3.5 px-4">
                    {c.image_path ? (
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 shadow-xs bg-slate-100">
                        <img
                          src={getImageUrl(c.image_path)}
                          alt="Evidence thumbnail"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-medium px-2 py-1 rounded-md bg-slate-50 border border-slate-100">
                        <ImageIcon className="w-3 h-3 text-slate-300" />
                        No Photo
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 font-medium">{c.user?.name || 'Citizen'}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-800">{c.title}</td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-700">
                      <span>📍 {c.latitude.toFixed(4)}, {c.longitude.toFixed(4)}</span>
                      <a
                        href={`https://www.google.com/maps?q=${c.latitude},${c.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Open in Google Maps"
                        className="text-blue-600 hover:text-blue-800 p-0.5 rounded hover:bg-blue-50 transition"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
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
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition inline-flex items-center gap-1.5 shadow-xs"
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
                <p className="text-slate-600 mt-1 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 whitespace-pre-line">
                  {selectedComplaint.description}
                </p>
              </div>

              {/* Photo Evidence Card */}
              {selectedComplaint.image_path ? (
                <div>
                  <span className="font-bold text-slate-700 block mb-1">Evidence Photo & Geotag:</span>
                  <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 shadow-sm">
                    <img
                      src={getImageUrl(selectedComplaint.image_path)}
                      alt="Incident Evidence"
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent p-3 text-white flex items-center justify-between">
                      <div className="text-[11px] font-mono">
                        <span className="text-emerald-400 font-bold block">📍 {selectedComplaint.latitude.toFixed(5)}, {selectedComplaint.longitude.toFixed(5)}</span>
                        {selectedComplaint.address && (
                          <span className="text-[10px] text-slate-300 font-sans truncate block max-w-[280px]">
                            {selectedComplaint.address}
                          </span>
                        )}
                      </div>
                      <a
                        href={`https://www.google.com/maps?q=${selectedComplaint.latitude},${selectedComplaint.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold inline-flex items-center gap-1 backdrop-blur-xs transition shrink-0"
                      >
                        <span>Maps</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-slate-500 font-medium">GPS Location:</span>
                    <strong className="block font-mono text-slate-800">
                      📍 {selectedComplaint.latitude.toFixed(5)}, {selectedComplaint.longitude.toFixed(5)}
                    </strong>
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${selectedComplaint.latitude},${selectedComplaint.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs inline-flex items-center gap-1.5 transition"
                  >
                    <span>Open in Maps</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
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

