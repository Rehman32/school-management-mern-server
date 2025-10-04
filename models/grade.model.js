const mongoose = require("mongoose");

const GradeSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
  examId: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true, index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, index: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
  marksObtained: { type: Number, required: true },
  remark: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

GradeSchema.index({ schoolId: 1, examId: 1, studentId: 1, subjectId: 1 }, { unique: true });

module.exports = mongoose.model("Grade", GradeSchema);
