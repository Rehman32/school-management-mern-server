// ============================================
// EXAM MODEL - SINGLE-TENANT EDITION
// ============================================

const mongoose = require("mongoose");

const ExamSchema = new mongoose.Schema({
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
ExamSchema.index({ classId: 1, date: -1 });
ExamSchema.index({ subjectId: 1 });
ExamSchema.index({ status: 1 });
ExamSchema.index({ isDeleted: 1 });

module.exports = mongoose.model("Exam", ExamSchema);
