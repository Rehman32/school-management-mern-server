// SUBJECT MODEL
// ============================================

const mongoose = require("mongoose");

const SubjectSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },

    // Basic Information
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    description: String,

    // Academic Details
    category: {
      type: String,
      enum: ["core", "elective", "optional", "extra_curricular", "language"],
      default: "core",
    },
    department: {
      type: String,
      trim: true,
    },

    // Credit & Marks
    credits: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxMarks: {
      type: Number,
      default: 100,
      min: 0,
    },
    passingMarks: {
      type: Number,
      default: 33,
      min: 0,
    },

    // Subject Type
    hasTheory: {
      type: Boolean,
      default: true,
    },
    hasPractical: {
      type: Boolean,
      default: false,
    },
    practicalMarks: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Lab Requirements
    requiresLab: {
      type: Boolean,
      default: false,
    },
    labEquipment: [String],

    // Prerequisites
    prerequisites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject",
      },
    ],

    // Order/Sequence
    displayOrder: {
      type: Number,
      default: 0,
    },

    // Applicable Grades
    applicableGrades: [String],

    // Resources
    syllabus: {
      url: String,
      uploadedAt: Date,
    },
    textbooks: [
      {
        title: String,
        author: String,
        publisher: String,
        isbn: String,
      },
    ],
    referenceMaterials: [
      {
        title: String,
        type: String,
        url: String,
      },
    ],

    // Status
    status: {
      type: String,
      enum: ["active", "inactive", "archived"],
      default: "active",
      index: true,
    },

    // Academic Year (for year-specific subjects)
    academicYears: [String],

    // Metadata
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: Date,
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { 
    timestamps: true 
  }
);

// ============================================
// INDEXES
// ============================================

// ✅ FIXED: School-scoped unique code
SubjectSchema.index(
  { schoolId: 1, code: 1 },
  { 
    unique: true,
    partialFilterExpression: { isDeleted: false }
  }
);

SubjectSchema.index({ schoolId: 1, category: 1, status: 1 });
SubjectSchema.index({ schoolId: 1, department: 1 });
SubjectSchema.index({ name: "text", code: "text", description: "text" });

// ============================================
// VIRTUAL FIELDS
// ============================================

// Total marks (theory + practical)
SubjectSchema.virtual("totalMarks").get(function() {
  return (this.maxMarks || 0) + (this.practicalMarks || 0);
});

SubjectSchema.set("toJSON", { virtuals: true });
SubjectSchema.set("toObject", { virtuals: true });

// ============================================
// STATIC METHODS
// ============================================

// Get subjects by category
SubjectSchema.statics.getByCategory = async function(schoolId, category) {
  return this.find({
    schoolId,
    category,
    status: "active",
    isDeleted: false,
  })
    .sort({ displayOrder: 1, name: 1 })
    .lean();
};

// Get subjects for grade
SubjectSchema.statics.getForGrade = async function(schoolId, grade) {
  return this.find({
    schoolId,
    applicableGrades: grade,
    status: "active",
    isDeleted: false,
  })
    .sort({ displayOrder: 1, name: 1 })
    .lean();
};

const Subject = mongoose.model("Subject", SubjectSchema);
module.exports = Subject;
