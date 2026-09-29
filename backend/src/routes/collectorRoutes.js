const express = require('express');
const { updateLocation, getVehicleStatus } = require('../controllers/collectorController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware(['collector', 'admin']));

router.post('/location', updateLocation);
router.get('/vehicle', getVehicleStatus);

module.exports = router;
