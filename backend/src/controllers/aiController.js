const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { classifyWasteImage } = require('../services/aiBridge');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * Classify uploaded waste image
 * POST /api/waste/classify
 */
async function classify(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded. Please upload a JPG or PNG image.',
      });
    }

    const imageAbsolutePath = req.file.path;
    const publicUrl = `/uploads/${req.file.filename}`;

    // Call vision classifier bridge
    const aiResult = await classifyWasteImage(imageAbsolutePath);

    let userId = req.user ? req.user.id : null;
    if (!userId) {
      const defaultCitizen = await prisma.user.findFirst({ where: { role: 'citizen' } });
      userId = defaultCitizen ? defaultCitizen.id : 1;
    }

    // Save classification record in database
    const record = await prisma.wasteClassification.create({
      data: {
        user_id: userId,
        image_path: publicUrl,
        predicted_class: aiResult.predicted_class,
        confidence: aiResult.confidence,
        recyclable: aiResult.recyclable,
        model_version: aiResult.model_version,
      },
    });

    // Award citizen +10 Eco-Points
    try {
      await prisma.ecoReward.create({
        data: {
          user_id: userId,
          points: 10,
          reason: `AI Waste Scan: ${aiResult.predicted_class}`,
          reference_type: 'classification',
          reference_id: record.id,
        },
      });
    } catch (e) {
      // Ignored
    }

    return res.status(200).json({
      success: true,
      message: 'Waste image classified successfully.',
      data: {
        id: record.id,
        image_url: publicUrl,
        category: aiResult.predicted_class,
        confidence: aiResult.confidence,
        recyclable: aiResult.recyclable,
        recommendation: aiResult.recommendation,
        disposal_stream: aiResult.disposal_stream,
        model_version: aiResult.model_version,
        is_demo_mode: aiResult.is_demo_mode,
        mode_label: aiResult.mode_label || 'PyTorch Inference',
        accuracy_note: aiResult.accuracy_note,
        created_at: record.created_at,
      },
    });
  } catch (error) {
    logger.error('Error during waste classification', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to process and classify image.',
    });
  }
}

/**
 * Get user's AI classification history
 * GET /api/waste/history
 */
async function getHistory(req, res) {
  try {
    const history = await prisma.wasteClassification.findMany({
      where: { user_id: req.user.id },
      orderBy: { created_at: 'desc' },
      take: 20,
    });

    return res.status(200).json({
      success: true,
      count: history.length,
      history,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve classification history.',
    });
  }
}

module.exports = {
  classify,
  getHistory,
};
