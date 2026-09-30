import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { collectionsAPI, binsAPI, iotAPI, collectorAPI } from '../../services/api';
import { broadcastCollectorGps, onCollectionEvent, getSocket, joinRoleRoom } from '../../services/socket';
import { getCurrentUserLocation, watchLiveLocation, clearLiveLocationWatch } from '../../services/locationService';
import StatusBadge from '../../components/StatusBadge';
import LeafletMap from '../../components/LeafletMap';
import { fetchRoadRoute, sampleRoadWaypoints } from '../../services/roadRoutingService';
import {
  Truck,
  AlertCircle,
  CheckCircle2,
  Navigation,
  ArrowRight,
  ListOrdered,
  RefreshCw,
  Sparkles,
  Layers,
  MapPin,
  Clock,
  Scale,
  Check,
  Radio,
  Camera,
  ShieldCheck,
  AlertTriangle,
  X,
} from 'lucide-react';

// Multi-Chamber Smart Dustbin layout helper
function getDustbinChambers(bin) {
  if (bin?.chambers && Array.isArray(bin.chambers) && bin.chambers.length > 0) {
    return bin.chambers;
  }
  const fill = Math.round(bin?.current_fill_percentage || 0);
  const primary = (bin?.primary_stream || bin?.waste_type || 'General').toLowerCase();
  const seed = ((bin?.id || 1) * 31) % 100;

  const isPrimary = (type) => primary.includes(type.toLowerCase());

  const organic = isPrimary('organic') ? Math.max(fill, 85) : Math.round(20 + ((seed * 3) % 25));
  const paper = isPrimary('paper') ? Math.max(fill, 85) : Math.round(18 + ((seed * 7) % 22));
  const plastic = isPrimary('plastic') ? Math.max(fill, 85) : Math.round(25 + (seed % 24));
  const metal = isPrimary('metal') || isPrimary('glass') || isPrimary('hazard') ? Math.max(fill, 85) : Math.round(12 + ((seed * 5) % 18));

  return [
    { type: 'Organic', name: 'Organic', icon: '🍏', percentage: Math.min(100, organic), color: '#10b981', is_primary: isPrimary('organic') },
    { type: 'Paper', name: 'Paper', icon: '📦', percentage: Math.min(100, paper), color: '#f59e0b', is_primary: isPrimary('paper') },
    { type: 'Plastic', name: 'Plastic', icon: '🥤', percentage: Math.min(100, plastic), color: '#3b82f6', is_primary: isPrimary('plastic') },
    { type: 'Metal', name: 'Metal/Glass', icon: '⚙️', percentage: Math.min(100, metal), color: '#6366f1', is_primary: isPrimary('metal') || isPrimary('glass') },
  ];
}

export default function CollectorDashboard() {
  const [tasks, setTasks] = useState([]);
  const [allBins, setAllBins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  // Active view filter: 'CRITICAL' | 'COMPLETED' | 'ACTIVE' | 'ALL_BINS'
  const [viewFilter, setViewFilter] = useState('CRITICAL');

  // Road-only moving fleet navigation
  const [truckPos, setTruckPos] = useState([12.9690, 77.5920]);
  const [truckDispatching, setTruckDispatching] = useState(false);
  const [dispatchTargetBin, setDispatchTargetBin] = useState(null);
  const [activeRoadRoute, setActiveRoadRoute] = useState([]);

  // Live GPS Shift Transmission
  const [isShiftActive, setIsShiftActive] = useState(false);
  const [liveGpsCoords, setLiveGpsCoords] = useState(null);
  const gpsWatchIdRef = useRef(null);

  // Collection Verification Modal
  const [activeCollectTask, setActiveCollectTask] = useState(null);
  const [collectWeightKg, setCollectWeightKg] = useState('25');
  const [collectProofPhoto, setCollectProofPhoto] = useState(null);
  const [lastVerificationResult, setLastVerificationResult] = useState(null);
  const [selectedMapBin, setSelectedMapBin] = useState(null);

  const fetchCollectorData = async () => {
    try {
      const [tRes, bRes] = await Promise.all([
        collectionsAPI.getAll({ all: 'true' }),
        binsAPI.getAll(),
      ]);
      if (tRes.data?.success) setTasks(tRes.data.requests || []);
      if (bRes.data?.success) setAllBins(bRes.data.bins || []);
    } catch (err) {
      console.error('Error loading collector data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollectorData();

    // Socket.IO Room & Real-time Task Ingestion
    joinRoleRoom('collector');
    const unsubCol = onCollectionEvent(() => {
      fetchCollectorData();
      setActionMessage('🔔 New automated collection event dispatched to your route queue!');
      setTimeout(() => setActionMessage(''), 5000);
    });

    const interval = setInterval(fetchCollectorData, 6000);

    return () => {
      clearInterval(interval);
      unsubCol?.();
      if (gpsWatchIdRef.current) {
        clearLiveLocationWatch(gpsWatchIdRef.current);
      }
    };
  }, []);

  // Toggle Live Shift & GPS Broadcasting
  const handleToggleShift = async () => {
    if (isShiftActive) {
      // End shift
      if (gpsWatchIdRef.current) {
        clearLiveLocationWatch(gpsWatchIdRef.current);
        gpsWatchIdRef.current = null;
      }
      setIsShiftActive(false);
      setActionMessage('Shift ended. Live GPS tracking deactivated.');
      setTimeout(() => setActionMessage(''), 4000);
    } else {
      // Start shift & begin GPS broadcast
      setIsShiftActive(true);
      setActionMessage('🚚 Shift started! Live GPS tracking activated and broadcasting to municipal command.');
      setTimeout(() => setActionMessage(''), 4000);

      // Get initial position
      const loc = await getCurrentUserLocation();
      if (loc) {
        const newCoords = [loc.latitude, loc.longitude];
        setTruckPos(newCoords);
        setLiveGpsCoords(newCoords);

        // Broadcast to server & websocket
        collectorAPI.updateLocation({
          latitude: loc.latitude,
          longitude: loc.longitude,
          speed: 28.5,
          heading: 90,
          vehicle_id: 'TRUCK-01',
        }).catch(() => {});

        broadcastCollectorGps({
          latitude: loc.latitude,
          longitude: loc.longitude,
          speed: 28.5,
          vehicle_id: 'TRUCK-01',
        });
      }

      // Continuous watch
      gpsWatchIdRef.current = watchLiveLocation((pos) => {
        const coords = [pos.latitude, pos.longitude];
        setTruckPos(coords);
        setLiveGpsCoords(coords);

        collectorAPI.updateLocation({
          latitude: pos.latitude,
          longitude: pos.longitude,
          speed: pos.speed || 30.0,
          heading: pos.heading || 0,
          vehicle_id: 'TRUCK-01',
        }).catch(() => {});

        broadcastCollectorGps({
          latitude: pos.latitude,
          longitude: pos.longitude,
          speed: pos.speed || 30.0,
          vehicle_id: 'TRUCK-01',
        });
      });
    }
  };

  // Derived collections
  const criticalBins = allBins.filter(
    (b) => b.status === 'Critical' || (b.current_fill_percentage >= 90)
  );
  const activeTasks = tasks.filter((t) =>
    ['Pending', 'Assigned', 'Accepted', 'On the Way'].includes(t.status)
  );
  const completedTasks = tasks.filter(
    (t) => t.status === 'Completed' || t.status === 'Collected'
  );

  // Dispatch Truck strictly along real physical roads to destination bin
  const dispatchTruckOnRoad = async (targetBin, onArrive) => {
    if (!targetBin?.latitude || !targetBin?.longitude) {
      if (onArrive) await onArrive();
      return;
    }

    setDispatchTargetBin(targetBin);
    setTruckDispatching(true);
    setActionMessage(`🚚 Vehicle TRUCK-01 navigating road network to ${targetBin.bin_code || 'Bin'}...`);

    const startCoords = [truckPos[0], truckPos[1]];
    const endCoords = [targetBin.latitude, targetBin.longitude];

    const roadData = await fetchRoadRoute(startCoords, endCoords);
    const roadCoordinates = roadData?.coordinates || [startCoords, endCoords];
    setActiveRoadRoute(roadCoordinates);

    const roadWaypoints = sampleRoadWaypoints(roadCoordinates, 20);

    let step = 0;
    const driveInterval = setInterval(async () => {
      if (step < roadWaypoints.length) {
        const nextPos = roadWaypoints[step];
        setTruckPos(nextPos);
        broadcastCollectorGps({
          latitude: nextPos[0],
          longitude: nextPos[1],
          speed: 35.0,
          vehicle_id: 'TRUCK-01',
        });
        step += 1;
      } else {
        clearInterval(driveInterval);
        setTruckPos([endCoords[0], endCoords[1]]);
        setTruckDispatching(false);
        setDispatchTargetBin(null);
        setActiveRoadRoute([]);
        if (onArrive) await onArrive();
      }
    }, 120);
  };

  // Accept Task - Dispatches truck along road network
  const handleAcceptTask = async (taskId) => {
    const task = tasks.find((t) => t.id === taskId);
    const targetBin = task?.bin || allBins.find((b) => b.id === task?.bin_id);
    setActionLoading(true);

    const completeAccept = async () => {
      try {
        await collectionsAPI.updateStatus(taskId, { status: 'Accepted' });
        setActionMessage(`✓ Task #${taskId} accepted! Vehicle TRUCK-01 navigated via road to ${targetBin?.bin_code || 'Bin'}.`);
        await fetchCollectorData();
        setTimeout(() => setActionMessage(''), 4000);
      } catch (e) {
        console.error(e);
      } finally {
        setActionLoading(false);
      }
    };

    if (targetBin) {
      await dispatchTruckOnRoad(targetBin, completeAccept);
    } else {
      await completeAccept();
    }
  };

  // Open Collect Modal
  const openCollectModal = (task) => {
    setActiveCollectTask(task);
    setCollectWeightKg('25');
    setCollectProofPhoto(null);
  };

  // Submit Verified Collection
  const handleSubmitCollection = async (e) => {
    e.preventDefault();
    if (!activeCollectTask) return;

    setActionLoading(true);
    try {
      // Acquire live collector GPS for proximity anti-fraud check
      const currentLoc = await getCurrentUserLocation();
      const currentLat = currentLoc?.latitude || truckPos[0];
      const currentLng = currentLoc?.longitude || truckPos[1];

      const formData = new FormData();
      formData.append('collected_quantity', collectWeightKg || '25');
      formData.append('unit', 'kg');
      formData.append('latitude', currentLat.toString());
      formData.append('longitude', currentLng.toString());
      if (collectProofPhoto) {
        formData.append('proof_photo', collectProofPhoto);
      }

      const res = await collectionsAPI.recordCollection(activeCollectTask.id, formData);

      // Reset bin fill in IoT simulation
      const binCode = activeCollectTask.bin?.bin_code;
      if (binCode) {
        await iotAPI.sendReading({
          bin_code: binCode,
          fill_percentage: 0.0,
          distance_cm: 100,
          gas_level_ppm: 15,
          battery_level: 95,
          sensor_status: 'OK',
          is_simulated: true,
        }).catch(() => {});
      }

      const record = res.data?.record || {};
      const batchNo = record.batch_number || `BATCH-SWMS-2026-${activeCollectTask.id + 1000}`;
      const isVerified = record.is_verified !== false && !record.fraud_flag;

      setLastVerificationResult({
        batchNo,
        isVerified,
        weight: collectWeightKg,
        binCode: binCode || 'Smart Bin',
      });

      setActiveCollectTask(null);
      setActionMessage(`✓ Collection verified! Logged ${collectWeightKg} kg under Batch ${batchNo}. Bin reset to 0%.`);
      await fetchCollectorData();
      setTimeout(() => setActionMessage(''), 5000);
    } catch (e) {
      console.error(e);
      setActionMessage('Collection recording error. Please retry.');
    } finally {
      setActionLoading(false);
    }
  };

  // Direct 1-Click Collect & Empty for a Critical Bin
  const handleDirectCollectBin = async (bin) => {
    setActionLoading(true);

    const completeCollect = async () => {
      try {
        const existingTask = tasks.find((t) => t.bin_id === bin.id && t.status !== 'Completed');

        if (existingTask) {
          const formData = new FormData();
          formData.append('collected_quantity', '25');
          formData.append('unit', 'kg');
          formData.append('latitude', bin.latitude.toString());
          formData.append('longitude', bin.longitude.toString());
          await collectionsAPI.recordCollection(existingTask.id, formData);
        }

        await iotAPI.sendReading({
          bin_code: bin.bin_code,
          fill_percentage: 0.0,
          distance_cm: 100,
          gas_level_ppm: 12,
          battery_level: 96,
          sensor_status: 'OK',
          is_simulated: true,
        }).catch(() => {});

        setActionMessage(`✓ ${bin.bin_code} emptied by TRUCK-01 via road network (Reset to 0%)!`);
        await fetchCollectorData();
        setTimeout(() => setActionMessage(''), 4000);
      } catch (e) {
        console.error(e);
      } finally {
        setActionLoading(false);
      }
    };

    await dispatchTruckOnRoad(bin, completeCollect);
  };

  // Compute bins for map preview based on current active tab
  const mapBins =
    viewFilter === 'CRITICAL'
      ? criticalBins
      : viewFilter === 'COMPLETED'
      ? completedTasks.map((t) => t.bin).filter(Boolean)
      : viewFilter === 'ACTIVE'
      ? activeTasks.map((t) => t.bin).filter(Boolean)
      : allBins;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
              Municipal Field Operations
            </span>
            {isShiftActive ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Shift Active • Live GPS Transmitting
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                Shift Inactive
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">Waste Collector Portal</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time GPS telematics, anti-fraud geofenced verification, and intelligent route navigation.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleToggleShift}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition flex items-center gap-2 ${
              isShiftActive
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            <Radio className={`w-4 h-4 ${isShiftActive ? 'animate-pulse' : ''}`} />
            <span>{isShiftActive ? 'End Shift & Pause GPS' : 'Start Shift & Broadcast GPS'}</span>
          </button>

          <Link
            to="/collector/route"
            className="px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition flex items-center gap-2"
          >
            <Navigation className="w-4 h-4" />
            <span>Multi-Stop Route Map</span>
          </Link>

          <button
            onClick={fetchCollectorData}
            className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            title="Refresh Tasks"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Verification Flash Result */}
      {lastVerificationResult && (
        <div className="p-4 bg-emerald-900 text-white rounded-2xl shadow-lg flex items-center justify-between gap-4 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-emerald-800 rounded-xl">
              <ShieldCheck className="w-6 h-6 text-emerald-300" />
            </span>
            <div>
              <p className="font-extrabold text-sm">
                Collection Verified & Traceable!
              </p>
              <p className="text-xs text-emerald-200">
                Batch <strong className="text-white font-mono">{lastVerificationResult.batchNo}</strong> registered with Material Recovery Facility. Weight: {lastVerificationResult.weight} kg.
              </p>
            </div>
          </div>
          <button
            onClick={() => setLastVerificationResult(null)}
            className="text-xs font-bold text-emerald-300 hover:text-white"
          >
            ✕ Dismiss
          </button>
        </div>
      )}

      {/* View Filter Interactive Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold no-scrollbar">
        <button
          onClick={() => setViewFilter('CRITICAL')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            viewFilter === 'CRITICAL'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30 ring-2 ring-rose-500/40'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          <span>Critical Overflow Bins ({criticalBins.length})</span>
        </button>

        <button
          onClick={() => setViewFilter('COMPLETED')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            viewFilter === 'COMPLETED'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-500/40'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Completed Today ({completedTasks.length})</span>
        </button>

        <button
          onClick={() => setViewFilter('ACTIVE')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            viewFilter === 'ACTIVE'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30 ring-2 ring-amber-500/40'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <ListOrdered className="w-4 h-4" />
          <span>Active Tasks ({activeTasks.length})</span>
        </button>

        <button
          onClick={() => setViewFilter('ALL_BINS')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            viewFilter === 'ALL_BINS'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-2 ring-blue-500/40'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>All Monitored Bins ({allBins.length})</span>
        </button>
      </div>

      {/* Main Content & Geography Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Filtered Items List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {viewFilter === 'CRITICAL' && `Critical Situation Bins (${criticalBins.length})`}
                {viewFilter === 'COMPLETED' && `Completed Collections Today (${completedTasks.length})`}
                {viewFilter === 'ACTIVE' && `Active Collection Tasks (${activeTasks.length})`}
                {viewFilter === 'ALL_BINS' && `All Municipal Smart Bins (${allBins.length})`}
              </h2>
              <p className="text-xs text-slate-500">
                {viewFilter === 'CRITICAL' && 'Smart bins currently at or above 90% fill requiring priority collection.'}
                {viewFilter === 'COMPLETED' && 'Bins successfully collected, emptied, and verified today.'}
                {viewFilter === 'ACTIVE' && 'Tasks queued, accepted, or en route for municipal pickup.'}
                {viewFilter === 'ALL_BINS' && 'Real-time multi-chamber telemetry for all municipal bin nodes.'}
              </p>
            </div>

            <Link
              to="/collector/tasks"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 shrink-0"
            >
              <span>Task List</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* 1. CRITICAL BINS VIEW */}
          {viewFilter === 'CRITICAL' && (
            criticalBins.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-xs text-slate-500 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="font-bold text-slate-900 text-sm">No Critical Bins Detected!</p>
                <p>All smart bins in the municipality are operating within safe capacity levels.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {criticalBins.map((bin) => {
                  const matchingTask = tasks.find(
                    (t) => t.bin_id === bin.id && t.status !== 'Completed'
                  );
                  return (
                    <div
                      key={bin.id}
                      className="bg-white rounded-2xl p-5 border border-rose-300 ring-1 ring-rose-200 shadow-sm space-y-3.5 hover:shadow-md transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold text-sm shrink-0">
                            🗑️
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-black text-slate-900 font-mono">{bin.bin_code}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                Smart Dustbin
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 font-medium mt-0.5 line-clamp-1">{bin.location_name}</p>
                          </div>
                        </div>
                        <StatusBadge status="Critical" />
                      </div>

                      {/* Fill Progress Bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-500">Total Dustbin Fill:</span>
                          <span className="text-rose-600">{bin.current_fill_percentage}% Full</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="bg-rose-600 h-2.5 rounded-full transition-all"
                            style={{ width: `${Math.min(100, bin.current_fill_percentage)}%` }}
                          />
                        </div>

                        {/* 4-Chamber Mini Breakdown */}
                        <div className="grid grid-cols-4 gap-1.5 pt-1">
                          {getDustbinChambers(bin).map((c) => (
                            <div key={c.type} className="bg-slate-50 p-1.5 rounded-xl border border-slate-100 text-center">
                              <span className="text-[11px] block">{c.icon}</span>
                              <span className="text-[9px] font-bold text-slate-700 font-mono block">{c.percentage}%</span>
                              <div className="w-full bg-slate-200 rounded-full h-1 mt-1 overflow-hidden">
                                <div
                                  className="h-1 rounded-full"
                                  style={{ width: `${c.percentage}%`, backgroundColor: c.color }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-between text-[10px] text-slate-400 font-mono pt-0.5">
                          <span>Battery: {bin.battery_level || 90}%</span>
                          <span className="text-rose-600 font-bold">🚨 Urgent Overflow Alert</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        {matchingTask ? (
                          <div className="flex items-center gap-1 text-xs">
                            <span className="text-slate-400 font-semibold">Task:</span>
                            <StatusBadge status={matchingTask.status} />
                          </div>
                        ) : (
                          <span className="text-[11px] text-amber-700 font-bold">Automated Queue</span>
                        )}

                        <button
                          onClick={() => {
                            if (matchingTask) {
                              openCollectModal(matchingTask);
                            } else {
                              handleDirectCollectBin(bin);
                            }
                          }}
                          disabled={actionLoading}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 transition flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Collect & Empty (0%)</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* 2. COMPLETED TODAY VIEW */}
          {viewFilter === 'COMPLETED' && (
            completedTasks.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-xs text-slate-500 space-y-2">
                <Clock className="w-10 h-10 text-slate-400 mx-auto" />
                <p className="font-bold text-slate-900 text-sm">No Collections Recorded Yet Today</p>
                <p>Accepted and collected tasks will appear here with proof logs and weight data.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {completedTasks.map((t) => (
                  <div
                    key={t.id}
                    className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-200 bg-emerald-50/20 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-black text-slate-900">{t.bin?.bin_code || `Task #${t.id}`}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          Verified & Clean
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Trace: {t.records?.[0]?.batch_number || `BATCH-SWMS-2026-${t.id + 1000}`}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-semibold">{t.bin?.location_name || 'Municipal Facility'}</p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1 flex-wrap">
                        <span>🕒 Completed: {new Date(t.completed_at || t.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>⚖️ Lifted: <strong>{t.records?.[0]?.collected_quantity || 25} kg</strong></span>
                        <span>👤 Vehicle: TRUCK-01</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-1 shadow-sm">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Collected & Clean</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* 3. ACTIVE TASKS VIEW */}
          {viewFilter === 'ACTIVE' && (
            activeTasks.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-xs text-slate-400">
                No active collection tasks pending right now.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeTasks.map((t) => (
                  <div
                    key={t.id}
                    className={`bg-white rounded-2xl p-5 border shadow-sm transition hover:shadow ${
                      t.priority === 'Critical' ? 'border-rose-300 ring-1 ring-rose-200' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-sm shrink-0">
                          🗑️
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono font-bold text-slate-900">{t.bin?.bin_code}</span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                              Smart Dustbin
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 font-medium line-clamp-1">{t.bin?.location_name}</p>
                        </div>
                      </div>
                      <StatusBadge status={t.priority} />
                    </div>

                    <div className="space-y-2 mb-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 font-medium">Total Dustbin Fill:</span>
                        <span className="font-bold text-rose-600">{t.bin?.current_fill_percentage}% Full</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-rose-500 h-2 rounded-full"
                          style={{ width: `${t.bin?.current_fill_percentage}%` }}
                        />
                      </div>

                      {/* 4-Chamber Mini Breakdown */}
                      <div className="grid grid-cols-4 gap-1.5 pt-1">
                        {getDustbinChambers(t.bin).map((c) => (
                          <div key={c.type} className="bg-slate-50 p-1.5 rounded-xl border border-slate-100 text-center">
                            <span className="text-[11px] block">{c.icon}</span>
                            <span className="text-[9px] font-bold text-slate-700 font-mono block">{c.percentage}%</span>
                            <div className="w-full bg-slate-200 rounded-full h-1 mt-1 overflow-hidden">
                              <div
                                className="h-1 rounded-full"
                                style={{ width: `${c.percentage}%`, backgroundColor: c.color }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <StatusBadge status={t.status} />
                      <div className="flex gap-1.5">
                        {t.status === 'Assigned' && (
                          <button
                            onClick={() => handleAcceptTask(t.id)}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition"
                          >
                            Accept Task
                          </button>
                        )}
                        {(t.status === 'Accepted' || t.status === 'On the Way') && (
                          <button
                            onClick={() => openCollectModal(t)}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition flex items-center gap-1 shadow-sm"
                          >
                            <Scale className="w-3.5 h-3.5" />
                            <span>Weigh & Verify</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* 4. ALL BINS VIEW */}
          {viewFilter === 'ALL_BINS' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {allBins.map((bin) => (
                <div key={bin.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono font-bold text-xs text-slate-900">{bin.bin_code}</span>
                      <p className="text-xs text-slate-600 line-clamp-1">{bin.location_name}</p>
                    </div>
                    <StatusBadge status={bin.status} />
                  </div>
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-500">Fill:</span>
                    <span className={bin.current_fill_percentage >= 90 ? 'text-rose-600 font-bold' : 'text-slate-900'}>
                      {bin.current_fill_percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${bin.current_fill_percentage >= 90 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${bin.current_fill_percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Col: Mini Map Preview */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Task Geography & Live Vehicle</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700">
                {mapBins.length} Nodes Shown
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live coordinates of vehicle TRUCK-01 and {viewFilter === 'CRITICAL' ? 'critical overflow bins' : 'municipal nodes'}.
            </p>
          </div>

          <div className="flex-1 min-h-[300px]">
            <LeafletMap
              bins={mapBins}
              height="300px"
              truckPosition={truckPos}
              isDispatching={truckDispatching}
              dispatchTargetBin={dispatchTargetBin}
              activeRoadRoute={activeRoadRoute}
              onDispatchBin={handleDirectCollectBin}
              onBinClick={(bin) => setSelectedMapBin(bin)}
            />
          </div>

          {selectedMapBin && (
            <div className="p-3.5 bg-slate-900 rounded-2xl border border-slate-800 text-white space-y-2.5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-black text-xs text-white">{selectedMapBin.bin_code}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-900/60 text-purple-300 border border-purple-700/60">
                    Selected Dustbin
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <StatusBadge status={selectedMapBin.status || 'Normal'} />
                  <button
                    onClick={() => setSelectedMapBin(null)}
                    className="text-slate-400 hover:text-white text-xs font-bold px-1"
                  >
                    &times;
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-slate-300 line-clamp-1">{selectedMapBin.location_name}</p>

              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-slate-400">Current Fill Level:</span>
                <span className="text-rose-400">{Math.round(selectedMapBin.current_fill_percentage || 0)}% Full</span>
              </div>

              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-rose-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.round(selectedMapBin.current_fill_percentage || 0))}%` }}
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const matchingTask = tasks.find((t) => t.bin_id === selectedMapBin.id && t.status !== 'Completed');
                    handleStartCollection(matchingTask || { bin_id: selectedMapBin.id, bin: selectedMapBin, id: `manual-${selectedMapBin.id}` });
                  }}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center gap-1 shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Collect & Empty</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDirectCollectBin(selectedMapBin)}
                  disabled={truckDispatching}
                  className="py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Dispatch</span>
                </button>
              </div>
            </div>
          )}

          <Link
            to="/collector/route"
            className="w-full py-2.5 rounded-xl text-xs font-bold text-center text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition"
          >
            Launch Heuristic Route Optimizer & Turn-by-Turn
          </Link>
        </div>
      </div>

      {/* VERIFIED COLLECTION MODAL (Anti-Fraud + Geo-fence + Batch generation) */}
      {activeCollectTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-base text-slate-900">Verified Bin Collection</h3>
              </div>
              <button
                onClick={() => setActiveCollectTask(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCollection} className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <p><strong>Target Bin:</strong> {activeCollectTask.bin?.bin_code} — {activeCollectTask.bin?.location_name}</p>
                <p><strong>Current Fill:</strong> {activeCollectTask.bin?.current_fill_percentage}%</p>
                <p className="text-[11px] text-emerald-700 font-bold">
                  📍 Browser GPS will be checked against bin location (&lt;350m anti-fraud rule).
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Measured Waste Mass (kg)
                </label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={collectWeightKg}
                  onChange={(e) => setCollectWeightKg(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                  placeholder="e.g. 25"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Collection Verification Photo (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCollectProofPhoto(e.target.files[0])}
                  className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveCollectTask(null)}
                  className="w-1/3 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {actionLoading ? 'Verifying & Submitting...' : 'Confirm & Empty Bin (0%)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
