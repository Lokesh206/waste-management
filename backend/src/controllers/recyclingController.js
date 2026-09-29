const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

const VALID_PROCESSING_STATUSES = [
  'Pending',
  'Received',
  'Processing',
  'Recycled',
  'Rejected',
];

/**
 * Get incoming recyclable waste records
 */
async function getIncomingWaste(req, res) {
  try {
    const { status, waste_type } = req.query;
    const where = {};
    if (status) where.status = status;
    if (waste_type) where.waste_type = waste_type;

    const records = await prisma.recyclingRecord.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        collectionRecord: {
          include: {
            collector: { select: { id: true, name: true, phone: true } },
            collectionRequest: { include: { bin: true } },
          },
        },
        recyclingCenter: { select: { id: true, name: true } },
      },
    });

    return res.status(200).json({
      success: true,
      count: records.length,
      records,
    });
  } catch (error) {
    logger.error('Error fetching recycling records', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve recycling records.',
    });
  }
}

/**
 * Update recycling processing status & processed quantity
 */
async function updateRecyclingStatus(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const { status, processed_quantity } = req.body;

    if (!VALID_PROCESSING_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status: ${status}. Allowed: ${VALID_PROCESSING_STATUSES.join(', ')}`,
      });
    }

    const record = await prisma.recyclingRecord.findUnique({ where: { id } });
    if (!record) {
      return res.status(404).json({ success: false, message: 'Recycling record not found' });
    }

    const updateData = { status };
    if (processed_quantity != null && !isNaN(parseFloat(processed_quantity))) {
      const pQty = parseFloat(processed_quantity);
      if (pQty < 0) {
        return res.status(400).json({ success: false, message: 'Processed quantity cannot be negative.' });
      }
      updateData.processed_quantity = pQty;
      updateData.processed_at = new Date();
    } else if (status === 'Recycled') {
      updateData.processed_quantity = record.quantity;
      updateData.processed_at = new Date();
    }

    const updated = await prisma.recyclingRecord.update({
      where: { id },
      data: updateData,
    });

    logger.info(`Recycling record #${id} updated to ${status} (Processed: ${updated.processed_quantity} ${updated.unit})`);

    return res.status(200).json({
      success: true,
      message: `Recycling status updated to '${status}'.`,
      record: updated,
    });
  } catch (error) {
    logger.error('Error updating recycling status', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to update recycling status.',
    });
  }
}

/**
 * Aggregate recycling statistics for charts
 */
async function getRecyclingStats(req, res) {
  try {
    const allRecords = await prisma.recyclingRecord.findMany();

    let totalReceivedKg = 0;
    let totalProcessedKg = 0;
    let totalRecycledKg = 0;
    const byCategory = {};

    for (const r of allRecords) {
      totalReceivedKg += r.quantity;
      totalProcessedKg += r.processed_quantity;
      if (r.status === 'Recycled') {
        totalRecycledKg += r.processed_quantity || r.quantity;
      }

      if (!byCategory[r.waste_type]) {
        byCategory[r.waste_type] = {
          received: 0,
          recycled: 0,
        };
      }
      byCategory[r.waste_type].received += r.quantity;
      if (r.status === 'Recycled') {
        byCategory[r.waste_type].recycled += r.processed_quantity || r.quantity;
      }
    }

    return res.status(200).json({
      success: true,
      totals: {
        totalReceivedKg: Math.round(totalReceivedKg * 10) / 10,
        totalProcessedKg: Math.round(totalProcessedKg * 10) / 10,
        totalRecycledKg: Math.round(totalRecycledKg * 10) / 10,
        recyclingEfficiencyPct:
          totalReceivedKg > 0
            ? Math.round((totalRecycledKg / totalReceivedKg) * 1000) / 10
            : 0,
      },
      byCategory,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to compute recycling statistics.',
    });
  }
}

module.exports = {
  getIncomingWaste,
  updateRecyclingStatus,
  getRecyclingStats,
};

