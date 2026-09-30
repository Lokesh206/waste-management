import React, { useState, useEffect, useRef } from 'react';
import { binsAPI, wasteAPI, complaintsAPI, iotAPI } from '../services/api';
import LeafletMap from '../components/LeafletMap';
import StatusBadge from '../components/StatusBadge';
import BinInspectorModal from '../components/BinInspectorModal';
import { fetchRoadRoute, sampleRoadWaypoints } from '../services/roadRoutingService';
import {
  Trash2,
  Cpu,
  Camera,
  AlertTriangle,
  Radio,
  Sparkles,
  RefreshCw,
  UploadCloud,
  CheckCircle2,
  Info,
  MapPin,
  Play,
  Pause,
  ArrowRight,
  Search,
  Filter,
  Layers,
  Zap,
  Truck,
  X,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  ShieldAlert,
  Activity,
  Compass,
} from 'lucide-react';

const STREAM_ICONS = {
  Plastic: '🥤',
  Organic: '🍏',
  Paper: '📦',
  Glass: '🍾',
  Metal: '⚙️',
  'E-Waste': '⚡',
  Hazardous: '☣️',
  General: '🗑️',
};

export default function Home() {
  // Bins telemetry state
  const [bins, setBins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBin, setSelectedBin] = useState(null);

  // Floating UI toggles
  const [isRegistryOpen, setIsRegistryOpen] = useState(true);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showDumpingModal, setShowDumpingModal] = useState(false);

  // Search & Stream Filter in Registry
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStream, setSelectedStream] = useState('ALL');

  // Real-time live auto-simulation (active by default for instant viva impact!)
  const [autoSimulate, setAutoSimulate] = useState(true);
  const [simMessage, setSimMessage] = useState('Real-time IoT telemetry ingestion active (4.5s intervals)');
  const [eventLog, setEventLog] = useState([
    { id: 1, time: 'Just now', text: 'Telemetry stream established with 10 municipal ESP32 nodes', type: 'info' },
    { id: 2, time: '1m ago', text: 'BIN-001 ultrasonic sensor threshold warning triggered (>90%)', type: 'alert' },
  ]);

  // Live Collection Truck Alpha-01 coordinates
  const [truckPos, setTruckPos] = useState([12.9690, 77.5920]);
  const [truckDispatching, setTruckDispatching] = useState(false);
  const [dispatchTargetBin, setDispatchTargetBin] = useState(null);
  const [activeRoadRoute, setActiveRoadRoute] = useState([]);

  // AI Classification state (Modal)
  const [aiFile, setAiFile] = useState(null);
  const [aiPreview, setAiPreview] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState('');

  // Dumping Report state (Modal)
  const [reportTitle, setReportTitle] = useState('');
  const [reportDesc, setReportDesc] = useState('');
  const [reportLocation, setReportLocation] = useState({ latitude: 12.9716, longitude: 77.5946 });
  const [reportImage, setReportImage] = useState(null);
  const [reportPreview, setReportPreview] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(null);
  const [reportError, setReportError] = useState('');

  const handleReportImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setReportImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReportPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Fetch Bins from Backend
  const fetchBins = async () => {
    try {
      const res = await binsAPI.getAll();
      if (res.data.success) {
        setBins(res.data.bins || []);
      }
    } catch (err) {
      console.error('Error loading bins', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBins();
    const interval = setInterval(fetchBins, 4500);
    return () => clearInterval(interval);
  }, []);

  // Background Live Telemetry Stream
  useEffect(() => {
    if (!autoSimulate || bins.length === 0) return;

    const simInterval = setInterval(async () => {
      const randomBin = bins[Math.floor(Math.random() * bins.length)];
      if (!randomBin) return;

      const delta = Math.round(Math.random() * 6 - 1);
      const newFill = Math.min(96, Math.max(10, Math.round(randomBin.current_fill_percentage + delta)));

      try {
        await iotAPI.sendReading({
          bin_code: randomBin.bin_code,
          fill_percentage: newFill,
          sensor_status: 'OK',
          is_simulated: true,
        });

        const sampleDeposits = [
          { name: 'Plastic Bottle', stream: 'Plastic' },
          { name: 'Fruit Peel', stream: 'Organic' },
          { name: 'Cardboard Box', stream: 'Paper' },
          { name: 'Glass Beverage Jar', stream: 'Glass' },
          { name: 'Aluminum Can', stream: 'Metal' },
          { name: 'Dry Cell Battery', stream: 'E-Waste' },
        ];
        const item = sampleDeposits[Math.floor(Math.random() * sampleDeposits.length)];

        const newEvent = {
          id: Date.now(),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          text: `${randomBin.bin_code} AI Intake: Auto-classified "${item.name}" -> [${item.stream}] chamber (Fill: ${newFill}%)`,
          type: newFill >= 91 ? 'alert' : 'info',
        };

        setSimMessage(`[ALL-IN-ONE AI BIN] ${randomBin.bin_code} intake classified deposit as [${item.stream}] (${newFill}%)`);
        setEventLog((prev) => [newEvent, ...prev.slice(0, 4)]);
        fetchBins();
      } catch (e) {
        // silent
      }
    }, 4500);

    return () => clearInterval(simInterval);
  }, [autoSimulate, bins]);

  // 1-Click Trigger: Spike BIN-001 to 92%
  const handleSpikeCritical = async () => {
    try {
      setSimMessage('Transmitting critical sensor reading for BIN-001...');
      const res = await iotAPI.sendReading({
        bin_code: 'BIN-001',
        fill_percentage: 92.0,
        sensor_status: 'OK',
        is_simulated: true,
      });
      if (res.data.success) {
        setSimMessage('🚨 BIN-001 spiked to 92%! Critical alert & collection task generated.');
        setEventLog((prev) => [
          {
            id: Date.now(),
            time: 'Just now',
            text: '🚨 CRITICAL OVERFLOW ALERT: BIN-001 internal chambers reached 92% capacity!',
            type: 'alert',
          },
          ...prev.slice(0, 4),
        ]);
        fetchBins();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 1-Click Trigger: Empty Bin (0%)
  const handleEmptyBin = async () => {
    try {
      setSimMessage('Simulating municipal collection emptying all chambers in BIN-001...');
      const res = await iotAPI.sendReading({
        bin_code: 'BIN-001',
        fill_percentage: 0.0,
        sensor_status: 'OK',
        is_simulated: true,
      });
      if (res.data.success) {
        setSimMessage('✓ BIN-001 reset to 0% (All 6 Segregated Chambers Emptied).');
        setEventLog((prev) => [
          {
            id: Date.now(),
            time: 'Just now',
            text: '✓ BIN-001 all 6 waste chambers emptied by municipal collection crew (0%)',
            type: 'success',
          },
          ...prev.slice(0, 4),
        ]);
        fetchBins();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Dynamic Trigger: Dispatch Moving Truck Fleet to any specific Bin strictly via real roads
  const handleDispatchToBin = async (targetBin) => {
    if (truckDispatching) return;

    // Fallback if no target is provided: use selectedBin or highest fill bin
    let binToCollect = targetBin;
    if (!binToCollect) {
      binToCollect = selectedBin || bins.reduce((prev, curr) => 
        ((prev?.current_fill_percentage || 0) > (curr?.current_fill_percentage || 0)) ? prev : curr, 
        bins[0]
      );
    }
    if (!binToCollect) return;

    setDispatchTargetBin(binToCollect);
    setTruckDispatching(true);
    setSimMessage(`🚚 Planning road network route to ${binToCollect.bin_code}...`);

    const startCoords = [truckPos[0], truckPos[1]];
    const endCoords = [binToCollect.latitude, binToCollect.longitude];

    // 1. Fetch exact street network road coordinates
    const roadData = await fetchRoadRoute(startCoords, endCoords);
    const roadCoordinates = roadData?.coordinates || [startCoords, endCoords];
    setActiveRoadRoute(roadCoordinates);

    const roadDesc = roadData?.summary ? `via ${roadData.summary}` : 'along City Roadways';
    setSimMessage(`🚚 Alpha-01 navigating ${roadDesc} to ${binToCollect.bin_code} (${binToCollect.location_name})...`);

    // 2. Sample 22 smooth turn-by-turn road waypoints along the road line
    const roadWaypoints = sampleRoadWaypoints(roadCoordinates, 22);

    let step = 0;
    const driveInterval = setInterval(async () => {
      if (step < roadWaypoints.length) {
        setTruckPos(roadWaypoints[step]);
        step += 1;
      } else {
        clearInterval(driveInterval);
        setTruckPos([endCoords[0], endCoords[1]]);
        setTruckDispatching(false);
        setDispatchTargetBin(null);
        setActiveRoadRoute([]);

        // Send reading to empty all chambers of this specific target bin
        try {
          const res = await iotAPI.sendReading({
            bin_code: binToCollect.bin_code,
            fill_percentage: 0.0,
            sensor_status: 'OK',
            is_simulated: true,
          });

          if (res.data.success) {
            setSimMessage(`✓ Alpha-01 arrived via road at ${binToCollect.bin_code} and completed collection (0% Clean)!`);
            setEventLog((prev) => [
              {
                id: Date.now(),
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                text: `✓ ${binToCollect.bin_code} (${binToCollect.location_name}) collected by Vehicle Alpha-01 via road network (Reset to 0%)`,
                type: 'success',
              },
              ...prev.slice(0, 4),
            ]);
            fetchBins();
          }
        } catch (err) {
          console.error('Collection empty error', err);
        }
      }
    }, 120);
  };

  // Alias for dock button
  const handleDispatchFleet = () => {
    handleDispatchToBin(selectedBin || null);
  };

  // AI Classification Submission
  const handleAiClassify = async (e) => {
    e.preventDefault();
    if (!aiFile) return setAiError('Please select a waste photo to classify.');
    setAiLoading(true);
    setAiError('');
    try {
      const formData = new FormData();
      formData.append('image', aiFile);
      const res = await wasteAPI.classify(formData);
      if (res.data.success) {
        setAiResult(res.data.data);
      } else {
        setAiError(res.data.message || 'Classification failed.');
      }
    } catch (err) {
      setAiError(err.response?.data?.message || 'Error communicating with vision model.');
    } finally {
      setAiLoading(false);
    }
  };

  // Dumping Report Submission
  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!reportTitle || !reportDesc) return setReportError('Title and description are required.');
    setReportLoading(true);
    setReportError('');
    try {
      const formData = new FormData();
      formData.append('title', reportTitle);
      formData.append('description', reportDesc);
      formData.append('latitude', reportLocation.latitude);
      formData.append('longitude', reportLocation.longitude);
      if (reportImage) formData.append('image', reportImage);

      const res = await complaintsAPI.create(formData);
      if (res.data.success) {
        setReportSuccess(res.data.complaint);
        setReportTitle('');
        setReportDesc('');
        setReportImage(null);
        setReportPreview(null);
      }
    } catch (err) {
      setReportError(err.response?.data?.message || 'Failed to submit report.');
    } finally {
      setReportLoading(false);
    }
  };

  // Calculations
  const criticalBins = bins.filter((b) => b.status === 'Critical' || b.current_fill_percentage >= 91);
  const almostFullBins = bins.filter((b) => b.status === 'Almost Full' || (b.current_fill_percentage >= 76 && b.current_fill_percentage < 91));
  const avgFill = bins.length > 0 ? Math.round(bins.reduce((sum, b) => sum + b.current_fill_percentage, 0) / bins.length) : 52;

  // Filtered bins for side registry (All bins accept all waste streams)
  const filteredBins = bins.filter((b) => {
    const matchSearch =
      b.bin_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.location_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSearch;
  });

  return (
    <div className="relative w-full h-[calc(100vh-4.2rem)] overflow-hidden bg-slate-950 font-sans text-slate-100 flex flex-col">
      {/* 1. TOP FLOATING TELEMETRY COMMAND TICKER */}
      <div className="absolute top-3 left-4 right-4 z-20 pointer-events-none">
        <div className="glass-hud p-3 sm:p-3.5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 pointer-events-auto border border-slate-700/70 shadow-2xl">
          {/* Municipal Ingestion Status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-700/80">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-black text-white tracking-wide">MUNICIPAL HUB LIVE</span>
              <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded">
                2.4 msg/s
              </span>
            </div>

            {/* Quick Metrics Chips */}
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <div className="px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700 font-semibold text-slate-300">
                <span className="text-white font-bold">{bins.length}</span> Monitored Nodes
              </div>
              <div className="px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700 font-semibold text-slate-300">
                Avg Fill: <span className="text-emerald-400 font-bold">{avgFill}%</span>
              </div>
              {criticalBins.length > 0 ? (
                <div className="px-2.5 py-1 rounded-xl bg-rose-950/80 border border-rose-700/80 text-rose-300 font-bold flex items-center gap-1 animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>{criticalBins.length} Critical Overflow Risk</span>
                </div>
              ) : (
                <div className="px-2.5 py-1 rounded-xl bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 font-bold">
                  All Systems Safe
                </div>
              )}
            </div>
          </div>

          {/* Real-time ticker text */}
          <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400 truncate max-w-lg bg-slate-950/70 px-3 py-1 rounded-xl border border-slate-800">
            <Activity className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">{simMessage}</span>
          </div>
        </div>
      </div>

      {/* 2. FULL IMMERSIVE MAP CANVAS */}
      <div className="w-full h-full relative z-0">
        <LeafletMap
          bins={bins}
          truckPosition={truckPos}
          onBinClick={(bin) => setSelectedBin(bin)}
          onDispatchBin={handleDispatchToBin}
          dispatchTargetBin={dispatchTargetBin}
          isDispatching={truckDispatching}
          activeRoadRoute={activeRoadRoute}
          height="100%"
        />
      </div>

      {/* 3. LEFT FLOATING SMART BIN REGISTRY HUD */}
      <div
        className={`absolute top-20 left-4 bottom-24 z-20 transition-all duration-300 pointer-events-auto flex ${
          isRegistryOpen ? 'w-80 sm:w-96' : 'w-12'
        }`}
      >
        <div className="glass-hud w-full h-full rounded-3xl border border-slate-700/80 shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
            {isRegistryOpen ? (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-extrabold text-xs text-white">Smart Bins Registry</h2>
                  <p className="text-[10px] text-emerald-400 font-semibold">{filteredBins.length} All-in-One AI Nodes</p>
                </div>
              </div>
            ) : null}

            <button
              onClick={() => setIsRegistryOpen(!isRegistryOpen)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title={isRegistryOpen ? 'Collapse Registry' : 'Expand Registry'}
            >
              {isRegistryOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>

          {isRegistryOpen && (
            <div className="p-3 flex-1 flex flex-col space-y-3 overflow-hidden">
              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search code or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Multi-Stream Acceptance Badge Banner */}
              <div className="p-2 rounded-xl bg-slate-900/95 border border-purple-800/40 text-[10px] flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-purple-300 font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Accepts All Waste Types</span>
                </div>
                <div className="flex items-center gap-1 text-[11px]">
                  <span>🍏</span>
                  <span>🥤</span>
                  <span>📦</span>
                  <span>🍾</span>
                  <span>⚙️</span>
                  <span>⚡</span>
                </div>
              </div>

              {/* Bins List with Visual Liquid Cylinders & 6-Chamber Indicators */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {[...filteredBins]
                  .sort((a, b) => b.current_fill_percentage - a.current_fill_percentage)
                  .map((bin) => {
                    const fill = Math.round(bin.current_fill_percentage || 0);
                    const isCritical = bin.status === 'Critical' || fill >= 91;
                    const isAlmost = bin.status === 'Almost Full' || fill >= 76;

                    return (
                      <div
                        key={bin.id}
                        onClick={() => setSelectedBin(bin)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer text-left flex flex-col gap-2 ${
                          isCritical
                            ? 'bg-rose-950/40 border-rose-700/60 hover:bg-rose-900/50 shadow-lg shadow-rose-950/30'
                            : isAlmost
                            ? 'bg-amber-950/30 border-amber-700/60 hover:bg-amber-900/40'
                            : 'bg-slate-900/80 border-slate-800 hover:bg-slate-800/70 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          {/* Left Info */}
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-black text-white">{bin.bin_code}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-950/80 text-purple-300 border border-purple-700/60 flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                                All-in-One AI Bin
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-medium truncate">{bin.location_name}</p>
                            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                              <span>Dist: {Math.max(0, (bin.capacity * (1 - fill / 100))).toFixed(0)}cm to lid</span>
                              <span className="text-emerald-400 font-sans font-bold text-[9px]">AI Intake: Online</span>
                            </div>
                          </div>

                          {/* Right: Vertical Cylindrical Liquid Tank */}
                          <div className="flex flex-col items-center gap-1 shrink-0">
                            <div className="w-8 h-12 rounded-lg bg-slate-950 border border-slate-700/80 relative overflow-hidden flex flex-col justify-end p-0.5 shadow-inner">
                              <div
                                className={`w-full rounded transition-all duration-700 ${
                                  isCritical
                                    ? 'bg-gradient-to-t from-rose-600 to-rose-400'
                                    : isAlmost
                                    ? 'bg-gradient-to-t from-amber-600 to-amber-400'
                                    : 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                                }`}
                                style={{ height: `${Math.min(100, Math.max(8, fill))}%` }}
                              />
                            </div>
                            <span
                              className={`text-[10px] font-black ${
                                isCritical ? 'text-rose-400' : isAlmost ? 'text-amber-400' : 'text-emerald-400'
                              }`}
                            >
                              {fill}%
                            </span>
                          </div>
                        </div>

                        {/* Internal Chamber Segregation Mini Bar */}
                        <div className="pt-1 border-t border-slate-800/80">
                          <div className="flex items-center justify-between text-[9px] text-slate-400 mb-1 font-semibold">
                            <span>Internal Chambers (6 Streams):</span>
                            <span className="text-purple-300 font-mono text-[8px]">Auto-Sorted</span>
                          </div>
                          <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-slate-950 gap-0.5 shadow-inner">
                            <div className="h-full bg-blue-500" style={{ width: '28%' }} title="Plastic Chamber: 28%" />
                            <div className="h-full bg-emerald-500" style={{ width: '25%' }} title="Organic Chamber: 25%" />
                            <div className="h-full bg-amber-500" style={{ width: '18%' }} title="Paper Chamber: 18%" />
                            <div className="h-full bg-teal-500" style={{ width: '14%' }} title="Glass Chamber: 14%" />
                            <div className="h-full bg-indigo-500" style={{ width: '10%' }} title="Metal Chamber: 10%" />
                            <div className="h-full bg-yellow-500" style={{ width: '5%' }} title="E-Waste Chamber: 5%" />
                          </div>
                        </div>

                        {/* Action Row: Accept & Dispatch Collection Button */}
                        <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-800/80">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDispatchToBin(bin);
                            }}
                            disabled={truckDispatching}
                            className={`flex-1 py-1.5 px-2.5 rounded-xl font-black text-[11px] transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-60 ${
                              truckDispatching && dispatchTargetBin?.bin_code === bin.bin_code
                                ? 'bg-amber-500 text-slate-950 animate-pulse font-bold'
                                : isCritical
                                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40'
                                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40'
                            }`}
                            title={`Accept task & dispatch collection truck directly to ${bin.bin_code}`}
                          >
                            <Truck className="w-3 h-3" />
                            <span>
                              {truckDispatching && dispatchTargetBin?.bin_code === bin.bin_code
                                ? 'Alpha-01 En Route...'
                                : 'Accept & Dispatch'}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBin(bin);
                            }}
                            className="py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] border border-slate-700 transition"
                            title="Inspect bin chambers & AI intake"
                          >
                            Inspect
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Event Feed Mini-Ticker */}
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[10px] space-y-1">
                <span className="text-slate-400 font-bold uppercase tracking-wider block">Live Ingestion Feed</span>
                <div className="text-slate-300 truncate font-mono">
                  {eventLog[0]?.text || 'Awaiting live sensor packet...'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. BOTTOM FLOATING ACTION DOCK */}
      <div className="absolute bottom-4 left-4 right-4 z-20 flex justify-center pointer-events-none">
        <div className="glass-hud p-2 sm:p-2.5 rounded-3xl flex items-center flex-wrap justify-center gap-2 pointer-events-auto border border-slate-700/80 shadow-2xl">
          {/* Toggle Live Stream */}
          <button
            onClick={() => setAutoSimulate(!autoSimulate)}
            className={`px-3.5 py-2 rounded-2xl text-xs font-black transition flex items-center gap-1.5 shadow-md ${
              autoSimulate
                ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-400/40'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            {autoSimulate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{autoSimulate ? '🔴 Live Stream: ON' : '⚪ Stream: Paused'}</span>
          </button>

          {/* 1-Click Spike */}
          <button
            onClick={handleSpikeCritical}
            className="px-3.5 py-2 rounded-2xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white transition flex items-center gap-1.5 shadow-lg shadow-rose-600/30 active:scale-95"
            title="Simulate ultrasonic sensor reaching 92%"
          >
            <span>🚨 Spike to 92%</span>
          </button>

          {/* 1-Click Empty */}
          <button
            onClick={handleEmptyBin}
            className="px-3.5 py-2 rounded-2xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5 active:scale-95"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>🧹 Empty (0%)</span>
          </button>

          {/* 1-Click Moving Fleet Simulation */}
          <button
            onClick={handleDispatchFleet}
            disabled={truckDispatching}
            className="px-3.5 py-2 rounded-2xl text-xs font-black bg-blue-600 hover:bg-blue-500 text-white transition flex items-center gap-1.5 shadow-lg shadow-blue-600/30 active:scale-95 disabled:opacity-50"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>
              {truckDispatching
                ? `Alpha-01 En Route (${dispatchTargetBin?.bin_code || 'Bin'})...`
                : selectedBin
                ? `🚚 Dispatch to ${selectedBin.bin_code}`
                : '🚚 Dispatch Alpha-01'}
            </span>
          </button>

          <div className="h-6 w-px bg-slate-700 hidden sm:block" />

          {/* AI Waste Vision Scanner Button */}
          <button
            onClick={() => setShowAiModal(true)}
            className="px-4 py-2 rounded-2xl text-xs font-black bg-purple-600 hover:bg-purple-500 text-white transition flex items-center gap-1.5 shadow-lg shadow-purple-600/30 active:scale-95"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>AI Waste Vision</span>
          </button>

          {/* Report Illegal Dumping Button */}
          <button
            onClick={() => setShowDumpingModal(true)}
            className="px-4 py-2 rounded-2xl text-xs font-black bg-slate-800 hover:bg-rose-900/60 text-slate-200 hover:text-rose-200 border border-slate-700 transition flex items-center gap-1.5 active:scale-95"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>Report Dumping</span>
          </button>
        </div>
      </div>

      {/* 5. MODAL: INTERACTIVE BIN INSPECTOR */}
      {selectedBin && (
        <BinInspectorModal
          bin={selectedBin}
          onClose={() => setSelectedBin(null)}
          onRefresh={fetchBins}
          onDispatch={handleDispatchToBin}
          isDispatching={truckDispatching}
          isTargetBin={dispatchTargetBin?.bin_code === selectedBin.bin_code}
        />
      )}

      {/* 6. MODAL: AI WASTE VISION SCANNER */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="glass-hud w-full max-w-2xl rounded-3xl border border-slate-700/90 shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">PyTorch MobileNetV2 Waste Vision</h3>
                  <p className="text-xs text-slate-400">Zero login required • Instant edge AI classification</p>
                </div>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {aiError && (
              <div className="p-3 bg-rose-950/60 border border-rose-700/80 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{aiError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Upload area */}
              <form onSubmit={handleAiClassify} className="space-y-3">
                {!aiPreview ? (
                  <label className="border-2 border-dashed border-slate-700 hover:border-purple-500 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition bg-slate-900/60 hover:bg-purple-950/20 h-56">
                    <UploadCloud className="w-10 h-10 text-slate-400 mb-2" />
                    <span className="text-xs font-bold text-slate-200">Upload or Snap Photo</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">JPG, PNG, WEBP</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files[0];
                        if (f) {
                          setAiFile(f);
                          setAiPreview(URL.createObjectURL(f));
                          setAiResult(null);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="relative h-56 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700">
                    <img src={aiPreview} alt="Waste" className="w-full h-full object-contain" />
                    {aiLoading && <div className="scan-laser-line" />}
                    <button
                      type="button"
                      onClick={() => {
                        setAiFile(null);
                        setAiPreview(null);
                        setAiResult(null);
                      }}
                      className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-black/70 hover:bg-black text-white text-[10px] font-bold"
                    >
                      Change
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={aiLoading || !aiFile}
                  className="w-full py-3 px-4 rounded-xl text-xs font-black text-white bg-purple-600 hover:bg-purple-500 transition shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {aiLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Scanning with Neural Network...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Execute Vision Classification</span>
                    </>
                  )}
                </button>
              </form>

              {/* Result Area */}
              <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 flex flex-col justify-between text-xs">
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                    Model Inference Output
                  </h4>

                  {aiResult ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] text-slate-500 font-semibold uppercase">Category</span>
                          <p className="text-2xl font-black text-white">{aiResult.category}</p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full font-bold text-xs ${
                            aiResult.recyclable
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                              : 'bg-rose-950 text-rose-300 border border-rose-700'
                          }`}
                        >
                          {aiResult.recyclable ? 'Recyclable' : 'Non-Recyclable'}
                        </span>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] font-semibold text-slate-300 mb-1">
                          <span>Confidence:</span>
                          <span className="font-bold text-purple-400">{aiResult.confidence}%</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${aiResult.confidence}%` }} />
                        </div>
                      </div>

                      <div className="p-2.5 bg-emerald-950/40 rounded-xl border border-emerald-800/60 text-emerald-300 text-[11px]">
                        <strong>Disposal Stream: </strong> {aiResult.disposal_stream}
                      </div>

                      <p className="text-[11px] text-slate-400 leading-relaxed">{aiResult.recommendation}</p>
                    </div>
                  ) : (
                    <div className="h-44 flex flex-col items-center justify-center text-center text-slate-500">
                      <Camera className="w-10 h-10 text-slate-600 mb-1.5" />
                      <p className="font-bold text-xs">Awaiting Waste Image</p>
                      <p className="text-[10px] text-slate-500">Upload to classify into Plastic, Organic, Paper, Glass, etc.</p>
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-800">
                  Model: PyTorch MobileNetV2 fine-tuned on Municipal Waste Segregation Dataset.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL: REPORT ILLEGAL DUMPING */}
      {showDumpingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="glass-hud w-full max-w-xl rounded-3xl border border-slate-700/90 shadow-2xl p-6 sm:p-7 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <h3 className="font-extrabold text-base text-white">Report Illegal Waste Dumping</h3>
              </div>
              <button
                onClick={() => setShowDumpingModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {reportSuccess ? (
              <div className="p-5 rounded-2xl bg-emerald-950/60 border border-emerald-700/80 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="font-black text-white text-base">Report #{reportSuccess.id} Dispatched!</h4>
                <p className="text-xs text-emerald-300">
                  Municipal sanitation dispatch has queued this site for field clean-up.
                </p>

                {reportPreview && (
                  <div className="relative h-32 rounded-xl overflow-hidden border border-emerald-600/40">
                    <img src={reportPreview} alt="Incident Photo" className="w-full h-full object-cover" />
                    <div className="absolute bottom-1 right-1 px-2 py-0.5 bg-black/75 text-emerald-300 font-mono text-[10px] rounded">
                      📍 {reportLocation.latitude.toFixed(4)}, {reportLocation.longitude.toFixed(4)}
                    </div>
                  </div>
                )}

                <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800 text-[11px] font-mono flex items-center justify-between text-slate-300">
                  <span>GPS: {reportLocation.latitude.toFixed(4)}, {reportLocation.longitude.toFixed(4)}</span>
                  <a
                    href={`https://www.google.com/maps?q=${reportLocation.latitude},${reportLocation.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 hover:underline font-bold"
                  >
                    Google Maps ↗
                  </a>
                </div>

                <button
                  onClick={() => {
                    setReportSuccess(null);
                    setReportImage(null);
                    setReportPreview(null);
                  }}
                  className="mt-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition"
                >
                  File Another Incident
                </button>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-3 text-xs">
                {reportError && (
                  <div className="p-2.5 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{reportError}</span>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Incident Title</label>
                  <input
                    type="text"
                    required
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                    placeholder="e.g. Bulk trash accumulated by storm drain"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Description</label>
                  <textarea
                    required
                    rows={2}
                    value={reportDesc}
                    onChange={(e) => setReportDesc(e.target.value)}
                    placeholder="Describe the waste material and urgency..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  />
                </div>

                {/* Photo Evidence with GPS Coordinates */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-300">Photo Evidence with Coordinates</label>
                    <span className="text-[10px] text-slate-400">Optional photo</span>
                  </div>
                  {!reportPreview ? (
                    <div className="grid grid-cols-2 gap-2">
                      <label className="border border-dashed border-rose-500/50 hover:border-rose-400 bg-rose-950/20 hover:bg-rose-950/40 rounded-xl p-2.5 flex flex-col items-center justify-center text-center cursor-pointer transition">
                        <Camera className="w-4 h-4 text-rose-400 mb-1" />
                        <span className="text-[11px] font-bold text-white">Camera Capture</span>
                        <span className="text-[9px] text-slate-400">Direct camera</span>
                        <input type="file" accept="image/*" capture="environment" onChange={handleReportImageChange} className="hidden" />
                      </label>
                      <label className="border border-dashed border-slate-700 hover:border-slate-500 bg-slate-900 hover:bg-slate-850 rounded-xl p-2.5 flex flex-col items-center justify-center text-center cursor-pointer transition">
                        <UploadCloud className="w-4 h-4 text-slate-400 mb-1" />
                        <span className="text-[11px] font-bold text-white">Upload File</span>
                        <span className="text-[9px] text-slate-400">JPG, PNG</span>
                        <input type="file" accept="image/*" onChange={handleReportImageChange} className="hidden" />
                      </label>
                    </div>
                  ) : (
                    <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-700">
                      <img src={reportPreview} alt="Evidence Preview" className="w-full h-32 object-cover" />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent p-2 text-white">
                        <div className="text-[10px] font-mono text-emerald-300 flex items-center justify-between">
                          <span>📍 {reportLocation.latitude.toFixed(4)}, {reportLocation.longitude.toFixed(4)}</span>
                          <span>{new Date().toLocaleTimeString()}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setReportImage(null);
                          setReportPreview(null);
                        }}
                        className="absolute top-1.5 right-1.5 px-2 py-0.5 bg-black/70 hover:bg-black text-white text-[9px] font-bold rounded-md"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-[11px] font-mono flex items-center justify-between">
                  <span>GPS: {reportLocation.latitude.toFixed(4)}, {reportLocation.longitude.toFixed(4)}</span>
                  <button
                    type="button"
                    onClick={() => setReportLocation({ latitude: 12.9716, longitude: 77.5946 })}
                    className="text-xs text-blue-400 font-bold hover:underline"
                  >
                    Reset Center
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={reportLoading}
                  className="w-full py-3 px-4 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-500 transition shadow-lg shadow-rose-600/30"
                >
                  {reportLoading ? 'Transmitting Incident...' : 'Submit Incident Report to Municipality'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
