// server/controllers/assignment.controller.js
const mongoose = require("mongoose");
const TeacherAssignment = require("../models/teacherAssignment.model");
const Teacher = require("../models/teacher.model");
const Subject = require("../models/subject.model");
const ClassModel = require("../models/class.model");

const populateAssignment = (q) => q.populate("teacher", "fullName email status")
                            .populate("subject", "name code")
                            .populate("class", "name grade section");

/**
 * POST /api/assignments
 * Body: { teacherId, subjectId, classId }
 * Creates an assignment (class-centric or teacher-centric). Validates school.
 */
exports.createAssignment = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    let populated;
    await session.withTransaction(async () => {
      const schoolId = req.user.schoolId;
      const userId = req.user._id;
      const { teacherId, subjectId, classId } = req.body;

      if (!mongoose.Types.ObjectId.isValid(teacherId) ||
          !mongoose.Types.ObjectId.isValid(subjectId) ||
          !mongoose.Types.ObjectId.isValid(classId)) {
        throw new Error("Invalid IDs");
      }

      const [teacherCount, subjectCount, classCount] = await Promise.all([
        Teacher.countDocuments({ _id: teacherId, schoolId, isDeleted: false }).session(session),
        Subject.countDocuments({ _id: subjectId, schoolId, isDeleted: false }).session(session),
        ClassModel.countDocuments({ _id: classId, schoolId, isDeleted: false }).session(session)
      ]);

      if (teacherCount !== 1 || subjectCount !== 1 || classCount !== 1) {
        throw new Error("Teacher/Subject/Class not found for this school");
      }

      const assignment = await TeacherAssignment.create([{
        schoolId,
        teacher: teacherId,
        subject: subjectId,
        class: classId,
        createdBy: userId,
        updatedBy: userId,
      }], { session });

      await Teacher.findByIdAndUpdate(
        teacherId,
        { $addToSet: { subjects: subjectId, classes: classId } },
        { new: true, session }
      );

      populated = await populateAssignment(
        TeacherAssignment.findById(assignment[0]._id).session(session)
      );
    });

    session.endSession();
    return res.status(201).json({ success: true, data: populated });
  } catch (err) {
    session.endSession();
    if (err.code === 11000) return res.status(409).json({ success: false, message: "Assignment already exists" });
    console.error("createAssignment error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/assignments?classId=...&teacherId=...&subjectId=...
 * Generic listing scoping to school.
 */
exports.listAssignments = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { classId, teacherId, subjectId } = req.query;
    const filter = { schoolId };

    if (classId) filter.class = classId;
    if (teacherId) filter.teacher = teacherId;
    if (subjectId) filter.subject = subjectId;

    const items = await populateAssignment(TeacherAssignment.find(filter).sort({ createdAt: -1 }));
    return res.json({ success: true, data: items });
  } catch (err) {
    console.error("listAssignments error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/classes/:classId/assignments
 */
exports.getAssignmentsByClass = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const classId = req.params.classId;
    if (!mongoose.Types.ObjectId.isValid(classId)) return res.status(400).json({ success: false, message: "Invalid class id" });

    const items = await populateAssignment(TeacherAssignment.find({ class: classId, schoolId }).sort({ createdAt: -1 }));
    return res.json({ success: true, data: items });
  } catch (err) {
    console.error("getAssignmentsByClass error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * DELETE /api/assignments/:id
 */
exports.deleteAssignment = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid id" });

    const removed = await TeacherAssignment.findOneAndDelete({ _id: id, schoolId });
    if (!removed) return res.status(404).json({ success: false, message: "Assignment not found" });
    return res.json({ success: true, message: "Assignment removed", data: { _id: removed._id } });
  } catch (err) {
    console.error("deleteAssignment error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
