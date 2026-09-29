const { PrismaClient } = require('@prisma/client');
const {
  calculateFillPercentage,
  determineStatus,
  processThresholdAlert,
} = require('../services/binService');
const { emitEvent } = require('../websocket/socketManager');
const logger = require('../utils/logger');

const prisma = new PrismaClient();
const EXPECTED_API_KEY = process.env.IOT_API_KEY || 'swms_iot_device_secure_token_998877';

/**
 * Handle incoming IoT Ultrasonic Sensor Telemetry
 * POST /api/iot/bin-reading
 */
async function recordReading(req, res) {
  try {
    // 1. Authenticate device API key
    const clientApiKey = req.headers['x-api-key'] || req.headers['authorization'];
    if (!clientApiKey || clientApiKey !== EXPECTED_API_KEY) {
      logger.warn('Unauthorized IoT access attempt', { ip: req.ip });
      return res.status(401).json({
        success: false,
        message: 'Unauthorized IoT Device. Invalid or missing x-api-key header.',
      });
    }

    const {
      bin_code,
      fill_percentage,
      distance_cm,
      temperature,
      gas_level_ppm,
      battery_level,
      sensor_status = 'OK',
      is_simulated = false,
    } = req.body;

    // 2. Validate input parameters
    if (!bin_code) {
      return res.status(400).json({
        success: false,
        message: 'bin_code is required in telemetry payload.',
      });
    }

    const bin = await prisma.bin.findUnique({
      where: { bin_code: bin_code.trim().toUpperCase() },
    });

    if (!bin) {
      return res.status(404).json({
        success: false,
        message: `Bin code '${bin_code}' not found in SWMS registry.`,
      });
    }

    // 3. Compute or validate fill percentage
    let calculatedFill;
    if (distance_cm != null && !isNaN(distance_cm)) {
      calculatedFill = calculateFillPercentage(bin.capacity, parseFloat(distance_cm));
    } else if (fill_percentage != null && !isNaN(fill_percentage)) {
      const parsedFill = parseFloat(fill_percentage);
      if (parsedFill < 0 || parsedFill > 100) {
        return res.status(400).json({
          success: false,
          message: 'fill_percentage must be between 0 and 100.',
        });
      }
      calculatedFill = Math.round(parsedFill * 10) / 10;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Must provide either distance_cm or fill_percentage.',
      });
    }

    const distCm = distance_cm != null ? parseFloat(distance_cm) : null;
    const temp = temperature != null ? parseFloat(temperature) : null;
    const gasPpm = gas_level_ppm != null ? parseFloat(gas_level_ppm) : 22.0;
    const batt = battery_level != null ? parseFloat(battery_level) : 94.0;
    const newStatus = determineStatus(calculatedFill, sensor_status);

    // 4. Anomaly Detection Engine (Compare with previous telemetry reading)
    const lastReading = await prisma.binReading.findFirst({
      where: { bin_id: bin.id },
      orderBy: { recorded_at: 'desc' },
    });

    let anomalyDetected = null;
    if (lastReading) {
      const timeDiffMinutes = (Date.now() - new Date(lastReading.recorded_at).getTime()) / (60 * 1000);
      const fillJump = calculatedFill - lastReading.fill_percentage;

      // Detect sudden abnormal fill jump (> 30% in < 20 mins)
      if (timeDiffMinutes <= 20 && fillJump >= 30) {
        anomalyDetected = await prisma.anomaly.create({
          data: {
            bin_id: bin.id,
            anomaly_type: 'Fill Surge Anomaly',
            severity: 'High',
            description: `Sudden waste jump of +${fillJump.toFixed(1)}% in ${Math.round(timeDiffMinutes)} minutes. Possible unauthorized dumping or sensor obstruction.`,
          },
        });
        emitEvent('anomaly:detected', { bin_code: bin.bin_code, anomaly: anomalyDetected });
      }
    }

    // Detect Gas Hazard (Methane/Ammonia > 80 ppm)
    if (gasPpm >= 80) {
      const gasAnomaly = await prisma.anomaly.create({
        data: {
          bin_id: bin.id,
          anomaly_type: 'Hazardous Gas Concentration',
          severity: 'Critical',
          description: `Odor/gas sensor detected dangerous levels (${gasPpm} ppm). Risk of biochemical fermentation or fire hazard.`,
        },
      });
      emitEvent('iot:alert', { bin_code: bin.bin_code, alert: 'Gas Hazard', ppm: gasPpm });
    }

    // Detect Battery Degradation (< 20%)
    if (batt <= 20) {
      await prisma.maintenanceTicket.create({
        data: {
          bin_id: bin.id,
          issue_type: 'Low Solar Battery',
          priority: 'High',
          status: 'Pending',
          description: `Battery charge dropped to ${batt}%. Microcontroller telemetry shutdown imminent.`,
        },
      });
      emitEvent('iot:alert', { bin_code: bin.bin_code, alert: 'Battery Low', battery_level: batt });
    }

    // 5. Record reading in historical log
    const reading = await prisma.binReading.create({
      data: {
        bin_id: bin.id,
        fill_percentage: calculatedFill,
        distance_cm: distCm,
        temperature: temp,
        gas_level_ppm: gasPpm,
        battery_level: batt,
        sensor_status,
      },
    });

    // 6. Update bin current fill, status, battery, and gas levels
    const updatedBin = await prisma.bin.update({
      where: { id: bin.id },
      data: {
        current_fill_percentage: calculatedFill,
        status: newStatus,
        battery_level: batt,
        gas_level_ppm: gasPpm,
      },
    });

    // 7. Trigger threshold alert & automated collection request if critical
    const alertRequest = await processThresholdAlert(updatedBin, calculatedFill);

    // 8. Broadcast real-time updates via Socket.IO
    emitEvent('bin:update', {
      id: updatedBin.id,
      bin_code: updatedBin.bin_code,
      location_name: updatedBin.location_name,
      latitude: updatedBin.latitude,
      longitude: updatedBin.longitude,
      current_fill_percentage: calculatedFill,
      status: newStatus,
      battery_level: batt,
      gas_level_ppm: gasPpm,
      is_simulated: !!is_simulated,
    });

    if (calculatedFill >= 90) {
      emitEvent('bin:critical', {
        bin_code: updatedBin.bin_code,
        location_name: updatedBin.location_name,
        fill_percentage: calculatedFill,
      });
    }

    if (alertRequest) {
      emitEvent('collection:created', alertRequest);
    }

    logger.iot(bin.bin_code, calculatedFill, sensor_status);

    return res.status(200).json({
      success: true,
      message: 'Bin telemetry recorded successfully.',
      reading_id: reading.id,
      bin_code: bin.bin_code,
      fill_percentage: calculatedFill,
      status: newStatus,
      is_simulated: !!is_simulated,
      simulation_label: is_simulated ? 'SIMULATED DATA' : 'HARDWARE SENSOR DATA',
      alert_generated: !!alertRequest,
      collection_request_id: alertRequest ? alertRequest.id : null,
      priority: alertRequest ? alertRequest.priority : null,
      anomaly_detected: !!anomalyDetected,
    });
  } catch (error) {
    logger.error('IoT processing error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to process IoT sensor reading.',
    });
  }
}

module.exports = {
  recordReading,
};
