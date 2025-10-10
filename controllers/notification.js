const Notification = require("../models/Notification");
const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");

// Get User Notifications
const getUserNotifications = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { 
      page = 1, 
      limit = 20, 
      unreadOnly = false, 
      type = null 
    } = req.query;

    const result = await Notification.getUserNotifications(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      unreadOnly: unreadOnly === 'true',
      type
    });

    res.status(StatusCodes.OK).json({
      success: true,
      notifications: result.notifications,
      pagination: result.pagination,
      unreadCount: result.unreadCount
    });
  } catch (error) {
    next(error);
  }
};

// Get Notification Stats
const getNotificationStats = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const stats = await Notification.getNotificationStats(userId);

    res.status(StatusCodes.OK).json({
      success: true,
      stats
    });
  } catch (error) {
    next(error);
  }
};

// Mark Notification as Read
const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const notification = await Notification.markAsRead(id, userId);
    
    if (!notification) {
      throw new CustomError.NotFoundError("Bildirim bulunamadı");
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Bildirim okundu olarak işaretlendi",
      notification
    });
  } catch (error) {
    next(error);
  }
};

// Mark All Notifications as Read
const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    await Notification.markAllAsRead(userId);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Tüm bildirimler okundu olarak işaretlendi"
    });
  } catch (error) {
    next(error);
  }
};

// Delete Notification
const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const notification = await Notification.deleteNotification(id, userId);
    
    if (!notification) {
      throw new CustomError.NotFoundError("Bildirim bulunamadı");
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Bildirim silindi"
    });
  } catch (error) {
    next(error);
  }
};

// Create Notification (Internal use)
const createNotification = async (notificationData) => {
  try {
    const notification = await Notification.createNotification(notificationData);
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Send Welcome Notification
const sendWelcomeNotification = async (userId) => {
  try {
    const notificationData = {
      user: userId,
      type: 'welcome',
      title: 'Hoş Geldiniz!',
      message: 'Sisteme katıldığınız için hoş geldiniz. İlk oylamanızı yapmaya başlayın!',
      icon: 'welcome',
      color: 'green',
      priority: 'high',
      actionUrl: '/'
    };

    return await createNotification(notificationData);
  } catch (error) {
    console.error('Error sending welcome notification:', error);
  }
};

// Send Profile Update Notification
const sendProfileUpdateNotification = async (userId) => {
  try {
    const notificationData = {
      user: userId,
      type: 'profile_update',
      title: 'Profil Güncellendi',
      message: 'Profil bilginizi başarıyla değiştirdiniz.',
      icon: 'profile',
      color: 'blue',
      priority: 'low',
      actionUrl: '/profil'
    };

    return await createNotification(notificationData);
  } catch (error) {
    console.error('Error sending profile update notification:', error);
  }
};

// Send New Vote Notification
const sendNewVoteNotification = async (userId, testData) => {
  try {
    const notificationData = {
      user: userId,
      type: 'new_vote',
      title: 'Yeni Oylama',
      message: `"${testData.categoryName}" kategorisinde yeni bir oylama başladı!`,
      icon: 'vote',
      color: 'blue',
      priority: 'high',
      actionUrl: `/kategori/${testData.categorySlug}`,
      metadata: {
        testId: testData.testId,
        categoryId: testData.categoryId
      }
    };

    return await createNotification(notificationData);
  } catch (error) {
    console.error('Error sending new vote notification:', error);
  }
};

// Send Test Voted Notification
const sendTestVotedNotification = async (userId, testData) => {
  try {
    const notificationData = {
      user: userId,
      type: 'test_voted',
      title: 'Oylama Tamamlandı',
      message: `"${testData.testTitle}" oylamasını tamamladınız.`,
      icon: 'vote',
      color: 'green',
      priority: 'medium',
      actionUrl: testData.testSlug ? `/${testData.testSlug}` : `/vote/${testData.testId}`,
      metadata: {
        testId: testData.testId,
        testSlug: testData.testSlug
      }
    };

    return await createNotification(notificationData);
  } catch (error) {
    console.error('Error sending test voted notification:', error);
  }
};

// Send Usage Stats Notification
const sendUsageStatsNotification = async (userId, stats) => {
  try {
    const notificationData = {
      user: userId,
      type: 'usage_stats',
      title: 'Kullanım İstatistikleri',
      message: `Bu hafta ${stats.voteCount} oylama yaptınız ve ${stats.categoryCount} kategoride aktif oldunuz.`,
      icon: 'stats',
      color: 'purple',
      priority: 'medium',
      actionUrl: '/profil',
      metadata: {
        stats: stats
      }
    };

    return await createNotification(notificationData);
  } catch (error) {
    console.error('Error sending usage stats notification:', error);
  }
};

// Send System Maintenance Notification
const sendSystemMaintenanceNotification = async (userId, message) => {
  try {
    const notificationData = {
      user: userId,
      type: 'system_maintenance',
      title: 'Sistem Bakımı',
      message: message || 'Sistem bakımı tamamlandı. Yeni özellikler eklendi!',
      icon: 'maintenance',
      color: 'gray',
      priority: 'low',
      actionUrl: '/hakkimizda'
    };

    return await createNotification(notificationData);
  } catch (error) {
    console.error('Error sending system maintenance notification:', error);
  }
};

module.exports = {
  getUserNotifications,
  getNotificationStats,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
  sendWelcomeNotification,
  sendProfileUpdateNotification,
  sendNewVoteNotification,
  sendTestVotedNotification,
  sendUsageStatsNotification,
  sendSystemMaintenanceNotification
};
