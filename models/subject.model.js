// ============================================
// SUBJECT MODEL - SINGLE-TENANT EDITION
// ============================================

const mongoose = require("mongoose");

const SubjectSchema = new mongoose.Schema({
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
    unique: true,
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
SubjectSchema.index({ name: 1 });
SubjectSchema.index({ status: 1 });
SubjectSchema.index({ isDeleted: 1 });

module.exports = mongoose.model("Subject", SubjectSchema);
