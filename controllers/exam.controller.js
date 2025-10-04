const Exam = require("../models/exam.model");
const Grade = require("../models/grade.model");

exports.createExam = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const payload = { ...req.body, schoolId, createdBy: req.user._id };
    const exam = await Exam.create(payload);
    return res.status(201).json({ success: true, data: exam });
  } catch (err) {
    console.error("createExam error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.listExams = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const exams = await Exam.find({ schoolId }).populate("subjectId", "name").sort({ date: -1 });
    return res.json({ success: true, data: exams });
  } catch (err) {
    console.error("listExams error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.addOrUpdateGrade = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const examId = req.params.examId;
    const { studentId, subjectId, marksObtained, remark } = req.body;
    if (!studentId || marksObtained == null) return res.status(400).json({ success:false, message:"studentId and marksObtained required" });

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

exports.listGradesForExam = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const examId = req.params.examId;
    const grades = await Grade.find({ schoolId, examId }).populate("studentId", "fullName rollNumber").populate("subjectId", "name");
    return res.json({ success: true, data: grades });
  } catch (err) {
    console.error("listGradesForExam error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getStudentGrades = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const studentId = req.params.studentId;
    const grades = await Grade.find({ schoolId, studentId }).populate("examId", "title date").populate("subjectId", "name");
    return res.json({ success: true, data: grades });
  } catch (err) {
    console.error("getStudentGrades error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
