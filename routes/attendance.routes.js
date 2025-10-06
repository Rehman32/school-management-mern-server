
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/attendance.controller");
const { protect, authorize } = require("../middlewares/auth.middleware");

// Protect all attendance routes
router.use(protect);

// ============================================
// ATTENDANCE MARKING
// ============================================

// Mark attendance
router.post("/mark", authorize("admin", "teacher"), ctrl.markAttendance);

//    : Bulk operations
router.post("/mark-all-present", authorize("admin", "teacher"), ctrl.markAllPresent);

//    : Copy from previous day
router.post("/copy-previous", authorize("admin", "teacher"), ctrl.copyFromPreviousDay);

// ============================================
// ATTENDANCE VIEWING
// ============================================

// List attendance (with pagination)
router.get("/", authorize("admin", "teacher"), ctrl.listAttendance);

// Get specific attendance
router.get("/:id", authorize("admin", "teacher"), ctrl.getAttendanceById);

// ============================================
// ATTENDANCE UPDATES
// ============================================

// Update individual record
router.patch("/:id/record", authorize("admin", "teacher"), ctrl.updateAttendanceRecord);

// Delete attendance
router.delete("/:id", authorize("admin"), ctrl.deleteAttendance);

// ============================================
// REPORTS & ANALYTICS
// ============================================

// Class report
router.get("/report/class/:classId", authorize("admin", "teacher"), ctrl.getClassReport);

// Student report
router.get("/report/student/:studentId", authorize("admin", "teacher", "student"), ctrl.getStudentReport);

//    : Monthly statistics
router.get("/stats/monthly", authorize("admin", "teacher"), ctrl.getMonthlyStats);

module.exports = router;
