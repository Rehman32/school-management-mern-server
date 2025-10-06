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

// Admin only routes
router.get('/statistics', authorize('admin'), dashboardCtrl.getStatistics);
router.get('/activities', authorize('admin'), dashboardCtrl.getRecentActivities);
router.get('/grade-distribution', authorize('admin'), dashboardCtrl.getGradeDistribution);
router.get('/teacher-summary', authorize('admin'), dashboardCtrl.getTeacherSummary);

module.exports = router;
