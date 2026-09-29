const express = require('express');
const { getCitizenRewards } = require('../controllers/ecoRewardController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.get('/rewards', getCitizenRewards);

module.exports = router;
