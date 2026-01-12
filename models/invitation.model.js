// ============================================
// INVITATION MODEL
// server/models/invitation.model.js
// For inviting teachers to the school
// ============================================

const mongoose = require('mongoose');
const crypto = require('crypto');

const InvitationSchema = new mongoose.Schema({
  // Invitee info
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  name: {
    type: String,
    trim: true
  },
  
  // Role to assign
  role: {
    type: String,
    enum: ['teacher'],
    default: 'teacher'
  },
  
  // Invitation token
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Expiration
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'accepted', 'expired', 'cancelled'],
    default: 'pending',
    index: true
  },
  
  // Who invited
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Accepted user (after registration)
  acceptedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  acceptedAt: Date,
  
  // Metadata
  message: String, // Custom message from admin
  department: String,
  subjects: [String],
  
}, {
  timestamps: true
});

// ============================================
// INDEXES
// ============================================
InvitationSchema.index({ email: 1, status: 1 });
InvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// ============================================
// STATIC METHODS
// ============================================

// Generate invitation token
InvitationSchema.statics.generateToken = function() {
  return crypto.randomBytes(32).toString('hex');
};

// Find valid invitation by token
InvitationSchema.statics.findValidByToken = async function(token) {
  return this.findOne({
    token,
    status: 'pending',
    expiresAt: { $gt: new Date() }
  });
};

// Get pending invitations
InvitationSchema.statics.getPending = async function() {
  return this.find({
    status: 'pending',
    expiresAt: { $gt: new Date() }
  })
    .populate('invitedBy', 'name email')
    .sort({ createdAt: -1 });
};

// ============================================
// INSTANCE METHODS
// ============================================

// Check if expired
InvitationSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

// Mark as accepted
InvitationSchema.methods.markAccepted = async function(userId) {
  this.status = 'accepted';
  this.acceptedBy = userId;
  this.acceptedAt = new Date();
  return this.save();
};

// Cancel invitation
InvitationSchema.methods.cancel = async function() {
  this.status = 'cancelled';
  return this.save();
};

module.exports = mongoose.model('Invitation', InvitationSchema);
