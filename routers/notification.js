const express = require('express');
const {
  getUserNotifications,
  getNotificationStats,
  markAsRead,
  markAllAsRead,
  deleteNotification
} = require('../controllers/notification');
const { isAuthenticated } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(isAuthenticated);

// Get user notifications
router.get('/', getUserNotifications);

// Get notification stats
router.get('/stats', getNotificationStats);

// Mark notification as read
router.patch('/:id/read', markAsRead);

// Mark all notifications as read
router.patch('/read-all', markAllAsRead);

// Delete notification
router.delete('/:id', deleteNotification);

module.exports = router;
