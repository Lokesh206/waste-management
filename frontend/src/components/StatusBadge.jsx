import React from 'react';

export default function StatusBadge({ status, type = 'status' }) {
  if (!status) return null;

  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';

  const s = status.toLowerCase();

  if (s === 'normal' || s === 'completed' || s === 'resolved' || s === 'recycled') {
    colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (s === 'moderate' || s === 'medium' || s === 'accepted' || s === 'received') {
    colorClasses = 'bg-blue-50 text-blue-700 border-blue-200';
  } else if (s === 'almost full' || s === 'high' || s === 'under review' || s === 'processing' || s === 'assigned' || s === 'on the way') {
    colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (s === 'critical' || s === 'rejected' || s === 'cancelled') {
    colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (s === 'offline') {
    colorClasses = 'bg-slate-800 text-white border-slate-900';
  } else if (s === 'pending') {
    colorClasses = 'bg-amber-100 text-amber-800 border-amber-300';
  }

  // Icons or dots for bin status
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorClasses}`}
    >
      {status === 'Critical' && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />}
      {status === 'Normal' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
      {status === 'Moderate' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
      {status === 'Almost Full' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
      {status === 'Offline' && <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />}
      {status}
    </span>
  );
}

