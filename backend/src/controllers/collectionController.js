const { PrismaClient } = require('@prisma/client');
const { planCollectionRoute } = require('../services/routeService');
const { createNotification } = require('../services/notificationService');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

const VALID_STATUSES = [
  'Pending',
  'Assigned',
  'Accepted',
  'On the Way',
  'Collected',
  'Completed',
  'Cancelled',
];

const VALID_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

function enrichRequestBin(r) {
  if (!r || !r.bin) return r;
  const bin = r.bin;
  const fill = Math.round(bin.current_fill_percentage || 0);
  const primaryStream = bin.waste_type || 'General';
  const seed = ((bin.id || 1) * 23) % 100;

  const plastic = primaryStream.toLowerCase() === 'plastic' ? Math.max(fill, 85) : Math.round(25 + (seed % 20));
  const organic = primaryStream.toLowerCase() === 'organic' ? Math.max(fill, 85) : Math.round(20 + ((seed * 3) % 25));
  const paper = primaryStream.toLowerCase() === 'paper' ? Math.max(fill, 85) : Math.round(18 + ((seed * 7) % 20));
  const glass = primaryStream.toLowerCase() === 'glass' ? Math.max(fill, 85) : Math.round(15 + ((seed * 11) % 15));
  const metal = primaryStream.toLowerCase() === 'metal' ? Math.max(fill, 85) : Math.round(10 + ((seed * 5) % 15));

  return {
    ...r,
    bin: {
      ...bin,
      dustbin_model: 'Smart Municipal Dustbin (Multi-Chamber)',
      waste_type: 'Multi-Chamber Smart Dustbin',
      primary_stream: primaryStream,
      is_multi_chamber: true,
      chambers: [
        { type: 'Organic', name: 'Wet / Organic', icon: '🍏', percentage: Math.min(100, organic), color: '#10b981', is_primary: primaryStream.toLowerCase() === 'organic' },
        { type: 'Paper', name: 'Dry / Paper', icon: '📦', percentage: Math.min(100, paper), color: '#f59e0b', is_primary: primaryStream.toLowerCase() === 'paper' },
        { type: 'Plastic', name: 'Plastic', icon: '🥤', percentage: Math.min(100, plastic), color: '#3b82f6', is_primary: primaryStream.toLowerCase() === 'plastic' },
        { type: 'Metal', name: 'Metal / Glass', icon: '⚙️', percentage: Math.min(100, Math.max(metal, glass)), color: '#6366f1', is_primary: primaryStream.toLowerCase() === 'metal' || primaryStream.toLowerCase() === 'glass' },
      ],
    },
  };
}

/**
 * Get all collection requests (supports filtering)
 */
async function getAllRequests(req, res) {
  try {
    const { status, priority, collector_id, bin_id } = req.query;
    const where = {};

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (bin_id) where.bin_id = parseInt(bin_id, 10);

    // If logged in as collector, include assigned tasks and unassigned tasks so collector can accept them
    if (req.user.role === 'collector') {
      if (req.query.scope === 'all' || req.query.all === 'true') {
        // no collector restriction
      } else if (req.query.only_me === 'true') {
        where.assigned_collector_id = req.user.id;
      } else {
        where.OR = [
          { assigned_collector_id: req.user.id },
          { assigned_collector_id: null },
        ];
      }
    } else if (collector_id) {
      where.assigned_collector_id = parseInt(collector_id, 10);
    }

    const requests = await prisma.collectionRequest.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { requested_at: 'desc' }],
      include: {
        bin: true,
        assignedCollector: { select: { id: true, name: true, phone: true, email: true } },
        requester: { select: { id: true, name: true } },
        records: true,
      },
    });

    const enrichedRequests = requests.map(enrichRequestBin);

    return res.status(200).json({
      success: true,
      count: enrichedRequests.length,
      requests: enrichedRequests,
    });
  } catch (error) {
    logger.error('Error fetching collection requests', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve collection requests.',
    });
  }
}

/**
 * Get single collection request details
 */
async function getRequestById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const request = await prisma.collectionRequest.findUnique({
      where: { id },
      include: {
        bin: true,
        assignedCollector: { select: { id: true, name: true, phone: true, email: true } },
        requester: { select: { id: true, name: true } },
        records: {
          include: { collector: { select: { id: true, name: true } } },
        },
      },
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Collection request not found' });
    }

    return res.status(200).json({ success: true, request: enrichRequestBin(request) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve request details.' });
  }
}

/**
 * Manually create a collection request (Citizen or Admin)
 */
async function createRequest(req, res) {
  try {
    const { bin_id, priority = 'Medium', notes } = req.body;

    if (!bin_id) {
      return res.status(400).json({ success: false, message: 'bin_id is required' });
    }

    const bin = await prisma.bin.findUnique({ where: { id: parseInt(bin_id, 10) } });
    if (!bin) {
      return res.status(404).json({ success: false, message: 'Bin not found' });
    }

    const assignedPriority = VALID_PRIORITIES.includes(priority) ? priority : 'Medium';

    const newRequest = await prisma.collectionRequest.create({
      data: {
        bin_id: bin.id,
        requested_by: req.user ? req.user.id : null,
        priority: assignedPriority,
        status: 'Pending',
        notes: notes ? notes.trim() : null,
      },
      include: { bin: true },
    });

    return res.status(201).json({
      success: true,
      message: 'Collection request registered successfully.',
      request: newRequest,
    });
  } catch (error) {
    logger.error('Error creating collection request', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to create collection request.' });
  }
}

/**
 * Admin assigns collector to task
 */
async function assignCollector(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const { collector_id, priority, notes } = req.body;

    const request = await prisma.collectionRequest.findUnique({ where: { id } });
    if (!request) {
      return res.status(404).json({ success: false, message: 'Collection request not found' });
    }

    const collector = await prisma.user.findFirst({
      where: { id: parseInt(collector_id, 10), role: 'collector', is_active: true },
    });

    if (!collector) {
      return res.status(404).json({ success: false, message: 'Active collector not found.' });
    }

    const updateData = {
      assigned_collector_id: collector.id,
      status: 'Assigned',
      assigned_at: new Date(),
    };

    if (priority && VALID_PRIORITIES.includes(priority)) {
      updateData.priority = priority;
    }
    if (notes) {
      updateData.notes = notes.trim();
    }

    const updated = await prisma.collectionRequest.update({
      where: { id },
      data: updateData,
      include: { bin: true, assignedCollector: true },
    });

    // Notify assigned collector
    await createNotification(
      collector.id,
      'New Task Assigned',
      `You have been assigned to collect ${updated.bin.bin_code} (${updated.bin.location_name}). Priority: ${updated.priority}`,
      'task'
    );

    return res.status(200).json({
      success: true,
      message: `Task assigned to ${collector.name} successfully.`,
      request: updated,
    });
  } catch (error) {
    logger.error('Error assigning collector', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to assign collector.' });
  }
}

/**
 * Update task status (Collector transitions: Accepted, On the Way, etc.)
 */
async function updateStatus(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const { status, notes } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status: ${status}. Allowed: ${VALID_STATUSES.join(', ')}`,
      });
    }

    const existing = await prisma.collectionRequest.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Collection request not found' });
    }

    // Role check: if collector, ensure assigned to this task
    if (req.user.role === 'collector' && existing.assigned_collector_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You can only update tasks assigned to you.',
      });
    }

    const updateData = { status };
    if (notes) updateData.notes = notes.trim();

    if (status === 'Accepted' || status === 'On the Way') {
      if (!existing.started_at) updateData.started_at = new Date();
    } else if (status === 'Completed') {
      updateData.completed_at = new Date();
    }

    const updated = await prisma.collectionRequest.update({
      where: { id },
      data: updateData,
      include: { bin: true },
    });

    logger.info(`Collection request #${id} updated to status '${status}' by user ${req.user.email}`);

    return res.status(200).json({
      success: true,
      message: `Status updated to '${status}'.`,
      request: updated,
    });
  } catch (error) {
    logger.error('Error updating task status', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to update task status.' });
  }
}

/**
 * Record completed collection with quantity, proof image, and empty the bin
 */
async function recordCollection(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const { collected_quantity, unit = 'kg', latitude, longitude } = req.body;

    if (collected_quantity == null || isNaN(parseFloat(collected_quantity))) {
      return res.status(400).json({
        success: false,
        message: 'Valid collected_quantity (kg) is required.',
      });
    }

    const qty = parseFloat(collected_quantity);
    if (qty < 0) {
      return res.status(400).json({
        success: false,
        message: 'Waste quantity must not be negative.',
      });
    }

    const request = await prisma.collectionRequest.findUnique({
      where: { id },
      include: { bin: true },
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Collection request not found' });
    }

    const proofImagePath = req.file ? `/uploads/${req.file.filename}` : null;
    const lat = latitude ? parseFloat(latitude) : request.bin.latitude;
    const lng = longitude ? parseFloat(longitude) : request.bin.longitude;

    // Anti-Fraud GPS Distance Verification
    const distanceKm = planCollectionRoute ? Math.abs(lat - request.bin.latitude) * 111 : 0;
    let isVerified = true;
    let fraudFlag = null;

    if (latitude != null && longitude != null) {
      // Check if collector is more than 350m away from bin
      const dLat = (lat - request.bin.latitude) * (Math.PI / 180);
      const dLon = (lng - request.bin.longitude) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(request.bin.latitude * (Math.PI / 180)) *
          Math.cos(lat * (Math.PI / 180)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distMeters = Math.round(6371 * c * 1000);

      if (distMeters > 350) {
        isVerified = false;
        fraudFlag = `SUSPICIOUS: Geolocation was ${distMeters}m from registered bin coordinates. Flagged for municipal supervisor audit.`;
        logger.warn(`Suspicious collection flagged for Task #${request.id}: ${fraudFlag}`);
      }
    }

    // 1. Create collection record with verification status
    const record = await prisma.collectionRecord.create({
      data: {
        collection_request_id: request.id,
        collector_id: req.user.id,
        collected_quantity: qty,
        unit: unit || 'kg',
        proof_image: proofImagePath,
        collection_latitude: lat,
        collection_longitude: lng,
        is_verified: isVerified,
        fraud_flag: fraudFlag,
      },
    });

    // 2. Mark collection request as Completed
    await prisma.collectionRequest.update({
      where: { id: request.id },
      data: {
        status: 'Completed',
        completed_at: new Date(),
      },
    });

    // 3. Reset bin fill level to 0% and status to Normal
    await prisma.bin.update({
      where: { id: request.bin_id },
      data: {
        current_fill_percentage: 0.0,
        status: 'Normal',
        last_collected_at: new Date(),
      },
    });

    // 4. Log a zero-fill reading
    await prisma.binReading.create({
      data: {
        bin_id: request.bin_id,
        fill_percentage: 0.0,
        distance_cm: request.bin.capacity,
        sensor_status: 'OK',
      },
    });

    // 5. Generate traceable unique Waste Batch ID for Recycling Center
    const batchNumber = `BATCH-SWMS-2026-${String(10000 + (record.id % 90000))}`;
    const recyclableTypes = ['Plastic', 'Paper', 'Glass', 'Metal', 'Organic', 'All-in-One Multi-Stream AI'];

    const recyclingCenters = await prisma.user.findMany({
      where: { role: 'recycling_center', is_active: true },
    });

    if (recyclingCenters.length > 0) {
      const center = recyclingCenters[0];
      await prisma.recyclingRecord.create({
        data: {
          batch_number: batchNumber,
          collection_record_id: record.id,
          recycling_center_id: center.id,
          waste_type: request.bin.waste_type || 'Mixed Recyclables',
          quantity: qty,
          unit: unit || 'kg',
          recovery_rate: 82.5,
          status: 'Pending',
        },
      });

      await createNotification(
        center.id,
        `Incoming Shipment: ${batchNumber}`,
        `Vehicle logged ${qty} ${unit} from ${request.bin.bin_code}. Batch ID: ${batchNumber}.`,
        'recycling'
      );
    }

    // 6. Real-time WebSocket emission
    const { emitEvent } = require('../websocket/socketManager');
    emitEvent('collection:completed', {
      task_id: request.id,
      bin_code: request.bin.bin_code,
      collected_quantity: qty,
      is_verified: isVerified,
      fraud_flag: fraudFlag,
      batch_number: batchNumber,
    });

    emitEvent('bin:update', {
      id: request.bin.id,
      bin_code: request.bin.bin_code,
      current_fill_percentage: 0.0,
      status: 'Normal',
    });

    logger.info(`Collection completed for Bin ${request.bin.bin_code}: ${qty} kg logged. Batch: ${batchNumber}. Verified: ${isVerified}`);

    return res.status(201).json({
      success: true,
      message: isVerified
        ? 'Waste collection verified and recorded. Bin reset to 0%.'
        : 'Collection logged with audit flag (distance mismatch). Submitted for supervisor review.',
      record,
      batch_number: batchNumber,
      is_verified: isVerified,
      fraud_flag: fraudFlag,
    });
  } catch (error) {
    logger.error('Error recording collection', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to record collection.',
    });
  }
}

/**
 * Calculate heuristic collection route for collector
 */
async function getPlannedRoute(req, res) {
  try {
    const collectorId = req.user.id;
    const { latitude, longitude } = req.query;

    const startLoc = {
      latitude: latitude ? parseFloat(latitude) : 12.9716,
      longitude: longitude ? parseFloat(longitude) : 77.5946,
    };

    const activeTasks = await prisma.collectionRequest.findMany({
      where: {
        assigned_collector_id: collectorId,
        status: { in: ['Assigned', 'Accepted', 'On the Way'] },
      },
      include: { bin: true },
    });

    const routePlan = planCollectionRoute(startLoc, activeTasks);

    return res.status(200).json({
      success: true,
      startLocation: startLoc,
      routePlan,
    });
  } catch (error) {
    logger.error('Error planning collection route', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate collection route.',
    });
  }
}

module.exports = {
  getAllRequests,
  getRequestById,
  createRequest,
  assignCollector,
  updateStatus,
  recordCollection,
  getPlannedRoute,
};

