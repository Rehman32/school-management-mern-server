// teacher.model.js

const mongoose = require("mongoose");

// Emergency Contact Sub-Schema
const EmergencyContactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    relationship: { type: String, required: true },
    phone: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          return /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/.test(
            v
          );
        },
        message: "Invalid phone number format",
      },
    },
  },
  { _id: false }
);

// Bank Details Sub-Schema
const BankDetailsSchema = new mongoose.Schema(
  {
    accountNumber: String,
    ifscCode: String,
    bankName: String,
    branchName: String,
    accountHolderName: String,
  },
  { _id: false }
);

// Salary Structure Sub-Schema
const SalaryStructureSchema = new mongoose.Schema(
  {
    basicSalary: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    allowances: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    netSalary: { type: Number, default: 0 },
    effectiveFrom: Date,
  },
  { _id: false }
);

// Document Sub-Schema
const DocumentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "aadhar",
        "pan",
        "degree",
        "certificate",
        "id_proof",
        "photo",
        "other",
      ],
      required: true,
    },
    name: String,
    url: String,
    expiryDate: Date,
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

// Main Teacher Schema
const TeacherSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },

    // ✅ NEW: Employee Identification
    employeeId: {
      type: String,
      required: false,
      unique: false, // Will use compound index
      index: true,
      sparse: true,
    },

    // Basic Information
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      required: true,
      validate: {
        validator: function (v) {
          return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: "Invalid email format",
      },
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          if (!v) return true;
          return /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/.test(
            v
          );
        },
        message: "Invalid phone number format",
      },
    },
    alternatePhone: String,

    // Personal Details
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      required: true,
    },
    dob: {
      type: Date,
      validate: {
        validator: function (v) {
          return v < new Date();
        },
        message: "Date of birth cannot be in the future",
      },
    },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", ""],
    },
    nationality: {
      type: String,
      default: "Indian",
    },
    maritalStatus: {
      type: String,
      enum: ["single", "married", "divorced", "widowed", ""],
      default: "",
    },

    // Address Information
    currentAddress: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      country: { type: String, default: "India" },
    },
    permanentAddress: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      country: { type: String, default: "India" },
    },

    // Emergency Contact
    emergencyContacts: {
      type: [EmergencyContactSchema],
      default: [], // ✅ Change from required to optional with default
    },

    // Educational Qualifications
    qualifications: [
      {
        type: String,
        trim: true,
      },
    ],
    specialization: [String],
    languagesSpoken: [String],
    certifications: [String],

    // Experience & Professional
    experience: {
      type: Number,
      min: 0,
      default: 0,
    },
    previousSchool: String,
    achievements: [String],
    publications: [String],

    // Employment Details
    employmentType: {
      type: String,
      enum: ["full-time", "part-time", "contract", "visiting"],
      default: "full-time",
    },
    department: String,
    designation: String,
    dateJoined: {
      type: Date,
      default: Date.now,
      validate: {
        validator: function (v) {
          return v <= new Date();
        },
        message: "Joining date cannot be in the future",
      },
    },
    probationEndDate: Date,
    contractEndDate: Date,

    // Salary & Bank Details
    salaryStructure: SalaryStructureSchema,
    bankDetails: BankDetailsSchema,
    pfNumber: String,
    esiNumber: String,
    panNumber: String,
    aadharNumber: String,

    // Academic Assignments (kept for backward compatibility)
    subjects: [{ type: mongoose.Schema.Types.ObjectId, ref: "Subject" }],
    classes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Class" }],
    isClassTeacher: { type: Boolean, default: false },
    classTeacherOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      default: null, //
      validate: {
        //
        validator: function (v) {
          return (
            v === null || v === undefined || mongoose.Types.ObjectId.isValid(v)
          );
        },
        message: "Invalid class reference",
      },
    },

    // Status & Flags
    status: {
      type: String,
      enum: ["Active", "Inactive", "On Leave", "Resigned", "Terminated"],
      default: "Active",
      index: true,
    },
    statusHistory: [
      {
        status: String,
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        reason: String,
      },
    ],

    // Leave Balance
    leaveBalance: {
      casual: { type: Number, default: 10 },
      sick: { type: Number, default: 7 },
      earned: { type: Number, default: 15 },
    },

    // Documents
    documents: [DocumentSchema],
    photoUrl: String,

    // Performance Metrics
    performanceScore: { type: Number, min: 0, max: 100 },
    studentFeedbackScore: { type: Number, min: 0, max: 5 },
    lastReviewDate: Date,

    // Soft delete & audit
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // ✅ CHANGE THIS from true to false
    },

    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Metadata
    notes: String,
  },
  { timestamps: true }
);

// ============================================
// INDEXES FOR PERFORMANCE
// ============================================

// Text index for search
TeacherSchema.index({
  fullName: "text",
  email: "text",
  phone: "text",
  employeeId: "text",
});

// Compound unique indexes (scoped to school)
TeacherSchema.index(
  { schoolId: 1, employeeId: 1 },
  {
    unique: true,
    sparse: true,
  }
);
TeacherSchema.index(
  { schoolId: 1, email: 1 },
  {
    unique: true,
    sparse: true,
  }
);
TeacherSchema.index(
  { schoolId: 1, phone: 1 },
  {
    unique: true,
    sparse: true,
  }
);
TeacherSchema.index({ schoolId: 1, status: 1 });
TeacherSchema.index({ schoolId: 1, department: 1 });
TeacherSchema.index({ schoolId: 1, isDeleted: 1 });

// ============================================
// VIRTUAL FIELDS
// ============================================

// Calculate age
TeacherSchema.virtual("age").get(function () {
  if (!this.dob) return null;
  const today = new Date();
  const birthDate = new Date(this.dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  return age;
});

// Calculate total salary
TeacherSchema.virtual("totalSalary").get(function () {
  if (!this.salaryStructure) return 0;
  const { basicSalary, hra, allowances, deductions } = this.salaryStructure;
  return (
    (basicSalary || 0) + (hra || 0) + (allowances || 0) - (deductions || 0)
  );
});

TeacherSchema.set("toJSON", { virtuals: true });
TeacherSchema.set("toObject", { virtuals: true });

// ============================================
// MIDDLEWARE - AUTO-GENERATE EMPLOYEE ID
// ============================================

TeacherSchema.pre("save", async function (next) {
  try {
    // Auto-generate employee ID if not provided
    if (this.isNew && !this.employeeId) {
      const year = new Date().getFullYear();

      // Find the last teacher with employee ID for this school
      const lastTeacher = await this.constructor
        .findOne({
          schoolId: this.schoolId,
          employeeId: { $exists: true, $ne: null },
        })
        .sort({ employeeId: -1 })
        .select("employeeId")
        .lean();

      let sequence = 1;

      if (lastTeacher && lastTeacher.employeeId) {
        // Extract sequence number from last employee ID
        const match = lastTeacher.employeeId.match(/\d+$/);
        if (match) {
          sequence = parseInt(match[0]) + 1;
        }
      }

      // Generate new employee ID: EMP2025-0001
      this.employeeId = `EMP${year}-${String(sequence).padStart(4, "0")}`;
    }

    // Split fullName into firstName and lastName if not provided
    if (this.fullName && (!this.firstName || !this.lastName)) {
      const parts = this.fullName.trim().split(" ");
      this.firstName = parts[0];
      this.lastName = parts.slice(1).join(" ") || parts[0];
    }

    // Calculate net salary
    if (this.salaryStructure) {
      const { basicSalary, hra, allowances, deductions } = this.salaryStructure;
      this.salaryStructure.netSalary =
        (basicSalary || 0) + (hra || 0) + (allowances || 0) - (deductions || 0);
    }

    next();
  } catch (error) {
    next(error);
  }
});

// ============================================
// STATIC METHODS
// ============================================

TeacherSchema.statics.getSchoolStats = async function (schoolId) {
  const stats = await this.aggregate([
    {
      $match: {
        schoolId: new mongoose.Types.ObjectId(schoolId),
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: {
          $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] },
        },
        male: {
          $sum: { $cond: [{ $eq: ["$gender", "Male"] }, 1, 0] },
        },
        female: {
          $sum: { $cond: [{ $eq: ["$gender", "Female"] }, 1, 0] },
        },
        fullTime: {
          $sum: { $cond: [{ $eq: ["$employmentType", "full-time"] }, 1, 0] },
        },
        partTime: {
          $sum: { $cond: [{ $eq: ["$employmentType", "part-time"] }, 1, 0] },
        },
        avgExperience: { $avg: "$experience" },
      },
    },
  ]);

  return (
    stats[0] || {
      total: 0,
      active: 0,
      male: 0,
      female: 0,
      fullTime: 0,
      partTime: 0,
      avgExperience: 0,
    }
  );
};

module.exports = mongoose.model("Teacher", TeacherSchema);
