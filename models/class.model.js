// CLASS MODEL
// 
// ============================================

const mongoose = require("mongoose");

const ClassSchema = new mongoose.Schema(
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
      trim: true,
    },
    grade: {
      type: String,
      required: true,
      trim: true,
    },
    section: {
      type: String,
      trim: true,
      uppercase: true,
    },
    
    // Academic Year
    academicYear: {
      type: String,
      required: true,
      default: function() {
        const year = new Date().getFullYear();
        return `${year}-${year + 1}`;
      },
      index: true,
    },

    // Class Teacher
    classTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
    },

    // Capacity & Enrollment
    maxCapacity: {
      type: Number,
      default: 40,
      min: 1,
      max: 100,
    },
    currentEnrollment: {
      type: Number,
      default: 0,
      min: 0,
    },
    maleCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    femaleCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Room & Location
    room: {
      type: String,
      trim: true,
    },
    building: {
      type: String,
      trim: true,
    },
    floor: String,

    // Stream/Specialization (for higher grades)
    stream: {
      type: String,
      enum: ["", "science", "commerce", "arts", "general"],
      default: "",
    },

    // Status
    status: {
      type: String,
      enum: ["active", "archived", "promoted", "inactive"],
      default: "active",
      index: true,
    },

    // Promotion Tracking
    promotedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
    },
    promotedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
    },
    promotionDate: Date,

    // Class Monitors/Prefects
    monitors: [
      {
        student: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Student",
        },
        role: {
          type: String,
          enum: ["head", "assistant", "subject"],
        },
      },
    ],

    // Metadata
    notes: String,
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

// ✅ FIXED: Compound unique for grade+section per school per year
ClassSchema.index(
  { schoolId: 1, grade: 1, section: 1, academicYear: 1 },
  { 
    unique: true,
    partialFilterExpression: { isDeleted: false }
  }
);

ClassSchema.index({ schoolId: 1, academicYear: 1, status: 1 });
ClassSchema.index({ schoolId: 1, classTeacher: 1 });
ClassSchema.index({ schoolId: 1, stream: 1 });

// Text search
ClassSchema.index({ 
  name: "text", 
  grade: "text", 
  section: "text" 
});

// ============================================
// VIRTUAL FIELDS
// ============================================

// Full class name
ClassSchema.virtual("fullName").get(function() {
  const parts = [];
  if (this.grade) parts.push(`Grade ${this.grade}`);
  if (this.section) parts.push(`Section ${this.section}`);
  if (this.name) parts.push(`(${this.name})`);
  return parts.join(" ");
});

// Capacity utilization percentage
ClassSchema.virtual("capacityUtilization").get(function() {
  if (!this.maxCapacity) return 0;
  return Math.round((this.currentEnrollment / this.maxCapacity) * 100);
});

// Available seats
ClassSchema.virtual("availableSeats").get(function() {
  return Math.max(0, (this.maxCapacity || 0) - (this.currentEnrollment || 0));
});

ClassSchema.set("toJSON", { virtuals: true });
ClassSchema.set("toObject", { virtuals: true });

// ============================================
// STATIC METHODS
// ============================================

// Get school statistics
ClassSchema.statics.getSchoolStats = async function(schoolId, academicYear) {
  const currentYear = academicYear || new Date().getFullYear() + "-" + (new Date().getFullYear() + 1);
  
  const stats = await this.aggregate([
    {
      $match: {
        schoolId: new mongoose.Types.ObjectId(schoolId),
        academicYear: currentYear,
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: null,
        totalClasses: { $sum: 1 },
        totalCapacity: { $sum: "$maxCapacity" },
        totalEnrolled: { $sum: "$currentEnrollment" },
        totalMale: { $sum: "$maleCount" },
        totalFemale: { $sum: "$femaleCount" },
      },
    },
  ]);

  return stats[0] || {
    totalClasses: 0,
    totalCapacity: 0,
    totalEnrolled: 0,
    totalMale: 0,
    totalFemale: 0,
  };
};

// Get classes by grade
ClassSchema.statics.getByGrade = async function(schoolId, grade, academicYear) {
  const currentYear = academicYear || new Date().getFullYear() + "-" + (new Date().getFullYear() + 1);
  
  return this.find({
    schoolId,
    grade,
    academicYear: currentYear,
    isDeleted: false,
  })
    .populate("classTeacher", "fullName email")
    .sort({ section: 1 });
};

const ClassModel = mongoose.model("Class", ClassSchema);
module.exports = ClassModel;
