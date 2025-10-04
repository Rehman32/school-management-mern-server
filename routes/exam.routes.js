const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middlewares/auth.middleware");
const examCtrl = require("../controllers/exam.controller");

router.use(protect);
router.post("/", authorize("admin","teacher"), examCtrl.createExam);
router.get("/", authorize("admin","teacher"), examCtrl.listExams);

router.post("/:examId/grades", authorize("admin","teacher"), examCtrl.addOrUpdateGrade);
router.get("/:examId/grades", authorize("admin","teacher"), examCtrl.listGradesForExam);

router.get("/student/:studentId", authorize("admin","teacher","student"), examCtrl.getStudentGrades);

module.exports = router;
