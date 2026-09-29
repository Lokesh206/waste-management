import React, { useState, useEffect, useRef } from 'react';
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
  Flame,
  BatteryCharging,
  Play,
  Square,
  Zap,
  Activity,
  AlertTriangle,
  CloudRain,
  PartyPopper,
  ShieldAlert,
} from 'lucide-react';

const SCENARIOS = [
  {
    id: 'NORMAL_DAY',
    name: 'Normal Day',
    icon: Activity,
    color: 'emerald',
    desc: 'Regular municipal waste generation (35% - 60% fill, healthy gas < 25 ppm, battery > 90%)',
    params: { fill: 45, gas: 18, battery: 94, sensor: 'OK' },
  },
  {
    id: 'FESTIVAL_SPIKE',
    name: 'Festival Waste Spike',
    icon: PartyPopper,
    color: 'rose',
    desc: 'Sudden public gathering surge triggering automated emergency collection dispatch (96% fill)',
    params: { fill: 96, gas: 42, battery: 88, sensor: 'OK' },
  },
  {
    id: 'GAS_ALERT',
    name: 'Toxic Gas / Decomposition Hazard',
    icon: Flame,
    color: 'amber',
    desc: 'Anaerobic organic breakdown exceeding safety thresholds (92 ppm methane/ammonia alert)',
    params: { fill: 82, gas: 92, battery: 85, sensor: 'OK' },
  },
  {
    id: 'BATTERY_FAILURE',
    name: 'Low Battery Alert',
    icon: BatteryCharging,
    color: 'purple',
    desc: 'IoT telemetry node solar/battery failure below operational threshold (9% battery)',
    params: { fill: 40, gas: 15, battery: 9, sensor: 'OK' },
  },
  {
    id: 'SENSOR_FAULT',
    name: 'Hardware Sensor Fault',
    icon: AlertTriangle,
    color: 'red',
    desc: 'Ultrasonic transducer hardware fault or obscured optics (sensor_status: ERROR)',
    params: { fill: 0, gas: 0, battery: 75, sensor: 'ERROR' },
  },
  {
    id: 'HEAVY_RAIN',
    name: 'Heavy Rain / Wet Surge',
    icon: CloudRain,
    color: 'blue',
    desc: 'Monsoon season wet organic saturation with rising moisture levels',
    params: { fill: 88, gas: 38, battery: 78, sensor: 'OK' },
  },
];

export default function IoTSimulatorView() {
  const [bins, setBins] = useState([]);
  const [selectedBinCode, setSelectedBinCode] = useState('BIN-001');
  const [fillPercentage, setFillPercentage] = useState(92);
  const [gasLevelPpm, setGasLevelPpm] = useState(25);
  const [batteryLevel, setBatteryLevel] = useState(90);
  const [sensorStatus, setSensorStatus] = useState('OK');
  const [apiKey, setApiKey] = useState('swms_iot_device_secure_token_998877');

  const [loading, setLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState(null);
  const [error, setError] = useState('');

  // Continuous City-Scale Stream Simulator State
  const [isStreaming, setIsStreaming] = useState(false);
  const [packetStreamLog, setPacketStreamLog] = useState([]);
  const streamIntervalRef = useRef(null);
  const binIndexRef = useRef(0);

  const fetchBins = async () => {
    try {
      const res = await binsAPI.getAll();
      if (res.data?.success) {
        setBins(res.data.bins || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBins();
    return () => {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
      }
    };
  }, []);

  // Send Single Telemetry Reading through production IoT endpoint
  const sendReadingThroughApi = async (binCode, fill, gas, battery, status) => {
    const payload = {
      bin_code: binCode,
      fill_percentage: parseFloat(fill),
      distance_cm: Math.max(5, Math.round(100 - fill)),
      gas_level_ppm: parseFloat(gas),
      battery_level: parseInt(battery),
      sensor_status: status,
      is_simulated: true,
    };

    const res = await iotAPI.sendReading(payload, apiKey);
    return res.data;
  };

  const handleSendTelemetry = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');
    setLastResponse(null);

    try {
      const data = await sendReadingThroughApi(
        selectedBinCode,
        fillPercentage,
        gasLevelPpm,
        batteryLevel,
        sensorStatus
      );

      if (data.success) {
        setLastResponse(data);
        fetchBins();

        // Append to packet log
        setPacketStreamLog((prev) => [
          {
            id: Date.now(),
            binCode: selectedBinCode,
            fill: fillPercentage,
            gas: gasLevelPpm,
            battery: batteryLevel,
            status: sensorStatus,
            alertGenerated: data.alert_generated,
            time: new Date().toLocaleTimeString(),
          },
          ...prev.slice(0, 19),
        ]);
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

  // Apply Pre-configured Real-World Scenario
  const handleApplyScenario = (scenario) => {
    setFillPercentage(scenario.params.fill);
    setGasLevelPpm(scenario.params.gas);
    setBatteryLevel(scenario.params.battery);
    setSensorStatus(scenario.params.sensor);
  };

  // Toggle Continuous Automated Multi-Bin City Stream
  const handleToggleStreaming = () => {
    if (isStreaming) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
      setIsStreaming(false);
    } else {
      setIsStreaming(true);
      streamIntervalRef.current = setInterval(async () => {
        if (bins.length === 0) return;

        const currentBin = bins[binIndexRef.current % bins.length];
        binIndexRef.current += 1;

        // Generate dynamic fluctuation
        const randFill = Math.min(98, Math.max(10, Math.round(currentBin.current_fill_percentage + (Math.random() * 8 - 2))));
        const randGas = Math.round(15 + Math.random() * 25);
        const randBatt = Math.round(85 + Math.random() * 12);

        try {
          const result = await sendReadingThroughApi(
            currentBin.bin_code,
            randFill,
            randGas,
            randBatt,
            'OK'
          );

          setPacketStreamLog((prev) => [
            {
              id: Date.now(),
              binCode: currentBin.bin_code,
              fill: randFill,
              gas: randGas,
              battery: randBatt,
              status: 'OK',
              alertGenerated: result.alert_generated,
              time: new Date().toLocaleTimeString(),
            },
            ...prev.slice(0, 19),
          ]);
        } catch (e) {
          console.warn('Continuous simulation packet send dropped');
        }
      }, 3000);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-200 text-xs font-semibold mb-2">
            <Cpu className="w-3.5 h-3.5" />
            <span>Virtual IoT Municipal Simulator</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">IoT Telemetry & Multi-Scenario Simulator</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Transmits real ESP32-compliant sensor packets directly to the production <code className="font-mono text-purple-700 bg-purple-50 px-1 py-0.5 rounded">/api/iot/bin-reading</code> endpoint.
          </p>
        </div>

        <button
          onClick={handleToggleStreaming}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition flex items-center gap-2 ${
            isStreaming
              ? 'bg-rose-600 hover:bg-rose-700 text-white'
              : 'bg-slate-900 hover:bg-slate-800 text-white'
          }`}
        >
          {isStreaming ? (
            <>
              <Square className="w-3.5 h-3.5" />
              <span>Stop Continuous City Stream</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              <span>Start Continuous City Stream (Every 3s)</span>
            </>
          )}
        </button>
      </div>

      {/* Prominent Simulated Data Warning Banner */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Radio className="w-5 h-5 text-amber-600 animate-pulse shrink-0" />
          <div>
            <span className="font-bold uppercase tracking-wider block">Mode: Hardware Simulation Active</span>
            <span className="text-[11px] text-amber-800">
              Readings generated via this console are tagged as <strong className="font-mono">is_simulated: true</strong>. Both physical ESP32 and virtual nodes share the exact same ingestion and AI dispatch pipeline.
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

      {/* Realistic Emergency Scenarios Grid */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-900">Pre-configured Operational Scenarios</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SCENARIOS.map((sc) => {
            const Icon = sc.icon;
            return (
              <button
                key={sc.id}
                onClick={() => handleApplyScenario(sc)}
                className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-purple-300 hover:shadow-md text-left transition space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-purple-50 text-purple-700 group-hover:bg-purple-600 group-hover:text-white transition">
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="font-bold text-xs text-slate-900">{sc.name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-purple-700 font-bold">Apply</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">{sc.desc}</p>
                <div className="flex gap-2 text-[10px] text-slate-400 font-mono pt-1">
                  <span>Fill: {sc.params.fill}%</span>
                  <span>Gas: {sc.params.gas}ppm</span>
                  <span>Batt: {sc.params.battery}%</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Telemetry Control & Response */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Controls Column */}
        <form onSubmit={handleSendTelemetry} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-slate-900">Manual Telemetry Payload Settings</h2>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target Smart Bin</label>
            <select
              value={selectedBinCode}
              onChange={(e) => setSelectedBinCode(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold bg-white"
            >
              {bins.map((b) => (
                <option key={b.id} value={b.bin_code}>
                  {b.bin_code} — {b.location_name} (Current: {b.current_fill_percentage}%)
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-1">
              <span>Ultrasonic Fill Level</span>
              <span className={`text-base font-bold ${fillPercentage >= 90 ? 'text-rose-600' : fillPercentage >= 75 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {fillPercentage}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={fillPercentage}
              onChange={(e) => setFillPercentage(e.target.value)}
              className="w-full accent-purple-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
              <span>0% (Empty)</span>
              <span>75% (Warning)</span>
              <span className="text-rose-600 font-bold">90% (Auto-Dispatch)</span>
              <span>100%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Gas / Air Quality (PPM)</label>
              <input
                type="number"
                min="0"
                max="300"
                value={gasLevelPpm}
                onChange={(e) => setGasLevelPpm(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">&gt;80 ppm = Toxic Anomaly</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Battery Level (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={batteryLevel}
                onChange={(e) => setBatteryLevel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">&lt;20% = Maintenance Ticket</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Sensor Health Status</label>
            <select
              value={sensorStatus}
              onChange={(e) => setSensorStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-medium"
            >
              <option value="OK">OK (Transducer Healthy)</option>
              <option value="ERROR">ERROR (Hardware Failure / Blocked)</option>
              <option value="TIMEOUT">TIMEOUT (No Echo Returned)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Device Token (x-api-key)</label>
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
                <span>Transmitting to Ingestion Engine...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Transmit Telemetry Packet</span>
              </>
            )}
          </button>
        </form>

        {/* Live Reaction & Response Column */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-slate-900">Ingestion Server Reaction</h2>
              {isStreaming && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 animate-pulse">
                  ● City Stream Active
                </span>
              )}
            </div>

            {lastResponse ? (
              <div className="space-y-4 text-xs">
                {/* Status Result Card */}
                <div className={`p-4 rounded-2xl border ${lastResponse.alert_generated ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-900">{lastResponse.bin_code}</span>
                    <StatusBadge status={lastResponse.status} />
                  </div>
                  <div className="space-y-1 text-slate-600">
                    <p>Processed Fill Level: <strong className="text-slate-900">{lastResponse.fill_percentage}%</strong></p>
                    <p>Hardware Mode: <span className="font-bold text-amber-700">{lastResponse.simulation_label}</span></p>
                    <p>Ingestion Log ID: <span className="font-mono">#{lastResponse.reading_id}</span></p>
                  </div>
                </div>

                {/* Auto Alert Box */}
                {lastResponse.alert_generated ? (
                  <div className="p-4 rounded-2xl bg-rose-600 text-white space-y-2 shadow-sm animate-in fade-in">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <span>Automated Dispatch Engine Activated!</span>
                    </div>
                    <p className="text-rose-100 text-[11px] leading-relaxed">
                      Fill exceeded 90% threshold! Collection Request <strong className="text-white">#{lastResponse.collection_request_id}</strong> was automatically generated with <strong className="text-white">Priority: {lastResponse.priority}</strong> and dispatched to active collector fleet.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
                    ✓ Sensor telemetry ingested into database. Fill is within safe municipal limits.
                  </div>
                )}
              </div>
            ) : (
              <div className="h-44 flex flex-col items-center justify-center text-center text-slate-400 p-6">
                <Cpu className="w-10 h-10 text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-600">Awaiting Telemetry Packet</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                  Apply a scenario or adjust the sliders to trigger automated collection logic.
                </p>
              </div>
            )}
          </div>

          {/* Real-time Telemetry Packet Stream Log */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
              Recent Ingested Packets ({packetStreamLog.length}):
            </span>
            {packetStreamLog.length === 0 ? (
              <p className="text-[11px] text-slate-400">No packets sent in this session yet.</p>
            ) : (
              <div className="max-h-36 overflow-y-auto space-y-1 text-[10px] font-mono no-scrollbar">
                {packetStreamLog.map((pkt) => (
                  <div
                    key={pkt.id}
                    className={`p-2 rounded-lg border flex items-center justify-between ${
                      pkt.alertGenerated
                        ? 'bg-rose-50 border-rose-200 text-rose-900 font-bold'
                        : 'bg-slate-50 border-slate-100 text-slate-700'
                    }`}
                  >
                    <span>{pkt.time} • {pkt.binCode}</span>
                    <span>Fill: {pkt.fill}%</span>
                    <span>Gas: {pkt.gas}ppm</span>
                    <span>Batt: {pkt.battery}%</span>
                    <span>{pkt.alertGenerated ? '🚨 DISPATCH' : '✓ OK'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
