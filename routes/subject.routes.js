// ============================================
// SUBJECT ROUTES
// ============================================

const express = require("express");
const router = express.Router();
const subjectCtrl = require("../controllers/subject.controller");
const { protect, authorize } = require("../middlewares/auth.middleware");

router.use(protect);

// List & Query
router.get("/", authorize("admin", "teacher"), subjectCtrl.listSubjects);
router.get("/category/:category", authorize("admin", "teacher"), subjectCtrl.getByCategory);
router.get("/grade/:grade", authorize("admin", "teacher"), subjectCtrl.getForGrade);

// CRUD
router.get("/:id", authorize("admin", "teacher"), subjectCtrl.getSubjectById);
router.post("/", authorize("admin"), subjectCtrl.createSubject);
router.put("/:id", authorize("admin"), subjectCtrl.updateSubject);
router.delete("/:id", authorize("admin"), subjectCtrl.deleteSubject);

// Operations
router.post("/bulk-create", authorize("admin"), subjectCtrl.bulkCreateSubjects);

module.exports = router;
