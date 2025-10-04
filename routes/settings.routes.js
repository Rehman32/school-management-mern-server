const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middlewares/auth.middleware");
const schoolCtrl = require("../controllers/school.controller");

router.use(protect, authorize("admin"));
router.get("/profile", schoolCtrl.getProfile);
router.put("/profile", schoolCtrl.updateProfile);

module.exports = router;