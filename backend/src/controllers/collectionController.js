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

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
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

    return res.status(200).json({ success: true, request });
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

    // 1. Create collection record
    const record = await prisma.collectionRecord.create({
      data: {
        collection_request_id: request.id,
        collector_id: req.user.id,
        collected_quantity: qty,
        unit: unit || 'kg',
        proof_image: proofImagePath,
        collection_latitude: lat,
        collection_longitude: lng,
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

    // 5. If recyclable waste, automatically create entry for Recycling Center
    const recyclableTypes = ['Plastic', 'Paper', 'Glass', 'Metal', 'Organic'];
    if (recyclableTypes.includes(request.bin.waste_type)) {
      const recyclingCenters = await prisma.user.findMany({
        where: { role: 'recycling_center', is_active: true },
      });

      if (recyclingCenters.length > 0) {
        const center = recyclingCenters[0];
        await prisma.recyclingRecord.create({
          data: {
            collection_record_id: record.id,
            recycling_center_id: center.id,
            waste_type: request.bin.waste_type,
            quantity: qty,
            unit: unit || 'kg',
            status: 'Pending',
          },
        });

        await createNotification(
          center.id,
          'Incoming Recyclable Shipment',
          `Collector logged ${qty} ${unit} of ${request.bin.waste_type} waste collected from ${request.bin.bin_code}.`,
          'recycling'
        );
      }
    }

    logger.info(`Collection completed for Bin ${request.bin.bin_code}: ${qty} kg logged.`);

    return res.status(201).json({
      success: true,
      message: 'Waste collection recorded successfully and bin reset.',
      record,
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

