// ============================================
// NOTIFICATION ROUTES
// server/routes/notification.routes.js
// ============================================

const express = require('express');
const router = express.Router();
const { NotificationController } = require('../controllers/notification.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

// All routes require authentication
router.use(protect);

// Get notifications for current user
router.get('/', NotificationController.list);

// Get unread count
router.get('/unread-count', NotificationController.unreadCount);

// Mark all as read
router.put('/read-all', NotificationController.markAllAsRead);

// Clear all notifications
router.delete('/clear-all', NotificationController.clearAll);

// Mark single as read
router.put('/:id/read', NotificationController.markAsRead);

// Delete single notification
router.delete('/:id', NotificationController.delete);

// Create notification (admin only)
router.post('/', authorize('admin'), NotificationController.create);

module.exports = router;
