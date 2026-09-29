/**
 * Application Logger Utility for SWMS
 * Tracks logins, API errors, IoT telemetry, AI predictions, and collection updates
 * without logging sensitive credentials.
 */

function formatMessage(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

const logger = {
  info: (message, meta) => {
    console.log(formatMessage('info', message, meta));
  },
  warn: (message, meta) => {
    console.warn(formatMessage('warn', message, meta));
  },
  error: (message, meta) => {
    console.error(formatMessage('error', message, meta));
  },
  iot: (binCode, fillPercentage, sensorStatus) => {
    console.log(formatMessage('iot', `Bin ${binCode} reported fill: ${fillPercentage}% | Sensor: ${sensorStatus}`));
  },
  auth: (action, email, success, reason = '') => {
    console.log(formatMessage('auth', `${action} for ${email}: ${success ? 'SUCCESS' : 'FAILED'}${reason ? ` (${reason})` : ''}`));
  },
  ai: (category, confidence, isDemo = false) => {
    console.log(formatMessage('ai', `Classification: ${category} (${confidence}%)${isDemo ? ' [DEMO MODE]' : ''}`));
  },
};

module.exports = logger;

