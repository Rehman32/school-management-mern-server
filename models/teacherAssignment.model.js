//  TEACHER ASSIGNMENT MODEL


const mongoose = require("mongoose");

// Period/Time Slot Sub-Schema
const PeriodSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
    required: true,
  },
  periodNumber: {
    type: Number,
    required: true,
    min: 1,
    max: 10,
  },
  startTime: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: "Time must be in HH:MM format (24-hour)"
    }
  },
  endTime: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: "Time must be in HH:MM format (24-hour)"
    }
  },
  room: String,
}, { _id: false });

// Individual Assignment Sub-Schema
const AssignmentSchema = new mongoose.Schema({
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject",
    required: true,
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Class",
    required: true,
  },
  
  // Assignment Type
  assignmentType: {
    type: String,
    enum: ["primary", "substitute", "support", "co-teacher"],
    default: "primary",
  },

  // Schedule/Timetable
  periods: [PeriodSchema],
  
  // Workload (hours per week)
  hoursPerWeek: {
    type: Number,
    default: 0,
    min: 0,
  },

  // Validity Period
  startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: Date,

  // Room/Location
  defaultRoom: String,

  // Status
  isActive: {
    type: Boolean,
    default: true,
  },

  // Notes
  notes: String,
}, { _id: true });

// Main Teacher Assignment Schema
const TeacherAssignmentSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },

    // Teacher Reference
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
      index: true,
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

    // All Assignments for this teacher
    assignments: [AssignmentSchema],

    // Total Workload Summary
    totalHoursPerWeek: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Status
    status: {
      type: String,
      enum: ["active", "inactive", "completed"],
      default: "active",
      index: true,
    },

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
// INDEXES FOR PERFORMANCE
// ============================================

// ✅ FIXED: Removed overly strict unique index
// Now allows same teacher to teach same subject to multiple classes
TeacherAssignmentSchema.index(
  { schoolId: 1, teacher: 1, academicYear: 1 },
  { unique: true }
);

TeacherAssignmentSchema.index({ schoolId: 1, academicYear: 1, status: 1 });
TeacherAssignmentSchema.index({ "assignments.subject": 1 });
TeacherAssignmentSchema.index({ "assignments.class": 1 });

// ============================================
// VIRTUAL FIELDS
// ============================================

// Get active assignments count
TeacherAssignmentSchema.virtual("activeAssignmentsCount").get(function() {
  if (!this.assignments) return 0;
  return this.assignments.filter(a => a.isActive).length;
});

TeacherAssignmentSchema.set("toJSON", { virtuals: true });
TeacherAssignmentSchema.set("toObject", { virtuals: true });

// ============================================
// MIDDLEWARE
// ============================================

// Before save: Calculate total hours per week
TeacherAssignmentSchema.pre("save", function(next) {
  if (this.assignments && this.assignments.length > 0) {
    this.totalHoursPerWeek = this.assignments
      .filter(a => a.isActive)
      .reduce((sum, a) => sum + (a.hoursPerWeek || 0), 0);
  }
  next();
});

// ============================================
// STATIC METHODS
// ============================================

// Get assignments by teacher
TeacherAssignmentSchema.statics.getByTeacher = async function(
  schoolId,
  teacherId,
  academicYear
) {
  const currentYear = academicYear || 
    `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

  return this.findOne({
    schoolId,
    teacher: teacherId,
    academicYear: currentYear,
    isDeleted: false,
  })
    .populate("teacher", "fullName email employeeId")
    .populate("assignments.subject", "name code")
    .populate("assignments.class", "name grade section")
    .lean();
};

// Get assignments by class
TeacherAssignmentSchema.statics.getByClass = async function(
  schoolId,
  classId,
  academicYear
) {
  const currentYear = academicYear || 
    `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

  return this.find({
    schoolId,
    academicYear: currentYear,
    "assignments.class": classId,
    "assignments.isActive": true,
    isDeleted: false,
  })
    .populate("teacher", "fullName email employeeId phone")
    .populate("assignments.subject", "name code")
    .populate("assignments.class", "name grade section")
    .lean();
};

// Get assignments by subject
TeacherAssignmentSchema.statics.getBySubject = async function(
  schoolId,
  subjectId,
  academicYear
) {
  const currentYear = academicYear || 
    `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

  return this.find({
    schoolId,
    academicYear: currentYear,
    "assignments.subject": subjectId,
    "assignments.isActive": true,
    isDeleted: false,
  })
    .populate("teacher", "fullName email employeeId phone")
    .populate("assignments.subject", "name code")
    .populate("assignments.class", "name grade section")
    .lean();
};

// Check for schedule conflicts
TeacherAssignmentSchema.statics.checkConflict = async function(
  schoolId,
  teacherId,
  day,
  periodNumber,
  academicYear,
  excludeAssignmentId
) {
  const currentYear = academicYear || 
    `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

  const assignment = await this.findOne({
    schoolId,
    teacher: teacherId,
    academicYear: currentYear,
    isDeleted: false,
    "assignments.periods": {
      $elemMatch: {
        day: day,
        periodNumber: periodNumber,
      },
    },
  });

  if (!assignment) return null;

  // Filter to find the conflicting period
  for (const assign of assignment.assignments) {
    if (excludeAssignmentId && assign._id.toString() === excludeAssignmentId) {
      continue;
    }
    
    const conflict = assign.periods.find(
      p => p.day === day && p.periodNumber === periodNumber
    );
    
    if (conflict) {
      return {
        teacher: assignment.teacher,
        subject: assign.subject,
        class: assign.class,
        period: conflict,
      };
    }
  }

  return null;
};

// Get teacher workload summary
TeacherAssignmentSchema.statics.getWorkloadSummary = async function(
  schoolId,
  academicYear
) {
  const currentYear = academicYear || 
    `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

  return this.aggregate([
    {
      $match: {
        schoolId: new mongoose.Types.ObjectId(schoolId),
        academicYear: currentYear,
        isDeleted: false,
        status: "active",
      },
    },
    {
      $lookup: {
        from: "teachers",
        localField: "teacher",
        foreignField: "_id",
        as: "teacherDetails",
      },
    },
    { $unwind: "$teacherDetails" },
    {
      $project: {
        teacherId: "$teacher",
        teacherName: "$teacherDetails.fullName",
        employeeId: "$teacherDetails.employeeId",
        department: "$teacherDetails.department",
        totalHours: "$totalHoursPerWeek",
        assignmentsCount: { $size: "$assignments" },
        activeAssignments: {
          $size: {
            $filter: {
              input: "$assignments",
              as: "assign",
              cond: { $eq: ["$$assign.isActive", true] },
            },
          },
        },
      },
    },
    { $sort: { totalHours: -1 } },
  ]);
};

// Get unassigned classes (classes without teacher for a subject)
TeacherAssignmentSchema.statics.getUnassignedClasses = async function(
  schoolId,
  academicYear
) {
  const currentYear = academicYear || 
    `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

  // This would need to be implemented based on your requirements
  // Would involve comparing all classes against assigned ones
  return [];
};

const TeacherAssignment = mongoose.model("TeacherAssignment", TeacherAssignmentSchema);
module.exports = TeacherAssignment;
