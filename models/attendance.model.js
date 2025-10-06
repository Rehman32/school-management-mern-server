
const mongoose = require("mongoose");

// Attendance Record Sub-Schema
const attendanceRecordSchema = new mongoose.Schema({
  student: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Student", 
    required: true,
    index: true // ✅ NEW: Index for faster queries
  },
  status: { 
    type: String, 
    enum: ["present", "absent", "late", "half-day", "excused", "leave"], // ✅ ENHANCED: More status options
    required: true 
  },
  checkInTime: { 
    type: Date // ✅ NEW: Track exact check-in time
  },
  checkOutTime: { 
    type: Date // ✅ NEW: Track check-out time for half-day
  },
  remark: { 
    type: String,
    maxlength: 500
  },
  leaveType: { // ✅ NEW: For leave/excused absences
    type: String,
    enum: ["sick", "emergency", "authorized", "other"]
  },
  recordedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  },
  recordedAt: { // ✅ NEW: Exact time of marking
    type: Date,
    default: Date.now
  }
}, { _id: false });

// Main Attendance Schema
const AttendanceSchema = new mongoose.Schema({
  schoolId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "School", 
    required: true, 
    index: true 
  },
  classId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Class", 
    required: true, 
    index: true 
  },
  date: { 
    type: Date, 
    required: true, 
    index: true,
    validate: {
      validator: function(value) {
        // ✅ NEW: Don't allow future dates
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return value <= today;
      },
      message: "Cannot mark attendance for future dates"
    }
  },
  session: { // ✅ NEW: Support multiple sessions
    type: String,
    enum: ["full-day", "morning", "afternoon"],
    default: "full-day"
  },
  records: { 
    type: [attendanceRecordSchema], 
    default: [],
    validate: {
      validator: function(records) {
        // ✅ NEW: Prevent duplicate students
        const studentIds = records.map(r => r.student.toString());
        return studentIds.length === new Set(studentIds).size;
      },
      message: "Duplicate student records not allowed"
    }
  },
  totalStudents: { // ✅ NEW: Cache for performance
    type: Number,
    default: 0
  },
  presentCount: { // ✅ NEW: Cache for performance
    type: Number,
    default: 0
  },
  absentCount: { // ✅ NEW: Cache for performance
    type: Number,
    default: 0
  },
  lateCount: { // ✅ NEW: Cache for performance
    type: Number,
    default: 0
  },
  isLocked: { // ✅ NEW: Prevent accidental changes after review
    type: Boolean,
    default: false
  },
  lockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  lockedAt: Date,
  notes: String, // ✅ NEW: General notes for the day
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

// ============================================
// INDEXES FOR PERFORMANCE
// ============================================
AttendanceSchema.index({ schoolId: 1, classId: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ schoolId: 1, date: 1 });
AttendanceSchema.index({ "records.student": 1, date: 1 }); // ✅ NEW: For student reports

// ============================================
// MIDDLEWARE - AUTO-UPDATE COUNTS
// ============================================
AttendanceSchema.pre("save", function(next) {
  // Auto-calculate counts
  this.totalStudents = this.records.length;
  this.presentCount = this.records.filter(r => r.status === "present").length;
  this.absentCount = this.records.filter(r => r.status === "absent").length;
  this.lateCount = this.records.filter(r => r.status === "late").length;
  next();
});

// ============================================
// VIRTUAL FIELDS
// ============================================
AttendanceSchema.virtual("attendancePercentage").get(function() {
  if (this.totalStudents === 0) return 0;
  return ((this.presentCount / this.totalStudents) * 100).toFixed(2);
});

// Enable virtuals in JSON
AttendanceSchema.set("toJSON", { virtuals: true });
AttendanceSchema.set("toObject", { virtuals: true });

// ============================================
// STATIC METHODS
// ============================================

// Get attendance statistics for a class
AttendanceSchema.statics.getClassStats = async function(schoolId, classId, startDate, endDate) {
  const match = { schoolId, classId };
  
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

// Get student attendance summary
AttendanceSchema.statics.getStudentStats = async function(schoolId, studentId, startDate, endDate) {
  const match = { schoolId };
  
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
        "records.student": new mongoose.Types.ObjectId(studentId) // ✅ FIXED: Proper syntax
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
