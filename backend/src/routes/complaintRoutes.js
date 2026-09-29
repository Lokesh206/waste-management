const express = require('express');
const complaintController = require('../controllers/complaintController');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

// Citizen files complaint with optional photo (public or authenticated)
router.post('/', optionalAuthMiddleware, upload.single('image'), complaintController.createComplaint);

// Citizen gets their own complaints (requires login)
router.get('/my', authMiddleware, complaintController.getMyComplaints);

// Admin gets all complaints
router.get('/', roleMiddleware('admin'), complaintController.getAllComplaints);

// Admin updates complaint status & notes
router.put('/:id/status', roleMiddleware('admin'), complaintController.updateComplaintStatus);

module.exports = router;

