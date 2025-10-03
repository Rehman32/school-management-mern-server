// server/models/teacher.model.js

const mongoose = require("mongoose");

const TeacherSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      unique: false,
      trim: true,
      lowercase: true,
      required: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
    },
    dob: {
      type: Date,
    },
    address: {
      type: String,
    },

    qualification: [
      {
        type: String,
        trim: true,
      },
    ],
    experience: {
      type: Number,
      min: 0,
      default: 0,
    },

    //Relations
    // NOTE: subjects and classes relations moved to TeacherAssignment collection
    
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
      index: true,
    },

    // Soft delete & audit
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    dateJoined: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Text index for search
TeacherSchema.index({ fullName: 'text', email: 'text', phone: 'text' });

// Compound uniqueness per school (email, phone)
TeacherSchema.index({ schoolId: 1, email: 1 }, { unique: true, sparse: true });
TeacherSchema.index({ schoolId: 1, phone: 1 }, { unique: true, sparse: true });


module.exports = mongoose.model('Teacher', TeacherSchema);