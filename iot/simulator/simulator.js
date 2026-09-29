#!/usr/bin/env node
/**
 * SWMS Enterprise IoT Telemetry Simulator (Node.js CLI)
 * Implements Section 12 Specification:
 * - Sends data through the EXACT SAME API used by real ESP32 devices (POST /api/iot/bin-reading)
 * - Supports Multi-Scenario Testing: Normal Day, Festival Waste Spike, Gas Alert, Battery Failure, Sensor Fault, Heavy Rain
 * - Supports Continuous Automated Simulation
 * - Clearly tags all data as SIMULATED DATA (is_simulated: true)
 */

const http = require('http');

const SERVER_HOST = process.env.SWMS_HOST || 'localhost';
const SERVER_PORT = process.env.SWMS_PORT || 5000;
const IOT_API_KEY = process.env.IOT_API_KEY || 'swms_iot_device_secure_token_998877';

const SCENARIOS = {
  normal: { fill: 45, gas: 18, battery: 94, sensor: 'OK', label: 'Normal Day' },
  festival: { fill: 96, gas: 42, battery: 88, sensor: 'OK', label: 'Festival Waste Spike (Urgent Dispatch)' },
  gas_alert: { fill: 82, gas: 92, battery: 85, sensor: 'OK', label: 'Toxic Gas Decomposition Hazard' },
  battery_failure: { fill: 40, gas: 15, battery: 8, sensor: 'OK', label: 'Low Battery Maintenance Alert' },
  sensor_fault: { fill: 0, gas: 0, battery: 75, sensor: 'ERROR', label: 'Transducer Hardware Failure' },
  heavy_rain: { fill: 88, gas: 38, battery: 78, sensor: 'OK', label: 'Monsoon Heavy Rain Saturation' },
};

function sendReading(binCode, fillPercentage, gasPpm = 22, batteryLevel = 92, sensorStatus = 'OK') {
  const distanceCm = Math.max(5, Math.round(100 - fillPercentage));
  const payload = JSON.stringify({
    bin_code: binCode,
    fill_percentage: parseFloat(fillPercentage),
    distance_cm: distanceCm,
    gas_level_ppm: parseFloat(gasPpm),
    battery_level: parseInt(batteryLevel),
    temperature: 28.5,
    sensor_status: sensorStatus,
    is_simulated: true,
  });

  const options = {
    hostname: SERVER_HOST,
    port: SERVER_PORT,
    path: '/api/iot/bin-reading',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': IOT_API_KEY,
      'Content-Length': Buffer.byteLength(payload),
    },
  };

  console.log(`\n📡 [SIMULATED DATA] Transmitting to http://${SERVER_HOST}:${SERVER_PORT}/api/iot/bin-reading...`);
  console.log(`   Node: ${binCode} | Fill: ${fillPercentage}% | Gas: ${gasPpm} ppm | Battery: ${batteryLevel}% | Status: ${sensorStatus}`);

  const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => (body += chunk));
    res.on('end', () => {
      try {
        const json = JSON.parse(body);
        if (json.alert_generated) {
          console.log(`   🚨 [AUTO-DISPATCH ENGINE]: Collection Request #${json.collection_request_id} created with Priority: ${json.priority}!`);
        } else {
          console.log(`   ✓ Ingested successfully (Reading #${json.reading_id}). Status: ${json.status}`);
        }
      } catch {
        console.log(`   Response: ${body}`);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`❌ Connection failed: ${e.message}`);
    console.log(`   Ensure backend server is running on http://${SERVER_HOST}:${SERVER_PORT}`);
  });

  req.write(payload);
  req.end();
}

// Parse Command-Line Arguments
const args = process.argv.slice(2);

const scenarioArg = args.find((a) => a.startsWith('--scenario='));
const isContinuous = args.includes('--continuous');

if (scenarioArg) {
  const scenarioKey = scenarioArg.split('=')[1].toLowerCase();
  const scenario = SCENARIOS[scenarioKey] || SCENARIOS.festival;
  console.log(`=======================================================`);
  console.log(`  SWMS SCENARIO SIMULATION: ${scenario.label}`);
  console.log(`=======================================================`);
  sendReading('BIN-001', scenario.fill, scenario.gas, scenario.battery, scenario.sensor);
} else if (isContinuous) {
  console.log(`=======================================================`);
  console.log(`  SWMS CONTINUOUS MUNICIPAL CITY STREAM (Press Ctrl+C to stop)`);
  console.log(`=======================================================`);
  const binCodes = ['BIN-001', 'BIN-002', 'BIN-003', 'BIN-004', 'BIN-005'];
  let idx = 0;
  setInterval(() => {
    const code = binCodes[idx % binCodes.length];
    const fill = Math.round(20 + Math.random() * 75);
    const gas = Math.round(10 + Math.random() * 30);
    const batt = Math.round(80 + Math.random() * 18);
    sendReading(code, fill, gas, batt, 'OK');
    idx++;
  }, 3000);
} else if (args.length >= 2) {
  const binCode = args[0];
  const fill = parseFloat(args[1]);
  const gas = args[2] ? parseFloat(args[2]) : 20;
  const batt = args[3] ? parseInt(args[3]) : 90;
  sendReading(binCode, fill, gas, batt);
} else {
  console.log('=======================================================');
  console.log('  SWMS IoT TELEMETRY CLI SIMULATOR (ESP32 COMPLIANT)');
  console.log('=======================================================');
  console.log('Usage:');
  console.log('  node iot/simulator/simulator.js <BIN_CODE> <FILL_PERCENTAGE> [GAS_PPM] [BATTERY_%]');
  console.log('  node iot/simulator/simulator.js --scenario=festival');
  console.log('  node iot/simulator/simulator.js --scenario=gas_alert');
  console.log('  node iot/simulator/simulator.js --scenario=battery_failure');
  console.log('  node iot/simulator/simulator.js --continuous');
  console.log('-------------------------------------------------------');
  console.log('Sending default trigger reading: BIN-001 @ 95% (Critical Overflow Auto-Dispatch)');
  sendReading('BIN-001', 95.0, 48.0, 91, 'OK');
}
