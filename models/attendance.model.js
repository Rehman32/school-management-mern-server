// ============================================
// ATTENDANCE MODEL - MULTI-TENANT COMPATIBLE
// ============================================

const mongoose = require("mongoose");

// Attendance Record Sub-Schema
const attendanceRecordSchema = new mongoose.Schema({
  student: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Student", 
    required: true,
    index: true
  },
  status: { 
    type: String, 
    enum: ["present", "absent", "late", "half-day", "excused", "leave"],
    required: true 
  },
  checkInTime: Date,
  checkOutTime: Date,
  remark: { 
    type: String,
    maxlength: 500
  },
  leaveType: {
    type: String,
    enum: ["sick", "emergency", "authorized", "other"]
  },
  recordedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  },
  recordedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

// Main Attendance Schema
const AttendanceSchema = new mongoose.Schema({
  // ===== TENANT RELATIONSHIP =====
  tenantId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Tenant", 
    required: [true, "Tenant ID is required"],
    index: true 
  },
  // Keep schoolId for backward compatibility
  schoolId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "School", 
    required: false
  },

  // ===== CLASS & DATE =====
  classId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Class", 
    required: [true, "Class is required"],
    index: true 
  },
  date: { 
    type: Date, 
    required: [true, "Date is required"],
    index: true,
    validate: {
      validator: function(value) {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return value <= today;
      },
      message: "Cannot mark attendance for future dates"
    }
  },

  // ===== SESSION =====
  session: {
    type: String,
    enum: ["full-day", "morning", "afternoon"],
    default: "full-day"
  },

  // ===== RECORDS =====
  records: { 
    type: [attendanceRecordSchema], 
    default: [],
    validate: {
      validator: function(records) {
        const studentIds = records.map(r => r.student.toString());
        return studentIds.length === new Set(studentIds).size;
      },
      message: "Duplicate student records not allowed"
    }
  },

  // ===== CACHED COUNTS =====
  totalStudents: { 
    type: Number,
    default: 0
  },
  presentCount: {
    type: Number,
    default: 0
  },
  absentCount: {
    type: Number,
    default: 0
  },
  lateCount: {
    type: Number,
    default: 0
  },

  // ===== LOCK MECHANISM =====
  isLocked: {
    type: Boolean,
    default: false
  },
  lockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  lockedAt: Date,

  // ===== NOTES =====
  notes: String,

  // ===== AUDIT =====
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  },
  updatedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  }
}, { 
  timestamps: true 
});

// ===== INDEXES =====
AttendanceSchema.index({ tenantId: 1, classId: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ tenantId: 1, date: 1 });
AttendanceSchema.index({ "records.student": 1, date: 1 });

// ===== PRE-SAVE HOOK =====
AttendanceSchema.pre("save", function(next) {
  // Backward compatibility
  if (this.schoolId && !this.tenantId) {
    this.tenantId = this.schoolId;
  }

  // Auto-calculate counts
  this.totalStudents = this.records.length;
  this.presentCount = this.records.filter(r => r.status === "present").length;
  this.absentCount = this.records.filter(r => r.status === "absent").length;
  this.lateCount = this.records.filter(r => r.status === "late").length;
  
  next();
});

// ===== VIRTUAL FIELDS =====
AttendanceSchema.virtual("attendancePercentage").get(function() {
  if (this.totalStudents === 0) return 0;
  return ((this.presentCount / this.totalStudents) * 100).toFixed(2);
});

AttendanceSchema.set("toJSON", { virtuals: true });
AttendanceSchema.set("toObject", { virtuals: true });

// ===== STATIC METHODS =====
AttendanceSchema.statics.getClassStats = async function(tenantId, classId, startDate, endDate) {
  const match = { tenantId, classId };
  
  if (startDate && endDate) {
    match.date = { 
      $gte: new Date(startDate), 
      $lte: new Date(endDate) 
    };
  }
  
  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalDays: { $sum: 1 },
        totalPresent: { $sum: "$presentCount" },
        totalAbsent: { $sum: "$absentCount" },
        totalLate: { $sum: "$lateCount" },
        avgAttendance: { $avg: "$presentCount" }
      }
    }
  ]);
  
  return stats[0] || {
    totalDays: 0,
    totalPresent: 0,
    totalAbsent: 0,
    totalLate: 0,
    avgAttendance: 0
  };
};

AttendanceSchema.statics.getStudentStats = async function(tenantId, studentId, startDate, endDate) {
  const match = { tenantId };
  
  if (startDate && endDate) {
    match.date = { 
      $gte: new Date(startDate), 
      $lte: new Date(endDate) 
    };
  }
  
  const pipeline = [
    { $match: match },
    { $unwind: "$records" },
    { 
      $match: { 
        "records.student": new mongoose.Types.ObjectId(studentId)
      } 
    },
    {
      $group: {
        _id: "$records.status",
        count: { $sum: 1 }
      }
    }
  ];
  
  const results = await this.aggregate(pipeline);
  
  const summary = {
    present: 0,
    absent: 0,
    late: 0,
    "half-day": 0,
    excused: 0,
    leave: 0,
    total: 0
  };
  
  results.forEach(r => {
    summary[r._id] = r.count;
    summary.total += r.count;
  });
  
  summary.percentage = summary.total > 0 
    ? ((summary.present / summary.total) * 100).toFixed(2) 
    : 0;
  
  return summary;
};

module.exports = mongoose.model("Attendance", AttendanceSchema);
