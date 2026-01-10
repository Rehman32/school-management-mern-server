// ============================================
// TIMETABLE MODEL - SINGLE-TENANT EDITION
// ============================================

const mongoose = require("mongoose");

const TimetableSchema = new mongoose.Schema({
  classId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Class", 
    required: true, 
    index: true 
  },
  day: { 
    type: String, 
    enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], 
    required: true 
  },
  period: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 10 
  },
  subjectId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Subject", 
    required: true 
  },
  teacherId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Teacher", 
    required: true 
  },
  startTime: { 
    type: String, 
    required: true 
  },
  endTime: { 
    type: String, 
    required: true 
  },
  room: String,
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  },
}, { timestamps: true });

// Compound unique index - prevents duplicate entries for same class, day, and period
TimetableSchema.index({ classId: 1, day: 1, period: 1 }, { unique: true });
// Prevent teacher double-booking
TimetableSchema.index({ teacherId: 1, day: 1, period: 1 }, { unique: true });

module.exports = mongoose.model("Timetable", TimetableSchema);
