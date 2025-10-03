//teacher.controller.js

const mongoose = require("mongoose");
const { success } = require("zod");
const Teacher = require("../models/teacher.model");
const TeacherAssignment = require("../models/teacherAssignment.model");
const Subject = require("../models/subject.model");
const ClassModel = require("../models/class.model");
const fs = require('fs');
const cloudinary = require("cloudinary").v2;


const getPagination = (query) => {
  const page = Math.max(parseInt(query.page) || 1, 1);
  // allow limit between 1 and 100, default 10
  const limit = Math.min(Math.max(parseInt(query.limit) || 10, 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

//POST /api/teachers
exports.createTeacher = async (req, res) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing user or schoolId" });
    }
    const schoolId = req.user.schoolId;
    const userId = req.user.id || req.user._id;

    const payload = {
      ...req.body,
      schoolId,
      createdBy: userId,
      updatedBy: userId,
    };
    const teacher = await Teacher.create(payload);
    return res.status(201).json({ success: true, data: teacher });
  } catch (err) {
    console.error("createTeacher error:", err);
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate email/phone for this school",
        error: err.message,
      });
    }
    return res
      .status(500)
      .json({
        success: false,
        message: "Failed to create teacher",
        error: err.message,
      });
  }
};

//Get /api/teachers
exports.getAllTeachers = async (req, res) => {
  try {
    if (!req.user || !req.user.schoolId) {
      return res.status(400).json({ success: false, message: "Missing user or schoolId" });
    }

    const user = req.user;
    const { page, limit, skip } = getPagination(req.query);
    const { search, status, classId, subjectId } = req.query;

    // Build base teacher filter
    const filter = {
      schoolId: user.schoolId,
      isDeleted: false,
    };
    if (status) filter.status = status;

    // Text search fallback
    if (search && search.trim()) {
      const s = search.trim();
      filter.$or = [
        { fullName: { $regex: s, $options: "i" } },
        { email: { $regex: s, $options: "i" } },
        { phone: { $regex: s, $options: "i" } },
      ];
    }

    // If filtering by subjectId or classId, resolve teacher ids from TeacherAssignment
    if (subjectId || classId) {
      const aFilter = { schoolId };
      if (subjectId) aFilter.subject = subjectId;
      if (classId) aFilter.class = classId;

      const teacherIds = await TeacherAssignment.find(aFilter).distinct("teacher");
      if (!teacherIds || teacherIds.length === 0) {
        return res.json({
          success: true,
          data: [],
          meta: { page, limit, total: 0, totalPages: 0 },
        });
      }
      filter._id = { $in: teacherIds };
    }

    const total = await Teacher.countDocuments(filter);
    const items = await Teacher.find(filter)
      // NOTE: do NOT populate subject/class here (moved to TeacherAssignment)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.json({
      success: true,
      data: items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("getAllTeachers error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch teachers", error: err.message });
  }
};

// GET /api/teachers/:id
exports.getTeacherById = async (req, res) => {
  try {
    const user = req.user;
    const teacher = await Teacher.findOne({
      _id: req.params.id,
      schoolId: user.schoolId,
      isDeleted: false,
    });

    if (!teacher)
      return res.status(404).json({ success: false, message: "Teacher not found" });

    // Fetch assignments for this teacher (populate subject and class)
    const assignments = await TeacherAssignment.find({ teacher: teacher._id, schoolId: user.schoolId })
      .populate("subject", "name code")
      .populate("class", "name grade section")
      .sort({ createdAt: -1 });

    // Keep response shape compatible with frontend (res.data === teacher)
    // additional assignments provided on the response root
    return res.json({ success: true, data: teacher, assignments });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch teacher",
      error: err.message,
    });
  }
};

// GET /api/teachers/minimal
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


// PUT /api/teachers/:id
exports.updateTeacher = async (req, res) => {
  try {
    const user = req.user;
    const schoolId = user.schoolId;

    const update = {
      ...req.body,
      updatedBy: user._id,
    };

    const teacher = await Teacher.findOneAndUpdate(
      { _id: req.params.id, schoolId: user.schoolId, isDeleted: false },
      update,
      { new: true }
    );

    if (!teacher)
      return res
        .status(404)
        .json({ success: false, message: "Teacher not found" });

    return res.json({ success: true, data: teacher });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate email/phone for this school",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Failed to update teacher",
      error: err.message,
    });
  }
};

// DELETE /api/teachers/:id (soft delete)
exports.deleteTeacher = async (req, res) => {
  try {
    const user = req.user;

    const teacher = await Teacher.findOneAndUpdate(
      { _id: req.params.id, schoolId: user.schoolId, isDeleted: false },
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: user._id,
        status: "Inactive",
      },
      { new: true }
    );

    if (!teacher)
      return res
        .status(404)
        .json({ success: false, message: "Teacher not found" });

    return res.json({
      success: true,
      message: "Teacher deleted (soft)",
      data: { _id: teacher._id },
    });
  } catch (err) {
    return res
      .status(500)
      .json({
        success: false,
        message: "Failed to delete teacher",
        error: err.message,
      });
  }
};

// New: POST /api/teachers/:teacherId/assign
exports.createAssignment = async (req, res) => {
  try {
    const user = req.user;
    const schoolId = user.schoolId;
    const teacherId = req.params.teacherId;
    const { subjectId, classId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(teacherId))
      return res.status(400).json({ success: false, message: "Invalid teacher id" });
    if (!mongoose.Types.ObjectId.isValid(subjectId) || !mongoose.Types.ObjectId.isValid(classId))
      return res.status(400).json({ success: false, message: "Invalid subject or class id" });

    // ensure teacher belongs to same school
    const teacher = await Teacher.findOne({ _id: teacherId, schoolId, isDeleted: false });
    if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found" });

    // ensure subject and class exist for this school
    const sCount = await Subject.countDocuments({ _id: subjectId, schoolId });
    const cCount = await ClassModel.countDocuments({ _id: classId, schoolId });
    if (sCount !== 1 || cCount !== 1)
      return res.status(400).json({ success: false, message: "Subject or Class not found for this school" });

    // create assignment (unique compound index will prevent duplicates)
    const assignment = await TeacherAssignment.create({
      schoolId,
      teacher: teacherId,
      subject: subjectId,
      class: classId,
      createdBy: user._id,
      updatedBy: user._id,
    });

    const populated = await TeacherAssignment.findById(assignment._id)
      .populate("subject", "name code")
      .populate("class", "name grade section");

    return res.status(201).json({ success: true, data: populated });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "Assignment already exists" });
    }
    console.error("createAssignment error:", err);
    return res.status(500).json({ success: false, message: "Failed to create assignment", error: err.message });
  }
};

// New: GET /api/teachers/:teacherId/assignments
exports.getAssignments = async (req, res) => {
  try {
    const user = req.user;
    const schoolId = user.schoolId;
    const teacherId = req.params.teacherId;
    if (!mongoose.Types.ObjectId.isValid(teacherId))
      return res.status(400).json({ success: false, message: "Invalid teacher id" });

    const assignments = await TeacherAssignment.find({ teacher: teacherId, schoolId })
      .populate("subject", "name code")
      .populate("class", "name grade section")
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: assignments });
  } catch (err) {
    console.error("getAssignments error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch assignments", error: err.message });
  }
};

// New: PUT /api/teachers/:teacherId/assign/:assignmentId
exports.updateAssignment = async (req, res) => {
  try {
    const user = req.user;
    const schoolId = user.schoolId;
    const { teacherId, assignmentId } = req.params;
    const { subjectId, classId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(assignmentId))
      return res.status(400).json({ success: false, message: "Invalid assignment id" });

    const update = {};
    if (subjectId) update.subject = subjectId;
    if (classId) update.class = classId;
    update.updatedBy = user._id;

    const assignment = await TeacherAssignment.findOneAndUpdate(
      { _id: assignmentId, teacher: teacherId, schoolId },
      update,
      { new: true }
    )
      .populate("subject", "name code")
      .populate("class", "name grade section");

    if (!assignment) return res.status(404).json({ success: false, message: "Assignment not found" });

    return res.json({ success: true, data: assignment });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "Assignment would duplicate an existing one" });
    }
    console.error("updateAssignment error:", err);
    return res.status(500).json({ success: false, message: "Failed to update assignment", error: err.message });
  }
};

// New: DELETE /api/teachers/:teacherId/assign/:assignmentId
exports.deleteAssignment = async (req, res) => {
  try {
    const user = req.user;
    const schoolId = user.schoolId;
    const { teacherId, assignmentId } = req.params;

    const removed = await TeacherAssignment.findOneAndDelete({ _id: assignmentId, teacher: teacherId, schoolId });
    if (!removed) return res.status(404).json({ success: false, message: "Assignment not found" });

    return res.json({ success: true, message: "Assignment deleted", data: { _id: removed._id } });
  } catch (err) {
    console.error("deleteAssignment error:", err);
    return res.status(500).json({ success: false, message: "Failed to delete assignment", error: err.message });
  }
};

