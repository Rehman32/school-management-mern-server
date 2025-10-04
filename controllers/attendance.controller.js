const AttendanceService = require('../services/attendance.service');
const { z } = require('zod');
const mongoose = require("mongoose");
const Attendance = require("../models/attendance.model");
const Student = require("../models/student.model");

/**
 * POST /api/v1/attendance/take
 * Body: { classId, date, records: [{ studentId, status, remark? }] }
 * Requires: attendance.take permission
 */
exports.takeAttendance = async (req, res) => {
  // Validation schema
  const schema = z.object({
    classId: z.string().min(1),
    date: z.coerce.date(),
    records: z.array(
      z.object({
        studentId: z.string().min(1),
        status: z.enum(['present', 'absent', 'late']),
        remark: z.string().optional(),
      })
    ).min(1),
  });

  try {
    const { classId, date, records } = schema.parse(req.body);
    const result = await AttendanceService.markAttendance(
      { classId, date, records },
      { tenant: req.user.schoolId }
    );
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.errors ? err.errors : err.message,
    });
  }
};

/**
 * GET /api/v1/attendance/class-report/:classId?startDate=...&endDate=...
 * Requires: attendance.view permission
 */
exports.getClassReport = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { classId } = req.params;
    const { start, end } = req.query;
    if (!classId) return res.status(400).json({ success: false, message: "classId required" });
    const sDate = start ? new Date(start) : null;
    const eDate = end ? new Date(end) : null;
    const match = { schoolId, classId };
    if (sDate && eDate) {
      match.date = { $gte: new Date(sDate.setHours(0,0,0,0)), $lte: new Date(eDate.setHours(23,59,59,999)) };
    }
    // aggregate attendance per student
    const agg = await Attendance.aggregate([
      { $match: match },
      { $unwind: "$records" },
      { $group: {
        _id: "$records.student",
        total: { $sum: 1 },
        present: { $sum: { $cond: [{ $eq: ["$records.status", "present"] }, 1, 0] } }
      }},
      { $lookup: { from: "students", localField: "_id", foreignField: "_id", as: "student" } },
      { $unwind: "$student" },
      { $project: { studentId: "$_id", fullName: "$student.fullName", rollNumber: "$student.rollNumber", total:1, present:1, percentage: { $cond: [{ $eq: ["$total", 0] }, 0, { $multiply: [{ $divide: ["$present", "$total"] }, 100] }] } } }
    ]);
    return res.json({ success: true, data: agg });
  } catch (err) {
    console.error("getClassReport error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/attendance/student-report/:studentId?startDate=...&endDate=...
 * Requires: attendance.view permission
 */
exports.getStudentReport = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const studentId = req.params.studentId;
    const { start, end } = req.query;
    if (!studentId) return res.status(400).json({ success: false, message: "studentId required" });
    const sDate = start ? new Date(start) : null;
    const eDate = end ? new Date(end) : null;
    const match = { schoolId };
    if (sDate && eDate) {
      match.date = { $gte: new Date(sDate.setHours(0,0,0,0)), $lte: new Date(eDate.setHours(23,59,59,999)) };
    }
    // find documents in range and count statuses for the student
    const records = await Attendance.aggregate([
      { $match: match },
      { $unwind: "$records" },
      { $match: { "records.student": mongoose.Types.ObjectId(studentId) } },
      { $group: { _id: "$records.status", count: { $sum: 1 } } }
    ]);
    const summary = records.reduce((acc, r) => { acc[r._id] = r.count; return acc; }, {});
    return res.json({ success: true, data: summary });
  } catch (err) {
    console.error("getStudentReport error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/v1/attendance/mark
 * Body: { records: [{ studentId, classId, date, status }]
 * Requires: attendance.take permission
 */
exports.markAttendance = async (req, res) => {
  try {
    const { records } = req.body; // [{studentId, classId, date, status}]
    const schoolId = req.user.schoolId;
    const results = [];
    for (const rec of records) {
      const doc = await AttendanceService.create({ ...rec, schoolId });
      results.push(doc);
    }
    res.status(201).json({ success: true, data: results });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/attendance/list
 * Query: { classId, date }
 * Requires: attendance.view permission
 */
exports.listAttendance = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { classId, date, page = 1, limit = 50 } = req.query;
    const filter = { schoolId };
    if (classId) filter.classId = classId;
    if (date) {
      const d = new Date(date);
      d.setHours(0,0,0,0);
      filter.date = d;
    }
    const skip = (Math.max(parseInt(page) || 1,1) - 1) * Math.min(Math.max(parseInt(limit)||50,1),100);
    const total = await Attendance.countDocuments(filter);
    const items = await Attendance.find(filter).sort({ date: -1 }).skip(skip).limit(limit)
      .populate("records.student", "fullName rollNumber")
      .populate("classId", "grade section name");
    return res.json({ success: true, data: items, meta: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error("listAttendance error:", err);
    return res.status(500).json({ success: false, message: "Failed to list attendance", error: err.message });
  }
};

// GET /api/attendance/:id
exports.getAttendanceById = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const at = await Attendance.findOne({ _id: req.params.id, schoolId }).populate("records.student", "fullName rollNumber");
    if (!at) return res.status(404).json({ success: false, message: "Attendance not found" });
    return res.json({ success: true, data: at });
  } catch (err) {
    console.error("getAttendanceById error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/attendance/:id/record (body: { studentId, status, remark })
// edits one student's record (upserts if not present)
exports.updateAttendanceRecord = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const userId = req.user._id;
    const { studentId, status, remark } = req.body;
    if (!studentId || !status) return res.status(400).json({ success: false, message: "studentId and status required" });

    const attendance = await Attendance.findOne({ _id: req.params.id, schoolId });
    if (!attendance) return res.status(404).json({ success: false, message: "Attendance not found" });

    const idx = attendance.records.findIndex(r => String(r.student) === String(studentId));
    if (idx >= 0) {
      attendance.records[idx].status = status;
      attendance.records[idx].remark = remark;
      attendance.records[idx].recordedBy = userId;
    } else {
      attendance.records.push({ student: studentId, status, remark, recordedBy: userId });
    }
    attendance.updatedBy = userId;
    await attendance.save();
    const populated = await Attendance.findById(attendance._id).populate("records.student", "fullName rollNumber");
    return res.json({ success: true, data: populated });
  } catch (err) {
    console.error("updateAttendanceRecord error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/attendance/:id
exports.deleteAttendance = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const removed = await Attendance.findOneAndDelete({ _id: req.params.id, schoolId });
    if (!removed) return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, message: "Deleted", data: { _id: removed._id } });
  } catch (err) {
    console.error("deleteAttendance error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};