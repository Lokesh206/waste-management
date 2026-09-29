import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Trash2, Lock, Mail, AlertCircle, ArrowRight, Shield, Truck, User, Sparkles, Recycle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isExpired = new URLSearchParams(location.search).get('expired');

  const executeLogin = async (loginEmail, loginPassword) => {
    setError('');
    setLoading(true);

    try {
      const user = await login(loginEmail, loginPassword);
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'collector') navigate('/collector');
      else if (user.role === 'recycling_center') navigate('/recycling');
      else navigate('/citizen');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    executeLogin(email, password);
  };

  // 1-Click Instant Login (fills and logs in immediately)
  const handleInstantDemoLogin = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    executeLogin(demoEmail, demoPass);
  };

  return (
    <div className="max-w-md mx-auto my-8 sm:my-14 px-4">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 border border-slate-200/90 shadow-2xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 mx-auto flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
            <Trash2 className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Sign in to SWMS</h1>
          <p className="text-xs text-slate-500">Smart Waste Management Command & Operations</p>
        </div>

        {/* 1-Click Quick Demo Sign In Bar for all 4 Roles */}
        <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2.5 shadow-md">
          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>1-Click Instant Demo Login</span>
            </span>
            <span className="text-[10px] text-slate-400 font-normal">Click any role below</span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => handleInstantDemoLogin('admin@swms.com', 'admin123')}
              disabled={loading}
              className="py-2 px-1 rounded-xl bg-slate-800 hover:bg-rose-600 text-white font-bold transition flex flex-col items-center gap-1 border border-slate-700 hover:border-rose-500 active:scale-95"
            >
              <Shield className="w-4 h-4 text-rose-400" />
              <span className="text-[10px]">Admin</span>
            </button>

            <button
              type="button"
              onClick={() => handleInstantDemoLogin('collector@swms.com', 'collector123')}
              disabled={loading}
              className="py-2 px-1 rounded-xl bg-slate-800 hover:bg-amber-600 text-white font-bold transition flex flex-col items-center gap-1 border border-slate-700 hover:border-amber-500 active:scale-95"
            >
              <Truck className="w-4 h-4 text-amber-400" />
              <span className="text-[10px]">Collector</span>
            </button>

            <button
              type="button"
              onClick={() => handleInstantDemoLogin('citizen@swms.com', 'citizen123')}
              disabled={loading}
              className="py-2 px-1 rounded-xl bg-slate-800 hover:bg-blue-600 text-white font-bold transition flex flex-col items-center gap-1 border border-slate-700 hover:border-blue-500 active:scale-95"
            >
              <User className="w-4 h-4 text-blue-400" />
              <span className="text-[10px]">Citizen</span>
            </button>

            <button
              type="button"
              onClick={() => handleInstantDemoLogin('recycling@swms.com', 'recycling123')}
              disabled={loading}
              className="py-2 px-1 rounded-xl bg-slate-800 hover:bg-emerald-600 text-white font-bold transition flex flex-col items-center gap-1 border border-slate-700 hover:border-emerald-500 active:scale-95"
            >
              <Recycle className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px]">Recycler</span>
            </button>
          </div>
        </div>

        {isExpired && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Your session has expired. Please sign in again.</span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@swms.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl text-xs font-extrabold text-slate-950 bg-emerald-400 hover:bg-emerald-300 active:scale-98 transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
          >
            {loading ? 'Verifying Credentials...' : 'Sign In with Password'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Credentials Viva Cheat-Sheet */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
          <p className="font-bold text-slate-800">Pre-seeded Accounts (Password: <code>...123</code>):</p>
          <div className="grid grid-cols-2 gap-1 font-mono text-[10px]">
            <span className="p-1 rounded bg-rose-50 text-rose-800 text-center font-bold">admin@swms.com</span>
            <span className="p-1 rounded bg-amber-50 text-amber-800 text-center font-bold">collector@swms.com</span>
            <span className="p-1 rounded bg-blue-50 text-blue-800 text-center font-bold">citizen@swms.com</span>
            <span className="p-1 rounded bg-emerald-50 text-emerald-800 text-center font-bold">recycling@swms.com</span>
          </div>
        </div>

        <div className="text-center pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <Link to="/" className="font-semibold text-slate-700 hover:text-slate-900">
            ← Back to Live Map
          </Link>
          <Link to="/register" className="font-bold text-emerald-600 hover:text-emerald-700">
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
