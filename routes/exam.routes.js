const express = require("express");
const router = express.Router();
const { protect, authorize, injectTenant } = require("../middlewares/auth.middleware");
const examCtrl = require("../controllers/exam.controller");

// Apply auth & tenant injection
router.use(protect);
router.use(injectTenant); // ADD THIS LINE

// Exam CRUD
router.post("/", authorize("admin", "teacher"), examCtrl.createExam);
router.get("/", authorize("admin", "teacher"), examCtrl.listExams);

// Grade management
router.post("/:examId/grades", authorize("admin", "teacher"), examCtrl.addOrUpdateGrade);
router.get("/:examId/grades", authorize("admin", "teacher"), examCtrl.listGradesForExam);

// Student grades
router.get("/student/:studentId", authorize("admin", "teacher", "student"), examCtrl.getStudentGrades);

module.exports = router;
