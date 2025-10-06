
const Attendance = require("../models/attendance.model");
const Student = require("../models/student.model");
const Class = require("../models/class.model");
const mongoose = require("mongoose");

// ============================================
// HELPER: Validate Date
// ============================================
const validateAttendanceDate = (date) => {
  const attendanceDate = new Date(date);
  attendanceDate.setHours(0, 0, 0, 0);
  
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  if (attendanceDate > today) {
    return { valid: false, message: "Cannot mark attendance for future dates" };
  }
  
  return { valid: true, date: attendanceDate };
};

// ============================================
// HELPER: Validate Students Belong to Class
// ============================================
const validateStudentsInClass = async (schoolId, classId, studentIds) => {
  const students = await Student.find({
    _id: { $in: studentIds },
    schoolId,
    class: classId
  });
  
  if (students.length !== studentIds.length) {
    const foundIds = students.map(s => s._id.toString());
    const invalidIds = studentIds.filter(id => !foundIds.includes(id.toString()));
    return {
      valid: false,
      message: `Invalid students for this class: ${invalidIds.join(", ")}`
    };
  }
  
  return { valid: true };
};

// ============================================
// MARK ATTENDANCE
// ============================================
exports.markAttendance = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const userId = req.user._id;
    const { classId, date, records, session, notes } = req.body;
    
    // Validation
    if (!classId || !date || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "classId, date and records are required" 
      });
    }
    
    // Validate date
    const dateValidation = validateAttendanceDate(date);
    if (!dateValidation.valid) {
      return res.status(400).json({
        success: false,
        message: dateValidation.message
      });
    }
    
    // Validate class exists
    const classExists = await Class.findOne({ _id: classId, schoolId });
    if (!classExists) {
      return res.status(404).json({
        success: false,
        message: "Class not found"
      });
    }
    
    // Validate students belong to class
    const studentIds = records.map(r => r.studentId);
    const studentValidation = await validateStudentsInClass(schoolId, classId, studentIds);
    if (!studentValidation.valid) {
      return res.status(400).json({
        success: false,
        message: studentValidation.message
      });
    }
    
    // Prepare records with timestamp
    const attendanceRecords = records.map(r => ({
      student: r.studentId,
      status: r.status,
      checkInTime: r.checkInTime ? new Date(r.checkInTime) : null,
      checkOutTime: r.checkOutTime ? new Date(r.checkOutTime) : null,
      remark: r.remark,
      leaveType: r.leaveType,
      recordedBy: userId,
      recordedAt: new Date()
    }));
    
    // Upsert attendance document
    const attendance = await Attendance.findOneAndUpdate(
      { 
        schoolId, 
        classId, 
        date: dateValidation.date 
      },
      { 
        $set: { 
          records: attendanceRecords,
          session: session || "full-day",
          notes: notes || "",
          updatedBy: userId 
        },
        $setOnInsert: { 
          createdBy: userId 
        }
      },
      { 
        new: true, 
        upsert: true,
        runValidators: true
      }
    );
    
    // Populate and return
    const populated = await Attendance.findById(attendance._id)
      .populate("records.student", "fullName rollNumber email")
      .populate("classId", "name grade section")
      .populate("createdBy updatedBy", "name email");
    
    return res.status(200).json({ 
      success: true, 
      data: populated,
      message: "Attendance marked successfully"
    });
    
  } catch (err) {
    console.error("markAttendance error:", err);
    
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", ")
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: err.message || "Failed to mark attendance"
    });
  }
};

// ============================================
// BULK MARK ALL PRESENT
// ============================================
exports.markAllPresent = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const userId = req.user._id;
    const { classId, date, session } = req.body;
    
    if (!classId || !date) {
      return res.status(400).json({
        success: false,
        message: "classId and date are required"
      });
    }
    
    // Validate date
    const dateValidation = validateAttendanceDate(date);
    if (!dateValidation.valid) {
      return res.status(400).json({
        success: false,
        message: dateValidation.message
      });
    }
    
    // Get all students in class
    const students = await Student.find({ 
      schoolId, 
      class: classId,
      status: "active"
    });
    
    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No students found in this class"
      });
    }
    
    // Create records marking all present
    const records = students.map(student => ({
      student: student._id,
      status: "present",
      checkInTime: new Date(),
      recordedBy: userId,
      recordedAt: new Date()
    }));
    
    // Upsert attendance
    const attendance = await Attendance.findOneAndUpdate(
      { schoolId, classId, date: dateValidation.date },
      { 
        $set: { 
          records,
          session: session || "full-day",
          updatedBy: userId 
        },
        $setOnInsert: { createdBy: userId }
      },
      { new: true, upsert: true, runValidators: true }
    );
    
    const populated = await Attendance.findById(attendance._id)
      .populate("records.student", "fullName rollNumber")
      .populate("classId", "name grade section");
    
    return res.json({
      success: true,
      data: populated,
      message: `Marked ${students.length} students as present`
    });
    
  } catch (err) {
    console.error("markAllPresent error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to mark all present"
    });
  }
};

// ============================================
// COPY FROM PREVIOUS DAY
// ============================================
exports.copyFromPreviousDay = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const userId = req.user._id;
    const { classId, date } = req.body;
    
    if (!classId || !date) {
      return res.status(400).json({
        success: false,
        message: "classId and date are required"
      });
    }
    
    // Validate current date
    const dateValidation = validateAttendanceDate(date);
    if (!dateValidation.valid) {
      return res.status(400).json({
        success: false,
        message: dateValidation.message
      });
    }
    
    // Find previous day's attendance
    const previousDate = new Date(dateValidation.date);
    previousDate.setDate(previousDate.getDate() - 1);
    
    const previousAttendance = await Attendance.findOne({
      schoolId,
      classId,
      date: previousDate
    });
    
    if (!previousAttendance) {
      return res.status(404).json({
        success: false,
        message: "No attendance found for previous day"
      });
    }
    
    // Copy records with new timestamp
    const copiedRecords = previousAttendance.records.map(record => ({
      student: record.student,
      status: record.status,
      recordedBy: userId,
      recordedAt: new Date()
    }));
    
    // Create new attendance
    const attendance = await Attendance.findOneAndUpdate(
      { schoolId, classId, date: dateValidation.date },
      {
        $set: {
          records: copiedRecords,
          session: previousAttendance.session,
          updatedBy: userId
        },
        $setOnInsert: { createdBy: userId }
      },
      { new: true, upsert: true, runValidators: true }
    );
    
    const populated = await Attendance.findById(attendance._id)
      .populate("records.student", "fullName rollNumber")
      .populate("classId", "name grade section");
    
    return res.json({
      success: true,
      data: populated,
      message: "Attendance copied from previous day"
    });
    
  } catch (err) {
    console.error("copyFromPreviousDay error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to copy attendance"
    });
  }
};

// ============================================
// LIST ATTENDANCE (with pagination)
// ============================================
exports.listAttendance = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { 
      classId, 
      date, 
      startDate, 
      endDate,
      page = 1,
      limit = 30
    } = req.query;
    
    const filter = { schoolId };
    
    if (classId) filter.classId = classId;
    
    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      filter.date = d;
    } else if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [items, total] = await Promise.all([
      Attendance.find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("records.student", "fullName rollNumber email")
        .populate("classId", "grade section name")
        .populate("createdBy updatedBy", "name"),
      Attendance.countDocuments(filter)
    ]);
    
    return res.json({ 
      success: true, 
      data: items,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (err) {
    console.error("listAttendance error:", err);
    return res.status(500).json({ 
      success: false, 
      message: err.message || "Failed to list attendance"
    });
  }
};

// ============================================
// GET CLASS REPORT
// ============================================
exports.getClassReport = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { classId } = req.params;
    const { startDate, endDate } = req.query;
    
    if (!classId) {
      return res.status(400).json({ 
        success: false, 
        message: "classId required" 
      });
    }
    
    const match = { schoolId, classId };
    
    if (startDate && endDate) {
      match.date = { 
        $gte: new Date(startDate), 
        $lte: new Date(endDate) 
      };
    }
    
    // Aggregate attendance per student
    const studentStats = await Attendance.aggregate([
      { $match: match },
      { $unwind: "$records" },
      {
        $group: {
          _id: "$records.student",
          total: { $sum: 1 },
          present: { 
            $sum: { 
              $cond: [{ $eq: ["$records.status", "present"] }, 1, 0] 
            } 
          },
          absent: { 
            $sum: { 
              $cond: [{ $eq: ["$records.status", "absent"] }, 1, 0] 
            } 
          },
          late: { 
            $sum: { 
              $cond: [{ $eq: ["$records.status", "late"] }, 1, 0] 
            } 
          },
          halfDay: { 
            $sum: { 
              $cond: [{ $eq: ["$records.status", "half-day"] }, 1, 0] 
            } 
          }
        }
      },
      {
        $lookup: { 
          from: "students", 
          localField: "_id", 
          foreignField: "_id", 
          as: "student" 
        }
      },
      { $unwind: "$student" },
      {
        $project: {
          studentId: "$_id",
          fullName: "$student.fullName",
          rollNumber: "$student.rollNumber",
          total: 1,
          present: 1,
          absent: 1,
          late: 1,
          halfDay: 1,
          percentage: {
            $cond: [
              { $eq: ["$total", 0] },
              0,
              { 
                $round: [
                  { $multiply: [{ $divide: ["$present", "$total"] }, 100] },
                  2
                ]
              }
            ]
          }
        }
      },
      { $sort: { rollNumber: 1 } }
    ]);
    
    // Get overall class statistics
    const classStats = await Attendance.getClassStats(
      schoolId, 
      classId, 
      startDate, 
      endDate
    );
    
    return res.json({ 
      success: true, 
      data: {
        students: studentStats,
        classStats
      }
    });
    
  } catch (err) {
    console.error("getClassReport error:", err);
    return res.status(500).json({ 
      success: false, 
      message: err.message || "Failed to generate report"
    });
  }
};

// ============================================
// GET STUDENT REPORT
// ============================================
exports.getStudentReport = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { studentId } = req.params;
    const { startDate, endDate } = req.query;
    
    if (!studentId) {
      return res.status(400).json({ 
        success: false, 
        message: "studentId required" 
      });
    }
    
    // Authorization: students can only view their own report
    if (req.user.role === "student" && req.user._id.toString() !== studentId) {
      return res.status(403).json({
        success: false,
        message: "You can only view your own attendance"
      });
    }
    
    const summary = await Attendance.getStudentStats(
      schoolId,
      studentId,
      startDate,
      endDate
    );
    
    // Get detailed records
    const match = { schoolId };
    
    if (startDate && endDate) {
      match.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const detailedRecords = await Attendance.aggregate([
      { $match: match },
      { $unwind: "$records" },
      { 
        $match: { 
          "records.student": new mongoose.Types.ObjectId(studentId)
        } 
      },
      {
        $project: {
          date: 1,
          status: "$records.status",
          checkInTime: "$records.checkInTime",
          checkOutTime: "$records.checkOutTime",
          remark: "$records.remark"
        }
      },
      { $sort: { date: -1 } }
    ]);
    
    return res.json({ 
      success: true, 
      data: {
        summary,
        records: detailedRecords
      }
    });
    
  } catch (err) {
    console.error("getStudentReport error:", err);
    return res.status(500).json({ 
      success: false, 
      message: err.message || "Failed to generate student report"
    });
  }
};

// ============================================
// GET ATTENDANCE BY ID
// ============================================
exports.getAttendanceById = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const attendance = await Attendance.findOne({ 
      _id: req.params.id, 
      schoolId 
    })
    .populate("records.student", "fullName rollNumber email")
    .populate("classId", "name grade section")
    .populate("createdBy updatedBy", "name email");
    
    if (!attendance) {
      return res.status(404).json({ 
        success: false, 
        message: "Attendance not found" 
      });
    }
    
    return res.json({ 
      success: true, 
      data: attendance 
    });
    
  } catch (err) {
    console.error("getAttendanceById error:", err);
    return res.status(500).json({ 
      success: false, 
      message: err.message || "Failed to fetch attendance"
    });
  }
};

// ============================================
// UPDATE ATTENDANCE RECORD
// ============================================
exports.updateAttendanceRecord = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const userId = req.user._id;
    const { studentId, status, remark, checkInTime, checkOutTime } = req.body;
    
    if (!studentId || !status) {
      return res.status(400).json({ 
        success: false, 
        message: "studentId and status required" 
      });
    }
    
    const attendance = await Attendance.findOne({ 
      _id: req.params.id, 
      schoolId 
    });
    
    if (!attendance) {
      return res.status(404).json({ 
        success: false, 
        message: "Attendance not found" 
      });
    }
    
    // Check if locked
    if (attendance.isLocked) {
      return res.status(400).json({
        success: false,
        message: "Attendance is locked and cannot be modified"
      });
    }
    
    // Find and update student record
    const recordIndex = attendance.records.findIndex(
      r => r.student.toString() === studentId
    );
    
    if (recordIndex >= 0) {
      attendance.records[recordIndex].status = status;
      attendance.records[recordIndex].remark = remark;
      attendance.records[recordIndex].checkInTime = checkInTime ? new Date(checkInTime) : null;
      attendance.records[recordIndex].checkOutTime = checkOutTime ? new Date(checkOutTime) : null;
      attendance.records[recordIndex].recordedBy = userId;
      attendance.records[recordIndex].recordedAt = new Date();
    } else {
      // Add new record
      attendance.records.push({
        student: studentId,
        status,
        remark,
        checkInTime: checkInTime ? new Date(checkInTime) : null,
        checkOutTime: checkOutTime ? new Date(checkOutTime) : null,
        recordedBy: userId,
        recordedAt: new Date()
      });
    }
    
    attendance.updatedBy = userId;
    await attendance.save();
    
    const populated = await Attendance.findById(attendance._id)
      .populate("records.student", "fullName rollNumber")
      .populate("classId", "name grade section");
    
    return res.json({ 
      success: true, 
      data: populated,
      message: "Attendance record updated successfully"
    });
    
  } catch (err) {
    console.error("updateAttendanceRecord error:", err);
    return res.status(500).json({ 
      success: false, 
      message: err.message || "Failed to update record"
    });
  }
};

// ============================================
// DELETE ATTENDANCE
// ============================================
exports.deleteAttendance = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    
    const attendance = await Attendance.findOne({ 
      _id: req.params.id, 
      schoolId 
    });
    
    if (!attendance) {
      return res.status(404).json({ 
        success: false, 
        message: "Attendance not found" 
      });
    }
    
    // Check if locked
    if (attendance.isLocked) {
      return res.status(400).json({
        success: false,
        message: "Attendance is locked and cannot be deleted"
      });
    }
    
    await Attendance.findByIdAndDelete(req.params.id);
    
    return res.json({ 
      success: true, 
      message: "Attendance deleted successfully",
      data: { _id: req.params.id }
    });
    
  } catch (err) {
    console.error("deleteAttendance error:", err);
    return res.status(500).json({ 
      success: false, 
      message: err.message || "Failed to delete attendance"
    });
  }
};

// ============================================
// GET MONTHLY STATISTICS
// ============================================
exports.getMonthlyStats = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { classId, month, year } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "Month and year are required"
      });
    }
    
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
    
    const match = {
      schoolId,
      date: { $gte: startDate, $lte: endDate }
    };
    
    if (classId) match.classId = classId;
    
    const stats = await Attendance.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalDays: { $sum: 1 },
          totalPresent: { $sum: "$presentCount" },
          totalAbsent: { $sum: "$absentCount" },
          totalLate: { $sum: "$lateCount" },
          avgAttendance: { $avg: "$presentCount" }
        }
      }
    ]);
    
    return res.json({
      success: true,
      data: stats[0] || {
        totalDays: 0,
        totalPresent: 0,
        totalAbsent: 0,
        totalLate: 0,
        avgAttendance: 0
      }
    });
    
  } catch (err) {
    console.error("getMonthlyStats error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to get monthly statistics"
    });
  }
};
