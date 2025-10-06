// ============================================
// ENHANCED USER MODEL (Multi-tenant + Security)
// BACKWARD COMPATIBLE - Old code still works
// ============================================

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // ===== TENANT RELATIONSHIP (ENHANCED) =====
  // Changed from schoolId to tenantId for clarity
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant', // Now references Tenant model
    required: [true, 'Tenant ID is required'],
    index: true,
  },
  // Keep schoolId for backward compatibility during migration
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    // Will be deprecated after migration
  },

  // ===== BASIC INFORMATION =====
  name: {
    type: String,
    required: [true, 'Please provide name'],
    trim: true,
  },
  email: {
    type: String,
    unique: true,
    required: [true, 'Please provide an email'],
    trim: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email address.',
    ],
    index: true,
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [8, 'Password must be at least 8 characters long'], // Enhanced from 6
    select: false,
  },

  // ===== ROLE & PERMISSIONS =====
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'teacher', 'student', 'parent'], // Added super_admin
    default: 'student',
    index: true,
  },
  permissions: [
    {
      type: String,
      // Custom permissions array for granular control
      // e.g., ['student.create', 'class.view', 'attendance.take']
    },
  ],

  // ===== VERIFICATION & SECURITY (NEW) =====
  isVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationToken: String,
  emailVerificationExpiry: Date,

  // Password reset
  passwordResetToken: String,
  passwordResetExpiry: Date,
  lastPasswordChange: Date,

  // Account security
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  accountLockedUntil: Date,
  failedLoginAttempts: {
    type: Number,
    default: 0,
  },
  lastFailedLogin: Date,

  // Two-factor authentication (for future)
  twoFactorEnabled: {
    type: Boolean,
    default: false,
  },
  twoFactorSecret: String,

  // ===== PROFILE INFORMATION (NEW) =====
  profile: {
    avatar: String,
    phone: String,
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      pincode: String,
    },
  },

  // ===== INVITATION SYSTEM (NEW) =====
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  invitationCode: String,
  invitationAcceptedAt: Date,

  // ===== ACTIVITY TRACKING (NEW) =====
  lastLogin: Date,
  lastActivity: Date,
  loginCount: {
    type: Number,
    default: 0,
  },

  // ===== PREFERENCES (NEW) =====
  preferences: {
    language: {
      type: String,
      default: 'en',
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true },
    },
  },

  // ===== SOFT DELETE (NEW) =====
  isDeleted: {
    type: Boolean,
    default: false,
    index: true,
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  // ===== AUDIT TRAIL =====
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: Date,
});

// ===== INDEXES =====
userSchema.index({ email: 1, tenantId: 1 }); // Composite index for tenant isolation
userSchema.index({ role: 1, tenantId: 1 });
userSchema.index({ isActive: 1, isDeleted: 1 });
userSchema.index({ invitationCode: 1 });

// ===== PRE-SAVE HOOKS =====

// Hash password (EXISTING - KEEP AS IS)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  // Hash password
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  this.lastPasswordChange = new Date();
  next();
});

// Update timestamp
userSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// ===== INSTANCE METHODS =====

// Compare password (EXISTING - KEEP AS IS)
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if account is locked (NEW)
userSchema.methods.isAccountLocked = function () {
  return this.accountLockedUntil && this.accountLockedUntil > new Date();
};

// Increment failed login attempts (NEW)
userSchema.methods.incrementFailedLogins = async function () {
  this.failedLoginAttempts += 1;
  this.lastFailedLogin = new Date();

  // Lock account after 5 failed attempts
  if (this.failedLoginAttempts >= 5) {
    const lockDuration = 30 * 60 * 1000; // 30 minutes
    this.accountLockedUntil = new Date(Date.now() + lockDuration);
  }

  return this.save();
};

// Reset failed login attempts (NEW)
userSchema.methods.resetFailedLogins = async function () {
  this.failedLoginAttempts = 0;
  this.accountLockedUntil = undefined;
  return this.save();
};

// Update last login (NEW)
userSchema.methods.updateLastLogin = async function () {
  this.lastLogin = new Date();
  this.loginCount += 1;
  return this.save();
};

// Generate email verification token (NEW)
userSchema.methods.generateEmailVerificationToken = function () {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');

  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  this.emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  return token; // Return unhashed token to send via email
};

// Generate password reset token (NEW)
userSchema.methods.generatePasswordResetToken = function () {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  this.passwordResetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  return token; // Return unhashed token
};

// Check if user has permission (NEW)
userSchema.methods.hasPermission = function (permission) {
  // Super admin and admin have all permissions
  if (this.role === 'super_admin' || this.role === 'admin') {
    return true;
  }

  // Check in permissions array
  return this.permissions.includes(permission);
};

// ===== STATIC METHODS =====

// Find active users by tenant (NEW)
userSchema.statics.findByTenant = function (tenantId) {
  return this.find({
    tenantId,
    isActive: true,
    isDeleted: false,
  });
};

// Find user by email and tenant (NEW)
userSchema.statics.findByEmailAndTenant = function (email, tenantId) {
  return this.findOne({
    email: email.toLowerCase(),
    tenantId,
    isDeleted: false,
  });
};

// ===== VIRTUAL FIELDS =====

// Full name virtual (if you want to split first/last name later)
userSchema.virtual('displayName').get(function () {
  return this.name;
});

// ===== BACKWARD COMPATIBILITY =====
// Keep this for migration period
userSchema.pre('save', function (next) {
  // If schoolId exists but tenantId doesn't, copy it
  if (this.schoolId && !this.tenantId) {
    this.tenantId = this.schoolId;
  }
  next();
});

// Ensure JSON includes virtuals
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

const User = mongoose.model('User', userSchema);

module.exports = User;
