import React from 'react';
import { analyticsAPI } from '../../services/api';
import { FileText, Download, Truck, Recycle, Trash2, AlertTriangle } from 'lucide-react';

export default function ReportsView() {
  const reports = [
    {
      id: 'collections',
      title: 'Waste Collections Report',
      description: 'Log of all completed pickup operations, quantities collected (kg), timestamps, and collector IDs.',
      icon: Truck,
      color: 'blue',
    },
    {
      id: 'recycling',
      title: 'Recycling Facility Report',
      description: 'Incoming recyclable shipments, processed quantities, recovery percentages, and rejection logs.',
      icon: Recycle,
      color: 'emerald',
    },
    {
      id: 'bins',
      title: 'Smart Bins Utilization Report',
      description: 'Current registry of bins, physical capacities, current fill levels, statuses, and GPS locations.',
      icon: Trash2,
      color: 'amber',
    },
    {
      id: 'complaints',
      title: 'Illegal Dumping Complaints Report',
      description: 'Citizen filed dumping reports, resolution durations, enforcement actions, and coordinates.',
      icon: AlertTriangle,
      color: 'rose',
    },
  ];

  const handleDownload = (type) => {
    const url = analyticsAPI.exportReportUrl(type);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Municipal Reports & Data Exports</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Generate and export formatted CSV data files for audits, municipal review, and academic presentation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <div
              key={report.id}
              className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:shadow transition"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">{report.title}</h2>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{report.description}</p>
                </div>
              </div>

              <button
                onClick={() => handleDownload(report.id)}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-900 bg-slate-100 hover:bg-emerald-600 hover:text-white transition flex items-center justify-center gap-2 border border-slate-200"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV Report</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

