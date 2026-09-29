const { PrismaClient } = require('@prisma/client');
const notificationService = require('./notificationService');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

// Configurable fill thresholds
const THRESHOLDS = {
  NORMAL_MAX: 50,
  MODERATE_MAX: 75,
  ALMOST_FULL_MAX: 90,
  CRITICAL_MIN: 91,
};

/**
 * Calculates fill percentage given measured ultrasonic distance and bin height/capacity.
 */
function calculateFillPercentage(capacityCm, distanceCm) {
  if (capacityCm <= 0) return 0;
  if (distanceCm == null || isNaN(distanceCm)) return 0;
  const fill = ((capacityCm - distanceCm) / capacityCm) * 100;
  return Math.max(0, Math.min(100, Math.round(fill * 10) / 10));
}

/**
 * Computes status label according to configured thresholds
 */
function determineStatus(fillPercentage, sensorStatus = 'OK') {
  if (sensorStatus !== 'OK') {
    return 'Offline';
  }
  if (fillPercentage >= THRESHOLDS.CRITICAL_MIN) {
    return 'Critical';
  }
  if (fillPercentage > THRESHOLDS.MODERATE_MAX) {
    return 'Almost Full';
  }
  if (fillPercentage > THRESHOLDS.NORMAL_MAX) {
    return 'Moderate';
  }
  return 'Normal';
}

/**
 * Evaluates whether an automated collection alert is required without duplicate requests.
 */
async function processThresholdAlert(bin, fillPercentage) {
  // Only trigger for Almost Full or Critical
  if (fillPercentage <= THRESHOLDS.MODERATE_MAX) {
    return null;
  }

  const priority = fillPercentage >= THRESHOLDS.CRITICAL_MIN ? 'Critical' : 'High';

  // Check for existing active collection request for this bin
  const existingActive = await prisma.collectionRequest.findFirst({
    where: {
      bin_id: bin.id,
      status: {
        in: ['Pending', 'Assigned', 'Accepted', 'On the Way'],
      },
    },
  });

  if (existingActive) {
    // If priority elevated from High to Critical, update existing request
    if (priority === 'Critical' && existingActive.priority !== 'Critical') {
      const updated = await prisma.collectionRequest.update({
        where: { id: existingActive.id },
        data: { priority: 'Critical' },
      });
      logger.info(`Elevated collection priority to Critical for Bin ${bin.bin_code}`);
      return updated;
    }
    return existingActive; // Avoid duplicate collection request
  }

  // Create new automated collection request
  const newRequest = await prisma.collectionRequest.create({
    data: {
      bin_id: bin.id,
      priority,
      status: 'Pending',
      notes: `Automated alert: Fill level reached ${fillPercentage}% (${bin.status}).`,
    },
    include: { bin: true },
  });

  logger.info(`Automated collection request generated for Bin ${bin.bin_code} (Priority: ${priority})`);

  // Dispatch in-app notification to all Admins
  const admins = await prisma.user.findMany({
    where: { role: 'admin', is_active: true },
    select: { id: true },
  });

  for (const adm of admins) {
    await notificationService.createNotification(
      adm.id,
      `Smart Bin Alert: ${bin.bin_code}`,
      `Bin ${bin.bin_code} at ${bin.location_name} reached ${fillPercentage}% (${priority}). Immediate collection recommended.`,
      'alert'
    );
  }

  return newRequest;
}

module.exports = {
  THRESHOLDS,
  calculateFillPercentage,
  determineStatus,
  processThresholdAlert,
};

