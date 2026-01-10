// ============================================
// SUBJECT CONTROLLER - SINGLE-TENANT EDITION
// ============================================

const Subject = require("../models/subject.model");
const Class = require("../models/class.model");
const Teacher = require("../models/teacher.model");

// ============================================
// LIST SUBJECTS
// ============================================
exports.listSubjects = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = "",
      category = "",
      grade = "",
      stream = "",
      status = "active",
    } = req.query;

    const query = { isDeleted: false };

    if (status && status !== "all") query.status = status;
    if (category) query.category = category;
    if (grade) query.grade = grade;
    if (stream) query.stream = stream;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [subjects, total] = await Promise.all([
      Subject.find(query)
        .populate("teachers", "fullName email")
        .populate("classes", "name grade section")
        .sort({ name: 1 })
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
    const subject = await Subject.findOne({
      _id: req.params.id,
      isDeleted: false,
    })
      .populate("teachers", "fullName email")
      .populate("classes", "name grade section")
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
    const userId = req.user?.id;

    if (!req.body.name || !req.body.code) {
      return res.status(400).json({
        success: false,
        message: "Subject name and code are required"
      });
    }

    // Check for duplicate code
    const duplicate = await Subject.findOne({
      code: req.body.code.toUpperCase(),
      isDeleted: false,
    });

    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: "Subject code already exists"
      });
    }

    // Validate teachers if provided
    if (req.body.teachers && req.body.teachers.length > 0) {
      const teachersExist = await Teacher.countDocuments({
        _id: { $in: req.body.teachers },
        isDeleted: false,
      });

      if (teachersExist !== req.body.teachers.length) {
        return res.status(404).json({
          success: false,
          message: "One or more teachers not found"
        });
      }
    }

    // Validate classes if provided
    if (req.body.classes && req.body.classes.length > 0) {
      const classesExist = await Class.countDocuments({
        _id: { $in: req.body.classes },
        isDeleted: false,
      });

      if (classesExist !== req.body.classes.length) {
        return res.status(404).json({
          success: false,
          message: "One or more classes not found"
        });
      }
    }

    // Create subject
    const subjectData = {
      ...req.body,
      createdBy: userId,
      updatedBy: userId,
    };

    const newSubject = new Subject(subjectData);
    await newSubject.save();

    await newSubject.populate("teachers", "fullName email");
    await newSubject.populate("classes", "name grade section");

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
        message: "Subject code already exists"
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
    const userId = req.user?.id;

    const existing = await Subject.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Subject not found"
      });
    }

    // Check for duplicate code if changed
    if (req.body.code && req.body.code.toUpperCase() !== existing.code) {
      const duplicate = await Subject.findOne({
        _id: { $ne: req.params.id },
        code: req.body.code.toUpperCase(),
        isDeleted: false,
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: "Subject code already exists"
        });
      }
    }

    // Validate teachers if provided
    if (req.body.teachers) {
      const teachersExist = await Teacher.countDocuments({
        _id: { $in: req.body.teachers },
        isDeleted: false,
      });

      if (teachersExist !== req.body.teachers.length) {
        return res.status(404).json({
          success: false,
          message: "One or more teachers not found"
        });
      }
    }

    // Validate classes if provided
    if (req.body.classes) {
      const classesExist = await Class.countDocuments({
        _id: { $in: req.body.classes },
        isDeleted: false,
      });

      if (classesExist !== req.body.classes.length) {
        return res.status(404).json({
          success: false,
          message: "One or more classes not found"
        });
      }
    }

    const updateData = {
      ...req.body,
      updatedBy: userId,
    };

    delete updateData.createdBy;

    const updatedSubject = await Subject.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate("teachers", "fullName email")
      .populate("classes", "name grade section");

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
        message: "Subject code already exists"
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
// DELETE SUBJECT
// ============================================
exports.deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found"
      });
    }

    subject.isDeleted = true;
    subject.deletedAt = new Date();
    subject.status = "inactive";
    await subject.save();

    res.json({
      success: true,
      message: "Subject deleted successfully",
      data: { _id: subject._id }
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
// GET STATISTICS
// ============================================
exports.getStatistics = async (req, res) => {
  try {
    const stats = await Subject.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] }
          }
        }
      }
    ]);

    // Get category-wise count
    const categoryCounts = await Subject.aggregate([
      { $match: { status: "active", isDeleted: false } },
      { $group: { _id: "$category", count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        ...(stats[0] || { total: 0, active: 0 }),
        categoryCounts
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
// BULK CREATE SUBJECTS
// ============================================
exports.bulkCreateSubjects = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { subjects } = req.body;

    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Subjects array is required"
      });
    }

    const results = { success: [], failed: [] };

    for (const subjectData of subjects) {
      try {
        const newSubject = new Subject({
          ...subjectData,
          createdBy: userId,
          updatedBy: userId,
        });
        await newSubject.save();
        results.success.push(newSubject);
      } catch (err) {
        results.failed.push({ data: subjectData, error: err.message });
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
