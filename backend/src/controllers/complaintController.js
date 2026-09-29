const { PrismaClient } = require('@prisma/client');
const { createNotification } = require('../services/notificationService');
const { emitEvent } = require('../websocket/socketManager');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

const VALID_COMPLAINT_STATUSES = [
  'Pending',
  'Under Review',
  'Assigned',
  'Resolved',
  'Rejected',
];

/**
 * Citizen files an illegal dumping complaint with SLA and Eco-Rewards
 */
async function createComplaint(req, res) {
  try {
    const { title, description, latitude, longitude, category = 'General Waste', severity = 'Medium', address } = req.body;

    if (!title || !description || latitude == null || longitude == null) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, latitude, and longitude are required.',
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({ success: false, message: 'Latitude must be between -90 and 90.' });
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({ success: false, message: 'Longitude must be between -180 and 180.' });
    }

    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    let userId = req.user ? req.user.id : null;
    if (!userId) {
      const defaultCitizen = await prisma.user.findFirst({ where: { role: 'citizen' } });
      userId = defaultCitizen ? defaultCitizen.id : 1;
    }

    // SLA Calculation: Critical = 2h, High = 6h, Medium/Low = 24h
    const slaHours = severity === 'Critical' ? 2 : severity === 'High' ? 6 : 24;
    const slaDeadline = new Date(Date.now() + slaHours * 3600 * 1000);

    const complaint = await prisma.complaint.create({
      data: {
        user_id: userId,
        title: title.trim(),
        category,
        severity,
        address: address ? address.trim() : null,
        description: description.trim(),
        image_path: imagePath,
        latitude: lat,
        longitude: lng,
        status: 'Pending',
        sla_deadline: slaDeadline,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    // Award citizen +20 Eco-Points
    try {
      await prisma.ecoReward.create({
        data: {
          user_id: userId,
          points: 20,
          reason: `Civic report submitted: #${complaint.id} (${category})`,
          reference_type: 'complaint',
          reference_id: complaint.id,
        },
      });
    } catch (e) {
      logger.error('Failed to log eco points', { error: e.message });
    }

    // Notify citizen if authenticated
    if (req.user) {
      await createNotification(
        req.user.id,
        'Report Registered (+20 Eco-Points)',
        `Your illegal dumping complaint "${complaint.title}" has been registered (#${complaint.id}). SLA Target: ${slaHours}h.`,
        'complaint'
      );
    }

    // Notify admins
    const admins = await prisma.user.findMany({ where: { role: 'admin', is_active: true } });
    for (const adm of admins) {
      await createNotification(
        adm.id,
        `New Dumping Report [${severity}]`,
        `Citizen ${req.user?.name || 'Citizen'} reported: "${complaint.title}". SLA: ${slaHours}h response time.`,
        'complaint'
      );
    }

    // Real-time WebSocket emission
    emitEvent('complaint:created', complaint);

    logger.info(`Citizen ${req.user?.email || 'User'} filed complaint #${complaint.id}`);

    return res.status(201).json({
      success: true,
      message: 'Illegal dumping report filed successfully (+20 Eco-Points awarded).',
      complaint,
    });
  } catch (error) {
    logger.error('Error filing complaint', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to file illegal dumping report.',
    });
  }
}

/**
 * Citizen views their own submitted complaints
 */
async function getMyComplaints(req, res) {
  try {
    const complaints = await prisma.complaint.findMany({
      where: { user_id: req.user.id },
      orderBy: { created_at: 'desc' },
    });

    return res.status(200).json({
      success: true,
      count: complaints.length,
      complaints,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve your complaints.',
    });
  }
}

/**
 * Admin views all complaints with SLA monitoring
 */
async function getAllComplaints(req, res) {
  try {
    const { status, severity } = req.query;
    const where = {};
    if (status) where.status = status;
    if (severity) where.severity = severity;

    const complaints = await prisma.complaint.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    // Check SLA breaches
    const now = new Date();
    const enrichedComplaints = complaints.map((c) => {
      const isBreached = c.status !== 'Resolved' && c.sla_deadline && new Date(c.sla_deadline) < now;
      const remainingMs = c.sla_deadline ? new Date(c.sla_deadline) - now : null;
      return {
        ...c,
        is_sla_breached: !!isBreached,
        remaining_minutes: remainingMs != null ? Math.round(remainingMs / 60000) : null,
      };
    });

    return res.status(200).json({
      success: true,
      count: enrichedComplaints.length,
      complaints: enrichedComplaints,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve complaints.',
    });
  }
}

/**
 * Admin updates complaint status & adds notes with resolution reward
 */
async function updateComplaintStatus(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const { status, admin_notes } = req.body;

    if (!VALID_COMPLAINT_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status: ${status}. Allowed: ${VALID_COMPLAINT_STATUSES.join(', ')}`,
      });
    }

    const complaint = await prisma.complaint.findUnique({ where: { id } });
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const updated = await prisma.complaint.update({
      where: { id },
      data: {
        status,
        admin_notes: admin_notes ? admin_notes.trim() : complaint.admin_notes,
      },
    });

    // If resolved, award citizen +50 Eco-Points
    if (status === 'Resolved' && complaint.status !== 'Resolved') {
      try {
        await prisma.ecoReward.create({
          data: {
            user_id: complaint.user_id,
            points: 50,
            reason: `Complaint #${complaint.id} verified and resolved by municipality`,
            reference_type: 'complaint_resolved',
            reference_id: complaint.id,
          },
        });
      } catch (e) {
        // Ignored
      }
    }

    // Notify citizen of the resolution / status change
    await createNotification(
      complaint.user_id,
      `Complaint #${complaint.id} Update: ${status}`,
      `Your report "${complaint.title}" status is now: ${status}.${status === 'Resolved' ? ' You received +50 Eco-Points!' : ''}${admin_notes ? ` Note: ${admin_notes}` : ''}`,
      'complaint'
    );

    // Real-time WebSocket emission
    emitEvent('complaint:updated', updated);

    return res.status(200).json({
      success: true,
      message: `Complaint status updated to '${status}'.`,
      complaint: updated,
    });
  } catch (error) {
    logger.error('Error updating complaint', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to update complaint status.',
    });
  }
}

module.exports = {
  createComplaint,
  getMyComplaints,
  getAllComplaints,
  updateComplaintStatus,
};
