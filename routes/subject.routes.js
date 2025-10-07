const express = require("express");
const router = express.Router();
const subjectCtrl = require("../controllers/subject.controller");
const { protect, authorize, injectTenant } = require("../middlewares/auth.middleware");

// Apply auth & tenant injection to all routes
router.use(protect);
router.use(injectTenant); // ADD THIS LINE - Critical!

// List & Statistics
router.get("/", authorize("admin", "teacher"), subjectCtrl.listSubjects);
router.get("/statistics", authorize("admin"), subjectCtrl.getStatistics);

// CRUD
router.get("/:id", authorize("admin", "teacher"), subjectCtrl.getSubjectById);
router.post("/", authorize("admin"), subjectCtrl.createSubject);
router.put("/:id", authorize("admin"), subjectCtrl.updateSubject);
router.delete("/:id", authorize("admin"), subjectCtrl.deleteSubject);

// Bulk Operations
router.post("/bulk-create", authorize("admin"), subjectCtrl.bulkCreateSubjects);

module.exports = router;
