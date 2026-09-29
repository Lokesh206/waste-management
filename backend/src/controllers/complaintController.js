const { PrismaClient } = require('@prisma/client');
const { createNotification } = require('../services/notificationService');
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
 * Citizen files an illegal dumping complaint
 */
async function createComplaint(req, res) {
  try {
    const { title, description, latitude, longitude } = req.body;

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

    const complaint = await prisma.complaint.create({
      data: {
        user_id: userId,
        title: title.trim(),
        description: description.trim(),
        image_path: imagePath,
        latitude: lat,
        longitude: lng,
        status: 'Pending',
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    // Notify citizen if authenticated
    if (req.user) {
      await createNotification(
        req.user.id,
        'Report Submitted',
        `Your illegal dumping complaint "${complaint.title}" has been registered (#${complaint.id}).`,
        'complaint'
      );
    }

    // Notify admins
    const admins = await prisma.user.findMany({ where: { role: 'admin', is_active: true } });
    for (const adm of admins) {
      await createNotification(
        adm.id,
        'New Dumping Report',
        `Citizen ${req.user.name} reported illegal dumping: "${complaint.title}".`,
        'complaint'
      );
    }

    logger.info(`Citizen ${req.user.email} filed complaint #${complaint.id}`);

    return res.status(201).json({
      success: true,
      message: 'Illegal dumping report filed successfully.',
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
 * Admin views all complaints
 */
async function getAllComplaints(req, res) {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = status;

    const complaints = await prisma.complaint.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    return res.status(200).json({
      success: true,
      count: complaints.length,
      complaints,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve complaints.',
    });
  }
}

/**
 * Admin updates complaint status & adds notes
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

    // Notify citizen of the resolution / status change
    await createNotification(
      complaint.user_id,
      `Complaint #${complaint.id} Update`,
      `Your report "${complaint.title}" status is now: ${status}.${admin_notes ? ` Note: ${admin_notes}` : ''}`,
      'complaint'
    );

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
