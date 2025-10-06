// teacher.controller.js

const Teacher = require("../models/teacher.model");
const TeacherAssignment = require("../models/teacherAssignment.model");

// ============================================
// HELPER: Validate Teacher Data
// ============================================
const validateTeacher = (data) => {
  const required = ["fullName", "email", "gender"];
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
// LIST TEACHERS (with advanced filtering)
// ============================================
exports.listTeachers = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "",
      department = "",
      employmentType = "",
      gender = ""
    } = req.query;

    // Build query
    const query = { 
      schoolId,
      isDeleted: false
    };

    if (status && status !== "all") query.status = status;
    if (department) query.department = department;
    if (employmentType) query.employmentType = employmentType;
    if (gender) query.gender = gender;

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query with pagination
    const [teachers, total] = await Promise.all([
      Teacher.find(query)
        .select("-salaryStructure -bankDetails -pfNumber -esiNumber -panNumber -aadharNumber") // Hide sensitive data
        .populate("subjects", "name")
        .populate("classes", "name grade section")
        .populate("classTeacherOf", "name grade section")
        .sort(search ? { score: { $meta: "textScore" } } : { createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Teacher.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: teachers,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error("listTeachers error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch teachers"
    });
  }
};

// ============================================
// GET TEACHER BY ID
// ============================================
exports.getTeacherById = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { id } = req.params;

    const teacher = await Teacher.findOne({
      _id: id,
      schoolId,
      isDeleted: false
    })
      .populate("subjects", "name")
      .populate("classes", "name grade section")
      .populate("classTeacherOf", "name grade section")
      .populate("createdBy updatedBy", "name email");

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found"
      });
    }

    // Get teacher assignments if exists
    let assignments = [];
    try {
      const assignmentData = await TeacherAssignment.findOne({
        schoolId,
        teacher: id
      })
        .populate("assignments.subject", "name")
        .populate("assignments.class", "name grade section");
      
      if (assignmentData) {
        assignments = assignmentData.assignments;
      }
    } catch (err) {
      console.error("Error fetching assignments:", err);
    }

    res.json({
      success: true,
      data: {
        ...teacher.toObject(),
        assignments
      }
    });
  } catch (err) {
    console.error("getTeacherById error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch teacher"
    });
  }
};

// ============================================
// CREATE TEACHER
// ============================================
exports.createTeacher = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const userId = req.user._id;

    // Validate input
    const validation = validateTeacher(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
    }

    // ✅ CLEAN UP DATA BEFORE SAVING
    const teacherData = {
      ...req.body,
      schoolId,
      createdBy: userId,
      updatedBy: userId
    };

    // ✅ FIX: Remove empty classTeacherOf
    if (!teacherData.classTeacherOf || teacherData.classTeacherOf === "") {
      delete teacherData.classTeacherOf;
    }

    // ✅ FIX: Filter out empty emergency contacts
    if (teacherData.emergencyContacts) {
      teacherData.emergencyContacts = teacherData.emergencyContacts.filter(
        contact => contact.name && contact.relationship && contact.phone
      );
    }

    // ✅ FIX: Remove empty values from arrays
    if (teacherData.subjects) {
      teacherData.subjects = teacherData.subjects.filter(s => s);
    }
    if (teacherData.classes) {
      teacherData.classes = teacherData.classes.filter(c => c);
    }

    const newTeacher = new Teacher(teacherData);
    await newTeacher.save();

    // Populate and return
    const populated = await Teacher.findById(newTeacher._id)
      .populate("subjects", "name")
      .populate("classes", "name grade section")
      .populate("classTeacherOf", "name grade section");

    res.status(201).json({
      success: true,
      data: populated,
      message: "Teacher created successfully"
    });
  } catch (err) {
    console.error("createTeacher error:", err);

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
      message: err.message || "Failed to create teacher"
    });
  }
};

exports.getTeachersMinimal = async (req, res) => {
  try {
    const { schoolId } = req.user;
    const { search = "", limit = 1000 } = req.query;
    const filter = { schoolId, isDeleted: false };

    if (search && search.trim()) {
      const s = search.trim();
      filter.$or = [
        { fullName: { $regex: s, $options: "i" } },
        { email: { $regex: s, $options: "i" } },
      ];
    }

    const items = await Teacher.find(filter)
      .select("_id fullName email status")
      .limit(Math.min(parseInt(limit, 10) || 1000, 2000))
      .sort({ fullName: 1 });

    return res.json({ success: true, data: items });
  } catch (err) {
    console.error("getTeachersMinimal error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch teachers", error: err.message });
  }
};

// ============================================
// UPDATE TEACHER
// ============================================
exports.updateTeacher = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const userId = req.user._id;
    const { id } = req.params;

    // Find existing teacher
    const existing = await Teacher.findOne({
      _id: id,
      schoolId,
      isDeleted: false
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found"
      });
    }

    // Track status changes
    if (req.body.status && req.body.status !== existing.status) {
      if (!existing.statusHistory) {
        existing.statusHistory = [];
      }
      existing.statusHistory.push({
        status: req.body.status,
        changedAt: new Date(),
        changedBy: userId,
        reason: req.body.statusReason || ""
      });
    }

    // Update teacher
    const updateData = {
      ...req.body,
      updatedBy: userId
    };

    // Don't allow changing these fields
    delete updateData.schoolId;
    delete updateData.createdBy;
    delete updateData.employeeId; // Prevent manual change

    const updatedTeacher = await Teacher.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate("subjects", "name")
      .populate("classes", "name grade section")
      .populate("classTeacherOf", "name grade section");

    res.json({
      success: true,
      data: updatedTeacher,
      message: "Teacher updated successfully"
    });
  } catch (err) {
    console.error("updateTeacher error:", err);

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
      message: err.message || "Failed to update teacher"
    });
  }
};

// ============================================
// DELETE TEACHER (Soft Delete)
// ============================================
exports.deleteTeacher = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const userId = req.user._id;
    const { id } = req.params;

    const teacher = await Teacher.findOne({
      _id: id,
      schoolId,
      isDeleted: false
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found"
      });
    }

    // Soft delete
    teacher.isDeleted = true;
    teacher.deletedAt = new Date();
    teacher.deletedBy = userId;
    teacher.status = "Inactive";
    await teacher.save();

    // Also soft delete assignments if exists
    try {
      await TeacherAssignment.updateOne(
        { schoolId, teacher: id },
        { isDeleted: true, deletedAt: new Date() }
      );
    } catch (err) {
      console.error("Error deleting assignments:", err);
    }

    res.json({
      success: true,
      message: "Teacher deleted successfully",
      data: { _id: id }
    });
  } catch (err) {
    console.error("deleteTeacher error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to delete teacher"
    });
  }
};

// ============================================
// GET STATISTICS
// ============================================
exports.getStatistics = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;

    const stats = await Teacher.getSchoolStats(schoolId);

    // Get department-wise count
    const deptCounts = await Teacher.aggregate([
      { 
        $match: { 
          schoolId,
          isDeleted: false,
          status: "Active",
          department: { $exists: true, $ne: "" }
        } 
      },
      { $group: { _id: "$department", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get qualification distribution
    const qualStats = await Teacher.aggregate([
      { 
        $match: { 
          schoolId,
          isDeleted: false,
          status: "Active"
        } 
      },
      { $unwind: "$qualifications" },
      { $group: { _id: "$qualifications", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        ...stats,
        departmentCounts: deptCounts,
        qualificationStats: qualStats
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
// BULK UPDATE STATUS
// ============================================
exports.bulkUpdateStatus = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const userId = req.user._id;
    const { teacherIds, status, reason } = req.body;

    if (!teacherIds || !Array.isArray(teacherIds) || teacherIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "teacherIds array is required"
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "status is required"
      });
    }

    // Update all teachers
    const result = await Teacher.updateMany(
      {
        _id: { $in: teacherIds },
        schoolId,
        isDeleted: false
      },
      {
        $set: { 
          status,
          updatedBy: userId
        },
        $push: {
          statusHistory: {
            status,
            changedAt: new Date(),
            changedBy: userId,
            reason: reason || ""
          }
        }
      }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} teachers updated successfully`,
      count: result.modifiedCount
    });
  } catch (err) {
    console.error("bulkUpdateStatus error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to update teachers"
    });
  }
};

// ============================================
// BULK DELETE TEACHERS
// ============================================
exports.bulkDelete = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const userId = req.user._id;
    const { teacherIds } = req.body;

    if (!teacherIds || !Array.isArray(teacherIds) || teacherIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "teacherIds array is required"
      });
    }

    // Soft delete all teachers
    const result = await Teacher.updateMany(
      {
        _id: { $in: teacherIds },
        schoolId,
        isDeleted: false
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: userId,
          status: "Inactive"
        }
      }
    );

    // Delete assignments
    await TeacherAssignment.updateMany(
      {
        schoolId,
        teacher: { $in: teacherIds }
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date()
        }
      }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} teachers deleted successfully`,
      count: result.modifiedCount
    });
  } catch (err) {
    console.error("bulkDelete error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to delete teachers"
    });
  }
};

// ============================================
// GET UNIQUE DEPARTMENTS
// ============================================
exports.getDepartments = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;

    const departments = await Teacher.distinct("department", {
      schoolId,
      isDeleted: false,
      department: { $exists: true, $ne: "" }
    });

    res.json({
      success: true,
      data: departments.sort()
    });
  } catch (err) {
    console.error("getDepartments error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch departments"
    });
  }
};
