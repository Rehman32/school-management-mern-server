// ============================================
// GRADE MODEL - MULTI-TENANT COMPATIBLE
// ============================================

const mongoose = require("mongoose");

const GradeSchema = new mongoose.Schema({
  // ===== TENANT RELATIONSHIP =====
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tenant",
    required: true,
    index: true,
  },
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "School",
    required: false,
  },

  // ===== EXAM & STUDENT =====
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Exam",
    required: true,
    index: true,
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
    index: true,
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject",
    required: true,
  },

  // ===== MARKS =====
  marksObtained: {
    type: Number,
    required: true,
    min: 0,
  },
  totalMarks: Number,

  // ===== GRADE INFO =====
  grade: String, // A+, A, B+, etc.
  percentage: Number,
  isPassed: Boolean,

  // ===== REMARKS =====
  remark: String,
  teacherComment: String,

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

// ===== UNIQUE CONSTRAINT =====
// One grade per student per exam per subject
GradeSchema.index(
  { tenantId: 1, examId: 1, studentId: 1, subjectId: 1 },
  { unique: true }
);

// ===== INDEXES =====
GradeSchema.index({ tenantId: 1, studentId: 1 });
GradeSchema.index({ tenantId: 1, examId: 1 });

// ===== PRE-SAVE HOOK =====
GradeSchema.pre("save", function(next) {
  if (this.schoolId && !this.tenantId) {
    this.tenantId = this.schoolId;
  }
  next();
});

module.exports = mongoose.model("Grade", GradeSchema);
