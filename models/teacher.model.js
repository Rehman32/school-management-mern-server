// ============================================
// TEACHER MODEL - MULTI-TENANT COMPATIBLE
// Professional Production-Ready Version
// ============================================

const mongoose = require("mongoose");

// ============================================
// SUB-SCHEMAS
// ============================================

// Emergency Contact Sub-Schema
const EmergencyContactSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  relationship: { 
    type: String, 
    required: true 
  },
  phone: { 
    type: String, 
    required: true,
    validate: {
      validator: function(v) {
        return /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/.test(v);
      },
      message: "Invalid phone number format"
    }
  }
}, { _id: false });

// Salary Structure Sub-Schema
const SalaryStructureSchema = new mongoose.Schema({
  basic: Number,
  hra: Number,
  allowances: Number,
  deductions: Number,
  totalSalary: Number
}, { _id: false });

// Bank Details Sub-Schema
const BankDetailsSchema = new mongoose.Schema({
  bankName: String,
  accountNumber: String,
  ifscCode: String,
  accountHolderName: String
}, { _id: false });

// Document Sub-Schema
const DocumentSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["resume", "id_proof", "certificate", "photo", "other"],
    required: true
  },
  name: String,
  url: String,
  uploadedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

// ============================================
// MAIN TEACHER SCHEMA
// ============================================

const TeacherSchema = new mongoose.Schema({
  // ===== TENANT RELATIONSHIP (MULTI-TENANT) =====
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tenant",
    required: [true, "Tenant ID is required"],
    index: true,
  },
  // Keep schoolId for backward compatibility
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "School",
    required: false,
  },

  // ===== BASIC INFORMATION =====
  employeeId: {
    type: String,
    sparse: true,
    index: true
  },
  fullName: {
    type: String,
    required: [true, "Full name is required"],
    trim: true,
    index: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    sparse: true,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
      },
      message: "Invalid email format"
    }
  },
  phone: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/.test(v);
      },
      message: "Invalid phone number format"
    }
  },
  alternatePhone: String,

  // ===== PERSONAL INFORMATION =====
  gender: {
    type: String,
    enum: {
      values: ["Male", "Female", "Other"],
      message: "{VALUE} is not a valid gender"
    },
    required: [true, "Gender is required"]
  },
  dob: {
    type: Date,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return v < new Date();
      },
      message: "Date of birth cannot be in the future"
    }
  },
  bloodGroup: {
    type: String,
    enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", ""]
  },
  nationality: {
    type: String,
    default: "Indian"
  },
  religion: String,
  maritalStatus: {
    type: String,
    enum: ["single", "married", "divorced", "widowed", ""],
    default: ""
  },

  // ===== CONTACT INFORMATION =====
  currentAddress: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: "India" }
  },
  permanentAddress: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: "India" }
  },

  // ===== EMERGENCY CONTACTS =====
  emergencyContacts: {
    type: [EmergencyContactSchema],
    default: []
  },

  // ===== EDUCATIONAL QUALIFICATIONS =====
  qualifications: [{
    type: String,
    trim: true
  }],
  specialization: [String],
  languagesSpoken: [String],
  certifications: [String],

  // ===== EXPERIENCE & PROFESSIONAL =====
  experience: {
    type: Number,
    min: 0,
    default: 0
  },
  previousSchool: String,
  achievements: [String],
  publications: [String],

  // ===== EMPLOYMENT DETAILS =====
  employmentType: {
    type: String,
    enum: ["full-time", "part-time", "contract", "visiting"],
    default: "full-time"
  },
  department: String,
  designation: String,
  dateJoined: {
    type: Date,
    default: Date.now,
    validate: {
      validator: function(v) {
        return v <= new Date();
      },
      message: "Joining date cannot be in the future"
    }
  },
  probationEndDate: Date,
  contractEndDate: Date,

  // ===== SALARY & BANK DETAILS =====
  salaryStructure: SalaryStructureSchema,
  bankDetails: BankDetailsSchema,
  pfNumber: String,
  esiNumber: String,
  panNumber: String,
  aadharNumber: String,

  // ===== ACADEMIC ASSIGNMENTS =====
  subjects: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Subject" 
  }],
  classes: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Class" 
  }],
  isClassTeacher: { 
    type: Boolean, 
    default: false 
  },
  classTeacherOf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Class",
    default: null,
    validate: {
      validator: function(v) {
        return v === null || v === undefined || mongoose.Types.ObjectId.isValid(v);
      },
      message: "Invalid class reference"
    }
  },

  // ===== STATUS & FLAGS =====
  status: {
    type: String,
    enum: ["Active", "Inactive", "On Leave", "Resigned", "Terminated"],
    default: "Active",
    index: true
  },
  statusHistory: [{
    status: String,
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reason: String
  }],

  // ===== LEAVE BALANCE =====
  leaveBalance: {
    casual: { type: Number, default: 10 },
    sick: { type: Number, default: 7 },
    earned: { type: Number, default: 15 }
  },

  // ===== DOCUMENTS =====
  documents: [DocumentSchema],
  photoUrl: String,

  // ===== PERFORMANCE METRICS =====
  performanceScore: { 
    type: Number, 
    min: 0, 
    max: 100 
  },
  studentFeedbackScore: { 
    type: Number, 
    min: 0, 
    max: 5 
  },
  lastReviewDate: Date,

  // ===== SOFT DELETE & AUDIT =====
  isDeleted: { 
    type: Boolean, 
    default: false, 
    index: true 
  },
  deletedAt: Date,
  deletedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false
  },
  updatedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  },

  // ===== METADATA =====
  notes: String
}, { 
  timestamps: true 
});

// ============================================
// INDEXES FOR PERFORMANCE
// ============================================

// Multi-tenant scoped unique indexes
TeacherSchema.index({ tenantId: 1, employeeId: 1 }, { 
  unique: true, 
  sparse: true 
});
TeacherSchema.index({ tenantId: 1, email: 1 }, { 
  unique: true, 
  sparse: true
});
TeacherSchema.index({ tenantId: 1, phone: 1 }, { 
  unique: true, 
  sparse: true
});
TeacherSchema.index({ tenantId: 1, status: 1 });
TeacherSchema.index({ tenantId: 1, department: 1 });
TeacherSchema.index({ tenantId: 1, isDeleted: 1 });
TeacherSchema.index({ fullName: "text", email: "text", phone: "text", employeeId: "text" });

// ============================================
// MIDDLEWARE
// ============================================

// Pre-save hook: Backward compatibility + auto-generate employee ID
TeacherSchema.pre("save", async function(next) {
  try {
    // Backward compatibility: Copy schoolId to tenantId if missing
    if (this.schoolId && !this.tenantId) {
      this.tenantId = this.schoolId;
    }

    // Auto-generate employee ID if new and not provided
    if (this.isNew && !this.employeeId) {
      const year = new Date().getFullYear();
      
      const lastTeacher = await this.constructor
        .findOne({ 
          tenantId: this.tenantId,
          employeeId: { $exists: true, $ne: null }
        })
        .sort({ employeeId: -1 })
        .select('employeeId')
        .lean();
      
      let sequence = 1;
      
      if (lastTeacher && lastTeacher.employeeId) {
        const match = lastTeacher.employeeId.match(/\d+$/);
        if (match) {
          sequence = parseInt(match[0]) + 1;
        }
      }
      
      this.employeeId = `EMP${year}-${String(sequence).padStart(4, "0")}`;
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// ============================================
// STATIC METHODS
// ============================================

TeacherSchema.statics.getSchoolStats = async function(tenantId) {
  const stats = await this.aggregate([
    { 
      $match: { 
        tenantId: new mongoose.Types.ObjectId(tenantId),
        isDeleted: false
      } 
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: { 
          $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] } 
        },
        male: { 
          $sum: { $cond: [{ $eq: ["$gender", "Male"] }, 1, 0] } 
        },
        female: { 
          $sum: { $cond: [{ $eq: ["$gender", "Female"] }, 1, 0] } 
        }
      }
    }
  ]);
  
  return stats[0] || {
    total: 0,
    active: 0,
    male: 0,
    female: 0
  };
};

module.exports = mongoose.model("Teacher", TeacherSchema);
