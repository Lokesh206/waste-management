import React from 'react';
import { NavLink } from 'react-router-dom';
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
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const { role } = useAuth();

  const getNavLinks = () => {
    switch (role) {
      case 'admin':
        return [
          { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
          { to: '/admin/bins', label: 'Smart Bins Registry', icon: Trash2 },
          { to: '/admin/assignments', label: 'Collection Tasks', icon: CheckSquare },
          { to: '/admin/complaints', label: 'Dumping Complaints', icon: AlertTriangle },
          { to: '/admin/simulator', label: 'IoT Web Simulator', icon: Cpu },
          { to: '/admin/analytics', label: 'Analytics & Trends', icon: BarChart3 },
          { to: '/admin/reports', label: 'CSV Reports', icon: FileText },
        ];
      case 'collector':
        return [
          { to: '/collector', label: 'Dashboard', icon: LayoutDashboard, exact: true },
          { to: '/collector/tasks', label: 'Assigned Tasks', icon: ListOrdered },
          { to: '/collector/route', label: 'Route Navigation', icon: Navigation },
        ];
      case 'recycling_center':
        return [
          { to: '/recycling', label: 'Dashboard', icon: LayoutDashboard, exact: true },
          { to: '/recycling/incoming', label: 'Incoming Recyclables', icon: Recycle },
        ];
      case 'citizen':
      default:
        return [
          { to: '/citizen', label: 'Dashboard', icon: LayoutDashboard, exact: true },
          { to: '/citizen/classify', label: 'AI Waste Scanner', icon: Camera },
          { to: '/citizen/report-dumping', label: 'Report Dumping', icon: AlertTriangle },
          { to: '/citizen/nearby-bins', label: 'Nearby Smart Bins', icon: MapPin },
        ];
    }
  };

  const navLinks = getNavLinks();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-30 md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-16 left-0 z-30 h-[calc(100vh-4rem)] w-64 bg-white border-r border-slate-200 p-4 transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full justify-between">
          <div className="space-y-1">
            <p className="px-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2">
              Navigation ({role?.replace('_', ' ')})
            </p>
            {navLinks.map((link) => {
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
                        ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-100 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </NavLink>
              );
            })}
          </div>

          {/* System Status Footer */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-slate-900">SWMS Telemetry Live</span>
            </div>
            <p className="text-[10px] text-slate-500">IoT API & AI Services Operational</p>
          </div>
        </div>
      </aside>
    </>
  );
}

