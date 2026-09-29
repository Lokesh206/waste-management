const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);

// Analytics dashboard data for Admin
router.get('/dashboard', roleMiddleware('admin'), analyticsController.getDashboardStats);

module.exports = router;

