// ============================================
// AUDIT MIDDLEWARE
// Automatic logging of security-sensitive actions
// ============================================

const AuditLog = require('../models/auditLog.model');

class AuditMiddleware {
  /**
   * Log All Requests (Development only - too verbose for production)
   */
  static logRequest(req, res, next) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    }
    next();
  }

  /**
   * Audit Wrapper - Log action with details
   */
  static audit(action, resource = null, options = {}) {
    return async (req, res, next) => {
      // Store original res.json
      const originalJson = res.json.bind(res);

      // Override res.json to capture response
      res.json = function (data) {
        // Log audit entry
        AuditMiddleware.logAudit({
          userId: req.user?._id || req.user?.id,
          tenantId: req.tenantId || req.user?.tenantId,
          action,
          resource,
          resourceId: req.params.id || req.body._id || data?.data?._id,
          method: req.method,
          endpoint: req.originalUrl,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent'),
          status: res.statusCode >= 200 && res.statusCode < 300 ? 'success' : 'failure',
          details: options.includeBody ? { body: req.body } : undefined,
          severity: options.severity || 'low',
        });

        // Call original json
        return originalJson(data);
      };

      next();
    };
  }

  /**
 * Audit Authentication Events (FIXED)
 */
static auditAuth(action) {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = function (data) {
      const severity = action.includes('login') || action.includes('register') ? 'medium' : 'high';

      AuditMiddleware.logAudit({
        userId: req.user?._id || req.user?.id || data?.data?.user?.id,
        tenantId: req.tenantId || req.body?.tenantId || data?.data?.user?.tenantId,
        action,
        resource: 'User',
        method: req.method,
        endpoint: req.originalUrl,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        status: res.statusCode >= 200 && res.statusCode < 300 ? 'success' : 'failure',
        details: {
          email: req.body?.email || data?.data?.user?.email, // FIXED: Safe access
        },
        severity,
      });

      return originalJson(data);
    };

    next();
  };
}


  /**
   * Audit Failed Login Attempts
   */
  static auditFailedLogin(req, details = {}) {
    AuditMiddleware.logAudit({
      userId: null,
      tenantId: details.tenantId,
      action: 'login',
      resource: 'User',
      method: req.method,
      endpoint: req.originalUrl,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      status: 'failure',
      errorMessage: details.error || 'Invalid credentials',
      details: {
        email: req.body.email,
        reason: details.reason,
      },
      severity: 'high',
    });
  }

  /**
   * Audit Security Events
   */
  static auditSecurityEvent(type, req, details = {}) {
    AuditMiddleware.logAudit({
      userId: req.user?._id || req.user?.id,
      tenantId: req.tenantId || req.user?.tenantId,
      action: type,
      resource: 'Security',
      method: req.method,
      endpoint: req.originalUrl,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      status: 'warning',
      details,
      severity: 'critical',
    });
  }

  /**
   * Internal logging function
   */
  static async logAudit(data) {
    try {
      await AuditLog.log({
        userId: data.userId,
        tenantId: data.tenantId,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        timestamp: new Date(),
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        method: data.method,
        endpoint: data.endpoint,
        details: data.details,
        status: data.status || 'success',
        errorMessage: data.errorMessage,
        severity: data.severity || 'low',
      });
    } catch (error) {
      // Don't throw - audit logging should never break the app
      console.error('Failed to create audit log:', error);
    }
  }

  /**
   * Audit Data Changes (for update/delete operations)
   */
  static auditDataChange(action, resource) {
    return async (req, res, next) => {
      // Store original data before modification
      if (req.resource) {
        req.originalData = JSON.parse(JSON.stringify(req.resource));
      }

      const originalJson = res.json.bind(res);

      res.json = function (data) {
        AuditMiddleware.logAudit({
          userId: req.user._id || req.user.id,
          tenantId: req.tenantId,
          action,
          resource,
          resourceId: req.params.id,
          method: req.method,
          endpoint: req.originalUrl,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent'),
          status: res.statusCode >= 200 && res.statusCode < 300 ? 'success' : 'failure',
          details: {
            before: req.originalData,
            after: data?.data,
            changes: req.body,
          },
          severity: action === 'delete' ? 'high' : 'medium',
        });

        return originalJson(data);
      };

      next();
    };
  }
}

module.exports = AuditMiddleware;
