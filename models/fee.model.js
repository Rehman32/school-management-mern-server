// ============================================
// FEE MODEL - SINGLE-TENANT EDITION
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
  // ===== STUDENT =====
  student: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Student", 
    required: [true, "Student is required"],
    index: true 
  },
  
  // ===== FEE DETAILS =====
  feeType: {
    type: String,
    enum: ["tuition", "transport", "library", "lab", "sports", "exam", "admission", "annual", "other"],
    default: "tuition",
    index: true
  },
  amount: { 
    type: Number, 
    required: [true, "Amount is required"],
    min: [0.01, "Amount must be positive"]
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // ===== DATE FIELDS =====
  dueDate: { 
    type: Date, 
    required: [true, "Due date is required"],
    index: true 
  },
  month: { 
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
      },
      message: "Month must be in format YYYY-MM"
    }
  },
  academicYear: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^\d{4}-\d{4}$/.test(v);
      },
      message: "Academic year must be in format YYYY-YYYY"
    }
  },
  
  // ===== STATUS =====
  status: { 
    type: String, 
    enum: ["pending", "paid", "partial", "overdue", "waived"],
    default: "pending",
    index: true
  },
  
  // ===== DISCOUNT/WAIVER =====
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  discountReason: String,
  
  // ===== LATE FEE =====
  lateFee: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // ===== PAYMENT RECORDS =====
  paymentRecords: { 
    type: [PaymentRecordSchema], 
    default: [] 
  },
  
  // ===== NOTES =====
  notes: String,
  internalNotes: String,
  
  // ===== AUDIT =====
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

// ===== INDEXES =====
FeeSchema.index({ student: 1, month: 1 });
FeeSchema.index({ status: 1, dueDate: 1 });
FeeSchema.index({ feeType: 1 });
FeeSchema.index({ academicYear: 1 });

// ===== VIRTUAL FIELDS =====
FeeSchema.virtual("balance").get(function() {
  return this.amount + this.lateFee - this.discount - this.paidAmount;
});

FeeSchema.virtual("isOverdue").get(function() {
  if (this.status === "paid" || this.status === "waived") return false;
  return new Date() > new Date(this.dueDate) && this.balance > 0;
});

FeeSchema.virtual("totalAmount").get(function() {
  return this.amount + this.lateFee - this.discount;
});

FeeSchema.set("toJSON", { virtuals: true });
FeeSchema.set("toObject", { virtuals: true });

// ===== PRE-SAVE HOOK =====
FeeSchema.pre("save", function(next) {
  // Calculate paid amount
  if (this.paymentRecords && this.paymentRecords.length > 0) {
    this.paidAmount = this.paymentRecords.reduce((sum, record) => sum + record.amount, 0);
  }
  
  // Update status
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

// ===== STATIC METHODS =====
FeeSchema.statics.getStats = async function(filters = {}) {
  const match = { ...filters };
  
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
    totalOverdue: 0
  };
};

FeeSchema.statics.getStudentFees = async function(studentId) {
  return this.find({ student: studentId })
    .populate("student", "fullName rollNumber class")
    .sort({ dueDate: -1 });
};

module.exports = mongoose.model("Fee", FeeSchema);
