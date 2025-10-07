// ============================================
// CLASS MODEL - MULTI-TENANT COMPATIBLE
// ============================================

const mongoose = require("mongoose");

const ClassSchema = new mongoose.Schema({
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
ClassSchema.index({ tenantId: 1, grade: 1, section: 1 }, { unique: true });
ClassSchema.index({ tenantId: 1, status: 1 });
ClassSchema.index({ tenantId: 1, isDeleted: 1 });

// ===== PRE-SAVE HOOK =====
ClassSchema.pre("save", function(next) {
  // Backward compatibility
  if (this.schoolId && !this.tenantId) {
    this.tenantId = this.schoolId;
  }
  next();
});

module.exports = mongoose.model("Class", ClassSchema);
