// ============================================
// TENANT MIDDLEWARE
// Ensures data isolation between tenants
// Automatically filters queries by tenantId
// ============================================

const Tenant = require('../models/tenant.model');
const { TenantError, AuthenticationError } = require('../utils/errors');
const { ERROR_CODES } = require('../utils/constants');

class TenantMiddleware {
  /**
   * Extract Tenant Context from Request
   * Can be from: subdomain, custom domain, or JWT
   */
  static async extractTenantContext(req, res, next) {
    try {
      let tenant = null;

      // Method 1: Extract from subdomain (e.g., abc-school.yourplatform.com)
      const host = req.get('host');
      const subdomain = host.split('.')[0];

      if (subdomain && subdomain !== 'www' && subdomain !== 'localhost') {
        tenant = await Tenant.findByDomain(subdomain);
      }

      // Method 2: Extract from custom domain (e.g., abcschool.com)
      if (!tenant) {
        tenant = await Tenant.findByDomain(host);
      }

      // Method 3: Extract from JWT (fallback for single domain)
      if (!tenant && req.user && req.user.tenantId) {
        tenant = await Tenant.findById(req.user.tenantId);
      }

      // Method 4: Extract from header (for API clients)
      const tenantHeader = req.get('X-Tenant-ID');
      if (!tenant && tenantHeader) {
        tenant = await Tenant.findById(tenantHeader);
      }

      if (!tenant) {
        throw new TenantError(
          'Tenant not found. Please access via valid subdomain or domain.',
          ERROR_CODES.TENANT_NOT_FOUND
        );
      }

      // Check tenant status
      if (tenant.subscriptionStatus !== 'active') {
        throw new TenantError(
          'School account is inactive. Please contact support.',
          ERROR_CODES.TENANT_INACTIVE
        );
      }

      // Check subscription validity
      if (!tenant.hasActiveSubscription()) {
        throw new TenantError(
          'School subscription has expired. Please renew.',
          ERROR_CODES.SUBSCRIPTION_EXPIRED
        );
      }

      // Attach tenant to request
      req.tenant = tenant;
      req.tenantId = tenant._id;

      // Update last activity
      tenant.lastActivityAt = new Date();
      await tenant.save();

      next();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Enforce Tenant Isolation (for protected routes)
   * Ensures user belongs to the tenant they're trying to access
   */
  static enforceTenantIsolation(req, res, next) {
    try {
      // Super admin can access any tenant
      if (req.user.role === 'super_admin') {
        return next();
      }

      // Check if user's tenantId matches request tenantId
      if (req.user.tenantId.toString() !== req.tenantId.toString()) {
        throw new AuthenticationError(
          'Access denied. You do not belong to this tenant.'
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check Tenant Limits (before creating resources)
   */
  static checkTenantLimit(resource) {
    return async (req, res, next) => {
      try {
        const tenant = req.tenant;

        if (tenant.hasReachedLimit(resource)) {
          throw new TenantError(
            `You have reached the maximum ${resource} limit for your subscription plan.`,
            ERROR_CODES.LIMIT_REACHED
          );
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Auto-inject TenantId into Query/Body
   * Ensures all database operations are tenant-scoped
   */
  static injectTenantId(req, res, next) {
    // Skip for super admin
    if (req.user && req.user.role === 'super_admin') {
      return next();
    }

    // Inject tenantId into request body for CREATE operations
    if (req.method === 'POST' && req.body) {
      req.body.tenantId = req.tenantId;
    }

    // Inject tenantId into query filters for READ operations
    if (req.method === 'GET' && req.query) {
      req.query.tenantId = req.tenantId;
    }

    next();
  }

  /**
   * Validate Tenant Ownership of Resource
   * Ensures users can only access their tenant's data
   */
  static async validateResourceOwnership(Model) {
    return async (req, res, next) => {
      try {
        const resourceId = req.params.id;

        // Super admin bypass
        if (req.user.role === 'super_admin') {
          return next();
        }

        const resource = await Model.findById(resourceId);

        if (!resource) {
          throw new TenantError('Resource not found');
        }

        if (resource.tenantId.toString() !== req.tenantId.toString()) {
          throw new AuthenticationError(
            'Access denied. This resource does not belong to your organization.'
          );
        }

        // Attach resource to request for reuse
        req.resource = resource;
        next();
      } catch (error) {
        next(error);
      }
    };
  }
}

module.exports = TenantMiddleware;
