const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authMiddleware, authController.getProfile);
router.get('/collectors', authMiddleware, roleMiddleware(['admin', 'collector']), authController.getCollectors);
router.get('/users', authMiddleware, roleMiddleware('admin'), authController.getAllUsers);

module.exports = router;

