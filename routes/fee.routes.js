// ============================================
// ENHANCED FEE ROUTES - WITH RECEIPTS/INVOICES
// server/routes/fee.routes.js
// ============================================

const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middlewares/auth.middleware");
const feeCtrl = require("../controllers/fee.controller");

// Apply authentication to all routes
router.use(protect);

// ============================================
// FEE CRUD OPERATIONS
// ============================================

// List fees (with pagination and filtering)
router.get("/", authorize("admin", "teacher"), feeCtrl.listFees);

// Get statistics
router.get("/stats", authorize("admin", "teacher"), feeCtrl.getStatistics);

// Get fee summary report (with filters)
router.get("/summary-report", authorize("admin"), feeCtrl.getFeeSummaryReport);

// Get student fees
router.get("/student/:studentId", authorize("admin", "teacher"), feeCtrl.getStudentFees);

// Get student payment history
router.get("/student/:studentId/history", authorize("admin", "teacher"), feeCtrl.getPaymentHistory);

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

// ============================================
// RECEIPTS & INVOICES
// ============================================

// Generate invoice for a fee
router.get("/:id/invoice", authorize("admin", "teacher"), feeCtrl.generateInvoice);

// Generate receipt for a specific payment
router.get("/:id/receipt/:paymentId", authorize("admin", "teacher"), feeCtrl.generateReceipt);

module.exports = router;
