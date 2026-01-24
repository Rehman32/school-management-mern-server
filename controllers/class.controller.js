// ============================================
// CLASS CONTROLLER - SINGLE-TENANT EDITION
// ============================================

const Class = require("../models/class.model");
const User = require("../models/user.model");
const Student = require("../models/student.model");
const Teacher = require("../models/teacher.model");

// ============================================
// LIST CLASSES
// ============================================
exports.listClasses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      grade = "",
      stream = "",
      status = "active",
    } = req.query;

    const query = { isDeleted: false };

    if (status && status !== "all") query.status = status;
    if (grade) query.grade = grade;
    if (stream) query.stream = stream;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { grade: { $regex: search, $options: "i" } },
        { section: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [classes, total] = await Promise.all([
      Class.find(query)
        .populate("classTeacher", "fullName email")
        .sort({ grade: 1, section: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Class.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: classes,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error("listClasses error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch classes"
    });
  }
};

// ============================================
// GET CLASS BY ID
// ============================================
exports.getClassById = async (req, res) => {
  try {
    const classData = await Class.findOne({
      _id: req.params.id,
      isDeleted: false,
    })
      .populate("classTeacher", "fullName email")
      .populate("createdBy updatedBy", "name email");

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found"
      });
    }

    res.json({
      success: true,
      data: classData
    });
  } catch (err) {
    console.error("getClassById error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch class"
    });
  }
};

// ============================================
// CREATE CLASS
// ============================================
exports.createClass = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!req.body.grade) {
      return res.status(400).json({
        success: false,
        message: "Grade is required"
      });
    }

    // Validate class teacher if provided
    let teacherId = null;
    if (req.body.classTeacher && req.body.classTeacher.trim() !== '') {
      const teacher = await Teacher.findOne({
        _id: req.body.classTeacher,
        isDeleted: false,
      });

      if (!teacher) {
        return res.status(400).json({
          success: false,
          message: "Invalid teacher ID"
        });
      }
      teacherId = teacher._id;
    }

    // Check for duplicate
    const duplicate = await Class.findOne({
      grade: req.body.grade,
      section: req.body.section || "",
      isDeleted: false,
    });

    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: "A class with this grade and section already exists"
      });
    }

    // Create class
    const classData = {
      ...req.body,
      classTeacher: teacherId,
      createdBy: userId,
      updatedBy: userId,
    };

    const newClass = new Class(classData);
    await newClass.save();

    await newClass.populate("classTeacher", "fullName email");

    res.status(201).json({
      success: true,
      data: newClass,
      message: "Class created successfully"
    });
  } catch (err) {
    console.error("createClass error:", err);

    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A class with this grade and section already exists"
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
      message: err.message || "Failed to create class"
    });
  }
};

// ============================================
// UPDATE CLASS
// ============================================
exports.updateClass = async (req, res) => {
  try {
    const userId = req.user?.id;

    const existing = await Class.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Class not found"
      });
    }

    // Validate class teacher if changed
    if (req.body.classTeacher !== undefined) {
      if (req.body.classTeacher === '' || req.body.classTeacher === null) {
        // Clear class teacher
        req.body.classTeacher = null;
      } else if (req.body.classTeacher !== existing.classTeacher?.toString()) {
        // Validate new teacher
        const teacher = await Teacher.findOne({
          _id: req.body.classTeacher,
          isDeleted: false,
        });

        if (!teacher) {
          return res.status(400).json({
            success: false,
            message: "Invalid teacher ID"
          });
        }
      }
    }

    const updateData = {
      ...req.body,
      updatedBy: userId,
    };

    delete updateData.createdBy;

    const updatedClass = await Class.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate("classTeacher", "fullName email");

    res.json({
      success: true,
      data: updatedClass,
      message: "Class updated successfully"
    });
  } catch (err) {
    console.error("updateClass error:", err);

    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A class with this grade and section already exists"
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
      message: err.message || "Failed to update class"
    });
  }
};

// ============================================
// DELETE CLASS
// ============================================
exports.deleteClass = async (req, res) => {
  try {
    const classData = await Class.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found"
      });
    }

    classData.isDeleted = true;
    classData.deletedAt = new Date();
    classData.status = "inactive";
    await classData.save();

    res.json({
      success: true,
      message: "Class deleted successfully",
      data: { _id: classData._id }
    });
  } catch (err) {
    console.error("deleteClass error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to delete class"
    });
  }
};

// ============================================
// GET STATISTICS
// ============================================
exports.getStatistics = async (req, res) => {
  try {
    const stats = await Class.aggregate([
      {
        $match: { isDeleted: false }
      },
      {
        $group: {
          _id: null,
          totalClasses: { $sum: 1 },
          activeClasses: {
            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] }
          },
          totalCapacity: { $sum: "$maxCapacity" },
          totalEnrolled: { $sum: "$currentEnrollment" }
        }
      }
    ]);

    res.json({
      success: true,
      data: stats[0] || {
        totalClasses: 0,
        activeClasses: 0,
        totalCapacity: 0,
        totalEnrolled: 0
      }
    });
  } catch (err) {
    console.error("getStatistics error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to get statistics"
    });
  }
};

// ============================================
// UPDATE ENROLLMENT COUNT
// ============================================
exports.updateEnrollmentCount = async (req, res) => {
  try {
    const { id } = req.params;

    const classData = await Class.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found"
      });
    }

    // Count students
    const studentCount = await Student.countDocuments({
      class: id,
      status: "active",
      isDeleted: false,
    });

    classData.currentEnrollment = studentCount;
    await classData.save();

    res.json({
      success: true,
      data: classData,
      message: "Enrollment count updated"
    });
  } catch (err) {
    console.error("updateEnrollmentCount error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to update enrollment"
    });
  }
};

// ============================================
// BULK CREATE CLASSES
// ============================================
exports.bulkCreateClasses = async (req, res) => {
  try {
    const userId = req.user?.id;

    const { classes } = req.body;

    if (!classes || !Array.isArray(classes) || classes.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Classes array is required"
      });
    }

    const results = {
      success: [],
      failed: [],
    };

    for (const classData of classes) {
      try {
        const newClass = new Class({
          ...classData,
          createdBy: userId,
          updatedBy: userId,
        });
        await newClass.save();
        results.success.push(newClass);
      } catch (err) {
        results.failed.push({
          data: classData,
          error: err.message,
        });
      }
    }

    res.json({
      success: true,
      message: `Created ${results.success.length} classes, ${results.failed.length} failed`,
      data: results,
    });
  } catch (err) {
    console.error("bulkCreateClasses error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to create classes"
    });
  }
};
