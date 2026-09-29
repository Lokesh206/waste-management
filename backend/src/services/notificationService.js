const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * Dispatches an in-app notification and optional email if SMTP credentials are configured.
 */
async function createNotification(userId, title, message, notificationType = 'system') {
  try {
    const notification = await prisma.notification.create({
      data: {
        user_id: userId,
        title,
        message,
        notification_type: notificationType,
        is_read: false,
      },
    });

    // Optional email check
    if (process.env.MAIL_SERVER && process.env.MAIL_USERNAME && process.env.MAIL_PASSWORD) {
      // In production/SMTP configured environment, nodemailer would send email here.
      logger.info(`[Email Dispatcher] Mock SMTP dispatched to user ${userId}: "${title}"`);
    }

    return notification;
  } catch (error) {
    logger.error('Failed to create notification', { error: error.message, userId, title });
    return null;
  }
}

/**
 * Retrieves notifications for a given user with unread count
 */
async function getUserNotifications(userId, limit = 20) {
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: limit,
    }),
    prisma.notification.count({
      where: { user_id: userId, is_read: false },
    }),
  ]);

  return { notifications, unreadCount };
}

/**
 * Marks a specific notification as read
 */
async function markAsRead(notificationId, userId) {
  return prisma.notification.updateMany({
    where: {
      id: notificationId,
      user_id: userId,
    },
    data: { is_read: true },
  });
}

/**
 * Marks all notifications for a user as read
 */
async function markAllAsRead(userId) {
  return prisma.notification.updateMany({
    where: {
      user_id: userId,
      is_read: false,
    },
    data: { is_read: true },
  });
}

module.exports = {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
};

