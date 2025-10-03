// controllers/student.controllers.js
const Student= require('../models/student.model');

exports.getAllStudents = async (req, res) => {
  const schoolId = req.user.schoolId;
  const students = await Student.find({ schoolId }).sort({ enrolledDate: -1 });
  res.json({ data: students });
};

exports.createStudent = async (req, res) => {
  const schoolId = req.user.schoolId;
  const newStudent = new Student({ ...req.body, schoolId });
  const savedStudent = await newStudent.save();
  res.status(201).json({ data: savedStudent });
};

exports.getStudentById = async (req, res) => {
  const schoolId = req.user.schoolId;
  const student = await Student.findOne({ _id: req.params.id, schoolId });
  if (!student) return res.status(404).json({ message: "Student not found" });
  res.json({ data: student });
};

exports.updateStudent = async (req, res) => {
  const schoolId = req.user.schoolId;
  const updatedStudent = await Student.findOneAndUpdate(
    { _id: req.params.id, schoolId },
    req.body,
    { new: true }
  );
  res.json({ data: updatedStudent });
};

exports.deleteStudent = async (req, res) => {
  const schoolId = req.user.schoolId;
  await Student.findOneAndDelete({ _id: req.params.id, schoolId });
  res.json({ message: "Student Deleted" });
};