#!/usr/bin/env node
/**
 * SWMS Standalone IoT Telemetry Simulator
 * Allows manual or automated simulation of bin sensor readings.
 * Clearly marks all sent readings as SIMULATED DATA.
 */

const http = require('http');

const SERVER_HOST = process.env.SWMS_HOST || 'localhost';
const SERVER_PORT = process.env.SWMS_PORT || 5000;
const IOT_API_KEY = process.env.IOT_API_KEY || 'swms_iot_device_secure_token_998877';

function sendReading(binCode, fillPercentage, distanceCm) {
  const payload = JSON.stringify({
    bin_code: binCode,
    fill_percentage: fillPercentage,
    distance_cm: distanceCm,
    sensor_status: 'OK',
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

  console.log(`\n📡 [SIMULATED DATA] Sending sensor telemetry for ${binCode}...`);
  console.log(`   Fill: ${fillPercentage}% | Distance: ${distanceCm}cm | Multi-Stream Segregation: Active`);

  const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => (body += chunk));
    res.on('end', () => {
      console.log(`   Response Status: ${res.statusCode}`);
      try {
        const json = JSON.parse(body);
        console.log(`   Result:`, json);
      } catch {
        console.log(`   Body:`, body);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`❌ Connection error: ${e.message}`);
    console.log(`   Ensure backend server is running on http://${SERVER_HOST}:${SERVER_PORT}`);
  });

  req.write(payload);
  req.end();
}

// Check arguments: node simulator.js <bin_code> <fill_percentage>
const args = process.argv.slice(2);
if (args.length >= 2) {
  const binCode = args[0];
  const fill = parseFloat(args[1]);
  const dist = Math.round(100 - fill);
  sendReading(binCode, fill, dist);
} else {
  console.log('==================================================');
  console.log('  SWMS IoT SENSOR SIMULATOR (SIMULATED DATA)');
  console.log('==================================================');
  console.log('Usage:');
  console.log('  node iot/simulator/simulator.js <BIN_CODE> <FILL_PERCENTAGE>');
  console.log('Example:');
  console.log('  node iot/simulator/simulator.js BIN-001 92');
  console.log('--------------------------------------------------');
  console.log('Sending default test reading: BIN-001 -> 92% (Critical)');
  sendReading('BIN-001', 92.0, 8.0, 26.2);
}

