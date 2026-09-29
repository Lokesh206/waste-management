import React, { useState, useEffect } from 'react';
import { binsAPI } from '../../services/api';
import LeafletMap from '../../components/LeafletMap';
import StatusBadge from '../../components/StatusBadge';
import { MapPin, Search, Filter, RefreshCw } from 'lucide-react';

export default function NearbyBins() {
  const [bins, setBins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [wasteFilter, setWasteFilter] = useState('');

  const fetchBins = async () => {
    setLoading(true);
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
  }, []);

  const filteredBins = bins.filter((b) => {
    const matchesSearch =
      b.bin_code.toLowerCase().includes(search.toLowerCase()) ||
      b.location_name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = wasteFilter ? b.waste_type === wasteFilter : true;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nearby Smart Bins</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Locate waste bins with real-time fill capacity and segregation streams.
          </p>
        </div>
        <button
          onClick={fetchBins}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs flex items-center gap-1.5 self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Map</span>
        </button>
      </div>

      {/* Interactive Map View */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
          <span className="font-bold text-slate-800">Real-Time City Map</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[11px] text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Normal (0-50%)
            </span>
            <span className="flex items-center gap-1 text-[11px] text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Moderate (51-75%)
            </span>
            <span className="flex items-center gap-1 text-[11px] text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Almost Full (76-90%)
            </span>
            <span className="flex items-center gap-1 text-[11px] text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Critical (91-100%)
            </span>
          </div>
        </div>
        <LeafletMap bins={filteredBins} height="400px" />
      </div>

      {/* Filter and Bin List */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by bin code or location name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <select
            value={wasteFilter}
            onChange={(e) => setWasteFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-700"
          >
            <option value="">All Waste Streams</option>
            <option value="Plastic">Plastic</option>
            <option value="Organic">Organic</option>
            <option value="Paper">Paper</option>
            <option value="Glass">Glass</option>
            <option value="Metal">Metal</option>
            <option value="E-Waste">E-Waste</option>
            <option value="Hazardous">Hazardous</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Bin Code</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Waste Type</th>
                <th className="py-3 px-4">Fill Level</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Coordinates</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBins.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3 px-4 font-bold text-slate-900">{b.bin_code}</td>
                  <td className="py-3 px-4 text-slate-700">{b.location_name}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                      {b.waste_type}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full ${
                            b.current_fill_percentage >= 90
                              ? 'bg-rose-500'
                              : b.current_fill_percentage >= 75
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${b.current_fill_percentage}%` }}
                        />
                      </div>
                      <span className="font-semibold text-slate-700">{b.current_fill_percentage}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                    {b.latitude.toFixed(4)}, {b.longitude.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

