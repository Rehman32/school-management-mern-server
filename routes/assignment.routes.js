// server/routes/assignment.routes.js
const express = require("express");
const router = express.Router();
const { authGuard, requireRole, protect, authorize } = require("../middlewares/auth.middleware");
const assignmentCtrl = require("../controllers/assignment.controller");

router.use(protect, authorize("admin")); // admin-only for now

router.post("/", assignmentCtrl.createAssignment);
router.get("/", assignmentCtrl.listAssignments);
router.get("/class/:classId", assignmentCtrl.getAssignmentsByClass);
router.delete("/:id", assignmentCtrl.deleteAssignment);

module.exports = router;
