// ============================================
// EXAM CONTROLLER - SINGLE-TENANT EDITION
// ============================================

const mongoose = require("mongoose");
const Exam = require("../models/exam.model");
const Grade = require("../models/grade.model");
const Class = require("../models/class.model");
const Subject = require("../models/subject.model");

// ============================================
// CREATE EXAM
// ============================================
exports.createExam = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { classId, subjectId, title, date, totalMarks, examType } = req.body;

    // Validate required fields
    if (!classId || !subjectId || !title || !date) {
      return res.status(400).json({
        success: false,
        message: "classId, subjectId, title, and date are required"
      });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid classId"
      });
    }
    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subjectId"
      });
    }

    // Validate class exists
    const classExists = await Class.findOne({ _id: classId, isDeleted: false });
    if (!classExists) {
      return res.status(404).json({
        success: false,
        message: "Class not found"
      });
    }

    // Validate subject exists
    const subjectExists = await Subject.findOne({ _id: subjectId, isDeleted: false });
    if (!subjectExists) {
      return res.status(404).json({
        success: false,
        message: "Subject not found"
      });
    }

    // Create exam
    const payload = {
      classId,
      subjectId,
      title,
      date,
      totalMarks: totalMarks || 100,
      examType: examType || "other",
      createdBy: userId,
      updatedBy: userId,
    };

    const exam = await Exam.create(payload);

    await exam.populate("classId", "name grade section");
    await exam.populate("subjectId", "name code");

    return res.status(201).json({
      success: true,
      data: exam,
      message: "Exam created successfully"
    });
  } catch (err) {
    console.error("createExam error:", err);

    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", ")
      });
    }

    return res.status(500).json({
      success: false,
      message: err.message || "Failed to create exam"
    });
  }
};

// ============================================
// LIST EXAMS
// ============================================
exports.listExams = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      classId,
      subjectId,
      status,
      examType,
    } = req.query;

    const query = { isDeleted: false };

    if (classId) query.classId = classId;
    if (subjectId) query.subjectId = subjectId;
    if (status) query.status = status;
    if (examType) query.examType = examType;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [exams, total] = await Promise.all([
      Exam.find(query)
        .populate("classId", "name grade section")
        .populate("subjectId", "name code")
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Exam.countDocuments(query)
    ]);

    return res.json({
      success: true,
      data: exams,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error("listExams error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to list exams"
    });
  }
};

// ============================================
// ADD OR UPDATE GRADE
// ============================================
exports.addOrUpdateGrade = async (req, res) => {
  try {
    const userId = req.user?.id;
    const examId = req.params.examId;
    const { studentId, subjectId, marksObtained, remark } = req.body;

    if (!studentId || marksObtained == null) {
      return res.status(400).json({
        success: false,
        message: "studentId and marksObtained are required"
      });
    }

    // Validate exam exists
    const exam = await Exam.findOne({ _id: examId, isDeleted: false });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found"
      });
    }

    // Calculate percentage and grade
    const percentage = (marksObtained / exam.totalMarks) * 100;
    const isPassed = exam.passingMarks ? marksObtained >= exam.passingMarks : percentage >= 40;

    let grade = "";
    if (percentage >= 90) grade = "A+";
    else if (percentage >= 80) grade = "A";
    else if (percentage >= 70) grade = "B+";
    else if (percentage >= 60) grade = "B";
    else if (percentage >= 50) grade = "C+";
    else if (percentage >= 40) grade = "C";
    else grade = "F";

    // Upsert grade
    const filter = {
      examId,
      studentId,
      subjectId: subjectId || exam.subjectId,
    };

    const update = {
      marksObtained,
      totalMarks: exam.totalMarks,
      percentage,
      grade,
      isPassed,
      remark,
      updatedBy: userId,
    };

    const opts = {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
      runValidators: true
    };

    // Set createdBy only on insert
    if (opts.upsert) {
      update.$setOnInsert = { createdBy: userId };
    }

    const gradeDoc = await Grade.findOneAndUpdate(filter, update, opts)
      .populate("studentId", "fullName rollNumber")
      .populate("subjectId", "name code");

    return res.json({
      success: true,
      data: gradeDoc,
      message: "Grade saved successfully"
    });
  } catch (err) {
    console.error("addOrUpdateGrade error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to save grade"
    });
  }
};

// ============================================
// LIST GRADES FOR EXAM
// ============================================
exports.listGradesForExam = async (req, res) => {
  try {
    const examId = req.params.examId;

    const grades = await Grade.find({ examId })
      .populate("studentId", "fullName rollNumber")
      .populate("subjectId", "name code")
      .populate("examId", "title date totalMarks")
      .sort({ "studentId.rollNumber": 1 })
      .lean();

    return res.json({
      success: true,
      data: grades
    });
  } catch (err) {
    console.error("listGradesForExam error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to list grades"
    });
  }
};

// ============================================
// GET STUDENT GRADES
// ============================================
exports.getStudentGrades = async (req, res) => {
  try {
    const studentId = req.params.studentId;

    const grades = await Grade.find({ studentId })
      .populate("examId", "title date totalMarks examType")
      .populate("subjectId", "name code")
      .sort({ "examId.date": -1 })
      .lean();

    return res.json({
      success: true,
      data: grades
    });
  } catch (err) {
    console.error("getStudentGrades error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to get student grades"
    });
  }
};

// ============================================
// GENERATE STUDENT REPORT CARD
// ============================================
exports.generateReportCard = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { examType, academicYear } = req.query;
    
    // Get student info
    const Student = require("../models/student.model");
    const student = await Student.findById(studentId)
      .populate("class", "name grade section")
      .select("firstName lastName fullName rollNumber admissionNumber class photo")
      .lean();
    
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }
    
    // Build query for exams
    const examQuery = { isDeleted: false };
    if (examType) examQuery.examType = examType;
    if (student.class) examQuery.classId = student.class._id;
    
    // Get all relevant exams
    const exams = await Exam.find(examQuery)
      .populate("subjectId", "name code")
      .sort({ date: 1 })
      .lean();
    
    // Get all grades for this student
    const examIds = exams.map(e => e._id);
    const grades = await Grade.find({ 
      studentId,
      examId: { $in: examIds }
    })
      .populate("subjectId", "name code")
      .populate("examId", "title date totalMarks examType")
      .lean();
    
    // Group grades by subject
    const subjectGrades = {};
    grades.forEach(grade => {
      const subjectName = grade.subjectId?.name || 'Unknown';
      if (!subjectGrades[subjectName]) {
        subjectGrades[subjectName] = {
          subjectCode: grade.subjectId?.code,
          exams: [],
          totalMarks: 0,
          totalObtained: 0
        };
      }
      subjectGrades[subjectName].exams.push({
        examTitle: grade.examId?.title,
        examType: grade.examId?.examType,
        date: grade.examId?.date,
        marksObtained: grade.marksObtained,
        totalMarks: grade.totalMarks,
        percentage: grade.percentage,
        grade: grade.grade,
        isPassed: grade.isPassed
      });
      subjectGrades[subjectName].totalMarks += grade.totalMarks;
      subjectGrades[subjectName].totalObtained += grade.marksObtained;
    });
    
    // Calculate subject-wise summary
    Object.keys(subjectGrades).forEach(subject => {
      const data = subjectGrades[subject];
      data.overallPercentage = data.totalMarks > 0 
        ? ((data.totalObtained / data.totalMarks) * 100).toFixed(2) 
        : 0;
      data.overallGrade = getGradeLetter(parseFloat(data.overallPercentage));
    });
    
    // Calculate overall summary
    const totalMarks = Object.values(subjectGrades).reduce((s, d) => s + d.totalMarks, 0);
    const totalObtained = Object.values(subjectGrades).reduce((s, d) => s + d.totalObtained, 0);
    const overallPercentage = totalMarks > 0 ? ((totalObtained / totalMarks) * 100).toFixed(2) : 0;
    
    const reportCard = {
      generatedAt: new Date(),
      academicYear: academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      
      student: {
        name: student.fullName || `${student.firstName} ${student.lastName}`,
        rollNumber: student.rollNumber,
        admissionNumber: student.admissionNumber,
        class: student.class,
        photo: student.photo
      },
      
      subjects: subjectGrades,
      
      summary: {
        totalSubjects: Object.keys(subjectGrades).length,
        totalExams: grades.length,
        totalMarks,
        totalObtained,
        overallPercentage: parseFloat(overallPercentage),
        overallGrade: getGradeLetter(parseFloat(overallPercentage)),
        isPassed: parseFloat(overallPercentage) >= 40,
        rank: null // Can be calculated separately
      }
    };
    
    return res.json({
      success: true,
      data: reportCard,
      message: "Report card generated successfully"
    });
    
  } catch (err) {
    console.error("generateReportCard error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};

// Helper function for grade letter
function getGradeLetter(percentage) {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B+";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C+";
  if (percentage >= 40) return "C";
  return "F";
}

// ============================================
// GET CLASS PERFORMANCE REPORT
// ============================================
exports.getClassPerformance = async (req, res) => {
  try {
    const { classId } = req.params;
    const { examId, examType } = req.query;
    
    // Build exam query
    const examQuery = { classId, isDeleted: false };
    if (examId) examQuery._id = examId;
    if (examType) examQuery.examType = examType;
    
    const exams = await Exam.find(examQuery).lean();
    const examIds = exams.map(e => e._id);
    
    if (examIds.length === 0) {
      return res.json({
        success: true,
        data: { students: [], summary: {} },
        message: "No exams found for this class"
      });
    }
    
    // Get all grades for these exams
    const grades = await Grade.find({ examId: { $in: examIds } })
      .populate("studentId", "firstName lastName fullName rollNumber")
      .populate("subjectId", "name")
      .lean();
    
    // Group by student
    const studentPerformance = {};
    grades.forEach(grade => {
      const sid = grade.studentId?._id.toString();
      if (!sid) return;
      
      if (!studentPerformance[sid]) {
        studentPerformance[sid] = {
          student: grade.studentId,
          totalMarks: 0,
          totalObtained: 0,
          examCount: 0,
          grades: []
        };
      }
      
      studentPerformance[sid].totalMarks += grade.totalMarks;
      studentPerformance[sid].totalObtained += grade.marksObtained;
      studentPerformance[sid].examCount++;
    });
    
    // Calculate percentages and ranks
    const students = Object.values(studentPerformance).map(s => ({
      ...s,
      percentage: s.totalMarks > 0 ? ((s.totalObtained / s.totalMarks) * 100).toFixed(2) : 0,
      grade: getGradeLetter(s.totalMarks > 0 ? (s.totalObtained / s.totalMarks) * 100 : 0)
    }));
    
    // Sort by percentage for ranking
    students.sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage));
    students.forEach((s, idx) => { s.rank = idx + 1; });
    
    // Class summary
    const totalStudents = students.length;
    const passed = students.filter(s => parseFloat(s.percentage) >= 40).length;
    const avgPercentage = totalStudents > 0 
      ? (students.reduce((sum, s) => sum + parseFloat(s.percentage), 0) / totalStudents).toFixed(2)
      : 0;
    
    return res.json({
      success: true,
      data: {
        students,
        summary: {
          totalStudents,
          passed,
          failed: totalStudents - passed,
          passPercentage: totalStudents > 0 ? ((passed / totalStudents) * 100).toFixed(2) : 0,
          classAverage: avgPercentage,
          topperName: students[0]?.student?.fullName || students[0]?.student?.firstName,
          topperPercentage: students[0]?.percentage || 0
        }
      }
    });
    
  } catch (err) {
    console.error("getClassPerformance error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};

// ============================================
// GET EXAM ANALYTICS
// ============================================
exports.getExamAnalytics = async (req, res) => {
  try {
    const { examId } = req.params;
    
    const exam = await Exam.findById(examId)
      .populate("classId", "name grade section")
      .populate("subjectId", "name code")
      .lean();
    
    if (!exam) {
      return res.status(404).json({ success: false, message: "Exam not found" });
    }
    
    const grades = await Grade.find({ examId })
      .populate("studentId", "firstName lastName fullName rollNumber gender")
      .lean();
    
    if (grades.length === 0) {
      return res.json({
        success: true,
        data: {
          exam,
          analytics: { message: "No grades recorded yet" }
        }
      });
    }
    
    // Calculate statistics
    const marks = grades.map(g => g.marksObtained);
    const highest = Math.max(...marks);
    const lowest = Math.min(...marks);
    const average = (marks.reduce((a, b) => a + b, 0) / marks.length).toFixed(2);
    
    // Grade distribution
    const gradeDistribution = { "A+": 0, "A": 0, "B+": 0, "B": 0, "C+": 0, "C": 0, "F": 0 };
    grades.forEach(g => {
      if (gradeDistribution[g.grade] !== undefined) {
        gradeDistribution[g.grade]++;
      }
    });
    
    // Pass/Fail
    const passed = grades.filter(g => g.isPassed).length;
    const failed = grades.length - passed;
    
    // Marks range distribution
    const rangeDistribution = {
      "90-100": grades.filter(g => g.percentage >= 90).length,
      "80-89": grades.filter(g => g.percentage >= 80 && g.percentage < 90).length,
      "70-79": grades.filter(g => g.percentage >= 70 && g.percentage < 80).length,
      "60-69": grades.filter(g => g.percentage >= 60 && g.percentage < 70).length,
      "50-59": grades.filter(g => g.percentage >= 50 && g.percentage < 60).length,
      "40-49": grades.filter(g => g.percentage >= 40 && g.percentage < 50).length,
      "Below 40": grades.filter(g => g.percentage < 40).length,
    };
    
    // Top performers
    const topPerformers = [...grades]
      .sort((a, b) => b.marksObtained - a.marksObtained)
      .slice(0, 5)
      .map(g => ({
        name: g.studentId?.fullName || `${g.studentId?.firstName} ${g.studentId?.lastName}`,
        rollNumber: g.studentId?.rollNumber,
        marks: g.marksObtained,
        percentage: g.percentage,
        grade: g.grade
      }));
    
    return res.json({
      success: true,
      data: {
        exam,
        analytics: {
          totalStudents: grades.length,
          highest,
          lowest,
          average: parseFloat(average),
          median: marks.sort((a, b) => a - b)[Math.floor(marks.length / 2)],
          passed,
          failed,
          passPercentage: ((passed / grades.length) * 100).toFixed(2),
          gradeDistribution,
          rangeDistribution,
          topPerformers
        }
      }
    });
    
  } catch (err) {
    console.error("getExamAnalytics error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};
