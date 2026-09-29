const express = require('express');
const {
  getAnomalies,
  getMaintenanceTickets,
  getAuditLogs,
  getSystemHealth,
} = require('../controllers/adminOperationsController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware(['admin']));

router.get('/anomalies', getAnomalies);
router.get('/maintenance', getMaintenanceTickets);
router.get('/audit-logs', getAuditLogs);
router.get('/system-health', getSystemHealth);

module.exports = router;
