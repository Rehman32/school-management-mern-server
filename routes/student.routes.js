//student.routes.js
const express = require('express');
const router = express.Router();
const studentController = require('../controllers/student.controller');
const { protect, authorize ,injectTenant} = require('../middlewares/auth.middleware');

// Protect all routes
router.use(protect);
router.use(injectTenant); 

// ============================================
// STUDENT CRUD OPERATIONS
// ============================================

// Get all students (with pagination, search, filters)
router.get(
  '/getAllStudents',
  authorize('admin', 'teacher'),
  studentController.getAllStudents
);

// Get statistics
router.get(
  '/statistics',
  authorize('admin'),
  studentController.getStatistics
);

// Get student by ID
router.get(
  '/getStudentById/:id',
  authorize('admin', 'teacher'),
  studentController.getStudentById
);

// Create student
router.post(
  '/createStudent',
  authorize('admin'),
  studentController.createStudent
);

// Update student
router.put(
  '/updateStudent/:id',
  authorize('admin'),
  studentController.updateStudent
);

// Delete student
router.delete(
  '/deleteStudent/:id',
  authorize('admin'),
  studentController.deleteStudent
);

// ============================================
// BULK OPERATIONS
// ============================================

// Bulk promote students
router.post(
  '/bulk-promote',
  authorize('admin'),
  studentController.bulkPromote
);

// Bulk delete students
router.post(
  '/bulk-delete',
  authorize('admin'),
  studentController.bulkDelete
);

module.exports = router;
