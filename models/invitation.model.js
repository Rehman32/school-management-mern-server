// ============================================
// INVITATION MODEL
// For inviting users to join a tenant
// ============================================

const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  role: {
    type: String,
    enum: ['admin', 'teacher', 'student', 'parent'],
    required: true,
  },
  
  // Invitation token
  token: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  
  // Who sent the invitation
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'accepted', 'expired', 'cancelled'],
    default: 'pending',
    index: true,
  },
  
  // Timestamps
  sentAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    index: true,
  },
  acceptedAt: Date,
  
  // Additional data
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    // Can store class assignment, department, etc.
  },
}, {
  timestamps: true,
});

// ===== INDEXES =====
invitationSchema.index({ email: 1, tenantId: 1 });
invitationSchema.index({ token: 1 });
invitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired

// ===== INSTANCE METHODS =====

// Check if invitation is valid
invitationSchema.methods.isValid = function () {
  return this.status === 'pending' && new Date() < this.expiresAt;
};

// Accept invitation
invitationSchema.methods.accept = async function () {
  this.status = 'accepted';
  this.acceptedAt = new Date();
  return this.save();
};

// ===== STATIC METHODS =====

// Find valid invitation
invitationSchema.statics.findValidInvitation = function (token) {
  return this.findOne({
    token,
    status: 'pending',
    expiresAt: { $gt: new Date() },
  }).populate('tenantId invitedBy');
};

const Invitation = mongoose.model('Invitation', invitationSchema);

module.exports = Invitation;
