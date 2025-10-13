// ============================================
// EXAM MODEL - MULTI-TENANT COMPATIBLE
// ============================================

const mongoose = require("mongoose");

const ExamSchema = new mongoose.Schema({
  // ===== TENANT RELATIONSHIP (REQUIRED) =====
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tenant",
    required: [true, "Tenant ID is required"],
    index: true,
  },
  // Keep schoolId for backward compatibility
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "School",
    required: false,
  },

  // ===== EXAM DETAILS =====
  title: {
    type: String,
    required: [true, "Exam title is required"],
    trim: true,
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Class",
    required: [true, "Class is required"],
    index: true,
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject",
    required: [true, "Subject is required"],
    index: true,
  },

  // ===== EXAM SCHEDULE =====
  date: {
    type: Date,
    required: [true, "Exam date is required"],
  },
  startTime: String,
  endTime: String,
  duration: Number, // in minutes

  // ===== MARKS =====
  totalMarks: {
    type: Number,
    default: 100,
    min: 0,
  },
  passingMarks: {
    type: Number,
    min: 0,
  },

  // ===== EXAM TYPE =====
  examType: {
    type: String,
    enum: ["midterm", "final", "quiz", "unit test", "monthly", "other"],
    default: "other",
  },

  // ===== STATUS =====
  status: {
    type: String,
    enum: ["scheduled", "ongoing", "completed", "cancelled"],
    default: "scheduled",
    index: true,
  },

  // ===== ADDITIONAL INFO =====
  instructions: String,
  room: String,

  // ===== SOFT DELETE =====
  isDeleted: {
    type: Boolean,
    default: false,
    index: true,
  },
  deletedAt: Date,

  // ===== AUDIT =====
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
}, {
  timestamps: true,
});

// ===== INDEXES =====
ExamSchema.index({ tenantId: 1, classId: 1, date: -1 });
ExamSchema.index({ tenantId: 1, subjectId: 1 });
ExamSchema.index({ tenantId: 1, status: 1 });
ExamSchema.index({ tenantId: 1, isDeleted: 1 });

// ===== PRE-SAVE HOOK =====
ExamSchema.pre("save", function(next) {
  // Backward compatibility
  if (this.schoolId && !this.tenantId) {
    this.tenantId = this.schoolId;
  }
  next();
});

module.exports = mongoose.model("Exam", ExamSchema);
