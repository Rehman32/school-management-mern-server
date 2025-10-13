// ============================================
// ENHANCED FEE ROUTES
// Fixed and Enhanced for Real School Management
// ============================================

const express = require("express");
const router = express.Router();
const { protect, authorize,injectTenant } = require("../middlewares/auth.middleware");
const feeCtrl = require("../controllers/fee.controller");

// Apply authentication to all routes
router.use(protect);
router.use(injectTenant);
// ============================================
// FEE CRUD OPERATIONS
// ============================================

// List fees (with pagination and filtering)
router.get("/", authorize("admin", "teacher", "student"), feeCtrl.listFees);

// Get statistics
router.get("/stats", authorize("admin", "teacher"), feeCtrl.getStatistics);

// Get student fees
router.get("/student/:studentId", authorize("admin", "teacher", "student"), feeCtrl.getStudentFees);

// Create fee
router.post("/", authorize("admin"), feeCtrl.createFee);

// Bulk generate fees for a class
router.post("/bulk-generate", authorize("admin"), feeCtrl.bulkGenerateFees);

// Update fee
router.put("/:id", authorize("admin"), feeCtrl.updateFee);

// Delete fee
router.delete("/:id", authorize("admin"), feeCtrl.deleteFee);

// ============================================
// PAYMENT MANAGEMENT
// ============================================

// Record a payment
router.post("/:id/payments", authorize("admin"), feeCtrl.recordPayment);

// Delete a payment record
router.delete("/:id/payments/:paymentId", authorize("admin"), feeCtrl.deletePayment);

module.exports = router;
