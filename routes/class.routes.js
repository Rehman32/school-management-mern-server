const express = require("express");
const router = express.Router();
const classCtrl = require("../controllers/class.controller");
const { protect, authorize, injectTenant } = require("../middlewares/auth.middleware");

// Apply auth & tenant injection to all routes
router.use(protect);
router.use(injectTenant); // ADD THIS LINE - Critical!

// List & Statistics
router.get("/", authorize("admin", "teacher"), classCtrl.listClasses);
router.get("/statistics", authorize("admin"), classCtrl.getStatistics);

// CRUD
router.get("/:id", authorize("admin", "teacher"), classCtrl.getClassById);
router.post("/", authorize("admin"), classCtrl.createClass);
router.put("/:id", authorize("admin"), classCtrl.updateClass);
router.delete("/:id", authorize("admin"), classCtrl.deleteClass);

// Operations
router.put("/:id/enrollment", authorize("admin"), classCtrl.updateEnrollmentCount);
router.post("/bulk-create", authorize("admin"), classCtrl.bulkCreateClasses);

module.exports = router;
