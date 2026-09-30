import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import {
  getSocket,
  onBinUpdate,
  onBinCritical,
  onVehicleLocation,
  onCollectionEvent,
  onComplaintEvent,
} from '../services/socket';
import {
  Trash2,
  Bell,
  LogOut,
  MapPin,
  Truck,
  Shield,
  Sparkles,
  Menu,
  X,
  Radio,
  Camera,
  AlertTriangle,
  Cpu,
  BarChart3,
  Recycle,
  User,
  Activity,
  CheckCircle2,
  Mic,
} from 'lucide-react';

const ROLE_STYLES = {
  admin: { label: 'Admin', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  citizen: { label: 'Citizen', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  collector: { label: 'Collector', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  recycling_center: { label: 'Recycler', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
};

export default function Navbar({ toggleSidebar, isSidebarOpen }) {
  const { user, role, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [liveEventTicker, setLiveEventTicker] = useState('Real-Time IoT & Municipal Engine Active');

  const location = useLocation();
  const navigate = useNavigate();

  // Socket.IO Connection & Live Ticker Pipeline
  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      setSocketConnected(socket.connected);
      socket.on('connect', () => setSocketConnected(true));
      socket.on('disconnect', () => setSocketConnected(false));
    }

    const unsubBinUpdate = onBinUpdate((data) => {
      setLiveEventTicker(`⚡ ${data.bin_code || 'Smart Bin'} fill updated to ${data.fill_percentage}%`);
    });

    const unsubBinCritical = onBinCritical((data) => {
      setLiveEventTicker(`🚨 ALERT: ${data.bin_code || 'Bin'} reached ${data.fill_percentage}% (Auto-Dispatch Created)`);
    });

    const unsubVehicle = onVehicleLocation((data) => {
      setLiveEventTicker(`🚚 ${data.vehicle_id || 'Fleet Vehicle'} broadcasting GPS (Speed: ${data.speed || 30} km/h)`);
    });

    const unsubCol = onCollectionEvent((data) => {
      setLiveEventTicker(`✓ Verified collection event logged in municipal ledger`);
    });

    const unsubComplaint = onComplaintEvent((data) => {
      setLiveEventTicker(`📢 New illegal dumping complaint registered with SLA target`);
    });

    return () => {
      unsubBinUpdate?.();
      unsubBinCritical?.();
      unsubVehicle?.();
      unsubCol?.();
      unsubComplaint?.();
    };
  }, []);

  const roleStyle = ROLE_STYLES[role] || { label: 'Guest', color: 'bg-slate-700 text-slate-300' };

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Left: Mobile Toggle & Brand */}
          <div className="flex items-center gap-3">
            {user && toggleSidebar && (
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition md:hidden"
                aria-label="Toggle Navigation Sidebar"
              >
                {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}

            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-extrabold shadow-lg shadow-emerald-500/25 group-hover:scale-105 transition transform shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-lg text-white tracking-tight">SWMS</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    2.0
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium tracking-wide hidden sm:inline">
                  Smart Waste Platform
                </span>
              </div>
            </Link>
          </div>

          {/* Center: Live Ticker & Quick Nav */}
          <div className="hidden lg:flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-2xl border border-slate-700/60 max-w-md xl:max-w-lg truncate">
            <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-400 shrink-0">
              <span className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'}`} />
              {socketConnected ? 'LIVE FEED' : 'SYNCING'}
            </span>
            <span className="text-slate-500">|</span>
            <p className="text-xs text-slate-300 font-mono truncate">{liveEventTicker}</p>
          </div>

          {/* Center-Right: Role-Specific Direct Navigation Links */}
          <div className="hidden md:flex items-center gap-1 text-xs font-semibold">
            <Link
              to="/"
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                location.pathname === '/'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Map</span>
            </Link>

            {/* Role Links without destructive overwrites */}
            {role === 'admin' && (
              <>
                <Link
                  to="/admin"
                  className={`px-3 py-1.5 rounded-xl transition ${
                    location.pathname === '/admin'
                      ? 'bg-purple-600 text-white font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  Command Center
                </Link>
                <Link
                  to="/admin/simulator"
                  className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1 ${
                    location.pathname === '/admin/simulator'
                      ? 'bg-purple-600 text-white font-bold'
                      : 'text-purple-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Simulator</span>
                </Link>
              </>
            )}

            {role === 'citizen' && (
              <>
                <Link
                  to="/citizen"
                  className={`px-3 py-1.5 rounded-xl transition ${
                    location.pathname === '/citizen'
                      ? 'bg-blue-600 text-white font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/citizen/classify"
                  className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1 ${
                    location.pathname === '/citizen/classify'
                      ? 'bg-blue-600 text-white font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>AI Scanner</span>
                </Link>
                <Link
                  to="/citizen/nearby-bins"
                  className={`px-3 py-1.5 rounded-xl transition ${
                    location.pathname === '/citizen/nearby-bins'
                      ? 'bg-blue-600 text-white font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  Nearby Bins
                </Link>
              </>
            )}

            {role === 'collector' && (
              <>
                <Link
                  to="/collector"
                  className={`px-3 py-1.5 rounded-xl transition ${
                    location.pathname === '/collector'
                      ? 'bg-amber-600 text-white font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/collector/route"
                  className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1 ${
                    location.pathname === '/collector/route'
                      ? 'bg-amber-600 text-white font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Route Map</span>
                </Link>
              </>
            )}

            {role === 'recycling_center' && (
              <Link
                to="/recycling"
                className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1 ${
                  location.pathname === '/recycling'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Recycle className="w-3.5 h-3.5" />
                <span>Recycling Hub</span>
              </Link>
            )}
          </div>

          {/* Right: Voice Assistant & Notifications & Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Voice Assistant Mic Trigger Button */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('toggle-voice-assistant'))}
              className="p-2 rounded-xl text-slate-300 hover:text-emerald-400 hover:bg-slate-800 transition relative group"
              title="Voice Command Assistant (Click & Speak)"
              aria-label="Toggle Voice Command Assistant"
            >
              <Mic className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition"
                aria-label="View Alerts"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-3 z-50 animate-in fade-in slide-in-from-top-2 text-slate-100">
                  <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">System Notifications</span>
                      {unreadCount > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-semibold border border-rose-500/30">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-800">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">No alerts logged.</div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => !n.is_read && markAsRead(n.id)}
                          className={`p-3.5 hover:bg-slate-800/60 transition cursor-pointer text-left ${
                            !n.is_read ? 'bg-emerald-950/30 border-l-2 border-emerald-500' : ''
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <p className="text-xs font-bold text-white">{n.title}</p>
                            <span className="text-[10px] text-slate-400 whitespace-nowrap">
                              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-1 leading-relaxed">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile or Sign In State */}
            {user ? (
              <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-bold text-white line-clamp-1">{user.name}</p>
                  <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${roleStyle.color}`}>
                    {roleStyle.label}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition shadow-sm hidden sm:inline-block"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
