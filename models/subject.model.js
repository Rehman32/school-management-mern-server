// ============================================
// SUBJECT MODEL - MULTI-TENANT COMPATIBLE
// ============================================

const mongoose = require("mongoose");

const SubjectSchema = new mongoose.Schema({
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

  // ===== BASIC INFORMATION =====
  name: {
    type: String,
    required: [true, "Subject name is required"],
    trim: true,
    index: true,
  },
  code: {
    type: String,
    required: [true, "Subject code is required"],
    trim: true,
    uppercase: true,
    index: true,
  },
  description: {
    type: String,
    trim: true,
  },

  // ===== CATEGORIZATION =====
  category: {
    type: String,
    enum: ["", "core", "elective", "language", "practical", "other"],
    default: "",
  },
  type: {
    type: String,
    enum: ["", "theory", "practical", "both"],
    default: "theory",
  },

  // ===== ACADEMIC DETAILS =====
  grade: {
    type: String,
    trim: true,
  },
  stream: {
    type: String,
    enum: ["", "science", "commerce", "arts", "general"],
    default: "",
  },

  // ===== CREDIT & MARKS =====
  credits: {
    type: Number,
    min: 0,
    default: 0,
  },
  maxMarks: {
    type: Number,
    min: 0,
    default: 100,
  },
  passingMarks: {
    type: Number,
    min: 0,
    default: 35,
  },

  // ===== TEACHER ASSIGNMENT =====
  teachers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }],

  // ===== CLASS ASSIGNMENT =====
  classes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Class",
  }],

  // ===== SYLLABUS =====
  syllabus: {
    type: String,
    trim: true,
  },
  textbooks: [{
    title: String,
    author: String,
    publisher: String,
    isbn: String,
  }],

  // ===== SCHEDULE =====
  hoursPerWeek: {
    type: Number,
    min: 0,
    default: 0,
  },
  totalHours: {
    type: Number,
    min: 0,
    default: 0,
  },

  // ===== STATUS =====
  status: {
    type: String,
    enum: ["active", "inactive", "archived"],
    default: "active",
    index: true,
  },

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
SubjectSchema.index({ tenantId: 1, code: 1 }, { unique: true });
SubjectSchema.index({ tenantId: 1, name: 1 });
SubjectSchema.index({ tenantId: 1, status: 1 });
SubjectSchema.index({ tenantId: 1, isDeleted: 1 });

// ===== PRE-SAVE HOOK =====
SubjectSchema.pre("save", function(next) {
  // Backward compatibility
  if (this.schoolId && !this.tenantId) {
    this.tenantId = this.schoolId;
  }
  next();
});

module.exports = mongoose.model("Subject", SubjectSchema);
