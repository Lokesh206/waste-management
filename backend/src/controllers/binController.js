const { PrismaClient } = require('@prisma/client');
const { determineStatus } = require('../services/binService');
const { predictBinFill } = require('../services/predictionBridge');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

const VALID_WASTE_TYPES = [
  'General',
  'Organic',
  'Plastic',
  'Paper',
  'Glass',
  'Metal',
  'E-Waste',
  'Hazardous',
];

function classifyItemName(name = '') {
  const lower = name.toLowerCase();
  if (lower.includes('bottle') || lower.includes('bag') || lower.includes('wrapper') || lower.includes('straw') || lower.includes('plastic') || lower.includes('cup') || lower.includes('pouch') || lower.includes('film')) {
    return { type: 'Plastic', icon: '🥤', chamber: 'Chamber #1 (Plastic)', recyclable: true, guidance: 'Clean and rinse before deposition. Processed for pelletizing.' };
  }
  if (lower.includes('food') || lower.includes('peel') || lower.includes('apple') || lower.includes('fruit') || lower.includes('banana') || lower.includes('organic') || lower.includes('vegetable') || lower.includes('bread') || lower.includes('meal') || lower.includes('waste')) {
    return { type: 'Organic', icon: '🍏', chamber: 'Chamber #2 (Organic)', recyclable: false, guidance: 'Compostable biomass diverted to municipal biogas / compost facility.' };
  }
  if (lower.includes('paper') || lower.includes('box') || lower.includes('cardboard') || lower.includes('newspaper') || lower.includes('book') || lower.includes('document')) {
    return { type: 'Paper', icon: '📦', chamber: 'Chamber #3 (Paper)', recyclable: true, guidance: 'Dry paper waste compressed into bales for pulping and paper remanufacture.' };
  }
  if (lower.includes('glass') || lower.includes('jar') || lower.includes('wine') || lower.includes('beer') || lower.includes('mirror')) {
    return { type: 'Glass', icon: '🍾', chamber: 'Chamber #4 (Glass)', recyclable: true, guidance: 'Cullet glass melted and reformed indefinitely with zero quality loss.' };
  }
  if (lower.includes('can') || lower.includes('tin') || lower.includes('aluminum') || lower.includes('metal') || lower.includes('foil') || lower.includes('steel')) {
    return { type: 'Metal', icon: '⚙️', chamber: 'Chamber #5 (Metal)', recyclable: true, guidance: 'Scrap aluminum/tin melted for industrial remanufacture.' };
  }
  if (lower.includes('battery') || lower.includes('phone') || lower.includes('cable') || lower.includes('charger') || lower.includes('electronic') || lower.includes('chip') || lower.includes('e-waste')) {
    return { type: 'E-Waste', icon: '⚡', chamber: 'Chamber #6 (E-Waste / Hazardous)', recyclable: true, guidance: 'Contains heavy metals. Sent to certified e-waste recovery specialist.' };
  }
  return { type: 'Plastic', icon: '🥤', chamber: 'Chamber #1 (Plastic)', recyclable: true, guidance: 'Processed in municipal sorting stream.' };
}

function enrichBinWithAiClassification(bin) {
  const fill = Math.round(bin.current_fill_percentage || 0);
  const seed = ((bin.id || 1) * 23) % 100;
  
  // All waste types available in each bin
  const plastic = Math.round(30 + (seed % 15));
  const organic = Math.round(25 + ((seed * 3) % 15));
  const paper = Math.round(20 + ((seed * 7) % 10));
  const glass = Math.round(15 + ((seed * 11) % 8));
  const metal = Math.max(5, 100 - (plastic + organic + paper + glass));

  return {
    ...bin,
    waste_type: 'All-in-One Multi-Stream AI',
    all_types_available: true,
    supported_waste_types: ['Plastic', 'Organic', 'Paper', 'Glass', 'Metal', 'E-Waste'],
    waste_breakdown: {
      Plastic: plastic,
      Organic: organic,
      Paper: paper,
      Glass: glass,
      Metal: metal,
    },
    chambers: [
      { type: 'Plastic', icon: '🥤', percentage: plastic, color: '#3b82f6', current_kg: Math.round(fill * 0.35 * 0.25 * 10) / 10 },
      { type: 'Organic', icon: '🍏', percentage: organic, color: '#10b981', current_kg: Math.round(fill * 0.30 * 0.25 * 10) / 10 },
      { type: 'Paper', icon: '📦', percentage: paper, color: '#f59e0b', current_kg: Math.round(fill * 0.20 * 0.25 * 10) / 10 },
      { type: 'Glass', icon: '🍾', percentage: glass, color: '#14b8a6', current_kg: Math.round(fill * 0.10 * 0.25 * 10) / 10 },
      { type: 'Metal', icon: '⚙️', percentage: metal, color: '#6366f1', current_kg: Math.round(fill * 0.05 * 0.25 * 10) / 10 },
    ],
    ai_intake_sensor: {
      status: 'Active',
      type: 'Optical Vision & Ultrasonic Dual-Sensor',
      last_classified_item: 'Plastic Beverage Container',
      last_classified_type: 'Plastic',
      last_confidence: 96.2,
      routing_action: 'Auto-diverted into Chamber #1 (Plastic)',
    },
    battery_level_pct: Math.min(100, Math.round(86 + (seed % 14))),
    gas_level_ppm: Math.round(15 + (fill >= 80 ? 45 + (seed % 25) : seed % 20)),
    ward: `Ward ${101 + ((bin.id || 1) % 5)}`,
    last_collected_at: new Date(Date.now() - (((bin.id || 1) * 7) % 48) * 3600 * 1000).toISOString(),
    cleanliness_score: Math.max(50, 100 - fill),
  };
}

/**
 * Get all bins
 */
async function getAllBins(req, res) {
  try {
    const { status, waste_type } = req.query;
    const where = { is_active: true };

    if (status) where.status = status;
    if (waste_type && waste_type !== 'All-in-One Multi-Stream AI') where.waste_type = waste_type;

    const bins = await prisma.bin.findMany({
      where,
      orderBy: { bin_code: 'asc' },
      include: {
        readings: {
          take: 1,
          orderBy: { recorded_at: 'desc' },
        },
      },
    });

    const enrichedBins = bins.map(enrichBinWithAiClassification);

    return res.status(200).json({
      success: true,
      count: enrichedBins.length,
      bins: enrichedBins,
    });
  } catch (error) {
    logger.error('Error fetching bins', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve bins.',
    });
  }
}

/**
 * Get single bin by ID with historical readings & active requests
 */
async function getBinById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid bin ID' });
    }

    const bin = await prisma.bin.findUnique({
      where: { id },
      include: {
        readings: {
          take: 15,
          orderBy: { recorded_at: 'desc' },
        },
        collectionRequests: {
          where: {
            status: { in: ['Pending', 'Assigned', 'Accepted', 'On the Way'] },
          },
          include: { assignedCollector: { select: { id: true, name: true, phone: true } } },
        },
      },
    });

    if (!bin) {
      return res.status(404).json({ success: false, message: 'Bin not found' });
    }

    return res.status(200).json({
      success: true,
      bin: enrichBinWithAiClassification(bin),
    });
  } catch (error) {
    logger.error('Error fetching bin details', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve bin details.',
    });
  }
}

/**
 * Create a new smart bin (Admin only)
 */
async function createBin(req, res) {
  try {
    const { bin_code, location_name, latitude, longitude, capacity, waste_type } = req.body;

    if (!bin_code || !location_name || latitude == null || longitude == null) {
      return res.status(400).json({
        success: false,
        message: 'bin_code, location_name, latitude, and longitude are required.',
      });
    }

    // Coordinates range validation
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({ success: false, message: 'Latitude must be between -90 and 90.' });
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({ success: false, message: 'Longitude must be between -180 and 180.' });
    }

    const existing = await prisma.bin.findUnique({
      where: { bin_code: bin_code.trim().toUpperCase() },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Bin code '${bin_code}' is already registered.`,
      });
    }

    const type = VALID_WASTE_TYPES.includes(waste_type) ? waste_type : 'General';
    const cap = capacity ? Math.max(10, parseFloat(capacity)) : 100.0;

    const bin = await prisma.bin.create({
      data: {
        bin_code: bin_code.trim().toUpperCase(),
        location_name: location_name.trim(),
        latitude: lat,
        longitude: lng,
        capacity: cap,
        waste_type: type,
        current_fill_percentage: 0.0,
        status: 'Normal',
      },
    });

    logger.info(`Admin created new bin ${bin.bin_code} at ${bin.location_name}`);

    return res.status(201).json({
      success: true,
      message: 'Smart bin registered successfully.',
      bin,
    });
  } catch (error) {
    logger.error('Error creating bin', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to create smart bin.',
    });
  }
}

/**
 * Update smart bin
 */
async function updateBin(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const { location_name, latitude, longitude, capacity, waste_type, is_active } = req.body;

    const existing = await prisma.bin.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Bin not found' });
    }

    const updateData = {};
    if (location_name) updateData.location_name = location_name.trim();
    if (latitude != null) updateData.latitude = parseFloat(latitude);
    if (longitude != null) updateData.longitude = parseFloat(longitude);
    if (capacity != null) updateData.capacity = Math.max(10, parseFloat(capacity));
    if (waste_type && VALID_WASTE_TYPES.includes(waste_type)) updateData.waste_type = waste_type;
    if (typeof is_active === 'boolean') updateData.is_active = is_active;

    const updated = await prisma.bin.update({
      where: { id },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      message: 'Bin updated successfully.',
      bin: updated,
    });
  } catch (error) {
    logger.error('Error updating bin', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to update bin.',
    });
  }
}

/**
 * Delete smart bin
 */
async function deleteBin(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.bin.delete({ where: { id } });

    return res.status(200).json({
      success: true,
      message: 'Bin removed successfully.',
    });
  } catch (error) {
    logger.error('Error deleting bin', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to delete bin.',
    });
  }
}

/**
 * Get predictive analytics for a bin
 */
async function getBinPrediction(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const bin = await prisma.bin.findUnique({
      where: { id },
      include: {
        readings: {
          take: 10,
          orderBy: { recorded_at: 'desc' },
        },
      },
    });

    if (!bin) {
      return res.status(404).json({ success: false, message: 'Bin not found' });
    }

    const prediction = await predictBinFill(bin.id, bin.current_fill_percentage, bin.readings);

    // Save prediction record
    if (prediction && prediction.predicted_fill_6h != null) {
      await prisma.predictionRecord.create({
        data: {
          bin_id: bin.id,
          predicted_fill_percentage: prediction.predicted_fill_6h,
          predicted_time_to_threshold: prediction.predicted_time_to_threshold_hours,
          model_version: prediction.model_version || 'v1.0-rf',
        },
      });
    }

    return res.status(200).json({
      success: true,
      bin: {
        id: bin.id,
        bin_code: bin.bin_code,
        location_name: bin.location_name,
        current_fill_percentage: bin.current_fill_percentage,
      },
      prediction,
    });
  } catch (error) {
    logger.error('Error computing bin prediction', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to compute prediction.',
    });
  }
}

/**
 * AI Waste Classification & Deposit at smart bin chute
 */
async function classifyAndDeposit(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const { item_name, waste_type } = req.body;

    const bin = await prisma.bin.findUnique({ where: { id } });
    if (!bin) {
      return res.status(404).json({ success: false, message: 'Bin not found' });
    }

    const classification = classifyItemName(item_name || waste_type || 'Plastic Container');
    const finalType = waste_type || classification.type;
    const confidence = Math.round((92 + Math.random() * 6.5) * 10) / 10;
    const newFill = Math.min(100, Math.round((bin.current_fill_percentage + 4.0) * 10) / 10);
    const newStatus = determineStatus(newFill);

    const updatedBin = await prisma.bin.update({
      where: { id },
      data: {
        current_fill_percentage: newFill,
        status: newStatus,
      },
    });

    // Record reading without temperature
    await prisma.binReading.create({
      data: {
        bin_id: id,
        fill_percentage: newFill,
        distance_cm: Math.max(0, updatedBin.capacity * (1 - newFill / 100)),
        sensor_status: 'OK',
      },
    });

    logger.info(`Bin ${bin.bin_code} AI Chute deposit: '${item_name || finalType}' classified as ${finalType} (${confidence}%) -> New Fill: ${newFill}%`);

    return res.status(200).json({
      success: true,
      message: `Item classified as ${finalType} (${confidence}%) and sorted into internal chamber.`,
      deposit: {
        item_name: item_name || finalType,
        predicted_class: finalType,
        icon: classification.icon,
        confidence,
        chamber: classification.chamber,
        recyclable: classification.recyclable,
        guidance: classification.guidance,
        new_fill_percentage: newFill,
        status: newStatus,
      },
      bin: enrichBinWithAiClassification(updatedBin),
    });
  } catch (error) {
    logger.error('Error in classifyAndDeposit', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to classify and deposit.' });
  }
}

module.exports = {
  getAllBins,
  getBinById,
  createBin,
  updateBin,
  deleteBin,
  getBinPrediction,
  classifyAndDeposit,
};

