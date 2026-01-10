// ============================================
// CLASS MODEL - SINGLE-TENANT EDITION
// ============================================

const mongoose = require("mongoose");

const ClassSchema = new mongoose.Schema({
  // ===== CLASS INFORMATION =====
  name: {
    type: String,
    trim: true,
  },
  grade: {
    type: String,
    required: [true, "Grade is required"],
    trim: true,
    index: true,
  },
  section: {
    type: String,
    trim: true,
  },
  
  // ===== CAPACITY & ENROLLMENT =====
  maxCapacity: {
    type: Number,
    default: 40,
    min: 1,
  },
  currentEnrollment: {
    type: Number,
    default: 0,
    min: 0,
  },

  // ===== TEACHER ASSIGNMENT =====
  classTeacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },

  // ===== ACADEMIC INFO =====
  stream: {
    type: String,
    enum: ["", "science", "commerce", "arts", "general"],
    default: "",
  },
  academicYear: {
    type: String,
    default: function() {
      const year = new Date().getFullYear();
      return `${year}-${year + 1}`;
    },
  },

  // ===== LOCATION =====
  room: String,
  building: String,

  // ===== STATUS =====
  status: {
    type: String,
    enum: ["active", "inactive", "archived", "promoted"],
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
ClassSchema.index({ grade: 1, section: 1 }, { unique: true });
ClassSchema.index({ status: 1 });
ClassSchema.index({ isDeleted: 1 });

module.exports = mongoose.model("Class", ClassSchema);
