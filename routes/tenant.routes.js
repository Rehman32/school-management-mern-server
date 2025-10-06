// ============================================
// TENANT ROUTES
// School/Tenant management routing
// ============================================

const express = require('express');
const router = express.Router();
const TenantController = require('../controllers/tenant.controller');
const AuthMiddleware = require('../middlewares/auth.middleware');
const TenantMiddleware = require('../middlewares/tenant.middleware');
const RBACMiddleware = require('../middlewares/rbac.middleware');
const AuditMiddleware = require('../middlewares/audit.middleware');
const RateLimitMiddleware = require('../middlewares/rateLimit.middleware');

// ============================================
// PUBLIC ROUTES
// ============================================

/**
 * @route   POST /api/tenants/register
 * @desc    Register new school (tenant)
 * @access  Public
 */
router.post(
  '/register',
  RateLimitMiddleware.registerLimiter,
  AuditMiddleware.audit('create', 'Tenant', { severity: 'high' }),
  TenantController.registerSchool
);

/**
 * @route   GET /api/tenants/check-subdomain/:subdomain
 * @desc    Check if subdomain is available
 * @access  Public
 */
router.get(
  '/check-subdomain/:subdomain',
  TenantController.checkSubdomain
);

// ============================================
// PROTECTED ROUTES (Admin Only)
// ============================================

/**
 * @route   GET /api/tenants/:id
 * @desc    Get tenant details
 * @access  Private (Admin)
 */
router.get(
  '/:id',
  AuthMiddleware.protect,
  TenantMiddleware.enforceTenantIsolation,
  RBACMiddleware.hasAnyRole('admin', 'super_admin'),
  TenantController.getTenant
);

/**
 * @route   PUT /api/tenants/:id
 * @desc    Update tenant
 * @access  Private (Admin)
 */
router.put(
  '/:id',
  AuthMiddleware.protect,
  TenantMiddleware.enforceTenantIsolation,
  RBACMiddleware.hasAnyRole('admin', 'super_admin'),
  AuditMiddleware.audit('update', 'Tenant'),
  TenantController.updateTenant
);

/**
 * @route   POST /api/tenants/:id/invite
 * @desc    Invite user to tenant
 * @access  Private (Admin)
 */
router.post(
  '/:id/invite',
  AuthMiddleware.protect,
  TenantMiddleware.enforceTenantIsolation,
  RBACMiddleware.hasAnyRole('admin', 'super_admin'),
  AuditMiddleware.audit('create', 'Invitation'),
  TenantController.inviteUser
);

/**
 * @route   GET /api/tenants/:id/stats
 * @desc    Get tenant statistics
 * @access  Private (Admin)
 */
router.get(
  '/:id/stats',
  AuthMiddleware.protect,
  TenantMiddleware.enforceTenantIsolation,
  RBACMiddleware.hasAnyRole('admin', 'super_admin'),
  TenantController.getStats
);

/**
 * @route   POST /api/tenants/:id/complete-onboarding
 * @desc    Mark onboarding as complete
 * @access  Private (Admin)
 */
router.post(
  '/:id/complete-onboarding',
  AuthMiddleware.protect,
  TenantMiddleware.enforceTenantIsolation,
  RBACMiddleware.hasAnyRole('admin', 'super_admin'),
  AuditMiddleware.audit('update', 'Tenant', { severity: 'medium' }),
  TenantController.completeOnboarding
);

module.exports = router;
