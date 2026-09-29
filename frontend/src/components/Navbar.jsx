import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
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
} from 'lucide-react';

export default function Navbar() {
  const { user, role, logout, login } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleRoleSwitch = async (targetRole) => {
    try {
      if (targetRole === 'admin') {
        await login('admin@swms.com', 'admin123');
        navigate('/admin');
      } else if (targetRole === 'collector') {
        await login('collector@swms.com', 'collector123');
        navigate('/collector');
      } else if (targetRole === 'citizen') {
        await login('citizen@swms.com', 'citizen123');
        navigate('/citizen');
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error('Role switch error', err);
    }
  };

  const isPublicMap = location.pathname === '/';
  const isCitizen = location.pathname.startsWith('/citizen') || (role === 'citizen' && !isPublicMap);
  const isCollector = location.pathname.startsWith('/collector') || (role === 'collector' && !isPublicMap);
  const isAdmin = location.pathname.startsWith('/admin') || (role === 'admin' && !isPublicMap);

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Brand with Live Telemetry Pulse */}
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-extrabold shadow-lg shadow-emerald-500/25 group-hover:scale-105 transition transform">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg text-white tracking-tight">SWMS</span>
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium tracking-wide">
                  Smart Waste Management
                </span>
              </div>
            </Link>
          </div>

          {/* Center: Streamlined Role Navigation */}
          <div className="flex items-center gap-1 bg-slate-800/90 p-1.5 rounded-2xl border border-slate-700/80 text-xs">
            <button
              onClick={() => handleRoleSwitch('public')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition ${
                isPublicMap
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Live Map</span>
            </button>

            <button
              onClick={() => handleRoleSwitch('citizen')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition ${
                isCitizen
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <span>Citizen</span>
            </button>

            <button
              onClick={() => handleRoleSwitch('collector')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition ${
                isCollector
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Collector</span>
            </button>

            <button
              onClick={() => handleRoleSwitch('admin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition ${
                isAdmin
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          </div>

          {/* Right: Notification Bell & Quick Session Controls */}
          <div className="flex items-center gap-3">
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

            {/* Profile / Login state */}
            {user ? (
              <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-bold text-white line-clamp-1">{user.name}</p>
                  <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                    {user.role}
                  </p>
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
              <Link
                to="/login"
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
