const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

/**
 * Predicts future fill rate and estimated hours until 90% critical threshold
 */
async function predictBinFill(binId, currentFill, historicalReadings = []) {
  const pythonBin = process.env.PYTHON_BIN || 'python';
  const scriptPath = path.join(__dirname, '../../../ai/predict_fill.py');

  return new Promise((resolve) => {
    let resolved = false;

    const safeResolve = (data) => {
      if (!resolved) {
        resolved = true;
        resolve(data);
      }
    };

    // 2-second timeout guard so API never hangs
    const timer = setTimeout(() => {
      safeResolve(generateFallbackPrediction(binId, currentFill, historicalReadings));
    }, 2000);

    if (!fs.existsSync(scriptPath)) {
      clearTimeout(timer);
      return safeResolve(generateFallbackPrediction(binId, currentFill, historicalReadings));
    }

    const payload = JSON.stringify({
      bin_id: binId,
      current_fill: currentFill,
      readings: historicalReadings.map((r) => ({
        fill: r.fill_percentage,
        time: r.recorded_at,
      })),
    });

    try {
      // Pass payload as command-line argument for instant Windows execution
      const py = spawn(pythonBin, [scriptPath, payload]);
      let outputData = '';

      py.stdout.on('data', (data) => {
        outputData += data.toString();
      });

      py.stderr.on('data', (data) => {
        // ignore debug stderr
      });

      py.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0 && outputData.trim()) {
          try {
            const parsed = JSON.parse(outputData.trim());
            return safeResolve(parsed);
          } catch (e) {
            logger.warn('Failed to parse Python prediction output', { error: e.message });
          }
        }
        safeResolve(generateFallbackPrediction(binId, currentFill, historicalReadings));
      });

      py.on('error', (err) => {
        clearTimeout(timer);
        logger.warn('Python prediction process error', { error: err.message });
        safeResolve(generateFallbackPrediction(binId, currentFill, historicalReadings));
      });
    } catch (err) {
      clearTimeout(timer);
      safeResolve(generateFallbackPrediction(binId, currentFill, historicalReadings));
    }
  });
}

/**
 * Fallback regression calculation based on rate of fill over time
 */
function generateFallbackPrediction(binId, currentFill, historicalReadings) {
  const targetThreshold = 90.0;
  let ratePerHour = 3.5; // Average default fill rate per hour

  if (historicalReadings && historicalReadings.length >= 2) {
    const sorted = [...historicalReadings].sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const hoursDiff = (new Date(last.recorded_at) - new Date(first.recorded_at)) / (1000 * 3600);
    const fillDiff = last.fill_percentage - first.fill_percentage;

    if (hoursDiff > 0 && fillDiff > 0) {
      ratePerHour = Math.max(0.5, Math.min(15, fillDiff / hoursDiff));
    }
  }

  let hoursToThreshold = null;
  if (currentFill < targetThreshold) {
    hoursToThreshold = Math.round(((targetThreshold - currentFill) / ratePerHour) * 10) / 10;
  } else {
    hoursToThreshold = 0;
  }

  const projected6h = Math.min(100, Math.round((currentFill + ratePerHour * 6) * 10) / 10);
  const projected12h = Math.min(100, Math.round((currentFill + ratePerHour * 12) * 10) / 10);
  const projected24h = Math.min(100, Math.round((currentFill + ratePerHour * 24) * 10) / 10);

  return {
    bin_id: binId,
    current_fill_percentage: currentFill,
    predicted_fill_6h: projected6h,
    predicted_fill_12h: projected12h,
    predicted_fill_24h: projected24h,
    fill_rate_per_hour: Math.round(ratePerHour * 10) / 10,
    predicted_time_to_threshold_hours: hoursToThreshold,
    target_threshold: targetThreshold,
    model_version: 'v1.0-linear-regression-simulation',
    is_simulation: true,
    message:
      currentFill >= targetThreshold
        ? `Bin is currently at ${currentFill}% (Exceeds critical threshold ${targetThreshold}%).`
        : `Expected to reach ${targetThreshold}% threshold in approximately ${hoursToThreshold} hours.`,
  };
}

module.exports = {
  predictBinFill,
};
