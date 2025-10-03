const ClassModel = require("../models/class.model");
const mongoose=require('mongoose');
// Helper: Pagination
const getPagination = (query) => {
  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit) || 10, 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

// POST /api/classes
exports.createClass = async (req, res) => {
  try {
    if (!req.user?.schoolId) {
      return res.status(400).json({ success: false, message: "Missing schoolId" });
    }

    const { name, grade, section } = req.body;
    if (!name || !grade) {
      return res.status(400).json({ success: false, message: "Name & grade are required" });
    }
    const userId = req.user.id || req.user._id;
    const payload = {
      ...req.body,
      schoolId: req.user.schoolId,
      createdBy: req.user._id,
      updatedBy: req.user._id,
    };

    const classObj = await ClassModel.create(payload);
    return res.status(201).json({ success: true, data: classObj });
  } catch (err) {
    console.error("createClass error:", err);
    return res.status(500).json({ success: false, message: "Failed to create class", error: err.message });
  }
};

// GET /api/classes
exports.getClasses = async (req, res) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(400).json({ success: false, message: "Missing schoolId or user" });
    }
    console.log(typeof req.user.schoolId, req.user.schoolId)
    const { page, limit, skip } = getPagination(req.query);
    const { search } = req.query;

    const filter = { 
  schoolId: new mongoose.Types.ObjectId(req.user.schoolId), 
  isDeleted: false 
};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { grade: { $regex: search, $options: "i" } },
        { section: { $regex: search, $options: "i" } },
      ];
    }
    
    const total = await ClassModel.countDocuments(filter);
    const items = await ClassModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.json({
      success: true,
      data: items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("getClasses error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch classes", error: err.message });
  }
};

// GET /api/classes/:id
exports.getClassById = async (req, res) => {
  try {
    const classObj = await ClassModel.findOne({
      _id: req.params.id,
      schoolId: req.user.schoolId,
      isDeleted: false,
    });
    // In your getClasses or getClassById controller
console.log("School ID from token:", req.user.schoolId);
console.log("School ID from saved data:", classObj.schoolId); // For getClassById
    if (!classObj) return res.status(404).json({ success: false, message: "Class not found" });
    return res.json({ success: true, data: classObj });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch class", error: err.message });
  }
};

// PUT /api/classes/:id
exports.updateClass = async (req, res) => {
  try {
    const classObj = await ClassModel.findOneAndUpdate(
      { _id: req.params.id, schoolId: req.user.schoolId, isDeleted: false },
      { ...req.body, updatedBy: req.user.id },
      { new: true }
    );
    if (!classObj) return res.status(404).json({ success: false, message: "Class not found" });
    return res.json({ success: true, data: classObj });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to update class", error: err.message });
  }
};

// DELETE /api/classes/:id (soft delete)
exports.deleteClass = async (req, res) => {
  try {
    const classObj = await ClassModel.findOneAndUpdate(
      { _id: req.params.id, schoolId: req.user.schoolId, isDeleted: false },
      { isDeleted: true, deletedAt: new Date(), deletedBy: req.user.id },
      { new: true }
    );
    if (!classObj) return res.status(404).json({ success: false, message: "Class not found" });
    return res.json({ success: true, message: "Class deleted (soft)", data: { _id: classObj._id } });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to delete class", error: err.message });
  }
};
