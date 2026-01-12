// ============================================
// NOTIFICATION MODEL
// server/models/notification.model.js
// Real-time notifications for system events
// ============================================

const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  // Recipient
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  // Broadcast to all (if user is null)
  broadcast: {
    type: Boolean,
    default: false
  },
  
  // Notification type
  type: {
    type: String,
    enum: [
      'enrollment',      // New student enrolled
      'fee_due',         // Fee payment reminder
      'fee_paid',        // Fee payment received
      'attendance',      // Attendance alert
      'exam',            // Exam scheduled/results
      'announcement',    // General announcement
      'assignment',      // Teacher assignment
      'leave',           // Leave request
      'system'           // System notification
    ],
    required: true,
    index: true
  },
  
  // Content
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  
  // Related entity
  entityType: {
    type: String,
    enum: ['student', 'teacher', 'class', 'fee', 'exam', 'attendance', null]
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId
  },
  
  // Action URL
  actionUrl: String,
  
  // Status
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: Date,
  
  // Priority
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  
  // Expiry
  expiresAt: {
    type: Date,
    index: true
  }
  
}, {
  timestamps: true
});

// ============================================
// INDEXES
// ============================================
NotificationSchema.index({ user: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ broadcast: 1, createdAt: -1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL

// ============================================
// STATIC METHODS
// ============================================

// Get unread count for user
NotificationSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({
    $or: [
      { user: userId },
      { broadcast: true }
    ],
    read: false
  });
};

// Get notifications for user
NotificationSchema.statics.getForUser = async function(userId, options = {}) {
  const { limit = 20, skip = 0, unreadOnly = false } = options;
  
  const query = {
    $or: [
      { user: userId },
      { broadcast: true }
    ]
  };
  
  if (unreadOnly) {
    query.read = false;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

// Create notification
NotificationSchema.statics.notify = async function(data) {
  return this.create(data);
};

// Mark as read
NotificationSchema.statics.markAsRead = async function(notificationId, userId) {
  return this.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { read: true, readAt: new Date() },
    { new: true }
  );
};

// Mark all as read for user
NotificationSchema.statics.markAllAsRead = async function(userId) {
  return this.updateMany(
    { user: userId, read: false },
    { read: true, readAt: new Date() }
  );
};

module.exports = mongoose.model('Notification', NotificationSchema);
