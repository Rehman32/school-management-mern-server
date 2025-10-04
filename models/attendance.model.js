const mongoose = require("mongoose");

const attendanceRecordSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  status: { type: String, enum: ["present", "absent", "late"], required: true },
  remark: { type: String },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { _id: false });

const AttendanceSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true, index: true },
  date: { type: Date, required: true, index: true },
  records: { type: [attendanceRecordSchema], default: [] },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

// prevent duplicate attendance docs for same class/date
AttendanceSchema.index({ schoolId: 1, classId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", AttendanceSchema);