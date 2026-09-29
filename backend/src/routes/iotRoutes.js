const express = require('express');
const iotController = require('../controllers/iotController');

const router = express.Router();

// Protected by x-api-key header inside controller
router.post('/bin-reading', iotController.recordReading);

module.exports = router;

