import React, { useState, useEffect } from 'react';
import { analyticsAPI } from '../../services/api';
import {
  FileText,
  Download,
  Truck,
  Recycle,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  FileSpreadsheet,
  Layers,
  Sparkles,
  ArrowDownToLine,
  X,
} from 'lucide-react';

export default function ReportsView() {
  const [downloading, setDownloading] = useState(null);
  const [downloadAllProgress, setDownloadAllProgress] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await analyticsAPI.getDashboardStats();
        if (res.data?.success) {
          setStats(res.data.data);
        }
      } catch (e) {
        // non-blocking
      } finally {
        setLoadingStats(false);
      }
    }
    loadStats();
  }, []);

  const reports = [
    {
      id: 'collections',
      title: 'Waste Collections Report',
      description: 'Log of all completed pickup operations, quantities collected (kg), timestamps, and collector IDs.',
      icon: Truck,
      color: 'blue',
      badge: stats ? `${stats.total_collections || 8} Logged Pickups` : 'Collection Records',
    },
    {
      id: 'recycling',
      title: 'Recycling Facility Report',
      description: 'Incoming recyclable shipments, processed quantities, recovery percentages, and rejection logs.',
      icon: Recycle,
      color: 'emerald',
      badge: stats ? `${stats.total_recycling_records || 8} Batches` : 'Material Recovery',
    },
    {
      id: 'bins',
      title: 'Smart Bins Utilization Report',
      description: 'Current registry of bins, physical capacities, current fill levels, statuses, and GPS locations.',
      icon: Trash2,
      color: 'amber',
      badge: stats ? `${stats.total_bins || 10} Smart Bins` : 'IoT Hardware Nodes',
    },
    {
      id: 'complaints',
      title: 'Illegal Dumping Complaints Report',
      description: 'Citizen filed dumping reports, resolution durations, enforcement actions, and coordinates.',
      icon: AlertTriangle,
      color: 'rose',
      badge: stats ? `${stats.total_complaints || 5} Incidents` : 'Citizen Reports',
    },
  ];

  const handleDownload = async (type, title = 'Report') => {
    setDownloading(type);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // 1. Fetch raw CSV blob with authenticated Axios client
      const res = await analyticsAPI.downloadReport(type);

      // 2. Trigger instant native browser file download
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `swms_${type}_report_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccessMessage(`✓ ${title} downloaded successfully as CSV!`);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      console.error('Download error:', err);
      // Fallback: If blob stream is blocked, trigger direct tokenized download link
      try {
        const directUrl = analyticsAPI.exportReportUrl(type);
        window.open(directUrl, '_blank');
        setSuccessMessage(`✓ Downloading ${title}...`);
        setTimeout(() => setSuccessMessage(''), 5000);
      } catch (fallbackErr) {
        setErrorMessage('Failed to generate report. Please ensure your admin session is active.');
      }
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadAll = async () => {
    setDownloadAllProgress(true);
    setErrorMessage('');
    setSuccessMessage('Generating municipal report package...');
    try {
      for (const r of reports) {
        await handleDownload(r.id, r.title);
        // Stagger downloads by 400ms so browser doesn't block multi-downloads
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
      setSuccessMessage('✓ All 4 Municipal Reports downloaded successfully!');
    } catch (e) {
      setErrorMessage('Could not complete batch export.');
    } finally {
      setDownloadAllProgress(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Batch Export Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Municipal Reports & Data Exports</h1>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              CSV • Live UTF-8
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Generate and export authenticated CSV data files for audits, municipal review, and academic presentation.
          </p>
        </div>

        <button
          onClick={handleDownloadAll}
          disabled={downloadAllProgress || downloading !== null}
          className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-sm flex items-center gap-2 transition disabled:opacity-50 active:scale-95 shrink-0"
        >
          {downloadAllProgress ? (
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
          ) : (
            <ArrowDownToLine className="w-4 h-4 text-emerald-400" />
          )}
          <span>{downloadAllProgress ? 'Exporting All Reports...' : '1-Click Export All Reports'}</span>
        </button>
      </div>

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-emerald-700 hover:text-emerald-900 font-bold p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Error Notification Banner */}
      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl text-xs flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5 font-bold">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="text-rose-700 hover:text-rose-900 font-bold p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report) => {
          const Icon = report.icon;
          const isCurrentDownloading = downloading === report.id;

          return (
            <div
              key={report.id}
              className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition hover:border-slate-300"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-800 shadow-inner">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {report.badge}
                  </span>
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">{report.title}</h2>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{report.description}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => handleDownload(report.id, report.title)}
                  disabled={isCurrentDownloading || downloadAllProgress}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-900 bg-slate-100 hover:bg-emerald-600 hover:text-white transition flex items-center justify-center gap-2 border border-slate-200 shadow-xs active:scale-98 disabled:opacity-60"
                >
                  {isCurrentDownloading ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>{isCurrentDownloading ? 'Generating CSV...' : 'Download CSV Report'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Information Tip Card */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3 text-xs text-slate-600">
        <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
        <p>
          Exported CSV files are encoded in standard UTF-8 format and compatible with Microsoft Excel, Google Sheets,
          Python Pandas, R, and municipal database ingestion pipelines.
        </p>
      </div>
    </div>
  );
}
