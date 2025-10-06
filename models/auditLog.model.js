// ============================================
// AUDIT LOG MODEL
// Tracks all security-sensitive operations
// Essential for compliance and debugging
// ============================================

const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    // ===== WHO =====
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      index: true,
    },

    // ===== WHAT =====
    action: {
      type: String,
      required: true,
      enum: [
        // Auth actions
        "login",
        "logout",
        "register",
        "password_reset",
        "email_verified",
        "token_refreshed",
        "password_changed",
        "account_locked",

        // Data actions
        "create",
        "read",
        "update",
        "delete",

        // Admin actions
        "user_created",
        "user_deleted",
        "role_changed",
        "permission_changed",

        // Security actions
        "suspicious_activity",
        "brute_force_attempt",
        "unauthorized_access",
        "error",
        "system_error",
      ],
      index: true,
    },

    resource: {
      type: String,
      // e.g., 'User', 'Student', 'Teacher', 'Class', etc.
      index: true,
    },

    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
    },

    // ===== WHEN =====
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // ===== WHERE =====
    ipAddress: String,
    userAgent: String,

    // ===== HOW =====
    method: String, // HTTP method: GET, POST, PUT, DELETE
    endpoint: String, // API endpoint called

    // ===== DETAILS =====
    details: {
      type: mongoose.Schema.Types.Mixed,
      // Store relevant data (sanitized, no sensitive info)
    },

    // ===== STATUS =====
    status: {
      type: String,
      enum: ["success", "failure", "warning"],
      default: "success",
    },

    errorMessage: String,

    // ===== METADATA =====
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "low",
    },
  },
  {
    timestamps: false, // We use custom timestamp field
  }
);

// ===== INDEXES =====
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ tenantId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ severity: 1, timestamp: -1 });

// ===== STATIC METHODS =====

// Log an action
auditLogSchema.statics.log = async function (data) {
  try {
    return await this.create(data);
  } catch (err) {
    console.error("Failed to create audit log:", err);
    // Don't throw - audit logging should never break the app
  }
};

// Get logs for user
auditLogSchema.statics.getUserLogs = function (userId, limit = 100) {
  return this.find({ userId }).sort({ timestamp: -1 }).limit(limit).lean();
};

// Get logs for tenant
auditLogSchema.statics.getTenantLogs = function (tenantId, limit = 100) {
  return this.find({ tenantId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate("userId", "name email")
    .lean();
};

// Get security events
auditLogSchema.statics.getSecurityEvents = function (tenantId, days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  return this.find({
    tenantId,
    timestamp: { $gte: since },
    severity: { $in: ["high", "critical"] },
  })
    .sort({ timestamp: -1 })
    .lean();
};

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

module.exports = AuditLog;
