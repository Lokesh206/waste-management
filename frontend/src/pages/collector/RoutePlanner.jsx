import React, { useState, useEffect } from 'react';
import { collectionsAPI } from '../../services/api';
import LeafletMap from '../../components/LeafletMap';
import StatusBadge from '../../components/StatusBadge';
import {
  Navigation,
  MapPin,
  Clock,
  Compass,
  Info,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';

export default function RoutePlanner() {
  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRoute = async () => {
    setLoading(true);
    try {
      const res = await collectionsAPI.getPlannedRoute();
      if (res.data.success) {
        setRouteData(res.data.routePlan);
      }
    } catch (err) {
      console.error('Failed to plan route', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoute();
  }, []);

  const orderedStops = routeData?.orderedStops || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold mb-1">
            <Compass className="w-3.5 h-3.5" />
            <span>Priority Nearest-Neighbor Heuristic</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Dynamic Collection Route</h1>
          <p className="text-xs text-slate-500">
            Sequenced pickup stops computed to minimize dead mileage while visiting Critical priority bins first.
          </p>
        </div>

        <button
          onClick={fetchRoute}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs flex items-center gap-1.5 self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Recalculate Route</span>
        </button>
      </div>

      {/* Route KPI Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase">Collection Stops</p>
            <p className="text-xl font-bold text-slate-900">{orderedStops.length} Bins</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase">Total Distance</p>
            <p className="text-xl font-bold text-slate-900">{routeData?.totalDistanceKm || 0} km</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase">Estimated Duration</p>
            <p className="text-xl font-bold text-slate-900">{routeData?.estimatedDurationMinutes || 0} mins</p>
          </div>
        </div>
      </div>

      {/* Map with Polyline and Sequence */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900">Map Route Polyline</h2>
        <LeafletMap
          bins={orderedStops.map((s) => ({
            id: s.taskId,
            bin_code: s.binCode,
            location_name: s.locationName,
            waste_type: s.wasteType,
            current_fill_percentage: s.fillPercentage,
            status: s.fillPercentage >= 90 ? 'Critical' : 'Almost Full',
            latitude: s.latitude,
            longitude: s.longitude,
          }))}
          routeStops={orderedStops}
          height="420px"
        />
      </div>

      {/* Sequenced Turn-by-turn stop table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900">Sequenced Stop Order</h2>

        {orderedStops.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No active collection tasks scheduled right now.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {orderedStops.map((stop) => (
              <div key={stop.stopNumber} className="py-3.5 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3.5">
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                    #{stop.stopNumber}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{stop.binCode}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                        {stop.wasteType}
                      </span>
                      <StatusBadge status={stop.priority} />
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{stop.locationName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px]">Leg Distance</span>
                    <span className="font-semibold text-slate-700">+{stop.distanceFromPreviousKm} km</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px]">Accumulated</span>
                    <span className="font-bold text-emerald-700">{stop.accumulatedDistanceKm} km</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Algorithm Distinction Note (Section 22) */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed">
            <span className="font-bold text-slate-800">Algorithm Transparency Note: </span>
            <span>
              This route is calculated using a priority-weighted Greedy Nearest-Neighbor heuristic (O(N²) complexity).
              Critical bins are visited first, followed by nearest geographic proximity based on Haversine spherical distance.
              It is designed for rapid responsive municipal dispatch rather than mathematically optimal TSP solutions.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

