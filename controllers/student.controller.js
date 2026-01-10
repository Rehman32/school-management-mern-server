// ============================================
// STUDENT CONTROLLER - SINGLE-TENANT EDITION
// Professional Production-Ready Version
// ============================================

const Student = require("../models/student.model");
const Class = require("../models/class.model");
const mongoose = require("mongoose");

// ============================================
// HELPER: Validate Required Fields
// ============================================
const validateStudent = (data) => {
  const required = ["fullName", "gender", "dob", "class", "rollNumber"];
  const missing = required.filter(field => !data[field]);
  
  if (missing.length > 0) {
    return {
      valid: false,
      message: `Missing required fields: ${missing.join(", ")}`
    };
  }
  
  // Validate at least one guardian
  if (!data.guardians || data.guardians.length === 0) {
    return {
      valid: false,
      message: "At least one guardian is required"
    };
  }
  
  return { valid: true };
};

// ============================================
// GET ALL STUDENTS (with pagination & search)
// ============================================
exports.getAllStudents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      class: classId,
      status = "active",
      gender,
      stream,
      academicYear
    } = req.query;
    
    // Build query
    const query = { isDeleted: false };
    
    if (status && status !== "all") query.status = status;
    if (classId) query.class = classId;
    if (gender) query.gender = gender;
    if (stream) query.stream = stream;
    if (academicYear) query.academicYear = academicYear;
    
    // Search
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { rollNumber: { $regex: search, $options: "i" } },
        { admissionNumber: { $regex: search, $options: "i" } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [students, total] = await Promise.all([
      Student.find(query)
        .populate("class", "name grade section")
        .sort({ enrolledDate: -1, fullName: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Student.countDocuments(query)
    ]);
    
    res.json({ 
      success: true, 
      data: students,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error("Error fetching students:", err);
    res.status(500).json({ 
      success: false, 
      message: err.message || "Server Error" 
    });
  }
};

// ============================================
// CREATE STUDENT
// ============================================
exports.createStudent = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    // Validate input
    const validation = validateStudent(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
    }
    
    // Validate class exists
    const classExists = await Class.findById(req.body.class);
    
    if (!classExists) {
      return res.status(404).json({
        success: false,
        message: "Class not found"
      });
    }
    
    // Check for duplicate admission number
    if (req.body.admissionNumber) {
      const existingStudent = await Student.findOne({
        admissionNumber: req.body.admissionNumber,
        isDeleted: false
      });
      
      if (existingStudent) {
        return res.status(400).json({
          success: false,
          message: "Admission number already exists"
        });
      }
    }

    // Check for duplicate roll number in same class
    const duplicateRoll = await Student.findOne({
      class: req.body.class,
      rollNumber: req.body.rollNumber,
      isDeleted: false
    });

    if (duplicateRoll) {
      return res.status(400).json({
        success: false,
        message: "Roll number already exists in this class"
      });
    }
    
    // Create student
    const studentData = {
      ...req.body,
      createdBy: userId,
      updatedBy: userId
    };
    
    const newStudent = new Student(studentData);
    const savedStudent = await newStudent.save();
    
    // Populate and return
    const populated = await Student.findById(savedStudent._id)
      .populate("class", "name grade section");
    
    res.status(201).json({ 
      success: true, 
      data: populated,
      message: "Student created successfully"
    });
  } catch (err) {
    console.error("Create student error:", err);
    
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`
      });
    }
    
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", ")
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: err.message || "Failed to create student"
    });
  }
};

// ============================================
// GET STUDENT BY ID
// ============================================
exports.getStudentById = async (req, res) => {
  try {
    const student = await Student.findOne({ 
      _id: req.params.id, 
      isDeleted: false
    })
    .populate("class", "name grade section")
    .populate("createdBy updatedBy", "name email");
    
    if (!student) {
      return res.status(404).json({ 
        success: false,
        message: "Student not found" 
      });
    }
    
    res.json({ success: true, data: student });
  } catch (err) {
    console.error("Get student error:", err);
    res.status(500).json({ 
      success: false, 
      message: err.message || "Failed to fetch student"
    });
  }
};

// ============================================
// UPDATE STUDENT
// ============================================
exports.updateStudent = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    // Find existing student
    const existing = await Student.findOne({ 
      _id: req.params.id, 
      isDeleted: false
    });
    
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }
    
    // Validate class if provided
    if (req.body.class && req.body.class !== existing.class.toString()) {
      const classExists = await Class.findById(req.body.class);
      
      if (!classExists) {
        return res.status(404).json({
          success: false,
          message: "Class not found"
        });
      }

      // Check for duplicate roll number in new class
      if (req.body.rollNumber) {
        const duplicateRoll = await Student.findOne({
          _id: { $ne: req.params.id },
          class: req.body.class,
          rollNumber: req.body.rollNumber,
          isDeleted: false
        });

        if (duplicateRoll) {
          return res.status(400).json({
            success: false,
            message: "Roll number already exists in this class"
          });
        }
      }
    }
    
    // Update student
    const updateData = {
      ...req.body,
      updatedBy: userId
    };
    
    // Don't allow changing these fields
    delete updateData.createdBy;
    
    const updatedStudent = await Student.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate("class", "name grade section");
    
    res.json({ 
      success: true, 
      data: updatedStudent,
      message: "Student updated successfully"
    });
  } catch (err) {
    console.error("Update student error:", err);
    
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`
      });
    }
    
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", ")
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: err.message || "Failed to update student"
    });
  }
};

// ============================================
// DELETE STUDENT (Soft Delete)
// ============================================
exports.deleteStudent = async (req, res) => {
  try {
    const student = await Student.findOne({ 
      _id: req.params.id, 
      isDeleted: false
    });
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    // Soft delete
    student.isDeleted = true;
    student.deletedAt = new Date();
    student.status = "inactive";
    await student.save();
    
    res.json({ 
      success: true, 
      message: "Student deleted successfully",
      data: { _id: student._id }
    });
  } catch (err) {
    console.error("Delete student error:", err);
    res.status(500).json({ 
      success: false, 
      message: err.message || "Failed to delete student"
    });
  }
};

// ============================================
// GET STATISTICS
// ============================================
exports.getStatistics = async (req, res) => {
  try {
    const stats = await Student.getStats();
    
    // Get class-wise count
    const classCounts = await Student.aggregate([
      { 
        $match: { 
          status: "active",
          isDeleted: false
        } 
      },
      { $group: { _id: "$class", count: { $sum: 1 } } },
      { 
        $lookup: {
          from: "classes",
          localField: "_id",
          foreignField: "_id",
          as: "class"
        }
      },
      { $unwind: "$class" },
      { 
        $project: {
          className: "$class.name",
          count: 1
        }
      },
      { $sort: { className: 1 } }
    ]);
    
    res.json({
      success: true,
      data: {
        ...stats,
        classCounts
      }
    });
  } catch (err) {
    console.error("Get statistics error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to get statistics"
    });
  }
};

// ============================================
// BULK PROMOTE STUDENTS
// ============================================
exports.bulkPromote = async (req, res) => {
  try {
    const { fromClass, toClass, studentIds, academicYear } = req.body;
    
    if (!fromClass || !toClass || !academicYear) {
      return res.status(400).json({
        success: false,
        message: "fromClass, toClass, and academicYear are required"
      });
    }
    
    // Validate classes exist
    const [fromClassExists, toClassExists] = await Promise.all([
      Class.findById(fromClass),
      Class.findById(toClass)
    ]);
    
    if (!fromClassExists || !toClassExists) {
      return res.status(404).json({
        success: false,
        message: "One or both classes not found"
      });
    }
    
    // Build query
    const query = { 
      class: fromClass,
      status: "active",
      isDeleted: false
    };
    
    if (studentIds && studentIds.length > 0) {
      query._id = { $in: studentIds };
    }
    
    // Update students
    const result = await Student.updateMany(
      query,
      {
        $set: {
          class: toClass,
          academicYear,
          updatedBy: req.user?.id
        }
      }
    );
    
    res.json({
      success: true,
      message: `${result.modifiedCount} students promoted successfully`,
      count: result.modifiedCount
    });
  } catch (err) {
    console.error("Bulk promote error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to promote students"
    });
  }
};

// ============================================
// BULK DELETE STUDENTS
// ============================================
exports.bulkDelete = async (req, res) => {
  try {
    const { studentIds } = req.body;
    
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "studentIds array is required"
      });
    }
    
    // Soft delete
    const result = await Student.updateMany(
      {
        _id: { $in: studentIds },
        isDeleted: false
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          status: "inactive"
        }
      }
    );
    
    res.json({
      success: true,
      message: `${result.modifiedCount} students deleted successfully`,
      count: result.modifiedCount
    });
  } catch (err) {
    console.error("Bulk delete error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to delete students"
    });
  }
};
