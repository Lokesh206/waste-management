const express = require('express');
const collectionController = require('../controllers/collectionController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.use(authMiddleware);

// View collection tasks
router.get('/', collectionController.getAllRequests);
router.get('/route/plan', roleMiddleware(['collector', 'admin']), collectionController.getPlannedRoute);
router.get('/:id', collectionController.getRequestById);

// Create collection request (Citizen or Admin)
router.post('/', collectionController.createRequest);

// Admin assigns collector
router.put('/:id/assign', roleMiddleware('admin'), collectionController.assignCollector);

// Collector updates status (Accepted, On the Way, etc.)
router.put('/:id/status', roleMiddleware(['collector', 'admin']), collectionController.updateStatus);

// Collector records collection with quantity & proof image
router.post(
  '/:id/collect',
  roleMiddleware(['collector', 'admin']),
  upload.single('proof_image'),
  collectionController.recordCollection
);

module.exports = router;

