// TEACHER ASSIGNMENT CONTROLLER


const TeacherAssignment = require("../models/teacherAssignment.model");
const Teacher = require("../models/teacher.model");
const Subject = require("../models/subject.model");
const Class = require("../models/class.model");

// ============================================
// HELPER: Validate Assignment Data
// ============================================
const validateAssignment = (data) => {
  const required = ["teacher", "subject", "class"];
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
// CREATE/UPDATE TEACHER ASSIGNMENT
// ============================================
exports.createOrUpdateAssignment = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const userId = req.user._id;
    const { teacher, subject, class: classId, periods, hoursPerWeek, assignmentType, defaultRoom, notes } = req.body;

    // Validate input
    const validation = validateAssignment(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
    }

    // Validate teacher, subject, and class in parallel
    const [teacherExists, subjectExists, classExists] = await Promise.all([
      Teacher.findOne({ 
        _id: teacher, 
        schoolId, 
        status: "Active", 
        isDeleted: false 
      }),
      Subject.findOne({ 
        _id: subject, 
        schoolId, 
        status: "active", 
        isDeleted: false 
      }),
      Class.findOne({ 
        _id: classId, 
        schoolId, 
        status: "active", 
        isDeleted: false 
      })
    ]);

    if (!teacherExists) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found or inactive"
      });
    }

    if (!subjectExists) {
      return res.status(404).json({
        success: false,
        message: "Subject not found or inactive"
      });
    }

    if (!classExists) {
      return res.status(404).json({
        success: false,
        message: "Class not found or inactive"
      });
    }

    // Check for schedule conflicts if periods are provided
    if (periods && periods.length > 0) {
      for (const period of periods) {
        const conflict = await TeacherAssignment.checkConflict(
          schoolId,
          teacher,
          period.day,
          period.periodNumber,
          req.body.academicYear
        );

        if (conflict) {
          return res.status(400).json({
            success: false,
            message: `Schedule conflict: Teacher is already assigned on ${period.day} period ${period.periodNumber}`,
            conflict
          });
        }
      }
    }

    // Get current academic year if not provided
    const academicYear = req.body.academicYear || 
      `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

    // Find existing assignment document for this teacher
    let assignment = await TeacherAssignment.findOne({
      schoolId,
      teacher,
      academicYear,
    });

    const newAssignment = {
      subject,
      class: classId,
      assignmentType: assignmentType || "primary",
      periods: periods || [],
      hoursPerWeek: hoursPerWeek || 0,
      defaultRoom,
      notes,
      isActive: true,
    };

    if (assignment) {
      // Check if this exact assignment already exists
      const existingIndex = assignment.assignments.findIndex(
        a => a.subject.toString() === subject && 
             a.class.toString() === classId &&
             a.isActive
      );

      if (existingIndex !== -1) {
        // Update existing assignment
        assignment.assignments[existingIndex] = {
          ...assignment.assignments[existingIndex].toObject(),
          ...newAssignment,
        };
      } else {
        // Add new assignment
        assignment.assignments.push(newAssignment);
      }

      assignment.updatedBy = userId;
      await assignment.save();
    } else {
      // Create new assignment document
      assignment = new TeacherAssignment({
        schoolId,
        teacher,
        academicYear,
        assignments: [newAssignment],
        createdBy: userId,
        updatedBy: userId,
      });
      await assignment.save();
    }

    // Populate and return
    const populated = await TeacherAssignment.findById(assignment._id)
      .populate("teacher", "fullName email employeeId")
      .populate("assignments.subject", "name code")
      .populate("assignments.class", "name grade section");

    res.status(201).json({
      success: true,
      data: populated,
      message: "Assignment created successfully"
    });
  } catch (err) {
    console.error("createOrUpdateAssignment error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to create assignment"
    });
  }
};

// ============================================
// GET ASSIGNMENTS BY TEACHER
// ============================================
exports.getAssignmentsByTeacher = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { teacherId } = req.params;
    const { academicYear } = req.query;

    const assignment = await TeacherAssignment.getByTeacher(
      schoolId,
      teacherId,
      academicYear
    );

    if (!assignment) {
      return res.json({
        success: true,
        data: {
          teacher: teacherId,
          assignments: [],
          totalHoursPerWeek: 0,
        }
      });
    }

    res.json({
      success: true,
      data: assignment
    });
  } catch (err) {
    console.error("getAssignmentsByTeacher error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch assignments"
    });
  }
};

// ============================================
// GET ASSIGNMENTS BY CLASS
// ============================================
exports.getAssignmentsByClass = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { classId } = req.params;
    const { academicYear } = req.query;

    const assignments = await TeacherAssignment.getByClass(
      schoolId,
      classId,
      academicYear
    );

    res.json({
      success: true,
      data: assignments
    });
  } catch (err) {
    console.error("getAssignmentsByClass error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch assignments"
    });
  }
};

// ============================================
// GET ASSIGNMENTS BY SUBJECT
// ============================================
exports.getAssignmentsBySubject = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { subjectId } = req.params;
    const { academicYear } = req.query;

    const assignments = await TeacherAssignment.getBySubject(
      schoolId,
      subjectId,
      academicYear
    );

    res.json({
      success: true,
      data: assignments
    });
  } catch (err) {
    console.error("getAssignmentsBySubject error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch assignments"
    });
  }
};

// ============================================
// GET ALL ASSIGNMENTS (with filters)
// ============================================
exports.getAllAssignments = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const {
      page = 1,
      limit = 50,
      academicYear,
      status = "active",
    } = req.query;

    const currentYear = academicYear || 
      `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

    const query = {
      schoolId,
      academicYear: currentYear,
      isDeleted: false,
    };

    if (status && status !== "all") query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [assignments, total] = await Promise.all([
      TeacherAssignment.find(query)
        .populate("teacher", "fullName email employeeId")
        .populate("assignments.subject", "name code")
        .populate("assignments.class", "name grade section")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      TeacherAssignment.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: assignments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error("getAllAssignments error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch assignments"
    });
  }
};

// ============================================
// REMOVE ASSIGNMENT
// ============================================
exports.removeAssignment = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const userId = req.user._id;
    const { teacherId, assignmentId } = req.params;
    const { academicYear } = req.query;

    const currentYear = academicYear || 
      `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

    const assignment = await TeacherAssignment.findOne({
      schoolId,
      teacher: teacherId,
      academicYear: currentYear,
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found"
      });
    }

    // Remove the specific assignment
    assignment.assignments = assignment.assignments.filter(
      a => a._id.toString() !== assignmentId
    );

    assignment.updatedBy = userId;
    await assignment.save();

    res.json({
      success: true,
      message: "Assignment removed successfully",
      data: assignment
    });
  } catch (err) {
    console.error("removeAssignment error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to remove assignment"
    });
  }
};

// ============================================
// CHECK SCHEDULE CONFLICT
// ============================================
exports.checkConflict = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { teacherId, day, periodNumber, academicYear, excludeAssignmentId } = req.query;

    if (!teacherId || !day || !periodNumber) {
      return res.status(400).json({
        success: false,
        message: "teacherId, day, and periodNumber are required"
      });
    }

    const conflict = await TeacherAssignment.checkConflict(
      schoolId,
      teacherId,
      day,
      parseInt(periodNumber),
      academicYear,
      excludeAssignmentId
    );

    res.json({
      success: true,
      hasConflict: !!conflict,
      conflict: conflict || null
    });
  } catch (err) {
    console.error("checkConflict error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to check conflict"
    });
  }
};

// ============================================
// GET WORKLOAD SUMMARY
// ============================================
exports.getWorkloadSummary = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { academicYear } = req.query;

    const summary = await TeacherAssignment.getWorkloadSummary(
      schoolId,
      academicYear
    );

    res.json({
      success: true,
      data: summary
    });
  } catch (err) {
    console.error("getWorkloadSummary error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to get workload summary"
    });
  }
};

// ============================================
// GET CLASS TIMETABLE
// ============================================
exports.getClassTimetable = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { classId } = req.params;
    const { academicYear } = req.query;

    const assignments = await TeacherAssignment.getByClass(
      schoolId,
      classId,
      academicYear
    );

    // Organize by day and period
    const timetable = {};
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

    days.forEach(day => {
      timetable[day] = {};
    });

    assignments.forEach(assignment => {
      assignment.assignments.forEach(assign => {
        if (assign.class.toString() === classId && assign.isActive && assign.periods) {
          assign.periods.forEach(period => {
            if (!timetable[period.day][period.periodNumber]) {
              timetable[period.day][period.periodNumber] = [];
            }
            timetable[period.day][period.periodNumber].push({
              teacher: assignment.teacher,
              subject: assign.subject,
              room: period.room || assign.defaultRoom,
              startTime: period.startTime,
              endTime: period.endTime,
            });
          });
        }
      });
    });

    res.json({
      success: true,
      data: timetable
    });
  } catch (err) {
    console.error("getClassTimetable error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to get class timetable"
    });
  }
};

// ============================================
// GET TEACHER TIMETABLE
// ============================================
exports.getTeacherTimetable = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { teacherId } = req.params;
    const { academicYear } = req.query;

    const assignment = await TeacherAssignment.getByTeacher(
      schoolId,
      teacherId,
      academicYear
    );

    if (!assignment) {
      return res.json({
        success: true,
        data: {}
      });
    }

    // Organize by day and period
    const timetable = {};
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

    days.forEach(day => {
      timetable[day] = {};
    });

    assignment.assignments.forEach(assign => {
      if (assign.isActive && assign.periods) {
        assign.periods.forEach(period => {
          if (!timetable[period.day][period.periodNumber]) {
            timetable[period.day][period.periodNumber] = [];
          }
          timetable[period.day][period.periodNumber].push({
            subject: assign.subject,
            class: assign.class,
            room: period.room || assign.defaultRoom,
            startTime: period.startTime,
            endTime: period.endTime,
          });
        });
      }
    });

    res.json({
      success: true,
      data: timetable
    });
  } catch (err) {
    console.error("getTeacherTimetable error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to get teacher timetable"
    });
  }
};

// ============================================
// BULK ASSIGN TEACHERS
// ============================================
exports.bulkAssign = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const userId = req.user._id;
    const { assignments } = req.body;

    if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Assignments array is required"
      });
    }

    const results = {
      success: [],
      failed: [],
    };

    for (const assignData of assignments) {
      try {
        // Validate
        const validation = validateAssignment(assignData);
        if (!validation.valid) {
          results.failed.push({
            data: assignData,
            error: validation.message,
          });
          continue;
        }

        // Use the create/update logic
        const academicYear = assignData.academicYear || 
          `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

        let assignment = await TeacherAssignment.findOne({
          schoolId,
          teacher: assignData.teacher,
          academicYear,
        });

        const newAssignment = {
          subject: assignData.subject,
          class: assignData.class,
          assignmentType: assignData.assignmentType || "primary",
          periods: assignData.periods || [],
          hoursPerWeek: assignData.hoursPerWeek || 0,
          defaultRoom: assignData.defaultRoom,
          notes: assignData.notes,
          isActive: true,
        };

        if (assignment) {
          assignment.assignments.push(newAssignment);
          assignment.updatedBy = userId;
          await assignment.save();
        } else {
          assignment = new TeacherAssignment({
            schoolId,
            teacher: assignData.teacher,
            academicYear,
            assignments: [newAssignment],
            createdBy: userId,
            updatedBy: userId,
          });
          await assignment.save();
        }

        results.success.push(assignment);
      } catch (err) {
        results.failed.push({
          data: assignData,
          error: err.message,
        });
      }
    }

    res.json({
      success: true,
      message: `Assigned ${results.success.length} successfully, ${results.failed.length} failed`,
      data: results,
    });
  } catch (err) {
    console.error("bulkAssign error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to bulk assign"
    });
  }
};
