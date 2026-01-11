// ============================================
// STUDENT ROUTES - ENHANCED
// server/routes/student.routes.js
// ============================================

const express = require('express');
const router = express.Router();
const studentController = require('../controllers/student.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const { uploadStudentPhoto, uploadStudentDocument } = require('../config/multer');

// Protect all routes
router.use(protect); 

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

// ============================================
// PHOTO MANAGEMENT
// ============================================

// Upload student photo
router.post(
  '/:id/photo',
  authorize('admin'),
  uploadStudentPhoto.single('photo'),
  studentController.uploadPhoto
);

// Delete student photo
router.delete(
  '/:id/photo',
  authorize('admin'),
  studentController.deletePhoto
);

// ============================================
// DOCUMENT MANAGEMENT
// ============================================

// Get student documents
router.get(
  '/:id/documents',
  authorize('admin', 'teacher'),
  studentController.getDocuments
);

// Upload student document
router.post(
  '/:id/documents',
  authorize('admin'),
  uploadStudentDocument.single('document'),
  studentController.uploadDocument
);

// Delete student document
router.delete(
  '/:id/documents/:documentId',
  authorize('admin'),
  studentController.deleteDocument
);

module.exports = router;
