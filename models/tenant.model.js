// ============================================
// TENANT MODEL (Multi-tenant School Management)
// Each school is a separate tenant with data isolation
// ============================================

const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  // ===== BASIC INFORMATION =====
  name: {
    type: String,
    required: [true, 'School name is required'],
    trim: true,
    index: true,
  },
  subdomain: {
    type: String,
    unique: true,
    sparse: true, // Allows null but unique if set
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9-]+$/, 'Subdomain can only contain lowercase letters, numbers, and hyphens'],
    // e.g., "abc-school" → abc-school.yourplatform.com
  },
  customDomain: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
    // e.g., "abcschool.com"
  },
  
  // ===== CONTACT INFORMATION =====
  email: {
    type: String,
    required: [true, 'School email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
  },
  phone: {
    type: String,
    trim: true,
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: { type: String, default: 'India' },
    pincode: String,
  },
  
  // ===== ADMINISTRATIVE =====
  adminUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // Primary admin for this tenant
  },
  
  // ===== SUBSCRIPTION & STATUS =====
  subscriptionPlan: {
    type: String,
    enum: ['trial', 'basic', 'premium', 'enterprise', 'custom'],
    default: 'trial',
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'cancelled', 'expired'],
    default: 'active',
  },
  subscriptionStartDate: {
    type: Date,
    default: Date.now,
  },
  subscriptionEndDate: {
    type: Date,
    // Will be set based on plan
  },
  trialEndsAt: {
    type: Date,
    // 14 days trial by default
    default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  },
  
  // ===== LIMITS (based on subscription) =====
  limits: {
    maxStudents: {
      type: Number,
      default: 50, // Trial limit
    },
    maxTeachers: {
      type: Number,
      default: 10,
    },
    maxClasses: {
      type: Number,
      default: 10,
    },
    maxStorage: {
      type: Number,
      default: 1024, // 1GB in MB
    },
  },
  
  // ===== USAGE TRACKING =====
  usage: {
    currentStudents: {
      type: Number,
      default: 0,
    },
    currentTeachers: {
      type: Number,
      default: 0,
    },
    currentClasses: {
      type: Number,
      default: 0,
    },
    storageUsed: {
      type: Number,
      default: 0, // in MB
    },
  },
  
  // ===== SCHOOL SETTINGS =====
  settings: {
    logo: String,
    website: String,
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },
    currency: {
      type: String,
      default: 'INR',
    },
    academicYear: {
      type: String,
      default: () => {
        const year = new Date().getFullYear();
        return `${year}-${year + 1}`;
      },
    },
    dateFormat: {
      type: String,
      default: 'DD/MM/YYYY',
    },
    allowSelfRegistration: {
      type: Boolean,
      default: false, // Students/teachers can't self-register
    },
  },
  
  // ===== ONBOARDING =====
  onboardingCompleted: {
    type: Boolean,
    default: false,
  },
  onboardingSteps: {
    profileCompleted: { type: Boolean, default: false },
    adminCreated: { type: Boolean, default: false },
    classesCreated: { type: Boolean, default: false },
    teachersInvited: { type: Boolean, default: false },
  },
  
  // ===== SECURITY =====
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationToken: String,
  verificationTokenExpiry: Date,
  
  // ===== AUDIT TRAIL =====
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  lastActivityAt: {
    type: Date,
    default: Date.now,
  },
  
  // ===== SOFT DELETE =====
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true, // createdAt, updatedAt
});

// ===== INDEXES =====
tenantSchema.index({ email: 1 });
tenantSchema.index({ subdomain: 1 });
tenantSchema.index({ subscriptionStatus: 1 });
tenantSchema.index({ isDeleted: 1 });
tenantSchema.index({ createdAt: -1 });

// ===== INSTANCE METHODS =====

// Check if tenant has active subscription
tenantSchema.methods.hasActiveSubscription = function() {
  if (this.subscriptionStatus === 'active') {
    // Check if not expired
    if (this.subscriptionEndDate) {
      return new Date() <= this.subscriptionEndDate;
    }
    // Check trial
    if (this.subscriptionPlan === 'trial') {
      return new Date() <= this.trialEndsAt;
    }
    return true;
  }
  return false;
};

// Check if tenant has reached limit
tenantSchema.methods.hasReachedLimit = function(resource) {
  const limits = this.limits;
  const usage = this.usage;
  
  switch(resource) {
    case 'students':
      return usage.currentStudents >= limits.maxStudents;
    case 'teachers':
      return usage.currentTeachers >= limits.maxTeachers;
    case 'classes':
      return usage.currentClasses >= limits.maxClasses;
    case 'storage':
      return usage.storageUsed >= limits.maxStorage;
    default:
      return false;
  }
};

// Update usage counter
tenantSchema.methods.updateUsage = async function(resource, increment = true) {
  const field = `usage.current${resource.charAt(0).toUpperCase() + resource.slice(1)}`;
  const update = increment ? { $inc: { [field]: 1 } } : { $inc: { [field]: -1 } };
  return this.constructor.findByIdAndUpdate(this._id, update, { new: true });
};

// ===== STATIC METHODS =====

// Find tenant by subdomain or custom domain
tenantSchema.statics.findByDomain = function(domain) {
  return this.findOne({
    $or: [
      { subdomain: domain },
      { customDomain: domain }
    ],
    isDeleted: false,
    subscriptionStatus: 'active',
  });
};

// Get active tenants
tenantSchema.statics.getActiveTenants = function() {
  return this.find({
    subscriptionStatus: 'active',
    isDeleted: false,
  }).sort({ createdAt: -1 });
};

// ===== PRE-SAVE HOOKS =====

// Update last activity
tenantSchema.pre('save', function(next) {
  this.lastActivityAt = new Date();
  next();
});

const Tenant = mongoose.model('Tenant', tenantSchema);

module.exports = Tenant;
