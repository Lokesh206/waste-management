import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collectionsAPI, binsAPI, iotAPI } from '../../services/api';
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
} from 'lucide-react';

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

  const fetchCollectorData = async () => {
    setLoading(true);
    try {
      const [tRes, bRes] = await Promise.all([
        collectionsAPI.getAll({ all: 'true' }),
        binsAPI.getAll(),
      ]);
      if (tRes.data.success) setTasks(tRes.data.requests || []);
      if (bRes.data.success) setAllBins(bRes.data.bins || []);
    } catch (err) {
      console.error('Error loading collector data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollectorData();
    const interval = setInterval(fetchCollectorData, 5000);
    return () => clearInterval(interval);
  }, []);

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
    setActionMessage(`🚚 Vehicle Alpha-01 navigating road network to ${targetBin.bin_code || 'Bin'}...`);

    const startCoords = [truckPos[0], truckPos[1]];
    const endCoords = [targetBin.latitude, targetBin.longitude];

    const roadData = await fetchRoadRoute(startCoords, endCoords);
    const roadCoordinates = roadData?.coordinates || [startCoords, endCoords];
    setActiveRoadRoute(roadCoordinates);

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
        setActionMessage(`✓ Task #${taskId} accepted! Vehicle Alpha-01 navigated via road to ${targetBin?.bin_code || 'Bin'}.`);
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

  // Record Collection for a Task
  const handleCollectTask = async (task) => {
    setActionLoading(true);
    try {
      const formData = new FormData();
      formData.append('collected_quantity', '25');
      formData.append('unit', 'kg');
      await collectionsAPI.recordCollection(task.id, formData);

      // Reset bin fill in simulation
      if (task.bin?.bin_code) {
        await iotAPI.sendReading({
          bin_code: task.bin.bin_code,
          fill_percentage: 0.0,
          sensor_status: 'OK',
          is_simulated: true,
        });
      }

      setActionMessage(`✓ Task #${task.id} collected! 25 kg logged, ${task.bin?.bin_code} reset to 0%.`);
      await fetchCollectorData();
      setTimeout(() => setActionMessage(''), 4000);
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  // Direct 1-Click Collect & Empty for a Critical Bin - navigates strictly via road
  const handleDirectCollectBin = async (bin) => {
    setActionLoading(true);

    const completeCollect = async () => {
      try {
        const existingTask = tasks.find((t) => t.bin_id === bin.id && t.status !== 'Completed');

        if (existingTask) {
          const formData = new FormData();
          formData.append('collected_quantity', '25');
          formData.append('unit', 'kg');
          await collectionsAPI.recordCollection(existingTask.id, formData);
        }

        await iotAPI.sendReading({
          bin_code: bin.bin_code,
          fill_percentage: 0.0,
          sensor_status: 'OK',
          is_simulated: true,
        });

        setActionMessage(`✓ ${bin.bin_code} emptied by Vehicle Alpha-01 via road network (Reset to 0%)!`);
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
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
            Municipal Field Operations
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">Waste Collector Portal</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Select any tab below to filter critical overflow bins, completed collections, or active tasks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/collector/route"
            className="px-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition flex items-center gap-2"
          >
            <Navigation className="w-4 h-4" />
            <span>Open Route Map</span>
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
              <span>Task Management</span>
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
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-black text-slate-900 font-mono">{bin.bin_code}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-100 text-purple-800 border border-purple-200">
                              All-in-One AI Bin
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 font-medium mt-1">{bin.location_name}</p>
                        </div>
                        <StatusBadge status="Critical" />
                      </div>

                      {/* Fill Progress Bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-500">Current Fill Level:</span>
                          <span className="text-rose-600">{bin.current_fill_percentage}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="bg-rose-600 h-2.5 rounded-full transition-all"
                            style={{ width: `${Math.min(100, bin.current_fill_percentage)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 font-mono pt-0.5">
                          <span>Dist: {Math.max(0, (bin.capacity * (1 - bin.current_fill_percentage / 100))).toFixed(0)}cm to lid</span>
                          <span className="text-rose-600 font-bold">🚨 Urgent Overflow Risk</span>
                        </div>
                      </div>

                      {/* 6-Chamber Mini Indicators */}
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-[10px] space-y-1">
                        <div className="flex justify-between font-semibold text-slate-600">
                          <span>Internal Chambers:</span>
                          <span className="text-purple-700 font-mono">6 Types Segregated</span>
                        </div>
                        <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-slate-200 gap-0.5">
                          <div className="h-full bg-blue-500" style={{ width: '28%' }} title="Plastic" />
                          <div className="h-full bg-emerald-500" style={{ width: '25%' }} title="Organic" />
                          <div className="h-full bg-amber-500" style={{ width: '18%' }} title="Paper" />
                          <div className="h-full bg-teal-500" style={{ width: '14%' }} title="Glass" />
                          <div className="h-full bg-indigo-500" style={{ width: '10%' }} title="Metal" />
                          <div className="h-full bg-yellow-500" style={{ width: '5%' }} title="E-Waste" />
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
                          <span className="text-[11px] text-amber-700 font-bold">Unassigned Queue</span>
                        )}

                        <button
                          onClick={() => handleDirectCollectBin(bin)}
                          disabled={actionLoading}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 transition flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Accept & Empty (0%)</span>
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
                          Completed & Clean
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">Task #{t.id}</span>
                      </div>
                      <p className="text-xs text-slate-700 font-semibold">{t.bin?.location_name || 'Municipal Facility'}</p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1 flex-wrap">
                        <span>🕒 Completed: {new Date(t.completed_at || t.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>⚖️ Lifted: <strong>{t.records?.[0]?.collected_quantity || 25} kg</strong></span>
                        <span>👤 Collector: {t.assignedCollector?.name || 'Team Alpha (You)'}</span>
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
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <span className="text-xs font-mono font-bold text-slate-900">{t.bin?.bin_code}</span>
                        <p className="text-xs text-slate-600 mt-0.5 font-medium">{t.bin?.location_name}</p>
                      </div>
                      <StatusBadge status={t.priority} />
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Fill Level:</span>
                        <span className="font-bold text-rose-600">{t.bin?.current_fill_percentage}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-rose-500 h-2 rounded-full"
                          style={{ width: `${t.bin?.current_fill_percentage}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                        <span>All-in-One Multi-Stream</span>
                        <span>Task #{t.id}</span>
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
                            onClick={() => handleCollectTask(t)}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition flex items-center gap-1 shadow-sm"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Collect (25kg)</span>
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
              <h2 className="text-base font-bold text-slate-900">Task Geography</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700">
                {mapBins.length} Nodes Shown
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live coordinates of {viewFilter === 'CRITICAL' ? 'critical overflow bins' : viewFilter === 'COMPLETED' ? 'completed collection sites' : 'monitored nodes'}
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
            />
          </div>

          <Link
            to="/collector/route"
            className="w-full py-2.5 rounded-xl text-xs font-bold text-center text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition"
          >
            Launch Heuristic Route Optimizer
          </Link>
        </div>
      </div>
    </div>
  );
}

