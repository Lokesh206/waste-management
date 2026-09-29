const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// Recyclability rules and recommendations for 8 waste categories
const CATEGORY_RULES = {
  Plastic: {
    recyclable: true,
    recommendation: 'Rinse container and place in designated plastic recycling bin. Avoid single-use plastic when possible.',
    disposalStream: 'Dry Recyclables / Plastic Stream',
  },
  Paper: {
    recyclable: true,
    recommendation: 'Keep dry, flatten cardboard cartons, and place in clean paper recycling bin.',
    disposalStream: 'Paper & Cardboard Stream',
  },
  Glass: {
    recyclable: true,
    recommendation: 'Rinse bottles/jars thoroughly. Do not break. Place in glass collection container.',
    disposalStream: 'Glass Recycling Stream',
  },
  Metal: {
    recyclable: true,
    recommendation: 'Clean food/beverage cans. Highly recyclable aluminum and steel streams.',
    disposalStream: 'Metal / Scrap Stream',
  },
  Organic: {
    recyclable: true,
    recommendation: 'Segregate food scraps and organic biomass into green bins for aerobic composting and biogas.',
    disposalStream: 'Organic / Wet Waste Stream',
  },
  'E-Waste': {
    recyclable: true,
    recommendation: 'Contains precious metals and heavy toxins. Hand over to authorized municipal e-waste drop-off center.',
    disposalStream: 'Certified E-Waste Facility',
  },
  Hazardous: {
    recyclable: false,
    recommendation: 'CAUTION: Medical, chemical, or battery hazard. Seal properly and contact hazardous waste authorities.',
    disposalStream: 'Hazardous Waste Processing',
  },
  Other: {
    recyclable: false,
    recommendation: 'Non-recyclable composite or contaminated residual waste. Dispose in general waste stream.',
    disposalStream: 'General Landfill / Incineration Stream',
  },
};

/**
 * Executes Python image classification or falls back to transparent AI Demo Mode
 */
async function classifyWasteImage(imageAbsolutePath) {
  const pythonBin = process.env.PYTHON_BIN || 'python';
  const scriptPath = path.join(__dirname, '../../../ai/predict.py');

  return new Promise((resolve) => {
    // Check if script exists
    if (!fs.existsSync(scriptPath)) {
      const demoResult = generateDemoClassification(imageAbsolutePath);
      return resolve(demoResult);
    }

    const py = spawn(pythonBin, [scriptPath, imageAbsolutePath]);
    let outputData = '';
    let errorData = '';

    py.stdout.on('data', (data) => {
      outputData += data.toString();
    });

    py.stderr.on('data', (data) => {
      errorData += data.toString();
    });

    py.on('close', (code) => {
      if (code === 0 && outputData.trim()) {
        try {
          const parsed = JSON.parse(outputData.trim());
          const category = parsed.predicted_class || 'Plastic';
          const rule = CATEGORY_RULES[category] || CATEGORY_RULES.Other;

          logger.ai(category, parsed.confidence, false);
          return resolve({
            predicted_class: category,
            confidence: parsed.confidence,
            recyclable: rule.recyclable,
            recommendation: rule.recommendation,
            disposal_stream: rule.disposalStream,
            model_version: parsed.model_version || 'v1.0-mobilenetv2',
            is_demo_mode: false,
            accuracy_note: 'Distinction: Prediction confidence reflects model certainty for this specific sample, not overall training benchmark accuracy.',
          });
        } catch (e) {
          logger.warn('Failed to parse Python AI output, falling back to Demo Mode', { error: e.message });
        }
      }

      // If python fails or weights missing, use transparent demo mode
      const demoResult = generateDemoClassification(imageAbsolutePath);
      resolve(demoResult);
    });

    py.on('error', (err) => {
      logger.warn('Could not launch Python AI process, invoking Demo Mode', { error: err.message });
      resolve(generateDemoClassification(imageAbsolutePath));
    });
  });
}

/**
 * Transparent AI Demo Mode fallback
 */
function generateDemoClassification(imagePath) {
  const categories = ['Plastic', 'Paper', 'Glass', 'Metal', 'Organic', 'E-Waste'];
  // Derive a deterministic pseudo-category from filename so the same image gives consistent results
  const filename = path.basename(imagePath || 'demo.jpg');
  let hash = 0;
  for (let i = 0; i < filename.length; i++) {
    hash = (hash << 5) - hash + filename.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % categories.length;
  const category = categories[index];
  const confidence = Math.round((88.5 + (Math.abs(hash) % 100) / 10) * 10) / 10;
  const rule = CATEGORY_RULES[category];

  logger.ai(category, confidence, true);

  return {
    predicted_class: category,
    confidence: Math.min(99.4, confidence),
    recyclable: rule.recyclable,
    recommendation: rule.recommendation,
    disposal_stream: rule.disposalStream,
    model_version: 'v1.0-mobilenetv2-simulation',
    is_demo_mode: true,
    mode_label: 'AI DEMO MODE (Model weights simulation)',
    accuracy_note: 'Notice: This result is generated in Demo Mode for demonstration/testing purposes.',
  };
}

module.exports = {
  CATEGORY_RULES,
  classifyWasteImage,
};

