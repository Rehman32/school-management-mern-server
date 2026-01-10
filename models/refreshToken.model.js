// ============================================
// REFRESH TOKEN MODEL - SINGLE-TENANT EDITION
// Stores refresh tokens for JWT authentication
// Enables token rotation and revocation
// ============================================

const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  // Token metadata
  issuedAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true, // For automatic cleanup
  },
  
  // Security
  ipAddress: String,
  userAgent: String,
  deviceId: String,
  
  // Status
  isRevoked: {
    type: Boolean,
    default: false,
    index: true,
  },
  revokedAt: Date,
  revokedReason: {
    type: String,
    enum: ['manual', 'logout', 'security', 'expired', 'replaced'],
  },
  
  // Token family (for rotation)
  replacedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RefreshToken',
  },
  
}, {
  timestamps: true,
});

// ===== INDEXES =====
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired

// ===== INSTANCE METHODS =====

// Check if token is valid
refreshTokenSchema.methods.isValid = function() {
  return !this.isRevoked && new Date() < this.expiresAt;
};

// Revoke this token
refreshTokenSchema.methods.revoke = function(reason = 'manual') {
  this.isRevoked = true;
  this.revokedAt = new Date();
  this.revokedReason = reason;
  return this.save();
};

// ===== STATIC METHODS =====

// Find valid token
refreshTokenSchema.statics.findValidToken = function(token) {
  return this.findOne({
    token,
    isRevoked: false,
    expiresAt: { $gt: new Date() },
  }).populate('userId');
};

// Revoke all tokens for user
refreshTokenSchema.statics.revokeAllForUser = function(userId, reason = 'security') {
  return this.updateMany(
    { userId, isRevoked: false },
    {
      isRevoked: true,
      revokedAt: new Date(),
      revokedReason: reason,
    }
  );
};

// Cleanup expired tokens (manual, cron job alternative)
refreshTokenSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() },
  });
};

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

module.exports = RefreshToken;
