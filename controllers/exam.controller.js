const mongoose = require("mongoose");
const Exam = require("../models/exam.model");

// Create Exam
exports.createExam = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;a
    const { classId, subjectId, title, date, totalMarks } = req.body;

    // Validate presence
    if (!classId || !subjectId)
      return res.status(400).json({ success: false, message: "Both classId and subjectId are required." });

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(classId))
      return res.status(400).json({ success: false, message: "Invalid classId." });
    if (!mongoose.Types.ObjectId.isValid(subjectId))
      return res.status(400).json({ success: false, message: "Invalid subjectId." });

    // Optionally: check existence in DB (recommended)
    // const classExists = await ClassModel.exists({ _id: classId, schoolId });
    // const subjectExists = await Subject.exists({ _id: subjectId, schoolId });
    // if (!classExists || !subjectExists)
    //   return res.status(404).json({ success: false, message: "Class or Subject not found." });

    const payload = {
      schoolId,
      classId,
      subjectId,
      title,
      date,
      totalMarks,
      createdBy: req.user._id,
    };
    const exam = await Exam.create(payload);
    return res.status(201).json({ success: true, data: exam });
  } catch (err) {
    console.error("createExam error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// List Exams
exports.listExams = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const exams = await Exam.find({ schoolId })
      .populate("subjectId", "name")
      .sort({ date: -1 });
    return res.json({ success: true, data: exams });
  } catch (err) {
    console.error("listExams error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Add or Update Grade
exports.addOrUpdateGrade = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const examId = req.params.examId;
    const { studentId, subjectId, marksObtained, remark } = req.body;
    if (!studentId || marksObtained == null)
      return res.status(400).json({ success: false, message: "studentId and marksObtained required" });

    const filter = { schoolId, examId, studentId, subjectId };
    const update = { marksObtained, remark, createdBy: req.user._id };
    const opts = { upsert: true, new: true, setDefaultsOnInsert: true };
    const grade = await Grade.findOneAndUpdate(filter, update, opts);
    return res.json({ success: true, data: grade });
  } catch (err) {
    console.error("addOrUpdateGrade error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// List Grades for Exam
exports.listGradesForExam = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const examId = req.params.examId;
    const grades = await Grade.find({ schoolId, examId })
      .populate("studentId", "fullName rollNumber")
      .populate("subjectId", "name");
    return res.json({ success: true, data: grades });
  } catch (err) {
    console.error("listGradesForExam error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Get Student Grades
exports.getStudentGrades = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const studentId = req.params.studentId;
    const grades = await Grade.find({ schoolId, studentId })
      .populate("examId", "title date")
      .populate("subjectId", "name");
    return res.json({ success: true, data: grades });
  } catch (err) {
    console.error("getStudentGrades error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
