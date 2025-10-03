const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/auth.middleware");
const subjectCtrl = require("../controllers/subject.controller");

router.post("/", protect, subjectCtrl.createSubject);
router.get("/", protect, subjectCtrl.getSubjects);
router.get("/:id", protect, subjectCtrl.getSubjectById);
router.put("/:id", protect, subjectCtrl.updateSubject);
router.delete("/:id", protect, subjectCtrl.deleteSubject);

module.exports = router;
