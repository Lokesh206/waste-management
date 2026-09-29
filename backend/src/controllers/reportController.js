const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Generate CSV Report
 * GET /api/reports/export?type=collections|recycling|bins|complaints
 */
async function exportReport(req, res) {
  try {
    const { type = 'collections' } = req.query;
    let csvData = '';
    let filename = `swms_${type}_report_${Date.now()}.csv`;

    if (type === 'collections') {
      const records = await prisma.collectionRecord.findMany({
        include: {
          collector: { select: { name: true, email: true } },
          collectionRequest: { include: { bin: true } },
        },
        orderBy: { collected_at: 'desc' },
      });

      csvData = 'Record ID,Bin Code,Location,Waste Type,Quantity (kg),Collector Name,Collector Email,Collected At\n';
      for (const r of records) {
        const binCode = r.collectionRequest?.bin?.bin_code || 'N/A';
        const location = `"${r.collectionRequest?.bin?.location_name || 'N/A'}"`;
        const wasteType = r.collectionRequest?.bin?.waste_type || 'N/A';
        csvData += `${r.id},${binCode},${location},${wasteType},${r.collected_quantity},"${r.collector.name}",${r.collector.email},${r.collected_at.toISOString()}\n`;
      }
    } else if (type === 'recycling') {
      const records = await prisma.recyclingRecord.findMany({
        include: {
          recyclingCenter: { select: { name: true } },
          collectionRecord: {
            include: { collectionRequest: { include: { bin: true } } },
          },
        },
        orderBy: { created_at: 'desc' },
      });

      csvData = 'Record ID,Recycling Center,Waste Type,Received Qty (kg),Processed Qty (kg),Status,Processed At,Created At\n';
      for (const r of records) {
        const center = `"${r.recyclingCenter.name}"`;
        csvData += `${r.id},${center},${r.waste_type},${r.quantity},${r.processed_quantity},${r.status},${r.processed_at ? r.processed_at.toISOString() : 'N/A'},${r.created_at.toISOString()}\n`;
      }
    } else if (type === 'bins') {
      const bins = await prisma.bin.findMany({
        orderBy: { bin_code: 'asc' },
      });

      csvData = 'Bin Code,Location,Waste Type,Capacity,Current Fill %,Status,Latitude,Longitude,Active\n';
      for (const b of bins) {
        csvData += `${b.bin_code},"${b.location_name}",${b.waste_type},${b.capacity},${b.current_fill_percentage},${b.status},${b.latitude},${b.longitude},${b.is_active}\n`;
      }
    } else if (type === 'complaints') {
      const complaints = await prisma.complaint.findMany({
        include: { user: { select: { name: true, email: true } } },
        orderBy: { created_at: 'desc' },
      });

      csvData = 'Complaint ID,Citizen Name,Title,Status,Latitude,Longitude,Admin Notes,Created At\n';
      for (const c of complaints) {
        const title = `"${c.title.replace(/"/g, '""')}"`;
        const notes = c.admin_notes ? `"${c.admin_notes.replace(/"/g, '""')}"` : '""';
        csvData += `${c.id},"${c.user.name}",${title},${c.status},${c.latitude},${c.longitude},${notes},${c.created_at.toISOString()}\n`;
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid report type. Allowed: collections, recycling, bins, complaints.',
      });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvData);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate report.',
      error: error.message,
    });
  }
}

module.exports = {
  exportReport,
};

