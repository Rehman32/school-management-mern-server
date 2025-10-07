// ============================================
// TEACHER CONTROLLER - MULTI-TENANT
// Professional Production-Ready Version
// ============================================

const Teacher = require("../models/teacher.model");
const Class = require("../models/class.model");
const Subject = require("../models/subject.model");
const mongoose = require("mongoose");

// ============================================
// HELPER FUNCTIONS
// ============================================

const validateTeacher = (data) => {
  const required = ["fullName", "email", "phone", "gender"];
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
// GET ALL TEACHERS (with pagination & search)
// ============================================
exports.listTeachers = async (req, res) => {
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
      search,
      status = "Active",
      department,
      employmentType,
      gender,
      sort = "-dateJoined"
    } = req.query;
    
    // Build query
    const query = { 
      tenantId,
      isDeleted: false
    };
    
    if (status && status !== "all") {
      query.status = status;
    }
    if (department) query.department = department;
    if (employmentType) query.employmentType = employmentType;
    if (gender) query.gender = gender;
    
    // Search
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { employeeId: { $regex: search, $options: "i" } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [teachers, total] = await Promise.all([
      Teacher.find(query)
        .populate("subjects", "name code")
        .populate("classes", "name grade section")
        .populate("classTeacherOf", "name grade section")
        .sort(sort)
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
    console.error("Error fetching teachers:", err);
    res.status(500).json({ 
      success: false, 
      message: err.message || "Server Error" 
    });
  }
};

// ============================================
// GET TEACHER BY ID
// ============================================
exports.getTeacherById = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required"
      });
    }

    const teacher = await Teacher.findOne({ 
      _id: req.params.id, 
      tenantId,
      isDeleted: false
    })
    .populate("subjects", "name code")
    .populate("classes", "name grade section")
    .populate("classTeacherOf", "name grade section")
    .populate("createdBy updatedBy", "name email");
    
    if (!teacher) {
      return res.status(404).json({ 
        success: false,
        message: "Teacher not found" 
      });
    }
    
    res.json({ success: true, data: teacher });
  } catch (err) {
    console.error("Get teacher error:", err);
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
    const tenantId = req.user?.tenantId || req.tenantId;
    const userId = req.user?._id;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required"
      });
    }
    
    // Validate input
    const validation = validateTeacher(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
    }
    
    // Check for duplicate email within tenant
    if (req.body.email) {
      const existingTeacher = await Teacher.findOne({
        tenantId,
        email: req.body.email.toLowerCase(),
        isDeleted: false
      });
      
      if (existingTeacher) {
        return res.status(400).json({
          success: false,
          message: "Email already exists"
        });
      }
    }

    // Check for duplicate phone within tenant
    if (req.body.phone) {
      const existingPhone = await Teacher.findOne({
        tenantId,
        phone: req.body.phone,
        isDeleted: false
      });
      
      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message: "Phone number already exists"
        });
      }
    }

    // Check for duplicate employee ID
    if (req.body.employeeId) {
      const existingEmpId = await Teacher.findOne({
        tenantId,
        employeeId: req.body.employeeId,
        isDeleted: false
      });
      
      if (existingEmpId) {
        return res.status(400).json({
          success: false,
          message: "Employee ID already exists"
        });
      }
    }
    
    // Validate subjects exist in this tenant
    if (req.body.subjects && req.body.subjects.length > 0) {
      const subjectsExist = await Subject.countDocuments({
        _id: { $in: req.body.subjects },
        tenantId
      });
      
      if (subjectsExist !== req.body.subjects.length) {
        return res.status(404).json({
          success: false,
          message: "One or more subjects not found in your school"
        });
      }
    }
    
    // Validate classes exist in this tenant
    if (req.body.classes && req.body.classes.length > 0) {
      const classesExist = await Class.countDocuments({
        _id: { $in: req.body.classes },
        tenantId
      });
      
      if (classesExist !== req.body.classes.length) {
        return res.status(404).json({
          success: false,
          message: "One or more classes not found in your school"
        });
      }
    }

    // Validate classTeacherOf if provided
    if (req.body.isClassTeacher && req.body.classTeacherOf) {
      const classExists = await Class.findOne({
        _id: req.body.classTeacherOf,
        tenantId
      });

      if (!classExists) {
        return res.status(404).json({
          success: false,
          message: "Class not found"
        });
      }

      // Check if class already has a class teacher
      const existingClassTeacher = await Teacher.findOne({
        tenantId,
        classTeacherOf: req.body.classTeacherOf,
        isDeleted: false,
        status: "Active"
      });

      if (existingClassTeacher) {
        return res.status(400).json({
          success: false,
          message: `Class already has a class teacher: ${existingClassTeacher.fullName}`
        });
      }
    }
    
    // Create teacher
    const teacherData = {
      ...req.body,
      tenantId,
      schoolId: tenantId, // Backward compatibility
      createdBy: userId,
      updatedBy: userId
    };
    
    const newTeacher = new Teacher(teacherData);
    const savedTeacher = await newTeacher.save();
    
    // Populate and return
    const populated = await Teacher.findById(savedTeacher._id)
      .populate("subjects", "name code")
      .populate("classes", "name grade section")
      .populate("classTeacherOf", "name grade section");
    
    res.status(201).json({ 
      success: true, 
      data: populated,
      message: "Teacher created successfully"
    });
  } catch (err) {
    console.error("Create teacher error:", err);
    
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

// ============================================
// UPDATE TEACHER
// ============================================
exports.updateTeacher = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.tenantId;
    const userId = req.user?._id;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required"
      });
    }
    
    // Find existing teacher
    const existing = await Teacher.findOne({ 
      _id: req.params.id, 
      tenantId,
      isDeleted: false
    });
    
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found"
      });
    }
    
    // Check for duplicate email (if changed)
    if (req.body.email && req.body.email !== existing.email) {
      const emailExists = await Teacher.findOne({
        _id: { $ne: req.params.id },
        tenantId,
        email: req.body.email.toLowerCase(),
        isDeleted: false
      });
      
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "Email already exists"
        });
      }
    }

    // Check for duplicate phone (if changed)
    if (req.body.phone && req.body.phone !== existing.phone) {
      const phoneExists = await Teacher.findOne({
        _id: { $ne: req.params.id },
        tenantId,
        phone: req.body.phone,
        isDeleted: false
      });
      
      if (phoneExists) {
        return res.status(400).json({
          success: false,
          message: "Phone number already exists"
        });
      }
    }

    // Validate classTeacherOf if being assigned
    if (req.body.isClassTeacher && req.body.classTeacherOf) {
      if (req.body.classTeacherOf !== existing.classTeacherOf?.toString()) {
        const classExists = await Class.findOne({
          _id: req.body.classTeacherOf,
          tenantId
        });

        if (!classExists) {
          return res.status(404).json({
            success: false,
            message: "Class not found"
          });
        }

        // Check if class already has another class teacher
        const existingClassTeacher = await Teacher.findOne({
          _id: { $ne: req.params.id },
          tenantId,
          classTeacherOf: req.body.classTeacherOf,
          isDeleted: false,
          status: "Active"
        });

        if (existingClassTeacher) {
          return res.status(400).json({
            success: false,
            message: `Class already has a class teacher: ${existingClassTeacher.fullName}`
          });
        }
      }
    }

    // If isClassTeacher is false, clear classTeacherOf
    if (req.body.isClassTeacher === false) {
      req.body.classTeacherOf = null;
    }
    
    // Validate subjects if provided
    if (req.body.subjects && req.body.subjects.length > 0) {
      const subjectsExist = await Subject.countDocuments({
        _id: { $in: req.body.subjects },
        tenantId
      });
      
      if (subjectsExist !== req.body.subjects.length) {
        return res.status(404).json({
          success: false,
          message: "One or more subjects not found"
        });
      }
    }
    
    // Validate classes if provided
    if (req.body.classes && req.body.classes.length > 0) {
      const classesExist = await Class.countDocuments({
        _id: { $in: req.body.classes },
        tenantId
      });
      
      if (classesExist !== req.body.classes.length) {
        return res.status(404).json({
          success: false,
          message: "One or more classes not found"
        });
      }
    }
    
    // Update teacher
    const updateData = {
      ...req.body,
      updatedBy: userId
    };
    
    // Don't allow changing tenantId, schoolId, or createdBy
    delete updateData.tenantId;
    delete updateData.schoolId;
    delete updateData.createdBy;
    delete updateData.employeeId; // Don't allow changing employee ID
    
    const updatedTeacher = await Teacher.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate("subjects", "name code")
    .populate("classes", "name grade section")
    .populate("classTeacherOf", "name grade section");
    
    res.json({ 
      success: true, 
      data: updatedTeacher,
      message: "Teacher updated successfully"
    });
  } catch (err) {
    console.error("Update teacher error:", err);
    
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
    const tenantId = req.user?.tenantId || req.tenantId;
    const userId = req.user?._id;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required"
      });
    }
    
    const teacher = await Teacher.findOne({ 
      _id: req.params.id, 
      tenantId,
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
    
    res.json({ 
      success: true, 
      message: "Teacher deleted successfully",
      data: { _id: teacher._id }
    });
  } catch (err) {
    console.error("Delete teacher error:", err);
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
    const tenantId = req.user?.tenantId || req.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required"
      });
    }
    
    const stats = await Teacher.getSchoolStats(tenantId);
    
    // Get department-wise count
    const departmentCounts = await Teacher.aggregate([
      { 
        $match: { 
          tenantId: new mongoose.Types.ObjectId(tenantId),
          status: "Active",
          isDeleted: false
        } 
      },
      { 
        $group: { 
          _id: "$department", 
          count: { $sum: 1 } 
        } 
      },
      { $sort: { count: -1 } }
    ]);

    // Get employment type distribution
    const employmentTypes = await Teacher.aggregate([
      { 
        $match: { 
          tenantId: new mongoose.Types.ObjectId(tenantId),
          status: "Active",
          isDeleted: false
        } 
      },
      { 
        $group: { 
          _id: "$employmentType", 
          count: { $sum: 1 } 
        } 
      }
    ]);
    
    res.json({
      success: true,
      data: {
        ...stats,
        departmentCounts,
        employmentTypes
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
// GET DEPARTMENTS (Unique list)
// ============================================
exports.getDepartments = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required"
      });
    }

    const departments = await Teacher.distinct("department", {
      tenantId,
      isDeleted: false,
      department: { $ne: null, $ne: "" }
    });

    res.json({
      success: true,
      data: departments.sort()
    });
  } catch (err) {
    console.error("Get departments error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to get departments"
    });
  }
};

// ============================================
// BULK UPDATE STATUS
// ============================================
exports.bulkUpdateStatus = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.tenantId;
    const userId = req.user?._id;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required"
      });
    }

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

    const validStatuses = ["Active", "Inactive", "On Leave", "Resigned", "Terminated"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`
      });
    }
    
    // Update teachers
    const result = await Teacher.updateMany(
      {
        _id: { $in: teacherIds },
        tenantId,
        isDeleted: false
      },
      {
        $set: { status },
        $push: {
          statusHistory: {
            status,
            changedAt: new Date(),
            changedBy: userId,
            reason: reason || "Bulk status update"
          }
        }
      }
    );
    
    res.json({
      success: true,
      message: `${result.modifiedCount} teachers status updated successfully`,
      count: result.modifiedCount
    });
  } catch (err) {
    console.error("Bulk update status error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to update status"
    });
  }
};

// ============================================
// BULK DELETE TEACHERS
// ============================================
exports.bulkDelete = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.tenantId;
    const userId = req.user?._id;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required"
      });
    }

    const { teacherIds } = req.body;
    
    if (!teacherIds || !Array.isArray(teacherIds) || teacherIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "teacherIds array is required"
      });
    }
    
    // Soft delete
    const result = await Teacher.updateMany(
      {
        _id: { $in: teacherIds },
        tenantId,
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
    
    res.json({
      success: true,
      message: `${result.modifiedCount} teachers deleted successfully`,
      count: result.modifiedCount
    });
  } catch (err) {
    console.error("Bulk delete error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to delete teachers"
    });
  }
};

// ============================================
// ASSIGN SUBJECTS TO TEACHER
// ============================================
exports.assignSubjects = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required"
      });
    }

    const { teacherId, subjectIds } = req.body;

    if (!teacherId || !subjectIds || !Array.isArray(subjectIds)) {
      return res.status(400).json({
        success: false,
        message: "teacherId and subjectIds array are required"
      });
    }

    // Validate teacher exists
    const teacher = await Teacher.findOne({
      _id: teacherId,
      tenantId,
      isDeleted: false
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found"
      });
    }

    // Validate subjects exist
    const subjects = await Subject.countDocuments({
      _id: { $in: subjectIds },
      tenantId
    });

    if (subjects !== subjectIds.length) {
      return res.status(404).json({
        success: false,
        message: "One or more subjects not found"
      });
    }

    // Assign subjects
    teacher.subjects = subjectIds;
    await teacher.save();

    await teacher.populate("subjects", "name code");

    res.json({
      success: true,
      message: "Subjects assigned successfully",
      data: teacher
    });
  } catch (err) {
    console.error("Assign subjects error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to assign subjects"
    });
  }
};

// ============================================
// ASSIGN CLASSES TO TEACHER
// ============================================
exports.assignClasses = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required"
      });
    }

    const { teacherId, classIds } = req.body;

    if (!teacherId || !classIds || !Array.isArray(classIds)) {
      return res.status(400).json({
        success: false,
        message: "teacherId and classIds array are required"
      });
    }

    // Validate teacher exists
    const teacher = await Teacher.findOne({
      _id: teacherId,
      tenantId,
      isDeleted: false
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found"
      });
    }

    // Validate classes exist
    const classes = await Class.countDocuments({
      _id: { $in: classIds },
      tenantId
    });

    if (classes !== classIds.length) {
      return res.status(404).json({
        success: false,
        message: "One or more classes not found"
      });
    }

    // Assign classes
    teacher.classes = classIds;
    await teacher.save();

    await teacher.populate("classes", "name grade section");

    res.json({
      success: true,
      message: "Classes assigned successfully",
      data: teacher
    });
  } catch (err) {
    console.error("Assign classes error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to assign classes"
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