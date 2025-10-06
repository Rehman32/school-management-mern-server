//  SCHOOL MODEL

const mongoose = require('mongoose');

// Contact Person Sub-Schema
const ContactPersonSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  designation: { type: String, trim: true },
  email: { type: String, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  isPrimary: { type: Boolean, default: false }
}, { _id: true });

// Academic Year Sub-Schema
const AcademicYearSchema = new mongoose.Schema({
  year: { type: String, required: true }, // e.g., "2024-2025"
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  isCurrent: { type: Boolean, default: false }
}, { _id: true });

// School Timings Sub-Schema
const SchoolTimingsSchema = new mongoose.Schema({
  dayOfWeek: {
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    required: true
  },
  startTime: { type: String, required: true }, // HH:MM format
  endTime: { type: String, required: true },
  isWorkingDay: { type: Boolean, default: true }
}, { _id: false });

// Grading System Sub-Schema
const GradeSchema = new mongoose.Schema({
  grade: { type: String, required: true }, // A+, A, B+, etc.
  minPercentage: { type: Number, required: true, min: 0, max: 100 },
  maxPercentage: { type: Number, required: true, min: 0, max: 100 },
  gradePoint: { type: Number, min: 0, max: 10 },
  description: { type: String }
}, { _id: true });

const SchoolSchema = new mongoose.Schema({
  // ============================================
  // BASIC INFORMATION
  // ============================================
  name: {
    type: String,
    required: [true, 'School Name is Required'],
    trim: true,
    index: true
  },
  email: {
    type: String,
    required: [true, 'School Email is Required'],
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    index: true
  },
  phone: {
    type: String,
    trim: true
  },
  alternatePhone: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  state: {
    type: String,
    trim: true
  },
  country: {
    type: String,
    default: 'India',
    trim: true
  },
  pincode: {
    type: String,
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  logo: {
    type: String // URL or path to uploaded file
  },
  description: {
    type: String,
    trim: true
  },

  // ============================================
  // REGISTRATION & AFFILIATION
  // ============================================
  registrationNumber: {
    type: String,
    trim: true
  },
  affiliationNumber: {
    type: String,
    trim: true
  },
  board: {
    type: String,
    enum: ['CBSE', 'ICSE', 'State Board', 'IB', 'Cambridge', 'Other'],
    default: 'State Board'
  },
  affiliatedTo: {
    type: String,
    trim: true
  },
  establishedYear: {
    type: Number,
    min: 1800,
    max: new Date().getFullYear()
  },

  // ============================================
  // CONTACT PERSONS
  // ============================================
  principal: {
    name: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true }
  },
  vicePrincipal: {
    name: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true }
  },
  contactPersons: [ContactPersonSchema],

  // ============================================
  // ACADEMIC SETTINGS
  // ============================================
  academicYears: [AcademicYearSchema],
  currentAcademicYear: {
    type: String,
    default: function() {
      const year = new Date().getFullYear();
      return `${year}-${year + 1}`;
    }
  },

  // School Timings
  schoolTimings: [SchoolTimingsSchema],
  defaultStartTime: {
    type: String,
    default: '08:00'
  },
  defaultEndTime: {
    type: String,
    default: '14:00'
  },

  // Grading System
  gradingSystem: [GradeSchema],
  passingPercentage: {
    type: Number,
    default: 33,
    min: 0,
    max: 100
  },

  // Attendance
  attendancePercentageRequired: {
    type: Number,
    default: 75,
    min: 0,
    max: 100
  },

  // ============================================
  // SYSTEM SETTINGS
  // ============================================
  settings: {
    // Date & Time
    dateFormat: {
      type: String,
      enum: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'],
      default: 'DD/MM/YYYY'
    },
    timeFormat: {
      type: String,
      enum: ['12', '24'],
      default: '12'
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    },
    currency: {
      type: String,
      default: 'INR'
    },
    language: {
      type: String,
      default: 'en'
    },

    // Communication
    enableSMS: { type: Boolean, default: false },
    enableEmail: { type: Boolean, default: true },
    enableNotifications: { type: Boolean, default: true },
    
    // Features
    enableOnlinePayment: { type: Boolean, default: false },
    enableParentPortal: { type: Boolean, default: true },
    enableStudentPortal: { type: Boolean, default: true },
    enableAttendanceApp: { type: Boolean, default: false },
    
    // Security
    sessionTimeout: {
      type: Number,
      default: 30, // minutes
      min: 5,
      max: 480
    },
    passwordMinLength: {
      type: Number,
      default: 8,
      min: 6,
      max: 32
    },
    enableTwoFactor: { type: Boolean, default: false },
    maxLoginAttempts: {
      type: Number,
      default: 5,
      min: 3,
      max: 10
    }
  },

  // ============================================
  // SUBSCRIPTION & STATUS
  // ============================================
  subscriptionPlan: {
    type: String,
    enum: ['free', 'basic', 'premium', 'enterprise'],
    default: 'free'
  },
  subscriptionStartDate: {
    type: Date
  },
  subscriptionEndDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
    index: true
  },

  // ============================================
  // METADATA
  // ============================================
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// ============================================
// INDEXES
// ============================================
SchoolSchema.index({ name: 1 });
SchoolSchema.index({ email: 1 });
SchoolSchema.index({ status: 1 });
SchoolSchema.index({ subscriptionPlan: 1 });

// ============================================
// METHODS
// ============================================

// Get current academic year object
SchoolSchema.methods.getCurrentAcademicYear = function() {
  return this.academicYears.find(year => year.isCurrent) || null;
};

// Check if subscription is active
SchoolSchema.methods.isSubscriptionActive = function() {
  if (this.subscriptionPlan === 'free') return true;
  if (!this.subscriptionEndDate) return false;
  return new Date() <= new Date(this.subscriptionEndDate);
};

// Get working days
SchoolSchema.methods.getWorkingDays = function() {
  return this.schoolTimings.filter(timing => timing.isWorkingDay);
};

// ============================================
// MIDDLEWARE
// ============================================

// Pre-save: Ensure only one current academic year
SchoolSchema.pre('save', function(next) {
  if (this.academicYears && this.academicYears.length > 0) {
    const currentYears = this.academicYears.filter(year => year.isCurrent);
    if (currentYears.length > 1) {
      // Keep only the first one as current
      this.academicYears.forEach((year, index) => {
        if (index > 0) year.isCurrent = false;
      });
    }
  }
  next();
});

const School = mongoose.model('School', SchoolSchema);
module.exports = School;
