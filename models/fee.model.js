// ============================================
// ENHANCED FEE MODEL
// Fixed and Enhanced for Real School Management
// ============================================

const mongoose = require("mongoose");

// Payment Record Sub-Schema
const PaymentRecordSchema = new mongoose.Schema({
  amount: { 
    type: Number, 
    required: true,
    min: [0.01, "Payment amount must be positive"]
  },
  date: { 
    type: Date, 
    default: Date.now,
    required: true 
  },
  method: { 
    type: String, 
    enum: ["cash", "card", "bank_transfer", "cheque", "online", "other"],
    default: "cash"
  },
  transactionId: String,
  providerReference: String,
  notes: String,
  receivedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  }
}, { 
  _id: true,
  timestamps: true 
});

// Main Fee Schema
const FeeSchema = new mongoose.Schema({
  schoolId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "School", 
    required: true, 
    index: true 
  },
  student: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Student", 
    required: true, 
    index: true 
  },
  
  // Fee Details
  feeType: {
    type: String,
    enum: ["tuition", "transport", "library", "lab", "sports", "exam", "admission", "annual", "other"],
    default: "tuition"
  },
  amount: { 
    type: Number, 
    required: true,
    min: [0.01, "Amount must be positive"]
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Date Fields
  dueDate: { 
    type: Date, 
    required: true,
    index: true 
  },
  month: { 
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^\d{4}-(0[1-9]|1[0-2])$/.test(v); // YYYY-MM
      },
      message: "Month must be in format YYYY-MM"
    }
  },
  academicYear: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^\d{4}-\d{4}$/.test(v); // 2024-2025
      },
      message: "Academic year must be in format YYYY-YYYY"
    }
  },
  
  // Status Management
  status: { 
    type: String, 
    enum: ["pending", "paid", "partial", "overdue", "waived"],
    default: "pending",
    index: true
  },
  
  // Discount/Waiver
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  discountReason: String,
  
  // Late Fee
  lateFee: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Payment Records
  paymentRecords: { 
    type: [PaymentRecordSchema], 
    default: [] 
  },
  
  // Notes
  notes: String,
  internalNotes: String, // Admin only
  
  // Audit Trail
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  },
  updatedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  }
}, { 
  timestamps: true 
});

// ============================================
// INDEXES FOR PERFORMANCE
// ============================================
FeeSchema.index({ schoolId: 1, student: 1, month: 1 });
FeeSchema.index({ schoolId: 1, status: 1, dueDate: 1 });
FeeSchema.index({ schoolId: 1, feeType: 1 });
FeeSchema.index({ schoolId: 1, academicYear: 1 });

// ============================================
// VIRTUAL FIELDS
// ============================================

// Calculate remaining balance
FeeSchema.virtual("balance").get(function() {
  return this.amount + this.lateFee - this.discount - this.paidAmount;
});

// Check if overdue
FeeSchema.virtual("isOverdue").get(function() {
  if (this.status === "paid" || this.status === "waived") return false;
  return new Date() > new Date(this.dueDate) && this.balance > 0;
});

// Calculate total amount
FeeSchema.virtual("totalAmount").get(function() {
  return this.amount + this.lateFee - this.discount;
});

// Enable virtuals in JSON
FeeSchema.set("toJSON", { virtuals: true });
FeeSchema.set("toObject", { virtuals: true });

// ============================================
// MIDDLEWARE - AUTO-UPDATE STATUS
// ============================================

FeeSchema.pre("save", function(next) {
  // Calculate paid amount from payment records
  if (this.paymentRecords && this.paymentRecords.length > 0) {
    this.paidAmount = this.paymentRecords.reduce((sum, record) => sum + record.amount, 0);
  }
  
  // Update status based on payment
  const totalDue = this.amount + this.lateFee - this.discount;
  
  if (this.paidAmount >= totalDue) {
    this.status = "paid";
  } else if (this.paidAmount > 0 && this.paidAmount < totalDue) {
    this.status = "partial";
  } else if (this.paidAmount === 0 && new Date() > new Date(this.dueDate)) {
    this.status = "overdue";
  } else if (this.paidAmount === 0) {
    this.status = "pending";
  }
  
  next();
});

// ============================================
// STATIC METHODS
// ============================================

// Get statistics for a school
FeeSchema.statics.getSchoolStats = async function(schoolId, filters = {}) {
  const match = { schoolId, ...filters };
  
  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalFees: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
        totalPaid: { $sum: "$paidAmount" },
        totalDiscount: { $sum: "$discount" },
        totalLateFee: { $sum: "$lateFee" },
        totalPending: { 
          $sum: { 
            $cond: [
              { $eq: ["$status", "pending"] }, 
              { $subtract: [{ $add: ["$amount", "$lateFee"] }, { $add: ["$paidAmount", "$discount"] }] }, 
              0
            ] 
          } 
        },
        totalOverdue: { 
          $sum: { 
            $cond: [
              { $eq: ["$status", "overdue"] }, 
              { $subtract: [{ $add: ["$amount", "$lateFee"] }, { $add: ["$paidAmount", "$discount"] }] }, 
              0
            ] 
          } 
        },
        totalPartial: { 
          $sum: { 
            $cond: [
              { $eq: ["$status", "partial"] }, 
              { $subtract: [{ $add: ["$amount", "$lateFee"] }, { $add: ["$paidAmount", "$discount"] }] }, 
              0
            ] 
          } 
        }
      }
    }
  ]);
  
  return stats[0] || {
    totalFees: 0,
    totalAmount: 0,
    totalPaid: 0,
    totalDiscount: 0,
    totalLateFee: 0,
    totalPending: 0,
    totalOverdue: 0,
    totalPartial: 0
  };
};

// Get fees by student
FeeSchema.statics.getStudentFees = async function(schoolId, studentId) {
  return this.find({ schoolId, student: studentId })
    .populate("student", "fullName rollNumber class")
    .sort({ dueDate: -1 });
};

module.exports = mongoose.model("Fee", FeeSchema);
