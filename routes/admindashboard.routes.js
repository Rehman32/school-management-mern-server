// ============================================
// DASHBOARD ROUTES
// server/routes/dashboard.routes.js
// ============================================

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const dashboardCtrl = require('../controllers/admindashboard.controller');

// Protect all routes
router.use(protect);

// Admin only routes - Core Stats
router.get('/statistics', authorize('admin'), dashboardCtrl.getStatistics);
router.get('/activities', authorize('admin'), dashboardCtrl.getRecentActivities);
router.get('/grade-distribution', authorize('admin'), dashboardCtrl.getGradeDistribution);
router.get('/teacher-summary', authorize('admin'), dashboardCtrl.getTeacherSummary);

// Enhanced Analytics (Phase 2.2)
router.get('/attendance-overview', authorize('admin'), dashboardCtrl.getAttendanceOverview);
router.get('/fee-status', authorize('admin'), dashboardCtrl.getFeeStatus);
router.get('/upcoming-exams', authorize('admin'), dashboardCtrl.getUpcomingExams);
router.get('/enrollment-trends', authorize('admin'), dashboardCtrl.getEnrollmentTrends);

module.exports = router;

