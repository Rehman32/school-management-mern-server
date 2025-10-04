const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middlewares/auth.middleware");
const feeCtrl = require("../controllers/fee.controller");

router.use(protect);
router.get("/", authorize("admin","teacher"), feeCtrl.listFees);
router.post("/", authorize("admin"), feeCtrl.createFee);
router.put("/:id", authorize("admin"), feeCtrl.updateFee);
router.delete("/:id", authorize("admin"), feeCtrl.deleteFee);

module.exports = router;