const express = require('express');
const aiController = require('../controllers/aiController');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

// Upload waste image for AI classification (public or authenticated)
router.post('/classify', optionalAuthMiddleware, upload.single('image'), aiController.classify);

// User's AI classification history (requires login)
router.get('/history', authMiddleware, aiController.getHistory);

module.exports = router;

