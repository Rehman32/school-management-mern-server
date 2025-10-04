const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/attendance.controller");
const { protect, authorize } = require("../middlewares/auth.middleware");

// protect all attendance routes
router.use(protect);

// admin and teacher can mark/view attendance; students only view their reports
router.post("/mark", authorize("admin", "teacher"), ctrl.markAttendance);
router.get("/", authorize("admin", "teacher"), ctrl.listAttendance);
router.get("/:id", authorize("admin", "teacher"), ctrl.getAttendanceById);
router.patch("/:id/record", authorize("admin", "teacher"), ctrl.updateAttendanceRecord);
router.delete("/:id", authorize("admin"), ctrl.deleteAttendance);

// reports
router.get("/report/class/:classId", authorize("admin", "teacher"), ctrl.getClassReport);
router.get("/report/student/:studentId", authorize("admin", "teacher", "student"), ctrl.getStudentReport);

module.exports = router;