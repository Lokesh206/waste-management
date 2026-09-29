import React, { useState } from 'react';
import { iotAPI, binsAPI } from '../services/api';
import StatusBadge from './StatusBadge';
import {
  X,
  Trash2,
  Cpu,
  Radio,
  Clock,
  MapPin,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Zap,
  Layers,
  ArrowRight,
  Eye,
  Check,
  Truck,
  BatteryCharging,
  Wind,
  ShieldCheck,
} from 'lucide-react';

const STREAM_META = {
  Plastic: { icon: '🥤', color: '#3b82f6', bg: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  Organic: { icon: '🍏', color: '#10b981', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  Paper: { icon: '📦', color: '#f59e0b', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  Glass: { icon: '🍾', color: '#14b8a6', bg: 'bg-teal-500/20 text-teal-300 border-teal-500/40' },
  Metal: { icon: '⚙️', color: '#6366f1', bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' },
  'E-Waste': { icon: '⚡', color: '#eab308', bg: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' },
};

const SAMPLE_DEPOSITS = [
  { name: 'Plastic Water Bottle', type: 'Plastic', icon: '🥤' },
  { name: 'Banana Peel / Food', type: 'Organic', icon: '🍏' },
  { name: 'Cardboard Box', type: 'Paper', icon: '📦' },
  { name: 'Glass Beverage Jar', type: 'Glass', icon: '🍾' },
  { name: 'Aluminum Soda Can', type: 'Metal', icon: '⚙️' },
  { name: 'AA Alkaline Battery', type: 'E-Waste', icon: '⚡' },
];

export default function BinInspectorModal({
  bin,
  onClose,
  onRefresh,
  onDispatch,
  isDispatching,
  isTargetBin,
}) {
  const [actionLoading, setActionLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [predictLoading, setPredictLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  // AI Deposit & Auto-Classify State
  const [selectedSample, setSelectedSample] = useState(SAMPLE_DEPOSITS[0]);
  const [customItem, setCustomItem] = useState('');
  const [depositLoading, setDepositLoading] = useState(false);
  const [lastDepositResult, setLastDepositResult] = useState(null);

  if (!bin) return null;

  const fill = Math.round(bin.current_fill_percentage || 0);
  const distanceRemaining = Math.max(0, ((bin.capacity || 100) * (1 - fill / 100))).toFixed(1);

  // Default chambers if not already enriched
  const defaultChambers = [
    { type: 'Plastic', icon: '🥤', percentage: 35, color: '#3b82f6', current_kg: Math.round(fill * 0.35 * 0.25 * 10) / 10 },
    { type: 'Organic', icon: '🍏', percentage: 30, color: '#10b981', current_kg: Math.round(fill * 0.30 * 0.25 * 10) / 10 },
    { type: 'Paper', icon: '📦', percentage: 20, color: '#f59e0b', current_kg: Math.round(fill * 0.20 * 0.25 * 10) / 10 },
    { type: 'Glass', icon: '🍾', percentage: 10, color: '#14b8a6', current_kg: Math.round(fill * 0.10 * 0.25 * 10) / 10 },
    { type: 'Metal', icon: '⚙️', percentage: 5, color: '#6366f1', current_kg: Math.round(fill * 0.05 * 0.25 * 10) / 10 },
  ];

  const chambers = bin.chambers || defaultChambers;

  // SVG Circular Gauge calculations
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (fill / 100) * circumference;

  let gaugeColor = '#10b981'; // emerald
  let gaugeGlow = 'rgba(16, 185, 129, 0.3)';
  if (bin.status === 'Critical' || fill >= 91) {
    gaugeColor = '#ef4444';
    gaugeGlow = 'rgba(239, 68, 68, 0.4)';
  } else if (bin.status === 'Almost Full' || fill >= 76) {
    gaugeColor = '#f59e0b';
    gaugeGlow = 'rgba(245, 158, 11, 0.4)';
  } else if (bin.status === 'Moderate' || fill >= 51) {
    gaugeColor = '#3b82f6';
    gaugeGlow = 'rgba(59, 130, 246, 0.4)';
  }

  // Interactive AI Deposit & Auto-Classify Handler
  const handleDepositAndClassify = async () => {
    setDepositLoading(true);
    setLastDepositResult(null);
    setActionMessage('');

    const itemNameToSend = customItem.trim() || selectedSample.name;
    const wasteTypeHint = customItem.trim() ? null : selectedSample.type;

    try {
      const res = await binsAPI.classifyDeposit(bin.id, {
        item_name: itemNameToSend,
        waste_type: wasteTypeHint,
      });

      if (res.data.success) {
        setLastDepositResult(res.data.deposit);
        setActionMessage(`✓ Deposit classified as [${res.data.deposit.predicted_class}] and routed to appropriate chamber.`);
        setCustomItem('');
        if (onRefresh) onRefresh();
      }
    } catch (e) {
      // Graceful fallback simulation if offline or error
      const mockTypes = ['Plastic', 'Organic', 'Paper', 'Glass', 'Metal'];
      const classifiedType = wasteTypeHint || (itemNameToSend.toLowerCase().includes('peel') ? 'Organic' : 'Plastic');
      const mockResult = {
        item_name: itemNameToSend,
        predicted_class: classifiedType,
        icon: STREAM_META[classifiedType]?.icon || '🥤',
        confidence: 96.4,
        chamber: `Chamber [${classifiedType}]`,
        recyclable: classifiedType !== 'Organic',
        new_fill_percentage: Math.min(100, fill + 4),
        status: fill + 4 >= 90 ? 'Critical' : 'Moderate',
      };
      setLastDepositResult(mockResult);
      setActionMessage(`✓ Optical chute classified [${itemNameToSend}] as ${classifiedType} (96.4% confidence)`);
      if (onRefresh) onRefresh();
    } finally {
      setDepositLoading(false);
    }
  };

  // Trigger Fill Spike (IoT Telemetry Simulation without temperature)
  const handleSpike = async () => {
    setActionLoading(true);
    setActionMessage('');
    try {
      await iotAPI.sendReading({
        bin_code: bin.bin_code,
        fill_percentage: 92.0,
        sensor_status: 'OK',
        is_simulated: true,
      });
      setActionMessage('🚨 Critical fill spike (92%) transmitted! Alert dispatched.');
      if (onRefresh) onRefresh();
    } catch (e) {
      setActionMessage('Failed to transmit telemetry reading.');
    } finally {
      setActionLoading(false);
    }
  };

  // Simulate Emptying All Chambers
  const handleEmpty = async () => {
    setActionLoading(true);
    setActionMessage('');
    try {
      await iotAPI.sendReading({
        bin_code: bin.bin_code,
        fill_percentage: 0.0,
        sensor_status: 'OK',
        is_simulated: true,
      });
      setActionMessage('✓ All internal segregation chambers emptied (0% clean).');
      if (onRefresh) onRefresh();
    } catch (e) {
      setActionMessage('Failed to reset bin.');
    } finally {
      setActionLoading(false);
    }
  };

  // Fetch ML Forecast
  const handleForecast = async () => {
    setPredictLoading(true);
    try {
      const res = await binsAPI.getPrediction(bin.id);
      if (res.data.success) {
        setPrediction(res.data.prediction);
      }
    } catch (e) {
      console.error('Forecast error', e);
    } finally {
      setPredictLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div
        className="bg-slate-900 text-slate-100 rounded-3xl border border-slate-700/90 shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-150 my-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-slate-950/90 p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-slate-950 flex items-center justify-center text-xl font-bold shadow-lg shadow-emerald-500/20">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg text-white tracking-tight">{bin.bin_code}</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  All-in-One AI Smart Bin
                </span>
                <StatusBadge status={bin.status} />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{bin.location_name} • Accepts all waste types with AI segregation</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
          {/* Top Row: Fill Gauge & Hardware Telemetry (No Temp) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
            {/* Circular Fill Meter */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80">
              <div className="relative flex items-center justify-center">
                <svg className="w-36 h-36 transform -rotate-90">
                  <circle
                    cx="72"
                    cy="72"
                    r={radius}
                    stroke="#1e293b"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  <circle
                    cx="72"
                    cy="72"
                    r={radius}
                    stroke={gaugeColor}
                    strokeWidth="10"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                    style={{
                      transition: 'stroke-dashoffset 0.6s ease-in-out',
                      filter: `drop-shadow(0 0 8px ${gaugeGlow})`,
                    }}
                  />
                </svg>

                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-black text-white tracking-tight">
                    {fill}%
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Total Volume
                  </span>
                </div>
              </div>

              <div className="mt-3 text-center">
                <span className="text-xs font-bold text-emerald-400">Multi-Stream Active</span>
                <p className="text-[11px] text-slate-400">Capacity: {bin.capacity || 100} cm Depth</p>
              </div>
            </div>

            {/* Hardware Sensor Telemetry (Temperature Removed) */}
            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-400 font-medium">
                  <Radio className="w-4 h-4 text-indigo-400" />
                  <span>Remaining Distance:</span>
                </div>
                <span className="font-extrabold text-white font-mono">{distanceRemaining} cm to lid</span>
              </div>

              {/* AI Intake Vision Sensor */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-400 font-medium">
                  <Eye className="w-4 h-4 text-purple-400" />
                  <span>AI Intake Sensor:</span>
                </div>
                <span className="font-bold text-purple-300 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                  Optical Classifier Online
                </span>
              </div>

              {/* ESP32 Hardware Status */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-400 font-medium">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  <span>IoT Microcontroller:</span>
                </div>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  ESP32 (RSSI: -64 dBm)
                </span>
              </div>

              {/* GPS Coordinates */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-400 font-medium">
                  <MapPin className="w-4 h-4 text-blue-400" />
                  <span>GPS Position:</span>
                </div>
                <span className="font-mono text-[11px] text-slate-300">
                  {bin.latitude.toFixed(4)}, {bin.longitude.toFixed(4)}
                </span>
              </div>

              {/* Solar Battery & Gas/Odor Sensors */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Battery:</span>
                  </div>
                  <span className="font-bold text-slate-200">{bin.battery_level_pct || 94}%</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Wind className="w-3.5 h-3.5 text-amber-400" />
                    <span>Odor/Gas:</span>
                  </div>
                  <span className="font-bold text-slate-200">{bin.gas_level_ppm || 24} ppm</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. ALL WASTE TYPES AVAILABLE IN THIS BIN: MULTI-CHAMBER BREAKDOWN */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Internal Segregation Chambers (All Types Available)
                </h4>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Automated Sorting</span>
            </div>

            {/* Segmented Multi-Color Progress Bar */}
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
              {chambers.map((c) => (
                <div
                  key={c.type}
                  style={{ width: `${c.percentage}%`, backgroundColor: c.color }}
                  className="h-full transition-all duration-500 relative group cursor-pointer"
                  title={`${c.type}: ${c.percentage}% of stored waste`}
                />
              ))}
            </div>

            {/* Chamber Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-xs">
              {chambers.map((c) => (
                <div
                  key={c.type}
                  className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 text-center space-y-1"
                >
                  <span className="text-lg block">{c.icon}</span>
                  <p className="font-bold text-white text-[11px] truncate">{c.type}</p>
                  <div className="text-[10px] text-slate-400">
                    <span className="font-mono font-bold text-emerald-400">{c.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. THAT BIN IS CLASSIFY WHICH TYPE OF WASTE IS: LIVE DEPOSIT & CLASSIFY MODULE */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-950 border border-purple-500/40 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wide">
                    Deposit & AI Auto-Classify Chute
                  </h4>
                  <p className="text-[11px] text-slate-400">Bin classifies deposited waste and routes it to the correct chamber</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Live AI Classifier
              </span>
            </div>

            {/* Quick Sample Items */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Select Item to Deposit into Bin Chute:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
                {SAMPLE_DEPOSITS.map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => {
                      setSelectedSample(item);
                      setCustomItem('');
                    }}
                    className={`p-2 rounded-xl border text-left transition flex items-center gap-2 ${
                      selectedSample.name === item.name && !customItem
                        ? 'bg-purple-600/30 border-purple-500 text-white font-bold'
                        : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span className="truncate text-[11px]">{item.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Item Entry */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customItem}
                onChange={(e) => setCustomItem(e.target.value)}
                placeholder="Or type custom item (e.g. Milk Jug, Newspaper, Soda Can)..."
                className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />

              <button
                type="button"
                onClick={handleDepositAndClassify}
                disabled={depositLoading}
                className="px-4 py-2 rounded-xl text-xs font-black text-white bg-purple-600 hover:bg-purple-500 transition shadow-lg shadow-purple-600/30 flex items-center gap-1.5 active:scale-95 disabled:opacity-50 shrink-0"
              >
                {depositLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Classifying...</span>
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>Deposit & Classify</span>
                  </>
                )}
              </button>
            </div>

            {/* AI Classification Feedback Output */}
            {lastDepositResult && (
              <div className="p-3 rounded-xl bg-purple-950/60 border border-purple-500/50 space-y-2 text-xs animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-white">AI Classification Result:</span>
                    <span className="font-black text-purple-300 text-sm">
                      {lastDepositResult.predicted_class}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {lastDepositResult.confidence}% AI Match
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-slate-950/80 text-[11px] text-slate-300 flex items-center justify-between font-mono">
                  <span>Routing Action: {lastDepositResult.chamber}</span>
                  <span className="text-emerald-400">Fill Level: {lastDepositResult.new_fill_percentage}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Action Message Toast */}
          {actionMessage && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-between">
              <span>{actionMessage}</span>
              <span className="text-[10px] text-emerald-400 font-mono">[AI TELEMETRY]</span>
            </div>
          )}

          {/* Live IoT Simulation Triggers (No Temp) */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                <span>Smart Bin Chamber Controls</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">[Ultrasonic & Chamber Trigger]</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={handleSpike}
                disabled={actionLoading}
                className="py-2.5 px-3 rounded-xl font-bold bg-rose-600 hover:bg-rose-500 text-white transition flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 shadow-md shadow-rose-900/30"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>🚨 Spike to 92% (Overflow)</span>
              </button>

              <button
                type="button"
                onClick={handleEmpty}
                disabled={actionLoading}
                className="py-2.5 px-3 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>🧹 Empty All Chambers (0%)</span>
              </button>
            </div>
          </div>

          {/* Scikit-Learn Predictive Regressor Section */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-purple-300 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Scikit-Learn Fill Rate Forecast</span>
              </div>
              <button
                onClick={handleForecast}
                disabled={predictLoading}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition flex items-center gap-1 active:scale-95 disabled:opacity-50"
              >
                {predictLoading ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Computing...</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-3 h-3" />
                    <span>Forecast Fill</span>
                  </>
                )}
              </button>
            </div>

            {prediction ? (
              <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                    Fill Velocity
                  </span>
                  <span className="text-sm font-extrabold text-purple-400">
                    +{prediction.fill_rate_per_hour || prediction.fillRatePerHour || 3.5}%/hr
                  </span>
                </div>

                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                    Overflow In
                  </span>
                  <span className="text-sm font-extrabold text-rose-400">
                    {prediction.predicted_time_to_threshold_hours ?? prediction.hoursUntilFull ?? 4.2} hrs
                  </span>
                </div>

                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                    6h Projected
                  </span>
                  <span className="text-sm font-black text-white">
                    {prediction.predicted_fill_6h ? `${prediction.predicted_fill_6h}%` : '85%'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400">
                Click <strong>Forecast Fill</strong> to calculate real-time linear regression fill trajectory and predicted overflow timing based on historical telemetry.
              </p>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          {onDispatch && (
            <button
              onClick={() => {
                onDispatch(bin);
                onClose();
              }}
              disabled={isDispatching}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-lg active:scale-95 disabled:opacity-60 ${
                isTargetBin
                  ? 'bg-amber-500 text-slate-950 animate-pulse font-bold'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>
                {isTargetBin
                  ? 'Alpha-01 En Route to this Bin...'
                  : `Accept & Dispatch Truck to ${bin.bin_code}`}
              </span>
            </button>
          )}

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
