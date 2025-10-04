const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middlewares/auth.middleware");
const ctrl = require("../controllers/timetable.controller");

router.use(protect);
router.post("/", authorize("admin"), ctrl.createEntry);
router.get("/class/:classId", authorize("admin","teacher"), ctrl.listByClass);
router.put("/:id", authorize("admin"), ctrl.updateEntry);
router.delete("/:id", authorize("admin"), ctrl.deleteEntry);

module.exports = router;
