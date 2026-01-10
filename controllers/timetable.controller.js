// ============================================
// TIMETABLE CONTROLLER - SINGLE-TENANT EDITION
// ============================================

import Timetable from "../models/timetable.model.js";

// Helper: Validate time range
const validateTimeRange = (startTime, endTime) => {
  if (!startTime || !endTime) return false;
  const start = new Date(`2000-01-01T${startTime}`);
  const end = new Date(`2000-01-01T${endTime}`);
  return start < end;
};

// Helper: Check time conflicts
const checkTimeConflict = (entries, newEntry) => {
  const newStart = new Date(`2000-01-01T${newEntry.startTime}`);
  const newEnd = new Date(`2000-01-01T${newEntry.endTime}`);
  
  for (const entry of entries) {
    if (entry.day === newEntry.day && entry.period !== newEntry.period) {
      const existingStart = new Date(`2000-01-01T${entry.startTime}`);
      const existingEnd = new Date(`2000-01-01T${entry.endTime}`);
      
      if (
        (newStart >= existingStart && newStart < existingEnd) ||
        (newEnd > existingStart && newEnd <= existingEnd) ||
        (newStart <= existingStart && newEnd >= existingEnd)
      ) {
        return {
          conflict: true,
          message: `Time conflict with Period ${entry.period} (${entry.startTime} - ${entry.endTime})`
        };
      }
    }
  }
  return { conflict: false };
};

// Helper: Check teacher availability
const checkTeacherConflict = async (teacherId, day, period, startTime, endTime, excludeId = null) => {
  const query = {
    teacherId,
    day,
    _id: { $ne: excludeId }
  };
  
  const existingEntries = await Timetable.find(query);
  const newStart = new Date(`2000-01-01T${startTime}`);
  const newEnd = new Date(`2000-01-01T${endTime}`);
  
  for (const entry of existingEntries) {
    const existingStart = new Date(`2000-01-01T${entry.startTime}`);
    const existingEnd = new Date(`2000-01-01T${entry.endTime}`);
    
    if (
      (newStart >= existingStart && newStart < existingEnd) ||
      (newEnd > existingStart && newEnd <= existingEnd) ||
      (newStart <= existingStart && newEnd >= existingEnd)
    ) {
      return {
        conflict: true,
        message: `Teacher is already scheduled at this time with another class`
      };
    }
  }
  return { conflict: false };
};

// CREATE ENTRY
export const createEntry = async (req, res) => {
  try {
    // Validate required fields
    if (!req.body.classId || !req.body.subjectId || !req.body.teacherId) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required fields: classId, subjectId, teacherId" 
      });
    }
    
    // Validate time range
    if (!validateTimeRange(req.body.startTime, req.body.endTime)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid time range: start time must be before end time" 
      });
    }
    
    // Check time conflicts
    const existingEntries = await Timetable.find({
      classId: req.body.classId,
      day: req.body.day
    });
    
    const timeConflict = checkTimeConflict(existingEntries, req.body);
    if (timeConflict.conflict) {
      return res.status(400).json({ 
        success: false, 
        message: timeConflict.message 
      });
    }
    
    // Check teacher conflicts
    const teacherConflict = await checkTeacherConflict(
      req.body.teacherId,
      req.body.day,
      req.body.period,
      req.body.startTime,
      req.body.endTime
    );
    
    if (teacherConflict.conflict) {
      return res.status(400).json({ 
        success: false, 
        message: teacherConflict.message 
      });
    }
    
    // Create payload
    const payload = {
      ...req.body,
      createdBy: req.user?.id,
    };
    
    const entry = await Timetable.create(payload);
    
    await entry.populate([
      { path: "subjectId", select: "name" },
      { path: "teacherId", select: "fullName name" },
      { path: "classId", select: "grade section name" }
    ]);
    
    return res.status(201).json({ 
      success: true, 
      data: entry,
      message: "Timetable entry created successfully"
    });
    
  } catch (err) {
    console.error("Timetable create error:", err);
    
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "An entry for this class/day/period already exists",
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
      message: err.message || "Server error" 
    });
  }
};

// UPDATE ENTRY
export const updateEntry = async (req, res) => {
  try {
    const { id } = req.params;
    
    const existing = await Timetable.findById(id);
    if (!existing) {
      return res.status(404).json({ 
        success: false, 
        message: "Timetable entry not found" 
      });
    }
    
    // Validate time range
    const startTime = req.body.startTime || existing.startTime;
    const endTime = req.body.endTime || existing.endTime;
    
    if (!validateTimeRange(startTime, endTime)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid time range: start time must be before end time" 
      });
    }
    
    // Check time conflicts (excluding current entry)
    const classId = req.body.classId || existing.classId;
    const day = req.body.day || existing.day;
    
    const existingEntries = await Timetable.find({
      classId,
      day,
      _id: { $ne: id }
    });
    
    const timeConflict = checkTimeConflict(existingEntries, {
      ...req.body,
      startTime,
      endTime,
      day
    });
    
    if (timeConflict.conflict) {
      return res.status(400).json({ 
        success: false, 
        message: timeConflict.message 
      });
    }
    
    // Check teacher conflicts
    const teacherId = req.body.teacherId || existing.teacherId;
    const teacherConflict = await checkTeacherConflict(
      teacherId,
      day,
      req.body.period || existing.period,
      startTime,
      endTime,
      id
    );
    
    if (teacherConflict.conflict) {
      return res.status(400).json({ 
        success: false, 
        message: teacherConflict.message 
      });
    }
    
    const updated = await Timetable.findByIdAndUpdate(
      id,
      { ...req.body },
      { new: true, runValidators: true }
    ).populate([
      { path: "subjectId", select: "name" },
      { path: "teacherId", select: "fullName name" },
      { path: "classId", select: "grade section name" }
    ]);
    
    return res.json({ 
      success: true, 
      data: updated,
      message: "Timetable entry updated successfully"
    });
    
  } catch (err) {
    console.error("Timetable update error:", err);
    
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "An entry for this class/day/period already exists",
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
      message: err.message || "Server error" 
    });
  }
};

// LIST BY CLASS
export const listByClass = async (req, res) => {
  try {
    const { classId } = req.params;
    
    if (!classId) {
      return res.status(400).json({ 
        success: false, 
        message: "Class ID is required" 
      });
    }
    
    const entries = await Timetable.find({ classId })
      .populate("subjectId", "name code")
      .populate("teacherId", "fullName name email")
      .populate("classId", "grade section name")
      .sort({ day: 1, period: 1 });
    
    return res.json({ 
      success: true, 
      data: entries,
      count: entries.length 
    });
    
  } catch (err) {
    console.error("List timetable error:", err);
    res.status(500).json({ 
      success: false, 
      message: err.message || "Server error" 
    });
  }
};

// DELETE ENTRY
export const deleteEntry = async (req, res) => {
  try {
    const { id } = req.params;
    
    const entry = await Timetable.findByIdAndDelete(id);
    
    if (!entry) {
      return res.status(404).json({ 
        success: false, 
        message: "Timetable entry not found" 
      });
    }
    
    return res.json({ 
      success: true, 
      message: "Timetable entry deleted successfully" 
    });
    
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ 
      success: false, 
      message: err.message || "Server error" 
    });
  }
};
