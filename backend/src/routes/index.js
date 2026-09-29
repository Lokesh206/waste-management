const express = require('express');

const authRoutes = require('./authRoutes');
const binRoutes = require('./binRoutes');
const iotRoutes = require('./iotRoutes');
const collectionRoutes = require('./collectionRoutes');
const complaintRoutes = require('./complaintRoutes');
const recyclingRoutes = require('./recyclingRoutes');
const wasteRoutes = require('./wasteRoutes');
const analyticsRoutes = require('./analyticsRoutes');
const notificationRoutes = require('./notificationRoutes');
const reportRoutes = require('./reportRoutes');
const collectorRoutes = require('./collectorRoutes');
const ecoRewardRoutes = require('./ecoRewardRoutes');
const adminRoutes = require('./adminRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/bins', binRoutes);
router.use('/iot', iotRoutes);
router.use('/collections', collectionRoutes);
router.use('/complaints', complaintRoutes);
router.use('/recycling', recyclingRoutes);
router.use('/waste', wasteRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/notifications', notificationRoutes);
router.use('/reports', reportRoutes);
router.use('/collector', collectorRoutes);
router.use('/citizen', ecoRewardRoutes);
router.use('/admin', adminRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    system: 'Smart Waste Management System (SWMS)',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;

