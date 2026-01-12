// ============================================
// SEARCH ROUTES
// server/routes/search.routes.js
// ============================================

const express = require('express');
const router = express.Router();
const SearchController = require('../controllers/search.controller');
const { protect } = require('../middlewares/auth.middleware');

// All routes require authentication
router.use(protect);

// Global search
router.get('/', SearchController.search);

// Quick stats
router.get('/quick-stats', SearchController.quickStats);

module.exports = router;
