const express = require('express');
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', notificationController.getMyNotifications);
router.put('/:id/read', notificationController.markOneRead);
router.put('/read-all', notificationController.markAllRead);

module.exports = router;

