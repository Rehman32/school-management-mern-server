const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/auth.middleware");
const classCtrl = require("../controllers/class.controller");

router.post("/", protect, classCtrl.createClass);
router.get("/", protect, classCtrl.getClasses);
router.get("/:id", protect, classCtrl.getClassById);
router.put("/:id", protect, classCtrl.updateClass);
router.delete("/:id", protect, classCtrl.deleteClass);

module.exports = router;
