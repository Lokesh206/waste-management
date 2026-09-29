const { PrismaClient } = require('@prisma/client');
const {
  calculateFillPercentage,
  determineStatus,
  processThresholdAlert,
} = require('../services/binService');
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
    const newStatus = determineStatus(calculatedFill, sensor_status);

    // 4. Record reading in historical log
    const reading = await prisma.binReading.create({
      data: {
        bin_id: bin.id,
        fill_percentage: calculatedFill,
        distance_cm: distCm,
        temperature: temp,
        sensor_status,
      },
    });

    // 5. Update bin current fill and status
    const updatedBin = await prisma.bin.update({
      where: { id: bin.id },
      data: {
        current_fill_percentage: calculatedFill,
        status: newStatus,
      },
    });

    // 6. Trigger threshold alert & automated collection request if needed
    const alertRequest = await processThresholdAlert(updatedBin, calculatedFill);

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

