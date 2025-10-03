const Subject = require("../models/subject.model");

const getPagination = (query) => {
  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit) || 10, 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

// POST /api/subjects
exports.createSubject = async (req, res) => {
  try {
    if (!req.user?.schoolId) {
      return res.status(400).json({ success: false, message: "Missing schoolId" });
    }

    const payload = {
      ...req.body,
      schoolId: req.user.schoolId,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    };

    const subject = await Subject.create(payload);
    return res.status(201).json({ success: true, data: subject });
  } catch (err) {
    console.error("createSubject error:", err);
    return res.status(500).json({ success: false, message: "Failed to create subject", error: err.message });
  }
};

// GET /api/subjects
exports.getSubjects = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search } = req.query;

    const filter = { schoolId: req.user.schoolId, isDeleted: false };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ];
    }

    const total = await Subject.countDocuments(filter);
    const items = await Subject.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.json({
      success: true,
      data: items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch subjects", error: err.message });
  }
};

// GET /api/subjects/:id
exports.getSubjectById = async (req, res) => {
  try {
    const subject = await Subject.findOne({
      _id: req.params.id,
      schoolId: req.user.schoolId,
      isDeleted: false,
    });
    if (!subject) return res.status(404).json({ success: false, message: "Subject not found" });
    return res.json({ success: true, data: subject });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch subject", error: err.message });
  }
};

// PUT /api/subjects/:id
exports.updateSubject = async (req, res) => {
  try {
    const subject = await Subject.findOneAndUpdate(
      { _id: req.params.id, schoolId: req.user.schoolId, isDeleted: false },
      { ...req.body, updatedBy: req.user.id },
      { new: true }
    );
    if (!subject) return res.status(404).json({ success: false, message: "Subject not found" });
    return res.json({ success: true, data: subject });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to update subject", error: err.message });
  }
};

// DELETE /api/subjects/:id (soft delete)
exports.deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findOneAndUpdate(
      { _id: req.params.id, schoolId: req.user.schoolId, isDeleted: false },
      { isDeleted: true, deletedAt: new Date(), deletedBy: req.user.id },
      { new: true }
    );
    if (!subject) return res.status(404).json({ success: false, message: "Subject not found" });
    return res.json({ success: true, message: "Subject deleted (soft)", data: { _id: subject._id } });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to delete subject", error: err.message });
  }
};
