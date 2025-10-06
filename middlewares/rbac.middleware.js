// ============================================
// RBAC MIDDLEWARE
// Role-Based Access Control with fine-grained permissions
// ============================================

const { AuthorizationError } = require('../utils/errors');
const { ROLES, PERMISSIONS } = require('../utils/constants');

class RBACMiddleware {
  /**
   * Check if user has any of the specified roles
   */
  static hasAnyRole(...roles) {
    return (req, res, next) => {
      try {
        if (!req.user) {
          throw new AuthorizationError('Authentication required');
        }

        // Super admin bypasses all checks
        if (req.user.role === ROLES.SUPER_ADMIN) {
          return next();
        }

        if (!roles.includes(req.user.role)) {
          throw new AuthorizationError(
            `Access denied. Required roles: ${roles.join(', ')}`
          );
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Check if user has all specified roles (rarely used)
   */
  static hasAllRoles(...roles) {
    return (req, res, next) => {
      try {
        if (!req.user) {
          throw new AuthorizationError('Authentication required');
        }

        // Super admin bypasses
        if (req.user.role === ROLES.SUPER_ADMIN) {
          return next();
        }

        const hasAll = roles.every((role) => req.user.role === role);

        if (!hasAll) {
          throw new AuthorizationError(
            `Access denied. Required all roles: ${roles.join(', ')}`
          );
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Check if user can perform action on resource
   */
  static canPerform(action, resource) {
    return (req, res, next) => {
      try {
        if (!req.user) {
          throw new AuthorizationError('Authentication required');
        }

        // Super admin and admin can do anything
        if (req.user.role === ROLES.SUPER_ADMIN || req.user.role === ROLES.ADMIN) {
          return next();
        }

        const permission = `${resource}.${action}`;

        if (!req.user.permissions || !req.user.permissions.includes(permission)) {
          throw new AuthorizationError(
            `Access denied. Cannot ${action} ${resource}`
          );
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Check if user owns the resource (e.g., own profile)
   */
  static isOwner(userIdField = 'userId') {
    return (req, res, next) => {
      try {
        if (!req.user) {
          throw new AuthorizationError('Authentication required');
        }

        // Super admin bypasses
        if (req.user.role === ROLES.SUPER_ADMIN) {
          return next();
        }

        const resourceUserId = req.params[userIdField] || req.body[userIdField];

        if (resourceUserId && resourceUserId.toString() !== req.user.id.toString()) {
          throw new AuthorizationError(
            'Access denied. You can only access your own resources.'
          );
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Check if user is owner OR has role
   */
  static isOwnerOrRole(...roles) {
    return (req, res, next) => {
      try {
        if (!req.user) {
          throw new AuthorizationError('Authentication required');
        }

        // Check if user is owner
        const resourceUserId = req.params.userId || req.body.userId;
        const isOwner = resourceUserId && resourceUserId.toString() === req.user.id.toString();

        // Check if user has required role
        const hasRole = roles.includes(req.user.role) || req.user.role === ROLES.SUPER_ADMIN;

        if (!isOwner && !hasRole) {
          throw new AuthorizationError(
            'Access denied. Must be resource owner or have required role.'
          );
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Admin or Self (for profile updates)
   */
  static adminOrSelf(req, res, next) {
    try {
      if (!req.user) {
        throw new AuthorizationError('Authentication required');
      }

      const targetUserId = req.params.id || req.params.userId;

      const isAdmin = req.user.role === ROLES.ADMIN || req.user.role === ROLES.SUPER_ADMIN;
      const isSelf = targetUserId && targetUserId.toString() === req.user.id.toString();

      if (!isAdmin && !isSelf) {
        throw new AuthorizationError(
          'Access denied. Admin privileges or self-access required.'
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  }
}

module.exports = RBACMiddleware;
