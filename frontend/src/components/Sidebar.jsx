import React from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Trash2,
  CheckSquare,
  AlertTriangle,
  BarChart3,
  Cpu,
  FileText,
  Camera,
  MapPin,
  Truck,
  Recycle,
  Navigation,
  ListOrdered,
  Shield,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const { role, user } = useAuth();
  const location = useLocation();

  const isCitizenPath = location.pathname.startsWith('/citizen');
  const isCollectorPath = location.pathname.startsWith('/collector');
  const isRecyclingPath = location.pathname.startsWith('/recycling');
  const isAdminPath = location.pathname.startsWith('/admin');

  // Determine navigation scope based on path and role
  const getNavLinks = () => {
    if (isAdminPath || (role === 'admin' && !isCitizenPath && !isCollectorPath && !isRecyclingPath)) {
      return {
        section: 'MUNICIPAL COMMAND (ADMIN)',
        color: 'purple',
        links: [
          { to: '/admin', label: 'Command Center', icon: LayoutDashboard, exact: true },
          { to: '/admin/bins', label: 'Smart Bins Registry', icon: Trash2 },
          { to: '/admin/assignments', label: 'Fleet & Task Dispatch', icon: CheckSquare },
          { to: '/admin/complaints', label: 'Dumping Complaints & SLA', icon: AlertTriangle },
          { to: '/admin/simulator', label: 'Virtual IoT Simulator', icon: Cpu },
          { to: '/admin/analytics', label: 'Analytics & Trends', icon: BarChart3 },
          { to: '/admin/reports', label: 'CSV Reports', icon: FileText },
        ],
      };
    }

    if (isCollectorPath || role === 'collector') {
      return {
        section: 'FIELD OPERATIONS (COLLECTOR)',
        color: 'amber',
        links: [
          { to: '/collector', label: 'Collector Dashboard', icon: LayoutDashboard, exact: true },
          { to: '/collector/tasks', label: 'Assigned Task Queue', icon: ListOrdered },
          { to: '/collector/route', label: 'Road Route Navigation', icon: Navigation },
        ],
      };
    }

    if (isRecyclingPath || role === 'recycling_center') {
      return {
        section: 'MATERIAL RECOVERY (RECYCLER)',
        color: 'emerald',
        links: [
          { to: '/recycling', label: 'Recycling Hub', icon: LayoutDashboard, exact: true },
          { to: '/recycling/incoming', label: 'Incoming Batch Trace', icon: Recycle },
        ],
      };
    }

    // Default to Citizen Portal
    return {
      section: 'CITIZEN ENVIRONMENTAL PORTAL',
      color: 'blue',
      links: [
        { to: '/citizen', label: 'Citizen Dashboard', icon: LayoutDashboard, exact: true },
        { to: '/citizen/classify', label: 'AI Waste Scanner', icon: Camera },
        { to: '/citizen/report-dumping', label: 'Report Illegal Dumping', icon: AlertTriangle },
        { to: '/citizen/nearby-bins', label: 'Nearby Smart Bins', icon: MapPin },
      ],
    };
  };

  const navConfig = getNavLinks();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-30 md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-16 left-0 z-30 h-[calc(100vh-4rem)] w-64 bg-white border-r border-slate-200 p-4 transition-transform duration-200 ease-in-out md:translate-x-0 flex flex-col justify-between shrink-0 shadow-xs ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-4">
          {/* Admin Supervisory Mode Warning / Return Banner */}
          {role === 'admin' && !isAdminPath && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-purple-900 text-[11px]">
                <Shield className="w-3.5 h-3.5 text-purple-600" />
                <span>Admin Supervisory Mode</span>
              </div>
              <p className="text-[10px] text-purple-700">Previewing operational view.</p>
              <Link
                to="/admin"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-800 hover:text-purple-950 underline"
              >
                <span>Return to Admin Command</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}

          {/* Navigation Category Header */}
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-black tracking-wider text-slate-400 uppercase">
              {navConfig.section}
            </p>

            <nav className="space-y-1 pt-1">
              {navConfig.links.map((link) => {
                const Icon = link.icon;
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.exact}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                        isActive
                          ? 'bg-slate-900 text-white font-bold shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{link.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Sidebar Footer: System Status */}
        <div className="pt-3 border-t border-slate-100">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-[11px] space-y-1 text-slate-500">
            <div className="flex items-center justify-between font-bold text-slate-800">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                SWMS Engine
              </span>
              <span className="text-[10px] font-mono text-emerald-600">v2.0.0</span>
            </div>
            <p className="text-[10px] text-slate-400">Prisma SQLite • Socket.IO Real-Time Stream</p>
          </div>
        </div>
      </aside>
    </>
  );
}
