import React, { useState, useEffect } from 'react';
import { binsAPI, iotAPI } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import {
  Cpu,
  Radio,
  Send,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Layers,
} from 'lucide-react';

export default function IoTSimulatorView() {
  const [bins, setBins] = useState([]);
  const [selectedBinCode, setSelectedBinCode] = useState('BIN-001');
  const [fillPercentage, setFillPercentage] = useState(92);
  const [sensorStatus, setSensorStatus] = useState('OK');
  const [apiKey, setApiKey] = useState('swms_iot_device_secure_token_998877');

  const [loading, setLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState(null);
  const [error, setError] = useState('');

  const fetchBins = async () => {
    try {
      const res = await binsAPI.getAll();
      if (res.data.success) {
        setBins(res.data.bins || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBins();
  }, []);

  const handleSendTelemetry = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setLastResponse(null);

    try {
      const payload = {
        bin_code: selectedBinCode,
        fill_percentage: parseFloat(fillPercentage),
        sensor_status: sensorStatus,
        is_simulated: true,
      };

      const res = await iotAPI.sendReading(payload, apiKey);
      if (res.data.success) {
        setLastResponse(res.data);
        fetchBins();
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Failed to transmit telemetry to /api/iot/bin-reading endpoint.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-200 text-xs font-semibold mb-2">
          <Cpu className="w-3.5 h-3.5" />
          <span>SIMULATED DATA Telemetry Console</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">IoT Sensor Simulator</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Simulate ESP32 ultrasonic distance readings, test automatic threshold alerts, and trigger immediate collection requests.
        </p>
      </div>

      {/* Prominent Simulated Data Warning Badge (Section 17) */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Radio className="w-5 h-5 text-amber-600 animate-pulse shrink-0" />
          <div>
            <span className="font-bold uppercase tracking-wider block">Notice: Simulation Mode Active</span>
            <span className="text-[11px] text-amber-800">
              Readings generated via this console are explicitly labeled as <strong className="font-mono">SIMULATED DATA</strong> in logs and database entries.
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Controls Column */}
        <form onSubmit={handleSendTelemetry} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-slate-900">Telemetry Payload Settings</h2>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target Smart Bin</label>
            <select
              value={selectedBinCode}
              onChange={(e) => setSelectedBinCode(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold bg-white"
            >
              {bins.map((b) => (
                <option key={b.id} value={b.bin_code}>
                  {b.bin_code} — {b.location_name} ({b.waste_type}, Current: {b.current_fill_percentage}%)
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-1">
              <span>Simulated Fill Percentage</span>
              <span className={`text-base font-bold ${fillPercentage >= 91 ? 'text-rose-600' : fillPercentage >= 76 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {fillPercentage}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={fillPercentage}
              onChange={(e) => setFillPercentage(e.target.value)}
              className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>0% (Empty)</span>
              <span>50% (Normal)</span>
              <span>75% (Moderate)</span>
              <span>90% (Threshold)</span>
              <span>100% (Full)</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">AI Intake Chute</label>
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 font-bold text-xs">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>All-Waste Auto Classifier</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sensor Health</label>
              <select
                value={sensorStatus}
                onChange={(e) => setSensorStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              >
                <option value="OK">OK (Operational)</option>
                <option value="ERROR">ERROR (Sensor Fault)</option>
                <option value="TIMEOUT">TIMEOUT (No Echo)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Device API Key (x-api-key)</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 active:scale-98 transition shadow-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Transmitting HTTP Telemetry...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Send Reading to /api/iot/bin-reading</span>
              </>
            )}
          </button>
        </form>

        {/* Live Reaction & Response Column */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100 mb-4">
              Telemetry Server Response
            </h2>

            {lastResponse ? (
              <div className="space-y-4 text-xs">
                {/* Status Result Card */}
                <div className={`p-4 rounded-2xl border ${lastResponse.alert_generated ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-900">{lastResponse.bin_code}</span>
                    <StatusBadge status={lastResponse.status} />
                  </div>
                  <div className="space-y-1 text-slate-600">
                    <p>New Fill Level: <strong className="text-slate-900">{lastResponse.fill_percentage}%</strong></p>
                    <p>Mode: <span className="font-bold text-amber-700">{lastResponse.simulation_label}</span></p>
                    <p>Reading Log ID: <span className="font-mono">#{lastResponse.reading_id}</span></p>
                  </div>
                </div>

                {/* Auto Alert Box */}
                {lastResponse.alert_generated ? (
                  <div className="p-4 rounded-2xl bg-rose-500 text-white space-y-2 shadow-sm animate-in fade-in">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <span>Automatic Dispatch Triggered!</span>
                    </div>
                    <p className="text-rose-100 text-[11px] leading-relaxed">
                      Fill exceeded threshold! Collection Request <strong className="text-white">#{lastResponse.collection_request_id}</strong> was automatically generated with <strong className="text-white">Priority: {lastResponse.priority}</strong> without creating duplicates.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
                    ✓ Fill level is within safe capacity. No automated collection alert required.
                  </div>
                )}
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400 p-6">
                <Cpu className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-xs font-semibold text-slate-600">Awaiting Telemetry Packet</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                  Adjust fill level and click "Send Reading" to observe backend threshold evaluation in real-time.
                </p>
              </div>
            )}
          </div>

          {/* Quick Viva Test Presets */}
          <div className="pt-3 border-t border-slate-100">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Viva Demonstration Quick Presets:
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedBinCode('BIN-001');
                  setFillPercentage(92);
                }}
                className="flex-1 py-1.5 px-2 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-[11px] font-bold"
              >
                BIN-001 @ 92% (Critical)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedBinCode('BIN-002');
                  setFillPercentage(40);
                }}
                className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-[11px] font-bold"
              >
                BIN-002 @ 40% (Normal)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

