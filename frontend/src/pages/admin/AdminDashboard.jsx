import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { analyticsAPI, binsAPI, collectionsAPI, authAPI } from '../../services/api';
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
  UserCheck,
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

  // Registered Roles & Users modal/section state
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [usersList, setUsersList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, binsRes, reqsRes, compRes] = await Promise.all([
        analyticsAPI.getDashboardStats(),
        binsAPI.getAll(),
        collectionsAPI.getAll({ priority: 'Critical', status: 'Pending' }),
        collectionsAPI.getAll({ status: 'Completed' }),
      ]);
      if (statsRes.data.success) setDashboardData(statsRes.data);
      if (binsRes.data.success) setBins(binsRes.data.bins || []);
      if (reqsRes.data.success) setCriticalRequests(reqsRes.data.requests || []);
      if (compRes.data.success) setCompletedCollections(compRes.data.requests || []);
    } catch (err) {
      console.error('Error fetching admin dashboard stats', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async (role = selectedRole) => {
    setUsersLoading(true);
    try {
      const res = await authAPI.getAllUsers(role === 'ALL' ? undefined : role);
      if (res.data.success) {
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

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800">
            System Administration
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">Command & Control Center</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Click Total Users or Active Collectors to inspect registered roles, or review completed bins below.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleOpenUsers('ALL')}
            className="px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            <span>View Registered Roles</span>
          </button>

          <Link
            to="/admin/simulator"
            className="px-4 py-2.5 rounded-xl font-bold text-xs bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition flex items-center gap-2"
          >
            <Cpu className="w-4 h-4" />
            <span>Launch IoT Simulator</span>
          </Link>
          <button
            onClick={fetchDashboardData}
            className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 8 KPI Cards (Clickable Total Users & Active Collectors) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Users"
          value={kpis.totalUsers || 0}
          subtitle="Click to view all registered roles"
          icon={Users}
          color="slate"
          onClick={() => handleOpenUsers('ALL')}
          isActive={showUsersModal && selectedRole === 'ALL'}
        />

        <MetricCard
          title="Active Collectors"
          value={kpis.activeCollectors || 0}
          subtitle="Click to view collector personnel"
          icon={Truck}
          color="blue"
          onClick={() => handleOpenUsers('collector')}
          isActive={showUsersModal && selectedRole === 'collector'}
        />

        <MetricCard
          title="Total Smart Bins"
          value={kpis.totalBins || 0}
          subtitle="Monitored hardware nodes"
          icon={Trash2}
          color="emerald"
        />

        <MetricCard
          title="Critical Bins"
          value={kpis.criticalBins || 0}
          subtitle="Fill ≥ 91% (Critical)"
          icon={AlertCircle}
          color="rose"
        />

        <MetricCard
          title="Pending Pickups"
          value={kpis.pendingCollections || 0}
          subtitle="Queued dispatch tasks"
          icon={Clock}
          color="amber"
        />

        <MetricCard
          title="Completed Collections"
          value={completedCollections.length}
          subtitle="Cleaned & emptied bins"
          icon={CheckCircle2}
          color="emerald"
        />

        <MetricCard
          title="Waste Collected"
          value={`${kpis.totalCollectedKg || 0} kg`}
          subtitle="Total mass lifted"
          icon={Scale}
          color="emerald"
        />

        <MetricCard
          title="Waste Recycled"
          value={`${kpis.totalRecycledKg || 0} kg`}
          subtitle={`Rate: ${kpis.recyclingRatePct || 0}%`}
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
              <h2 className="text-base font-bold text-slate-900">Live City Smart-Bin Status Map</h2>
              <p className="text-xs text-slate-500">Real-time GPS coordinates and fill percentages</p>
            </div>
            <Link to="/admin/bins" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              <span>Manage Registry</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 min-h-[360px]">
            <LeafletMap bins={bins} height="380px" />
          </div>
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
                {bins.filter((b) => b.status === 'Critical').length} Critical
              </span>
            </div>

            <div className="space-y-3">
              {bins
                .filter((b) => b.status === 'Critical' || b.status === 'Almost Full')
                .slice(0, 5)
                .map((bin) => (
                  <div key={bin.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-slate-900">{bin.bin_code}</span>
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
              Assign Collectors to Pending Tasks
            </Link>
            <Link
              to="/admin/analytics"
              className="w-full py-2.5 px-3 rounded-xl text-xs font-bold text-center text-slate-700 bg-slate-100 hover:bg-slate-200 transition block"
            >
              Open Analytical Charts & Trends
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
              <h2 className="text-lg font-bold text-slate-900">Completed Bins & Collections Activity</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified municipal collections where smart bins were emptied and reset to 0% capacity.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 w-fit">
            {completedCollections.length} Completed Collections Logged
          </span>
        </div>

        {completedCollections.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
            <Clock className="w-10 h-10 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No Completed Collections in Database Yet</p>
            <p className="text-xs text-slate-400">
              When collectors finish tasks or when bins are collected via Alpha-01, they will be archived here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Task / Bin Code</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Waste Stream</th>
                  <th className="py-3 px-4">Weight Lifted</th>
                  <th className="py-3 px-4">Assigned Collector</th>
                  <th className="py-3 px-4">Completion Time</th>
                  <th className="py-3 px-4">Status</th>
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
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-purple-100 text-purple-800 border border-purple-200">
                        All-in-One Multi-Stream
                      </span>
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
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" />
                        Completed & Clean
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
              {/* Role filter buttons */}
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

              {/* Search Box */}
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

