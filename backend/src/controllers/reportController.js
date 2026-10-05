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

      csvData = 'Record ID,Bin Code,Location,Ward,Waste Stream,Collected Qty (kg),Unit,Verified,Collector Name,Collector Email,Collected At\n';
      for (const r of records) {
        const binCode = r.collectionRequest?.bin?.bin_code || 'N/A';
        const location = `"${(r.collectionRequest?.bin?.location_name || 'N/A').replace(/"/g, '""')}"`;
        const ward = `"${(r.collectionRequest?.bin?.ward || 'Ward 101').replace(/"/g, '""')}"`;
        const wasteType = `"${(r.collectionRequest?.bin?.waste_type || 'All-in-One Multi-Stream').replace(/"/g, '""')}"`;
        const collectorName = `"${(r.collector?.name || 'Assigned Collector').replace(/"/g, '""')}"`;
        const collectorEmail = r.collector?.email || 'N/A';
        const isVerified = r.is_verified ? 'YES' : 'NO';
        const collectedAt = r.collected_at ? r.collected_at.toISOString() : new Date().toISOString();
        csvData += `${r.id},${binCode},${location},${ward},${wasteType},${r.collected_quantity || 0},${r.unit || 'kg'},${isVerified},${collectorName},${collectorEmail},${collectedAt}\n`;
      }
    } else if (type === 'recycling') {
      const records = await prisma.recyclingRecord.findMany({
        include: {
          recyclingCenter: { select: { name: true, email: true } },
          collectionRecord: {
            include: { collectionRequest: { include: { bin: true } } },
          },
        },
        orderBy: { created_at: 'desc' },
      });

      csvData = 'Record ID,Batch Number,Recycling Facility,Waste Stream,Received Qty (kg),Processed Qty (kg),Recovery Rate (%),Status,Processed At,Received At\n';
      for (const r of records) {
        const center = `"${(r.recyclingCenter?.name || 'Municipal Recovery Facility').replace(/"/g, '""')}"`;
        const batch = r.batch_number || `BATCH-${r.id}`;
        const recoveryRate = r.recovery_rate != null ? r.recovery_rate : 85.0;
        const processedAt = r.processed_at ? r.processed_at.toISOString() : 'Pending Processing';
        const createdAt = r.created_at ? r.created_at.toISOString() : new Date().toISOString();
        csvData += `${r.id},${batch},${center},"${r.waste_type || 'Mixed Recyclables'}",${r.quantity || 0},${r.processed_quantity || 0},${recoveryRate},${r.status || 'Received'},${processedAt},${createdAt}\n`;
      }
    } else if (type === 'bins') {
      const bins = await prisma.bin.findMany({
        orderBy: { bin_code: 'asc' },
      });

      csvData = 'Bin Code,Location Name,Ward,Waste Type,Capacity (L),Current Fill (%),Status,Battery (%),Gas/Odor (ppm),Latitude,Longitude,Active,Last Cleaned\n';
      for (const b of bins) {
        const loc = `"${(b.location_name || '').replace(/"/g, '""')}"`;
        const ward = `"${(b.ward || 'Ward 101').replace(/"/g, '""')}"`;
        const fill = Math.round(b.current_fill_percentage || 0);
        const battery = b.battery_level != null ? b.battery_level : 95.0;
        const gas = b.gas_level_ppm != null ? b.gas_level_ppm : 20.0;
        const lastCleaned = b.last_collected_at ? b.last_collected_at.toISOString() : 'Recent';
        csvData += `${b.bin_code},${loc},${ward},"${b.waste_type || 'Smart Multi-Chamber'}",${b.capacity || 100},${fill},${b.status || 'Normal'},${battery},${gas},${b.latitude},${b.longitude},${b.is_active ? 'YES' : 'NO'},${lastCleaned}\n`;
      }
    } else if (type === 'complaints') {
      const complaints = await prisma.complaint.findMany({
        include: { user: { select: { name: true, email: true } } },
        orderBy: { created_at: 'desc' },
      });

      csvData = 'Complaint ID,Citizen Name,Citizen Email,Incident Title,Category,Severity,Status,Street Address,Latitude,Longitude,Admin Notes,Reported At\n';
      for (const c of complaints) {
        const title = `"${(c.title || '').replace(/"/g, '""')}"`;
        const category = `"${(c.category || 'General Waste').replace(/"/g, '""')}"`;
        const severity = c.severity || 'Medium';
        const address = `"${(c.address || 'Street Coordinates').replace(/"/g, '""')}"`;
        const notes = `"${(c.admin_notes || 'Under Municipal Investigation').replace(/"/g, '""')}"`;
        const citizenName = `"${(c.user?.name || 'Citizen').replace(/"/g, '""')}"`;
        const citizenEmail = c.user?.email || 'N/A';
        const createdAt = c.created_at ? c.created_at.toISOString() : new Date().toISOString();
        csvData += `${c.id},${citizenName},${citizenEmail},${title},${category},${severity},${c.status || 'Pending'},${address},${c.latitude},${c.longitude},${notes},${createdAt}\n`;
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid report type. Allowed: collections, recycling, bins, complaints.',
      });
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    return res.status(200).send(csvData);
  } catch (error) {
    console.error('Export report error:', error);
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

