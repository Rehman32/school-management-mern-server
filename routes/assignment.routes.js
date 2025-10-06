// ============================================
// TEACHER ASSIGNMENT ROUTES
// ============================================

const express = require("express");
const router = express.Router();
const assignCtrl = require("../controllers/assignment.controller.js");
const { protect, authorize } = require("../middlewares/auth.middleware");

router.use(protect);
router.use(authorize("admin"));

// List & Query
router.get("/", assignCtrl.getAllAssignments);
router.get("/teacher/:teacherId", assignCtrl.getAssignmentsByTeacher);
router.get("/class/:classId", assignCtrl.getAssignmentsByClass);
router.get("/subject/:subjectId", assignCtrl.getAssignmentsBySubject);

// Timetables
router.get("/timetable/class/:classId", assignCtrl.getClassTimetable);
router.get("/timetable/teacher/:teacherId", assignCtrl.getTeacherTimetable);

// Reports
router.get("/workload", assignCtrl.getWorkloadSummary);

// Operations
router.post("/", assignCtrl.createOrUpdateAssignment);
router.delete("/teacher/:teacherId/assignment/:assignmentId", assignCtrl.removeAssignment);
router.get("/check-conflict", assignCtrl.checkConflict);
router.post("/bulk-assign", assignCtrl.bulkAssign);

module.exports = router;
