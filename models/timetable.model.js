const mongoose = require("mongoose");

const TimetableSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true, index: true },
  day: { type: String, enum: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"], required: true },
  period: { type: Number, required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

TimetableSchema.index({ schoolId:1, classId:1, day:1, period:1 }, { unique: true });

module.exports = mongoose.model("Timetable", TimetableSchema);
