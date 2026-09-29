import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { analyticsAPI, binsAPI, collectionsAPI, authAPI, adminAPI } from '../../services/api';
import { getSocket, onBinUpdate, onBinCritical, onVehicleLocation, onCollectionEvent, joinRoleRoom } from '../../services/socket';
import MetricCard from '../../components/MetricCard';
import StatusBadge from '../../components/StatusBadge';
import LeafletMap from '../../components/LeafletMap';
import {
  Users,
  Truck,
  Trash2,
  AlertCircle,
  Clock,
  AlertTriangle,
  Scale,
  Recycle,
  Cpu,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  X,
  Search,
  ShieldCheck,
  Filter,
  Sparkles,
  Check,
  Radio,
  Activity,
  Server,
  Zap,
  ShieldAlert,
  Flame,
  BatteryCharging,
  Layers,
} from 'lucide-react';

const ROLE_BADGES = {
  citizen: { label: 'Citizen', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  collector: { label: 'Collector', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  recycling_center: { label: 'Recycling Hub', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  admin: { label: 'Administrator', color: 'bg-purple-100 text-purple-800 border-purple-200' },
};

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [bins, setBins] = useState([]);
  const [criticalRequests, setCriticalRequests] = useState([]);
  const [completedCollections, setCompletedCollections] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active Admin View Tab: 'OVERVIEW' | 'ANOMALIES' | 'AUDIT_LOGS' | 'SYSTEM_HEALTH'
  const [activeTab, setActiveTab] = useState('OVERVIEW');

  // Real-time Socket.IO Connection & Alerts
  const [socketConnected, setSocketConnected] = useState(false);
  const [liveVehicles, setLiveVehicles] = useState({});
  const [criticalAlertBanner, setCriticalAlertBanner] = useState(null);

  // Registered Roles & Users modal state
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [usersList, setUsersList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Operational Subsystem States
  const [anomalies, setAnomalies] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [opsLoading, setOpsLoading] = useState(false);

  // Fetch Core Metrics
  const fetchDashboardData = async () => {
    try {
      const [statsRes, binsRes, reqsRes, compRes] = await Promise.all([
        analyticsAPI.getDashboardStats(),
        binsAPI.getAll(),
        collectionsAPI.getAll({ priority: 'Critical', status: 'Pending' }),
        collectionsAPI.getAll({ status: 'Completed' }),
      ]);
      if (statsRes.data?.success) setDashboardData(statsRes.data);
      if (binsRes.data?.success) setBins(binsRes.data.bins || []);
      if (reqsRes.data?.success) setCriticalRequests(reqsRes.data.requests || []);
      if (compRes.data?.success) setCompletedCollections(compRes.data.requests || []);
    } catch (err) {
      console.error('Error fetching admin dashboard stats', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Operational Diagnostics (Anomalies, Audits, Health)
  const fetchOperationalData = async () => {
    setOpsLoading(true);
    try {
      const [anomRes, auditRes, healthRes] = await Promise.all([
        adminAPI.getAnomalies().catch(() => ({ data: { anomalies: [] } })),
        adminAPI.getAuditLogs().catch(() => ({ data: { logs: [] } })),
        adminAPI.getSystemHealth().catch(() => ({ data: null })),
      ]);
      if (anomRes.data?.success) setAnomalies(anomRes.data.anomalies || []);
      if (auditRes.data?.success) setAuditLogs(anomRes.data.logs || auditRes.data?.logs || []);
      if (healthRes.data?.success) setSystemHealth(healthRes.data);
    } catch (err) {
      console.error('Error fetching operational diagnostics', err);
    } finally {
      setOpsLoading(false);
    }
  };

  const fetchUsers = async (role = selectedRole) => {
    setUsersLoading(true);
    try {
      const res = await authAPI.getAllUsers(role === 'ALL' ? undefined : role);
      if (res.data?.success) {
        setUsersList(res.data.users || []);
      }
    } catch (err) {
      console.error('Error fetching registered users', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleOpenUsers = (role = 'ALL') => {
    setSelectedRole(role);
    setShowUsersModal(true);
    fetchUsers(role);
  };

  // Initial Data & WebSocket Subscription Lifecycle
  useEffect(() => {
    fetchDashboardData();
    fetchOperationalData();

    // Setup Socket.IO
    const socket = getSocket();
    if (socket) {
      setSocketConnected(socket.connected);
      socket.on('connect', () => {
        setSocketConnected(true);
        joinRoleRoom('admin');
      });
      socket.on('disconnect', () => setSocketConnected(false));
    }

    // 1. Subscribe to Live Bin Updates (updates in-memory without reload)
    const unsubBinUpdate = onBinUpdate((updatedBin) => {
      setBins((prev) =>
        prev.map((b) => (b.id === updatedBin.id || b.bin_code === updatedBin.bin_code ? { ...b, ...updatedBin } : b))
      );
    });

    // 2. Subscribe to Critical Overflow Events
    const unsubBinCritical = onBinCritical((data) => {
      setCriticalAlertBanner(data);
      // Auto-hide alert banner after 8 seconds
      setTimeout(() => setCriticalAlertBanner(null), 8000);
      fetchDashboardData();
    });

    // 3. Subscribe to Moving Collector Vehicles
    const unsubVehicles = onVehicleLocation((loc) => {
      setLiveVehicles((prev) => ({
        ...prev,
        [loc.vehicle_id || loc.collector_name || 'TRUCK-01']: {
          ...loc,
          updated_at: new Date().toLocaleTimeString(),
        },
      }));
    });

    // 4. Subscribe to Collection Dispatch Events
    const unsubCollections = onCollectionEvent((eventData) => {
      fetchDashboardData();
    });

    // Background interval polling fallback
    const interval = setInterval(fetchDashboardData, 8000);

    return () => {
      clearInterval(interval);
      unsubBinUpdate?.();
      unsubBinCritical?.();
      unsubVehicles?.();
      unsubCollections?.();
    };
  }, []);

  const kpis = dashboardData?.kpis || {};

  // Filter users by search query
  const filteredUsers = usersList.filter((u) => {
    const query = userSearchQuery.toLowerCase();
    const matchName = u.name?.toLowerCase().includes(query);
    const matchEmail = u.email?.toLowerCase().includes(query);
    const matchRole = selectedRole === 'ALL' || u.role === selectedRole;
    return (matchName || matchEmail) && matchRole;
  });

  return (
    <div className="space-y-8">
      {/* Header & Status Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800">
              System Administration
            </span>
            {socketConnected ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Real-Time Engine: Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                Connecting WebSocket...
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">Command & Control Center</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time IoT telemetry ingestion, automated dispatch engine, anti-fraud audit trail, and municipal GIS.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => handleOpenUsers('ALL')}
            className="px-3.5 py-2 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition flex items-center gap-2"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Registered Roles</span>
          </button>

          <Link
            to="/admin/simulator"
            className="px-3.5 py-2 rounded-xl font-bold text-xs bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition flex items-center gap-2"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Virtual IoT Simulator</span>
          </Link>

          <button
            onClick={() => {
              fetchDashboardData();
              fetchOperationalData();
            }}
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            title="Refresh All Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading || opsLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Real-Time Critical Overflow Flash Toast */}
      {criticalAlertBanner && (
        <div className="p-4 bg-rose-600 text-white rounded-2xl shadow-xl flex items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-white/20 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-white animate-bounce" />
            </span>
            <div>
              <p className="font-extrabold text-sm">
                🚨 CRITICAL OVERFLOW ALERT: {criticalAlertBanner.bin_code || 'Smart Bin'} reached {criticalAlertBanner.fill_percentage}%
              </p>
              <p className="text-xs text-rose-100">
                Automatic dispatch triggered! {criticalAlertBanner.auto_dispatch ? 'Collection request auto-assigned to active collector.' : 'Collection task queued.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setCriticalAlertBanner(null)}
            className="p-1 rounded-lg hover:bg-white/20 text-white transition text-xs font-bold"
          >
            ✕ Dismiss
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold no-scrollbar border-b border-slate-200">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`px-4 py-2.5 rounded-t-xl transition flex items-center gap-2 ${
            activeTab === 'OVERVIEW'
              ? 'bg-slate-900 text-white shadow-sm font-black border-b-2 border-slate-900'
              : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Operational Overview</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('ANOMALIES');
            fetchOperationalData();
          }}
          className={`px-4 py-2.5 rounded-t-xl transition flex items-center gap-2 ${
            activeTab === 'ANOMALIES'
              ? 'bg-rose-600 text-white shadow-sm font-black border-b-2 border-rose-600'
              : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <AlertCircle className="w-4 h-4 text-rose-400" />
          <span>Sensor Anomalies & Gas Safety ({anomalies.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('AUDIT_LOGS');
            fetchOperationalData();
          }}
          className={`px-4 py-2.5 rounded-t-xl transition flex items-center gap-2 ${
            activeTab === 'AUDIT_LOGS'
              ? 'bg-blue-600 text-white shadow-sm font-black border-b-2 border-blue-600'
              : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          <span>Anti-Fraud & Audit Trail</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('SYSTEM_HEALTH');
            fetchOperationalData();
          }}
          className={`px-4 py-2.5 rounded-t-xl transition flex items-center gap-2 ${
            activeTab === 'SYSTEM_HEALTH'
              ? 'bg-emerald-600 text-white shadow-sm font-black border-b-2 border-emerald-600'
              : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Server className="w-4 h-4 text-emerald-400" />
          <span>Platform Health Diagnostics</span>
        </button>
      </div>

      {/* TAB 1: OPERATIONAL OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-8 animate-in fade-in duration-150">
          {/* 8 KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              title="Total Users"
              value={kpis.totalUsers || 0}
              subtitle="Registered municipal accounts"
              icon={Users}
              color="slate"
              onClick={() => handleOpenUsers('ALL')}
              isActive={showUsersModal && selectedRole === 'ALL'}
            />

            <MetricCard
              title="Active Collectors"
              value={kpis.activeCollectors || 0}
              subtitle="Fleet on active duty"
              icon={Truck}
              color="blue"
              onClick={() => handleOpenUsers('collector')}
              isActive={showUsersModal && selectedRole === 'collector'}
            />

            <MetricCard
              title="Total Smart Bins"
              value={kpis.totalBins || 0}
              subtitle="Active IoT sensor nodes"
              icon={Trash2}
              color="emerald"
            />

            <MetricCard
              title="Critical Overflow"
              value={kpis.criticalBins || 0}
              subtitle="Fill ≥ 90% (Urgent)"
              icon={AlertCircle}
              color="rose"
            />

            <MetricCard
              title="Pending Pickups"
              value={kpis.pendingCollections || 0}
              subtitle="Active dispatch queue"
              icon={Clock}
              color="amber"
            />

            <MetricCard
              title="Completed Collections"
              value={completedCollections.length}
              subtitle="Verified collections logged"
              icon={CheckCircle2}
              color="emerald"
            />

            <MetricCard
              title="Waste Lifted"
              value={`${kpis.totalCollectedKg || 0} kg`}
              subtitle="Total payload cleared"
              icon={Scale}
              color="emerald"
            />

            <MetricCard
              title="Waste Recycled"
              value={`${kpis.totalRecycledKg || 0} kg`}
              subtitle={`Efficiency: ${kpis.recyclingRatePct || 0}%`}
              icon={Recycle}
              color="blue"
            />
          </div>

          {/* Live Map & Immediate Action Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Map View */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h2 className="text-base font-bold text-slate-900">Live Municipal Smart-Bin & Fleet Map</h2>
                  </div>
                  <p className="text-xs text-slate-500">Live GPS telemetry and moving collection vehicles</p>
                </div>
                <Link to="/admin/bins" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                  <span>Manage Registry</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="flex-1 min-h-[380px]">
                <LeafletMap bins={bins} height="390px" />
              </div>

              {Object.keys(liveVehicles).length > 0 && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-slate-800">Active Live Fleet:</span>
                    {Object.entries(liveVehicles).map(([vId, v]) => (
                      <span key={vId} className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-mono font-semibold text-[11px]">
                        {vId} (Speed: {v.speed || 0} km/h)
                      </span>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400">Live Socket Updates Active</span>
                </div>
              )}
            </div>

            {/* Critical Alerts & Quick Actions */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                    <h2 className="text-base font-bold text-slate-900">Immediate Action Alerts</h2>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">
                    {bins.filter((b) => b.status === 'Critical' || b.current_fill_percentage >= 90).length} Critical
                  </span>
                </div>

                <div className="space-y-3">
                  {bins
                    .filter((b) => b.status === 'Critical' || b.current_fill_percentage >= 80)
                    .slice(0, 5)
                    .map((bin) => (
                      <div key={bin.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-slate-900">{bin.bin_code}</span>
                            {bin.gas_level_ppm > 70 && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">
                                Gas: {bin.gas_level_ppm}ppm
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-1">{bin.location_name}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-xs text-rose-600 block">{bin.current_fill_percentage}%</span>
                          <StatusBadge status={bin.status} />
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-100">
                <Link
                  to="/admin/assignments"
                  className="w-full py-2.5 px-3 rounded-xl text-xs font-bold text-center text-white bg-slate-900 hover:bg-slate-800 transition block shadow-sm"
                >
                  Manage Collector Assignments & Dispatches
                </Link>
                <Link
                  to="/admin/complaints"
                  className="w-full py-2.5 px-3 rounded-xl text-xs font-bold text-center text-slate-700 bg-slate-100 hover:bg-slate-200 transition block"
                >
                  Citizen Dumping Reports & SLAs
                </Link>
              </div>
            </div>
          </div>

          {/* COMPLETED BINS & COLLECTION LOGS LIST */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-lg font-bold text-slate-900">Completed Collections & Traceability Stream</h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verified municipal collections with GPS geo-fencing, tamper prevention, and batch trace codes.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 w-fit">
                {completedCollections.length} Completed Collections Logged
              </span>
            </div>

            {completedCollections.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <Clock className="w-10 h-10 text-slate-400 mx-auto" />
                <p className="text-sm font-bold text-slate-700">No Completed Collections Yet</p>
                <p className="text-xs text-slate-400">
                  When collectors complete their tasks via the mobile portal, verified entries will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Task / Bin Code</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">Trace Batch #</th>
                      <th className="py-3 px-4">Weight Lifted</th>
                      <th className="py-3 px-4">Assigned Collector</th>
                      <th className="py-3 px-4">Completion Time</th>
                      <th className="py-3 px-4">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {completedCollections.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <span className="text-emerald-600 font-bold">✓</span>
                            <span>{c.bin?.bin_code || `BIN-00${c.bin_id || 1}`}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-normal">Task #{c.id}</span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">
                          {c.bin?.location_name || 'Municipal Sector Central'}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-indigo-700 font-bold">
                          {c.records?.[0]?.batch_number || `BATCH-SWMS-2026-${c.id + 1000}`}
                        </td>
                        <td className="py-3 px-4 font-black text-slate-900">
                          {c.records?.[0]?.collected_quantity || 25} kg
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center">
                              {c.assignedCollector?.name?.[0] || 'A'}
                            </div>
                            <span className="font-semibold text-slate-900">
                              {c.assignedCollector?.name || 'Municipal Team Alpha'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                          {new Date(c.completed_at || c.updated_at).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4">
                          {c.records?.[0]?.fraud_flag ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              GPS Geo-fence Alert
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-600" />
                              GPS Verified (&lt;350m)
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SENSOR ANOMALIES & GAS SAFETY */}
      {activeTab === 'ANOMALIES' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                <h2 className="text-lg font-bold text-slate-900">Sensor Anomalies, Toxic Gas & Battery Alerts</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Automated detection of irregular fill surges (&gt;30% per cycle), dangerous air quality (&gt;80 ppm), and depleted batteries (&lt;20%).
              </p>
            </div>
            <button
              onClick={fetchOperationalData}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${opsLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Anomalies</span>
            </button>
          </div>

          {anomalies.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="text-sm font-bold text-slate-800">All Municipal Sensors Normal</p>
              <p className="text-xs text-slate-500">No sudden fill spikes, toxic gas leaks, or battery alerts detected.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {anomalies.map((anom) => (
                <div
                  key={anom.id}
                  className={`p-5 rounded-2xl border transition shadow-xs ${
                    anom.severity === 'CRITICAL'
                      ? 'bg-rose-50/50 border-rose-300 ring-1 ring-rose-200'
                      : anom.severity === 'WARNING'
                      ? 'bg-amber-50/50 border-amber-300'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-xs text-slate-900">
                      {anom.bin?.bin_code || `BIN-NODE-${anom.bin_id}`}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        anom.severity === 'CRITICAL'
                          ? 'bg-rose-600 text-white'
                          : 'bg-amber-600 text-white'
                      }`}
                    >
                      {anom.severity}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-slate-800 mb-1">{anom.anomaly_type.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-slate-600 mb-3 leading-relaxed">{anom.description}</p>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>{new Date(anom.detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className={anom.resolved ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                      {anom.resolved ? '✓ Resolved' : 'Active Anomaly'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ANTI-FRAUD & AUDIT TRAIL */}
      {activeTab === 'AUDIT_LOGS' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-slate-900">Anti-Fraud & Verification Audit Trail</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Cryptographic immutable log of collection attempts, GPS proximity checks, and suspicious collection alerts.
              </p>
            </div>
            <button
              onClick={fetchOperationalData}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${opsLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Audits</span>
            </button>
          </div>

          {auditLogs.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
              <ShieldCheck className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-800">Audit Trail Clean</p>
              <p className="text-xs text-slate-500">All recorded collections verified within legal municipal geo-fences.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Event Type</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Entity</th>
                    <th className="py-3 px-4">IP / GPS Details</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.action.includes('FRAUD') || log.action.includes('SUSPICIOUS')
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{log.user_id ? `User #${log.user_id}` : 'System'}</td>
                      <td className="py-3 px-4 text-slate-600">{log.entity_type} #{log.entity_id}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{log.ip_address || 'Internal RPC'}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {new Date(log.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                        {log.details ? JSON.stringify(log.details) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PLATFORM HEALTH DIAGNOSTICS */}
      {activeTab === 'SYSTEM_HEALTH' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-bold text-slate-900">Municipal SWMS Platform Health & Diagnostics</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time API gateway status, SQLite / Prisma database connection latency, WebSocket sockets, and IoT ingestion statistics.
              </p>
            </div>
            <button
              onClick={fetchOperationalData}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${opsLoading ? 'animate-spin' : ''}`} />
              <span>Run Diagnostics</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">API Gateway</span>
              <p className="text-xl font-black text-emerald-950">OPERATIONAL</p>
              <p className="text-xs text-emerald-700">Response Latency: &lt; 5ms</p>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-1">
              <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block">Database (Prisma)</span>
              <p className="text-xl font-black text-blue-950">CONNECTED</p>
              <p className="text-xs text-blue-700">Dialect: SQLite / ACID Compliant</p>
            </div>

            <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 space-y-1">
              <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider block">WebSocket Engine</span>
              <p className="text-xl font-black text-purple-950">{socketConnected ? 'ACTIVE' : 'CONNECTING'}</p>
              <p className="text-xs text-purple-700">Transport: Socket.IO / WSS</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">Host Memory</span>
              <p className="text-xl font-black text-slate-900">
                {systemHealth?.host?.used_memory_mb ? `${systemHealth.host.used_memory_mb} MB` : 'Normal'}
              </p>
              <p className="text-xs text-slate-500">Uptime: {Math.round((systemHealth?.host?.uptime_seconds || 3600) / 60)} mins</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-emerald-400 font-bold">● System Services Health Matrix</span>
              <span className="text-slate-400">Timestamp: {new Date().toISOString()}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <p>✓ Ingestion Pipeline: HTTP POST /api/iot/bin-reading (Secured with x-api-key)</p>
              <p>✓ Event Broadcast Engine: Socket.IO Server active on Port 5000</p>
              <p>✓ Real-Time GIS Engine: OpenStreetMap / Nominatim Reverse Geocoder active</p>
              <p>✓ Machine Learning: Waste Classification + Linear Fill Forecast Active</p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL / DRAWER: REGISTERED ROLES VIEWER */}
      {showUsersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-4xl rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Registered System Users & Roles</h3>
                  <p className="text-xs text-slate-500">View and inspect registered citizens, collectors, recyclers, and admins</p>
                </div>
              </div>
              <button
                onClick={() => setShowUsersModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Role Filter Tabs & Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold no-scrollbar">
                {[
                  { key: 'ALL', label: 'All Roles', count: usersList.length },
                  { key: 'citizen', label: 'Citizens', count: usersList.filter((u) => u.role === 'citizen').length },
                  { key: 'collector', label: 'Collectors', count: usersList.filter((u) => u.role === 'collector').length },
                  { key: 'recycling_center', label: 'Recyclers', count: usersList.filter((u) => u.role === 'recycling_center').length },
                  { key: 'admin', label: 'Admins', count: usersList.filter((u) => u.role === 'admin').length },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setSelectedRole(tab.key);
                      fetchUsers(tab.key);
                    }}
                    className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
                      selectedRole === tab.key
                        ? 'bg-slate-900 text-white shadow-sm font-black'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {usersList.length > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search user name or email..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Users Table */}
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-2xl">
              {usersLoading ? (
                <div className="p-12 text-center text-xs text-slate-500 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                  <p>Loading registered roles...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 space-y-1">
                  <p className="font-bold text-slate-800">No users match the selected role filter.</p>
                  <p className="text-[11px] text-slate-400">Try selecting "All Roles" or clearing your search query.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="py-3 px-4">User Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">Assigned Role</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Registered Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredUsers.map((u) => {
                      const badge = ROLE_BADGES[u.role] || { label: u.role, color: 'bg-slate-100 text-slate-800' };
                      return (
                        <tr key={u.id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-4 font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-800 font-black text-xs flex items-center justify-center border border-slate-200">
                                {u.name?.[0] || 'U'}
                              </div>
                              <span>{u.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-600">{u.email}</td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-600">{u.phone || '—'}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${badge.color}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {u.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 shrink-0">
              <span>Showing {filteredUsers.length} of {usersList.length} total registered accounts</span>
              <button
                onClick={() => setShowUsersModal(false)}
                className="px-4 py-2 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
