const {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
} = require('../services/notificationService');

async function getMyNotifications(req, res) {
  try {
    const { notifications, unreadCount } = await getUserNotifications(req.user.id);
    return res.status(200).json({
      success: true,
      unreadCount,
      notifications,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve notifications.',
    });
  }
}

async function markOneRead(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    await markAsRead(id, req.user.id);
    return res.status(200).json({ success: true, message: 'Notification marked as read.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update notification.' });
  }
}

async function markAllRead(req, res) {
  try {
    await markAllAsRead(req.user.id);
    return res.status(200).json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update notifications.' });
  }
}

module.exports = {
  getMyNotifications,
  markOneRead,
  markAllRead,
};

