const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: true 
    },
    type: {
      type: String,
      required: true,
      enum: [
        'new_vote',
        'welcome',
        'usage_stats',
        'profile_update',
        'category_vote',
        'system_maintenance',
        'test_created',
        'test_voted',
        'test_completed'
      ]
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    icon: {
      type: String,
      default: 'bell'
    },
    color: {
      type: String,
      default: 'blue',
      enum: ['blue', 'green', 'red', 'purple', 'orange', 'gray', 'yellow']
    },
    priority: {
      type: String,
      default: 'medium',
      enum: ['low', 'medium', 'high']
    },
    isRead: {
      type: Boolean,
      default: false
    },
    actionUrl: {
      type: String,
      default: '/'
    },
    // Additional data for specific notification types
    metadata: {
      testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' },
      categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'TestCategory' },
      voteCount: { type: Number },
      stats: {
        type: mongoose.Schema.Types.Mixed
      }
    }
  },
  { 
    timestamps: true 
  }
);

// Index for efficient queries
NotificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ type: 1, createdAt: -1 });

// Static method to create notification
NotificationSchema.statics.createNotification = async function(notificationData) {
  try {
    const notification = new this(notificationData);
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Static method to get user notifications
NotificationSchema.statics.getUserNotifications = async function(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    unreadOnly = false,
    type = null
  } = options;

  const filter = { user: userId };
  if (unreadOnly) filter.isRead = false;
  if (type) filter.type = type;

  const skip = (page - 1) * limit;

  const notifications = await this.find(filter)
    .populate('metadata.testId', 'title category')
    .populate('metadata.categoryId', 'name slug')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await this.countDocuments(filter);
  const unreadCount = await this.countDocuments({ user: userId, isRead: false });

  return {
    notifications,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      itemsPerPage: parseInt(limit)
    },
    unreadCount
  };
};

// Static method to mark as read
NotificationSchema.statics.markAsRead = async function(notificationId, userId) {
  return await this.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { isRead: true },
    { new: true }
  );
};

// Static method to mark all as read
NotificationSchema.statics.markAllAsRead = async function(userId) {
  return await this.updateMany(
    { user: userId, isRead: false },
    { isRead: true }
  );
};

// Static method to delete notification
NotificationSchema.statics.deleteNotification = async function(notificationId, userId) {
  return await this.findOneAndDelete({ _id: notificationId, user: userId });
};

// Static method to get notification stats
NotificationSchema.statics.getNotificationStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        unread: { $sum: { $cond: ['$isRead', 0, 1] } },
        read: { $sum: { $cond: ['$isRead', 1, 0] } }
      }
    }
  ]);

  return stats[0] || { total: 0, unread: 0, read: 0 };
};

const Notification = mongoose.model("Notification", NotificationSchema);

module.exports = Notification;
