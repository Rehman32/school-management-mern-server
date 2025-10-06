// ============================================
// FIXED STUDENT MODEL - CORRECTED VERSION
// ============================================

const mongoose = require("mongoose");

// Guardian Sub-Schema
const GuardianSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  relationship: {
    type: String,
    enum: ["father", "mother", "guardian", "other"],
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
  },
  email: {
    type: String,
    lowercase: true,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
      },
      message: "Invalid email format"
    }
  },
  occupation: String,
  income: Number,
  address: String,
  isPrimary: {
    type: Boolean,
    default: false
  }
}, { _id: false });

// Emergency Contact Sub-Schema
const EmergencyContactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  relationship: { type: String, required: true },
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

// Document Sub-Schema
const DocumentSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["birth_certificate", "transfer_certificate", "id_proof", "medical", "photo", "other"],
    required: true
  },
  name: String,
  url: String,
  uploadedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

// Main Student Schema
const StudentSchema = new mongoose.Schema({
  // Basic Information
  fullName: { 
    type: String, 
    required: true,
    trim: true,
    index: true
  },
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  email: { 
    type: String, 
    lowercase: true,
    trim: true,
    sparse: true, // Allow multiple null values
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
  
  // Academic Information
  admissionNumber: {
    type: String,
    required: false, // ✅ FIXED: Not required, auto-generated
    unique: false, // Will use compound index with schoolId
    index: true,
    sparse: true
  },
  rollNumber: { 
    type: String,
    required: true,
    index: true
  },
  class: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Class",
    required: true,
    index: true
  },
  section: String,
  academicYear: {
    type: String,
    default: function() {
      const year = new Date().getFullYear();
      return `${year}-${year + 1}`;
    }
  },
  stream: {
    type: String,
    enum: ["science", "commerce", "arts", "general", ""],
    default: ""
  },
  previousSchool: String,
  previousClass: String,
  
  // Personal Information
  gender: { 
    type: String, 
    enum: ["male", "female", "other"],
    required: true
  },
  dob: { 
    type: Date,
    required: true,
    validate: {
      validator: function(v) {
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
  category: {
    type: String,
    enum: ["general", "obc", "sc", "st", "other", ""],
    default: ""
  },
  
  // Contact Information
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: "India" }
  },
  
  // Guardian Information
  guardians: {
    type: [GuardianSchema],
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: "At least one guardian is required"
    }
  },
  emergencyContacts: [EmergencyContactSchema],
  
  // Health Information
  medicalConditions: String,
  allergies: String,
  
  // Transport & Hostel
  transportRequired: {
    type: Boolean,
    default: false
  },
  busRoute: String,
  hostelRequired: {
    type: Boolean,
    default: false
  },
  hostelBlock: String,
  hostelRoom: String,
  
  // Status & Dates
  status: {
    type: String,
    enum: ["active", "inactive", "graduated", "transferred", "expelled", "suspended"],
    default: "active",
    index: true
  },
  enrolledDate: { 
    type: Date, 
    default: Date.now,
    validate: {
      validator: function(v) {
        return v <= new Date();
      },
      message: "Enrollment date cannot be in the future"
    }
  },
  leftDate: Date,
  graduationDate: Date,
  
  // Documents
  documents: [DocumentSchema],
  photoUrl: String,
  
  // School Reference
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "School",
    required: true,
    index: true
  },
  
  // Metadata
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }
}, { 
  timestamps: true 
});

// ============================================
// INDEXES FOR PERFORMANCE
// ============================================

// ✅ FIXED: Compound unique indexes (scoped to school)
StudentSchema.index({ schoolId: 1, admissionNumber: 1 }, { 
  unique: true, 
  sparse: true // Allow documents without admissionNumber
});
StudentSchema.index({ schoolId: 1, email: 1 }, { 
  unique: true, 
  sparse: true
});
StudentSchema.index({ schoolId: 1, class: 1, rollNumber: 1 }, { unique: true });
StudentSchema.index({ schoolId: 1, status: 1 });
StudentSchema.index({ fullName: "text" });

// ============================================
// VIRTUAL FIELDS
// ============================================

StudentSchema.virtual("age").get(function() {
  if (!this.dob) return null;
  const today = new Date();
  const birthDate = new Date(this.dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

StudentSchema.virtual("primaryGuardian").get(function() {
  if (!this.guardians || this.guardians.length === 0) return null;
  return this.guardians.find(g => g.isPrimary) || this.guardians[0];
});

StudentSchema.set("toJSON", { virtuals: true });
StudentSchema.set("toObject", { virtuals: true });

// ============================================
// MIDDLEWARE - AUTO-GENERATE ADMISSION NUMBER
// ============================================

// ✅ FIXED: Better pre-save hook
StudentSchema.pre("save", async function(next) {
  try {
    // Auto-generate admission number only if it's a new document and not provided
    if (this.isNew && !this.admissionNumber) {
      const year = new Date().getFullYear();
      
      // Find the last student with admission number for this school
      const lastStudent = await this.constructor
        .findOne({ 
          schoolId: this.schoolId,
          admissionNumber: { $exists: true, $ne: null }
        })
        .sort({ admissionNumber: -1 })
        .select('admissionNumber')
        .lean();
      
      let sequence = 1;
      
      if (lastStudent && lastStudent.admissionNumber) {
        // Extract sequence number from last admission number
        const match = lastStudent.admissionNumber.match(/\d+$/);
        if (match) {
          sequence = parseInt(match[0]) + 1;
        }
      }
      
      // Generate new admission number: ADM2025-0001
      this.admissionNumber = `ADM${year}-${String(sequence).padStart(4, "0")}`;
    }
    
    // Split fullName into firstName and lastName if not provided
    if (this.fullName && (!this.firstName || !this.lastName)) {
      const parts = this.fullName.trim().split(" ");
      this.firstName = parts[0];
      this.lastName = parts.slice(1).join(" ") || parts[0];
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// ============================================
// STATIC METHODS
// ============================================

StudentSchema.statics.getSchoolStats = async function(schoolId) {
  const stats = await this.aggregate([
    { $match: { schoolId: new mongoose.Types.ObjectId(schoolId) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: { 
          $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } 
        },
        male: { 
          $sum: { $cond: [{ $eq: ["$gender", "male"] }, 1, 0] } 
        },
        female: { 
          $sum: { $cond: [{ $eq: ["$gender", "female"] }, 1, 0] } 
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

StudentSchema.statics.getByClass = async function(schoolId, classId, options = {}) {
  return this.find({ 
    schoolId, 
    class: classId,
    status: options.status || "active"
  })
  .populate("class", "name grade section")
  .sort({ rollNumber: 1 });
};

module.exports = mongoose.model("Student", StudentSchema);
