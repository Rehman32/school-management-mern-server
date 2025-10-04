const mongoose = require("mongoose");

const ExamSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true, index: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
  title: { type: String, required: true },
  date: { type: Date, required: true },
  totalMarks: { type: Number, default: 100 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

module.exports = mongoose.model("Exam", ExamSchema);
