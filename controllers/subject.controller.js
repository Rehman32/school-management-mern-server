// UBJECT CONTROLLER

const Subject = require("../models/subject.model");

// ============================================
// HELPER: Validate Subject Data
// ============================================
const validateSubject = (data) => {
  const required = ["name", "code"];
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
// LIST SUBJECTS (with pagination & filters)
// ============================================
exports.listSubjects = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const {
      page = 1,
      limit = 50,
      search = "",
      category = "",
      department = "",
      status = "active",
    } = req.query;

    // Build query
    const query = {
      schoolId,
      isDeleted: false,
    };

    if (status && status !== "all") query.status = status;
    if (category) query.category = category;
    if (department) query.department = department;

    // Search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [subjects, total] = await Promise.all([
      Subject.find(query)
        .sort({ displayOrder: 1, name: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Subject.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: subjects,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error("listSubjects error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch subjects"
    });
  }
};

// ============================================
// GET SUBJECT BY ID
// ============================================
exports.getSubjectById = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { id } = req.params;

    const subject = await Subject.findOne({
      _id: id,
      schoolId,
      isDeleted: false,
    })
      .populate("prerequisites", "name code")
      .populate("createdBy updatedBy", "name email");

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found"
      });
    }

    res.json({
      success: true,
      data: subject
    });
  } catch (err) {
    console.error("getSubjectById error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch subject"
    });
  }
};

// ============================================
// CREATE SUBJECT
// ============================================
exports.createSubject = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const userId = req.user._id;

    // Validate input
    const validation = validateSubject(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
    }

    // Create subject
    const subjectData = {
      ...req.body,
      schoolId,
      createdBy: userId,
      updatedBy: userId,
    };

    const newSubject = new Subject(subjectData);
    await newSubject.save();

    res.status(201).json({
      success: true,
      data: newSubject,
      message: "Subject created successfully"
    });
  } catch (err) {
    console.error("createSubject error:", err);

    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A subject with this code already exists"
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
      message: err.message || "Failed to create subject"
    });
  }
};

// ============================================
// UPDATE SUBJECT
// ============================================
exports.updateSubject = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const userId = req.user._id;
    const { id } = req.params;

    // Find existing subject
    const existing = await Subject.findOne({
      _id: id,
      schoolId,
      isDeleted: false,
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Subject not found"
      });
    }

    // Update subject
    const updateData = {
      ...req.body,
      updatedBy: userId,
    };

    // Don't allow changing these
    delete updateData.schoolId;
    delete updateData.createdBy;

    const updatedSubject = await Subject.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: updatedSubject,
      message: "Subject updated successfully"
    });
  } catch (err) {
    console.error("updateSubject error:", err);

    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A subject with this code already exists"
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
      message: err.message || "Failed to update subject"
    });
  }
};

// ============================================
// DELETE SUBJECT (Soft Delete)
// ============================================
exports.deleteSubject = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const userId = req.user._id;
    const { id } = req.params;

    const subject = await Subject.findOne({
      _id: id,
      schoolId,
      isDeleted: false,
    });

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found"
      });
    }

    // Soft delete
    subject.isDeleted = true;
    subject.deletedAt = new Date();
    subject.deletedBy = userId;
    subject.status = "archived";
    await subject.save();

    res.json({
      success: true,
      message: "Subject deleted successfully",
      data: { _id: id }
    });
  } catch (err) {
    console.error("deleteSubject error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to delete subject"
    });
  }
};

// ============================================
// GET SUBJECTS BY CATEGORY
// ============================================
exports.getByCategory = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { category } = req.params;

    const subjects = await Subject.getByCategory(schoolId, category);

    res.json({
      success: true,
      data: subjects
    });
  } catch (err) {
    console.error("getByCategory error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch subjects"
    });
  }
};

// ============================================
// GET SUBJECTS FOR GRADE
// ============================================
exports.getForGrade = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { grade } = req.params;

    const subjects = await Subject.getForGrade(schoolId, grade);

    res.json({
      success: true,
      data: subjects
    });
  } catch (err) {
    console.error("getForGrade error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch subjects"
    });
  }
};

// ============================================
// BULK CREATE SUBJECTS
// ============================================
exports.bulkCreateSubjects = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const userId = req.user._id;
    const { subjects } = req.body;

    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Subjects array is required"
      });
    }

    const results = {
      success: [],
      failed: [],
    };

    for (const subjectData of subjects) {
      try {
        const newSubject = new Subject({
          ...subjectData,
          schoolId,
          createdBy: userId,
          updatedBy: userId,
        });
        await newSubject.save();
        results.success.push(newSubject);
      } catch (err) {
        results.failed.push({
          data: subjectData,
          error: err.message,
        });
      }
    }

    res.json({
      success: true,
      message: `Created ${results.success.length} subjects, ${results.failed.length} failed`,
      data: results,
    });
  } catch (err) {
    console.error("bulkCreateSubjects error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to create subjects"
    });
  }
};
