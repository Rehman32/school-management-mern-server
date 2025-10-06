// ============================================
// ENHANCED SCHOOL ROUTES
// server/routes/school.routes.js
// ============================================

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect, authorize } = require('../middlewares/auth.middleware');
const schoolCtrl = require('../controllers/school.controller');

// ============================================
// FILE UPLOAD CONFIGURATION
// ============================================

// Storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/logos/'); // Make sure this directory exists
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter - only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|svg/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (jpeg, jpg, png, gif, svg) are allowed!'));
  }
};

// Upload middleware
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// ============================================
// ROUTES
// ============================================

// Protect all routes - admin only
router.use(protect, authorize('admin'));

// Profile routes
router.get('/profile', schoolCtrl.getProfile);
router.put('/profile', schoolCtrl.updateProfile);
router.get('/statistics', schoolCtrl.getStatistics);

// Logo upload route
router.post('/upload-logo', upload.single('logo'), schoolCtrl.uploadLogo);

// Academic year routes
router.put('/academic-year', schoolCtrl.updateAcademicYear);
router.delete('/academic-year/:year', schoolCtrl.deleteAcademicYear);

// School timings routes
router.put('/timings', schoolCtrl.updateSchoolTimings);

// Grading system routes
router.put('/grading-system', schoolCtrl.updateGradingSystem);

// System settings routes
router.put('/system-settings', schoolCtrl.updateSystemSettings);

// Contact persons routes
router.post('/contact-persons', schoolCtrl.addContactPerson);
router.put('/contact-persons/:id', schoolCtrl.updateContactPerson);
router.delete('/contact-persons/:id', schoolCtrl.deleteContactPerson);

module.exports = router;
