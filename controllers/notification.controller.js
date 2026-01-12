// ============================================
// NOTIFICATION CONTROLLER
// server/controllers/notification.controller.js
// ============================================

const Notification = require('../models/notification.model');
const ApiResponse = require('../utils/response');

class NotificationController {
  /**
   * Get notifications for current user
   * GET /api/notifications
   */
  static async list(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 20, skip = 0, unreadOnly = false } = req.query;

      const notifications = await Notification.getForUser(userId, {
        limit: parseInt(limit),
        skip: parseInt(skip),
        unreadOnly: unreadOnly === 'true'
      });

      const unreadCount = await Notification.getUnreadCount(userId);

      return ApiResponse.success(res, {
        notifications,
        unreadCount,
        hasMore: notifications.length === parseInt(limit)
      });

    } catch (err) {
      console.error('Get notifications error:', err);
      return ApiResponse.error(res, 'Failed to get notifications', 500);
    }
  }

  /**
   * Get unread count
   * GET /api/notifications/unread-count
   */
  static async unreadCount(req, res) {
    try {
      const count = await Notification.getUnreadCount(req.user.id);
      return ApiResponse.success(res, { count });
    } catch (err) {
      console.error('Get unread count error:', err);
      return ApiResponse.error(res, 'Failed to get count', 500);
    }
  }

  /**
   * Mark notification as read
   * PUT /api/notifications/:id/read
   */
  static async markAsRead(req, res) {
    try {
      const notification = await Notification.markAsRead(req.params.id, req.user.id);
      
      if (!notification) {
        return ApiResponse.error(res, 'Notification not found', 404);
      }

      return ApiResponse.success(res, notification, 'Marked as read');
    } catch (err) {
      console.error('Mark as read error:', err);
      return ApiResponse.error(res, 'Failed to mark as read', 500);
    }
  }

  /**
   * Mark all as read
   * PUT /api/notifications/read-all
   */
  static async markAllAsRead(req, res) {
    try {
      await Notification.markAllAsRead(req.user.id);
      return ApiResponse.success(res, null, 'All notifications marked as read');
    } catch (err) {
      console.error('Mark all as read error:', err);
      return ApiResponse.error(res, 'Failed to mark all as read', 500);
    }
  }

  /**
   * Create notification (internal/admin use)
   * POST /api/notifications
   */
  static async create(req, res) {
    try {
      const { type, title, message, userId, broadcast, entityType, entityId, actionUrl, priority } = req.body;

      if (!type || !title || !message) {
        return ApiResponse.error(res, 'Type, title, and message are required', 400);
      }

      const notification = await Notification.create({
        user: userId || null,
        broadcast: broadcast || false,
        type,
        title,
        message,
        entityType,
        entityId,
        actionUrl,
        priority: priority || 'medium'
      });

      return ApiResponse.created(res, notification, 'Notification created');
    } catch (err) {
      console.error('Create notification error:', err);
      return ApiResponse.error(res, 'Failed to create notification', 500);
    }
  }

  /**
   * Delete notification
   * DELETE /api/notifications/:id
   */
  static async delete(req, res) {
    try {
      const notification = await Notification.findOneAndDelete({
        _id: req.params.id,
        user: req.user.id
      });

      if (!notification) {
        return ApiResponse.error(res, 'Notification not found', 404);
      }

      return ApiResponse.success(res, null, 'Notification deleted');
    } catch (err) {
      console.error('Delete notification error:', err);
      return ApiResponse.error(res, 'Failed to delete notification', 500);
    }
  }

  /**
   * Clear all notifications
   * DELETE /api/notifications/clear-all
   */
  static async clearAll(req, res) {
    try {
      await Notification.deleteMany({ user: req.user.id });
      return ApiResponse.success(res, null, 'All notifications cleared');
    } catch (err) {
      console.error('Clear all error:', err);
      return ApiResponse.error(res, 'Failed to clear notifications', 500);
    }
  }
}

// ============================================
// NOTIFICATION SERVICE (for internal use)
// ============================================
class NotificationService {
  static async notifyEnrollment(studentName, classInfo) {
    return Notification.create({
      broadcast: true,
      type: 'enrollment',
      title: 'New Student Enrolled',
      message: `${studentName} has been enrolled in ${classInfo}`,
      priority: 'medium'
    });
  }

  static async notifyFeeDue(userId, studentName, amount, dueDate) {
    return Notification.create({
      user: userId,
      type: 'fee_due',
      title: 'Fee Payment Reminder',
      message: `Fee of ₹${amount} for ${studentName} is due on ${dueDate}`,
      priority: 'high',
      actionUrl: '/admin/fees'
    });
  }

  static async notifyFeePayment(userId, studentName, amount) {
    return Notification.create({
      user: userId,
      type: 'fee_paid',
      title: 'Fee Payment Received',
      message: `Payment of ₹${amount} received for ${studentName}`,
      priority: 'low'
    });
  }

  static async notifyLowAttendance(userId, studentName, percentage) {
    return Notification.create({
      user: userId,
      type: 'attendance',
      title: 'Low Attendance Alert',
      message: `${studentName} has ${percentage}% attendance this month`,
      priority: 'high',
      actionUrl: '/admin/attendance'
    });
  }

  static async notifyExamScheduled(classId, examName, date) {
    return Notification.create({
      broadcast: true,
      type: 'exam',
      title: 'Exam Scheduled',
      message: `${examName} scheduled for ${date}`,
      entityType: 'exam',
      priority: 'medium'
    });
  }

  static async broadcast(title, message, type = 'announcement') {
    return Notification.create({
      broadcast: true,
      type,
      title,
      message,
      priority: 'medium'
    });
  }
}

module.exports = { NotificationController, NotificationService };
