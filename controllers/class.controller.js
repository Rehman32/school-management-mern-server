//  CLASS CONTROLLER

const Class = require("../models/class.model");
const Teacher = require("../models/teacher.model");
const Student = require("../models/student.model");

// ============================================
// HELPER: Validate Class Data
// ============================================
const validateClass = (data) => {
  const required = ["grade"];
  const missing = required.filter(field => !data[field]);
  
  if (missing.length > 0) {
    return {
      valid: false,
      message: `Missing required fields: ${missing.join(", ")}`
    };
  }
  
  return { valid: true };
};

// ============================================
// LIST CLASSES (with pagination & filters)
// ============================================
exports.listClasses = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const {
      page = 1,
      limit = 20,
      search = "",
      grade = "",
      stream = "",
      status = "active",
      academicYear = "",
    } = req.query;

    // Build query
    const query = {
      schoolId,
      isDeleted: false,
    };

    if (status && status !== "all") query.status = status;
    if (grade) query.grade = grade;
    if (stream) query.stream = stream;
    if (academicYear) query.academicYear = academicYear;

    // Search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { grade: { $regex: search, $options: "i" } },
        { section: { $regex: search, $options: "i" } },
        { room: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [classes, total] = await Promise.all([
      Class.find(query)
        .populate("classTeacher", "fullName email employeeId")
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
    const schoolId = req.user.schoolId;
    const { id } = req.params;

    const classData = await Class.findOne({
      _id: id,
      schoolId,
      isDeleted: false,
    })
      .populate("classTeacher", "fullName email phone employeeId")
      .populate("promotedFrom", "name grade section")
      .populate("promotedTo", "name grade section")
      .populate("monitors.student", "fullName rollNumber");

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found"
      });
    }

    // Get student count
    const studentCount = await Student.countDocuments({
      class: id,
      schoolId,
      status: "active",
    });

    res.json({
      success: true,
      data: {
        ...classData.toObject(),
        studentCount,
      }
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
    const schoolId = req.user.schoolId;
    const userId = req.user._id;

    // Validate input
    const validation = validateClass(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
    }

    // Validate class teacher if provided
    if (req.body.classTeacher) {
      const teacher = await Teacher.findOne({
        _id: req.body.classTeacher,
        schoolId,
        status: "Active",
        isDeleted: false,
      });

      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: "Class teacher not found or inactive"
        });
      }
    }

    // Create class
    const classData = {
      ...req.body,
      schoolId,
      createdBy: userId,
      updatedBy: userId,
    };

    const newClass = new Class(classData);
    await newClass.save();

    // Populate and return
    const populated = await Class.findById(newClass._id)
      .populate("classTeacher", "fullName email employeeId");

    res.status(201).json({
      success: true,
      data: populated,
      message: "Class created successfully"
    });
  } catch (err) {
    console.error("createClass error:", err);

    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A class with this grade and section already exists for this academic year"
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
    const schoolId = req.user.schoolId;
    const userId = req.user._id;
    const { id } = req.params;

    // Find existing class
    const existing = await Class.findOne({
      _id: id,
      schoolId,
      isDeleted: false,
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Class not found"
      });
    }

    // Validate class teacher if provided
    if (req.body.classTeacher && req.body.classTeacher !== existing.classTeacher?.toString()) {
      const teacher = await Teacher.findOne({
        _id: req.body.classTeacher,
        schoolId,
        status: "Active",
        isDeleted: false,
      });

      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: "Class teacher not found or inactive"
        });
      }
    }

    // Update class
    const updateData = {
      ...req.body,
      updatedBy: userId,
    };

    // Don't allow changing these
    delete updateData.schoolId;
    delete updateData.createdBy;
    delete updateData.academicYear; // Prevent year change

    const updatedClass = await Class.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate("classTeacher", "fullName email employeeId");

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
// DELETE CLASS (Soft Delete)
// ============================================
exports.deleteClass = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const userId = req.user._id;
    const { id } = req.params;

    const classData = await Class.findOne({
      _id: id,
      schoolId,
      isDeleted: false,
    });

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found"
      });
    }

    // Check if class has students
    const studentCount = await Student.countDocuments({
      class: id,
      schoolId,
      status: "active",
    });

    if (studentCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete class with ${studentCount} active students. Please reassign them first.`
      });
    }

    // Soft delete
    classData.isDeleted = true;
    classData.deletedAt = new Date();
    classData.deletedBy = userId;
    classData.status = "archived";
    await classData.save();

    res.json({
      success: true,
      message: "Class deleted successfully",
      data: { _id: id }
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
    const schoolId = req.user.schoolId;
    const { academicYear } = req.query;

    const stats = await Class.getSchoolStats(schoolId, academicYear);

    // Get grade-wise distribution
    const gradeDistribution = await Class.aggregate([
      {
        $match: {
          schoolId,
          isDeleted: false,
          status: "active",
        }
      },
      {
        $group: {
          _id: "$grade",
          classCount: { $sum: 1 },
          totalCapacity: { $sum: "$maxCapacity" },
          totalEnrolled: { $sum: "$currentEnrollment" },
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        ...stats,
        gradeDistribution,
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
    const schoolId = req.user.schoolId;
    const { id } = req.params;

    // Get actual student count
    const [maleCount, femaleCount] = await Promise.all([
      Student.countDocuments({
        class: id,
        schoolId,
        status: "active",
        gender: "male",
      }),
      Student.countDocuments({
        class: id,
        schoolId,
        status: "active",
        gender: "female",
      })
    ]);

    const totalCount = maleCount + femaleCount;

    const updatedClass = await Class.findOneAndUpdate(
      { _id: id, schoolId },
      {
        currentEnrollment: totalCount,
        maleCount: maleCount,
        femaleCount: femaleCount,
      },
      { new: true }
    );

    if (!updatedClass) {
      return res.status(404).json({
        success: false,
        message: "Class not found"
      });
    }

    res.json({
      success: true,
      data: updatedClass,
      message: "Enrollment count updated successfully"
    });
  } catch (err) {
    console.error("updateEnrollmentCount error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to update enrollment count"
    });
  }
};

// ============================================
// BULK CREATE CLASSES
// ============================================
exports.bulkCreateClasses = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const userId = req.user._id;
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
          schoolId,
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
