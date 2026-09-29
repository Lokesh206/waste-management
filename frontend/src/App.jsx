import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

// Public Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';

// Citizen Pages
import CitizenDashboard from './pages/citizen/CitizenDashboard';
import ClassifyWaste from './pages/citizen/ClassifyWaste';
import ReportDumping from './pages/citizen/ReportDumping';
import NearbyBins from './pages/citizen/NearbyBins';

// Collector Pages
import CollectorDashboard from './pages/collector/CollectorDashboard';
import TasksView from './pages/collector/TasksView';
import RoutePlanner from './pages/collector/RoutePlanner';

// Recycling Center Pages
import RecyclingDashboard from './pages/recycling/RecyclingDashboard';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import BinsManager from './pages/admin/BinsManager';
import Assignments from './pages/admin/Assignments';
import ComplaintsManager from './pages/admin/ComplaintsManager';
import IoTSimulatorView from './pages/admin/IoTSimulatorView';
import AnalyticsView from './pages/admin/AnalyticsView';
import ReportsView from './pages/admin/ReportsView';

/**
 * Route guard enforcing login and role-based permissions
 */
function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, role } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xs font-semibold text-slate-400">
        Loading session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Redirect to respective dashboard if attempting unauthorized role route
    if (role === 'admin') return <Navigate to="/admin" replace />;
    if (role === 'collector') return <Navigate to="/collector" replace />;
    if (role === 'recycling_center') return <Navigate to="/recycling" replace />;
    return <Navigate to="/citizen" replace />;
  }

  return children;
}

function MainLayout() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const isRootMap = location.pathname === '/';
  const isPublicHome = isRootMap || location.pathname === '/login' || location.pathname === '/register';

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <Navbar
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        isSidebarOpen={sidebarOpen}
      />

      <div className={`flex flex-1 w-full ${isRootMap ? 'max-w-full' : 'max-w-7xl mx-auto'}`}>
        {user && !isPublicHome && (
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        )}

        <main className={`flex-1 overflow-y-auto ${isRootMap ? 'p-0' : 'p-4 sm:p-6 lg:p-8'}`}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Citizen Protected Routes */}
            <Route
              path="/citizen"
              element={
                <ProtectedRoute allowedRoles={['citizen', 'admin']}>
                  <CitizenDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/citizen/classify"
              element={
                <ProtectedRoute allowedRoles={['citizen', 'admin']}>
                  <ClassifyWaste />
                </ProtectedRoute>
              }
            />
            <Route
              path="/citizen/report-dumping"
              element={
                <ProtectedRoute allowedRoles={['citizen', 'admin']}>
                  <ReportDumping />
                </ProtectedRoute>
              }
            />
            <Route
              path="/citizen/nearby-bins"
              element={
                <ProtectedRoute allowedRoles={['citizen', 'admin']}>
                  <NearbyBins />
                </ProtectedRoute>
              }
            />

            {/* Collector Protected Routes */}
            <Route
              path="/collector"
              element={
                <ProtectedRoute allowedRoles={['collector', 'admin']}>
                  <CollectorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/collector/tasks"
              element={
                <ProtectedRoute allowedRoles={['collector', 'admin']}>
                  <TasksView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/collector/route"
              element={
                <ProtectedRoute allowedRoles={['collector', 'admin']}>
                  <RoutePlanner />
                </ProtectedRoute>
              }
            />

            {/* Recycling Center Protected Routes */}
            <Route
              path="/recycling"
              element={
                <ProtectedRoute allowedRoles={['recycling_center', 'admin']}>
                  <RecyclingDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/recycling/incoming"
              element={
                <ProtectedRoute allowedRoles={['recycling_center', 'admin']}>
                  <RecyclingDashboard />
                </ProtectedRoute>
              }
            />

            {/* Admin Protected Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/bins"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <BinsManager />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/assignments"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Assignments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/complaints"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ComplaintsManager />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/simulator"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <IoTSimulatorView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AnalyticsView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ReportsView />
                </ProtectedRoute>
              }
            />

            {/* 404 Fallback */}
            <Route
              path="*"
              element={
                <div className="text-center py-20 space-y-3">
                  <h1 className="text-4xl font-bold text-slate-900">404</h1>
                  <p className="text-xs text-slate-500">Page not found</p>
                </div>
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <MainLayout />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

