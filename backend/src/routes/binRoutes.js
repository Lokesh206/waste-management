const express = require('express');
const binController = require('../controllers/binController');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

// Public / Citizen can view bins for map & finding nearby bins & predictions
router.get('/', binController.getAllBins);
router.get('/:id', binController.getBinById);
router.get('/:id/prediction', optionalAuthMiddleware, binController.getBinPrediction);
router.post('/:id/deposit', optionalAuthMiddleware, binController.classifyAndDeposit);
router.post('/:id/classify-deposit', optionalAuthMiddleware, binController.classifyAndDeposit);

// Admin only: create, update, delete bins
router.post('/', authMiddleware, roleMiddleware('admin'), binController.createBin);
router.put('/:id', authMiddleware, roleMiddleware('admin'), binController.updateBin);
router.delete('/:id', authMiddleware, roleMiddleware('admin'), binController.deleteBin);

module.exports = router;
