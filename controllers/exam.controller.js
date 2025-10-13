// ============================================
// EXAM CONTROLLER - MULTI-TENANT
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
    const tenantId = req.user?.tenantId || req.tenantId;
    const userId = req.user?._id;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required"
      });
    }

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
    const classExists = await Class.findOne({
      _id: classId,
      tenantId,
      isDeleted: false
    });
    if (!classExists) {
      return res.status(404).json({
        success: false,
        message: "Class not found"
      });
    }

    // Validate subject exists
    const subjectExists = await Subject.findOne({
      _id: subjectId,
      tenantId,
      isDeleted: false
    });
    if (!subjectExists) {
      return res.status(404).json({
        success: false,
        message: "Subject not found"
      });
    }

    // Create exam
    const payload = {
      tenantId,
      schoolId: tenantId, // Backward compatibility
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
    const tenantId = req.user?.tenantId || req.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required"
      });
    }

    const {
      page = 1,
      limit = 20,
      classId,
      subjectId,
      status,
      examType,
    } = req.query;

    const query = {
      tenantId,
      isDeleted: false,
    };

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
    const tenantId = req.user?.tenantId || req.tenantId;
    const userId = req.user?._id;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required"
      });
    }

    const examId = req.params.examId;
    const { studentId, subjectId, marksObtained, remark } = req.body;

    if (!studentId || marksObtained == null) {
      return res.status(400).json({
        success: false,
        message: "studentId and marksObtained are required"
      });
    }

    // Validate exam exists
    const exam = await Exam.findOne({
      _id: examId,
      tenantId,
      isDeleted: false
    });

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
      tenantId,
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
    const tenantId = req.user?.tenantId || req.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required"
      });
    }

    const examId = req.params.examId;

    const grades = await Grade.find({
      tenantId,
      examId,
    })
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
    const tenantId = req.user?.tenantId || req.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required"
      });
    }

    const studentId = req.params.studentId;

    const grades = await Grade.find({
      tenantId,
      studentId,
    })
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
