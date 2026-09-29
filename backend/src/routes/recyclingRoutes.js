const express = require('express');
const recyclingController = require('../controllers/recyclingController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);

// Recycling center and admin can view incoming waste batches
router.get('/', roleMiddleware(['recycling_center', 'admin']), recyclingController.getIncomingWaste);
router.get('/stats', roleMiddleware(['recycling_center', 'admin']), recyclingController.getRecyclingStats);

// Update processing status
router.put('/:id/status', roleMiddleware(['recycling_center', 'admin']), recyclingController.updateRecyclingStatus);

module.exports = router;

