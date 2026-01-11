// ============================================
// EXAM ROUTES - WITH REPORT CARDS
// server/routes/exam.routes.js
// ============================================

const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middlewares/auth.middleware");
const examCtrl = require("../controllers/exam.controller");

// Apply auth
router.use(protect);

// ============================================
// EXAM CRUD
// ============================================

router.post("/", authorize("admin", "teacher"), examCtrl.createExam);
router.get("/", authorize("admin", "teacher"), examCtrl.listExams);

// ============================================
// GRADE MANAGEMENT
// ============================================

router.post("/:examId/grades", authorize("admin", "teacher"), examCtrl.addOrUpdateGrade);
router.get("/:examId/grades", authorize("admin", "teacher"), examCtrl.listGradesForExam);

// ============================================
// STUDENT GRADES & REPORT CARDS
// ============================================

// Get student grades
router.get("/student/:studentId", authorize("admin", "teacher"), examCtrl.getStudentGrades);

// Generate student report card
router.get("/student/:studentId/report-card", authorize("admin", "teacher"), examCtrl.generateReportCard);

// ============================================
// CLASS PERFORMANCE & ANALYTICS
// ============================================

// Get class performance report
router.get("/class/:classId/performance", authorize("admin", "teacher"), examCtrl.getClassPerformance);

// Get exam analytics
router.get("/:examId/analytics", authorize("admin", "teacher"), examCtrl.getExamAnalytics);

module.exports = router;
