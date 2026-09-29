const { PrismaClient } = require('@prisma/client');
const { emitEvent } = require('../websocket/socketManager');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * Handle live GPS telemetry from Collector mobile device
 * POST /api/collector/location
 */
async function updateLocation(req, res) {
  try {
    const { latitude, longitude, speed = 0, heading = 0, vehicle_code = 'TRUCK-07' } = req.body;

    if (latitude == null || longitude == null) {
      return res.status(400).json({ success: false, message: 'latitude and longitude are required.' });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const spd = parseFloat(speed);
    const hdg = parseFloat(heading);

    // Upsert vehicle position
    let vehicle = await prisma.vehicle.findUnique({
      where: { vehicle_code },
    });

    if (!vehicle) {
      vehicle = await prisma.vehicle.create({
        data: {
          vehicle_code,
          plate_number: 'KA-01-WM-9988',
          collector_id: req.user ? req.user.id : null,
          status: 'On Route',
          latitude: lat,
          longitude: lng,
          speed: spd,
          heading: hdg,
        },
      });
    } else {
      vehicle = await prisma.vehicle.update({
        where: { id: vehicle.id },
        data: {
          collector_id: req.user ? req.user.id : vehicle.collector_id,
          latitude: lat,
          longitude: lng,
          speed: spd,
          heading: hdg,
          status: 'On Route',
        },
      });
    }

    // Broadcast live moving vehicle position to Admin Command Center via Socket.IO
    emitEvent('vehicle:location', {
      vehicle_id: vehicle.id,
      vehicle_code: vehicle.vehicle_code,
      collector_id: req.user?.id,
      collector_name: req.user?.name || 'Collector Alpha',
      latitude: lat,
      longitude: lng,
      speed: spd,
      heading: hdg,
      timestamp: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      vehicle,
    });
  } catch (error) {
    logger.error('Error updating collector location', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to update vehicle location.' });
  }
}

/**
 * Get active vehicle details and live status
 * GET /api/collector/vehicle
 */
async function getVehicleStatus(req, res) {
  try {
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        OR: [
          { collector_id: req.user.id },
          { vehicle_code: 'TRUCK-07' },
        ],
      },
    });

    return res.status(200).json({
      success: true,
      vehicle: vehicle || {
        vehicle_code: 'TRUCK-07',
        plate_number: 'KA-01-WM-9988',
        status: 'Available',
        capacity_kg: 1500,
        current_load_kg: 275,
        latitude: 12.9690,
        longitude: 77.5920,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve vehicle status.' });
  }
}

module.exports = {
  updateLocation,
  getVehicleStatus,
};
