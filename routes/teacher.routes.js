// teacher.routes.js
// ============================================

const express = require("express");
const router = express.Router();
const teacherCtrl = require("../controllers/teacher.controller");
const { protect, authorize } = require("../middlewares/auth.middleware");

// Protect all routes
router.use(protect);

// ============================================
// TEACHER CRUD OPERATIONS
// ============================================

// List teachers (with advanced filtering)
router.get(
  "/",
  authorize("admin", "teacher"),
  teacherCtrl.listTeachers
);
router.get("/minimal", protect, authorize("admin"), teacherCtrl.getTeachersMinimal);

// Get statistics
router.get(
  "/statistics",
  authorize("admin"),
  teacherCtrl.getStatistics
);

// Get unique departments
router.get(
  "/departments",
  authorize("admin"),
  teacherCtrl.getDepartments
);

// Get teacher by ID
router.get(
  "/:id",
  authorize("admin", "teacher"),
  teacherCtrl.getTeacherById
);

// Create teacher
router.post(
  "/",
  authorize("admin"),
  teacherCtrl.createTeacher
);

// Update teacher
router.put(
  "/:id",
  authorize("admin"),
  teacherCtrl.updateTeacher
);

// Delete teacher (soft delete)
router.delete(
  "/:id",
  authorize("admin"),
  teacherCtrl.deleteTeacher
);

// ============================================
// BULK OPERATIONS
// ============================================

// Bulk update status
router.post(
  "/bulk-update-status",
  authorize("admin"),
  teacherCtrl.bulkUpdateStatus
);

// Bulk delete
router.post(
  "/bulk-delete",
  authorize("admin"),
  teacherCtrl.bulkDelete
);

module.exports = router;
