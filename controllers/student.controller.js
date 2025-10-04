// controllers/student.controller.js
const Student = require('../models/student.model');

exports.getAllStudents = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const students = await Student.find({ schoolId }).sort({ enrolledDate: -1 });
    res.json({ success: true, data: students });
  } catch (err) {
    console.error("Error fetching students:", err.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.createStudent = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const newStudent = new Student({ ...req.body, schoolId });
    const savedStudent = await newStudent.save();
    res.status(201).json({ success: true, data: savedStudent });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getStudentById = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const student = await Student.findOne({ _id: req.params.id, schoolId });
    if (!student) return res.status(404).json({ message: "Student not found" });
    res.json({ success: true, data: student });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const updatedStudent = await Student.findOneAndUpdate(
      { _id: req.params.id, schoolId },
      req.body,
      { new: true }
    );
    res.json({ success: true, data: updatedStudent });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    await Student.findOneAndDelete({ _id: req.params.id, schoolId });
    res.json({ success: true, message: "Student Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
