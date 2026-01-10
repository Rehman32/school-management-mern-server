// ============================================
// AUTH MIDDLEWARE - SINGLE-TENANT EDITION
// JWT verification with refresh token support
// ============================================

const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const TokenService = require('../services/token.service');
const { AuthenticationError, AuthorizationError } = require('../utils/errors');
const { ERROR_CODES, ROLES } = require('../utils/constants');

class AuthMiddleware {
  /**
   * Protect Routes (Verify JWT)
   * Enhanced version with better error handling
   */
  static async protect(req, res, next) {
    try {
      // 1. Extract token from header
      const authHeader = req.header('Authorization');

      if (!authHeader) {
        throw new AuthenticationError(
          'No authentication token provided',
          ERROR_CODES.TOKEN_INVALID
        );
      }

      const token = authHeader.split(' ')[1];

      if (!token) {
        throw new AuthenticationError(
          'Invalid token format. Use: Bearer <token>',
          ERROR_CODES.TOKEN_INVALID
        );
      }

      // 2. Verify token
      let decoded;
      try {
        decoded = TokenService.verifyAccessToken(token);
      } catch (error) {
        if (error.message.includes('expired')) {
          throw new AuthenticationError(
            'Access token expired. Please refresh your token.',
            ERROR_CODES.TOKEN_EXPIRED
          );
        }
        throw new AuthenticationError(
          'Invalid authentication token',
          ERROR_CODES.TOKEN_INVALID
        );
      }

      // 3. Get user from database
      const user = await User.findById(decoded.user.id)
        .select('-password');

      if (!user) {
        throw new AuthenticationError(
          'User not found. Token may be invalid.',
          ERROR_CODES.INVALID_CREDENTIALS
        );
      }

      // 4. Check if user is active
      if (!user.isActive) {
        throw new AuthenticationError(
          'Account is deactivated. Please contact support.',
          ERROR_CODES.ACCOUNT_LOCKED
        );
      }

      // 5. Check if account is locked
      if (user.isAccountLocked()) {
        throw new AuthenticationError(
          'Account is temporarily locked due to multiple failed login attempts.',
          ERROR_CODES.ACCOUNT_LOCKED
        );
      }

      // 6. Check if email is verified (optional - can be enforced)
      if (!user.isVerified && process.env.REQUIRE_EMAIL_VERIFICATION === 'true') {
        throw new AuthenticationError(
          'Email not verified. Please verify your email.',
          ERROR_CODES.EMAIL_NOT_VERIFIED
        );
      }

      // 7. Attach user to request
      req.user = {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: user.permissions,
      };

      // 8. Update last activity
      user.lastActivity = new Date();
      await user.save();

      next();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Optional Auth (for public routes that benefit from user context)
   */
  static async optionalAuth(req, res, next) {
    try {
      const authHeader = req.header('Authorization');

      if (authHeader) {
        const token = authHeader.split(' ')[1];
        if (token) {
          const decoded = TokenService.verifyAccessToken(token);
          const user = await User.findById(decoded.user.id).select('-password');

          if (user && user.isActive) {
            req.user = {
              id: user._id,
              email: user.email,
              name: user.name,
              role: user.role,
              permissions: user.permissions,
            };
          }
        }
      }
    } catch (error) {
      // Ignore errors in optional auth
      console.log('Optional auth failed:', error.message);
    }

    next();
  }

  /**
   * Authorize by Role(s)
   * Enhanced with multiple role support
   */
  static authorize(...allowedRoles) {
    return (req, res, next) => {
      try {
        if (!req.user) {
          throw new AuthenticationError('Authentication required');
        }

        // Admin has access to everything
        if (req.user.role === ROLES.ADMIN) {
          return next();
        }

        // Check if user's role is in allowed roles
        if (!allowedRoles.includes(req.user.role)) {
          throw new AuthorizationError(
            `Access denied. Required role: ${allowedRoles.join(' or ')}`,
            ERROR_CODES.INSUFFICIENT_PERMISSIONS
          );
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Check Specific Permission
   * For granular access control
   */
  static checkPermission(permission) {
    return (req, res, next) => {
      try {
        if (!req.user) {
          throw new AuthenticationError('Authentication required');
        }

        // Admin has all permissions
        if (req.user.role === ROLES.ADMIN) {
          return next();
        }

        // Check if user has the specific permission
        if (!req.user.permissions || !req.user.permissions.includes(permission)) {
          throw new AuthorizationError(
            `Access denied. Required permission: ${permission}`,
            ERROR_CODES.INSUFFICIENT_PERMISSIONS
          );
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Check Multiple Permissions (AND logic)
   */
  static checkPermissions(...permissions) {
    return (req, res, next) => {
      try {
        if (!req.user) {
          throw new AuthenticationError('Authentication required');
        }

        // Admin bypass
        if (req.user.role === ROLES.ADMIN) {
          return next();
        }

        // Check if user has ALL required permissions
        const hasAllPermissions = permissions.every((perm) =>
          req.user.permissions.includes(perm)
        );

        if (!hasAllPermissions) {
          throw new AuthorizationError(
            `Access denied. Required permissions: ${permissions.join(', ')}`,
            ERROR_CODES.INSUFFICIENT_PERMISSIONS
          );
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Require Email Verification
   */
  static requireVerified(req, res, next) {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      if (!req.user.isVerified) {
        throw new AuthenticationError(
          'Email verification required to access this resource',
          ERROR_CODES.EMAIL_NOT_VERIFIED
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  }
}

// Export class methods
module.exports = AuthMiddleware;

// Backward compatibility exports
module.exports.protect = AuthMiddleware.protect;
module.exports.authorize = AuthMiddleware.authorize;
