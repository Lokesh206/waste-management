const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Get comprehensive, real-time database dashboard analytics
 * GET /api/analytics/dashboard
 */
async function getDashboardStats(req, res) {
  try {
    const [
      totalUsers,
      activeCollectors,
      totalBins,
      criticalBins,
      almostFullBins,
      moderateBins,
      normalBins,
      offlineBins,
      pendingCollections,
      completedCollections,
      openComplaints,
      resolvedComplaints,
      collectionRecords,
      recyclingRecords,
      wasteClassifications,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'collector', is_active: true } }),
      prisma.bin.count({ where: { is_active: true } }),
      prisma.bin.count({ where: { is_active: true, status: 'Critical' } }),
      prisma.bin.count({ where: { is_active: true, status: 'Almost Full' } }),
      prisma.bin.count({ where: { is_active: true, status: 'Moderate' } }),
      prisma.bin.count({ where: { is_active: true, status: 'Normal' } }),
      prisma.bin.count({ where: { is_active: true, status: 'Offline' } }),
      prisma.collectionRequest.count({
        where: { status: { in: ['Pending', 'Assigned', 'Accepted', 'On the Way'] } },
      }),
      prisma.collectionRequest.count({ where: { status: 'Completed' } }),
      prisma.complaint.count({
        where: { status: { in: ['Pending', 'Under Review', 'Assigned'] } },
      }),
      prisma.complaint.count({ where: { status: 'Resolved' } }),
      prisma.collectionRecord.findMany({
        select: { collected_quantity: true, collected_at: true },
      }),
      prisma.recyclingRecord.findMany({
        select: {
          quantity: true,
          processed_quantity: true,
          waste_type: true,
          status: true,
        },
      }),
      prisma.wasteClassification.findMany({
        select: { predicted_class: true },
      }),
    ]);

    // Aggregate total waste collected in kg
    const totalCollectedKg = collectionRecords.reduce(
      (sum, r) => sum + (r.collected_quantity || 0),
      0
    );

    // Aggregate total waste recycled in kg
    const totalRecycledKg = recyclingRecords
      .filter((r) => r.status === 'Recycled')
      .reduce((sum, r) => sum + (r.processed_quantity || r.quantity || 0), 0);

    // Waste by category from recycling records & bins
    const wasteByCategory = {};
    for (const r of recyclingRecords) {
      wasteByCategory[r.waste_type] = (wasteByCategory[r.waste_type] || 0) + r.quantity;
    }

    // AI classification breakdown
    const aiCategoryBreakdown = {};
    for (const c of wasteClassifications) {
      aiCategoryBreakdown[c.predicted_class] =
        (aiCategoryBreakdown[c.predicted_class] || 0) + 1;
    }

    // Bin status breakdown
    const binStatusDistribution = {
      Normal: normalBins,
      Moderate: moderateBins,
      'Almost Full': almostFullBins,
      Critical: criticalBins,
      Offline: offlineBins,
    };

    return res.status(200).json({
      success: true,
      kpis: {
        totalUsers,
        activeCollectors,
        totalBins,
        criticalBins,
        almostFullBins,
        pendingCollections,
        completedCollections,
        openComplaints,
        resolvedComplaints,
        totalCollectedKg: Math.round(totalCollectedKg * 10) / 10,
        totalRecycledKg: Math.round(totalRecycledKg * 10) / 10,
        recyclingRatePct:
          totalCollectedKg > 0
            ? Math.round((totalRecycledKg / totalCollectedKg) * 1000) / 10
            : 0,
      },
      charts: {
        binStatusDistribution,
        wasteByCategory,
        aiCategoryBreakdown,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to compute dashboard analytics.',
      error: error.message,
    });
  }
}

module.exports = {
  getDashboardStats,
};

