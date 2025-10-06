// ============================================
// TENANT CONTROLLER
// School/Tenant management endpoints
// ============================================

const TenantService = require('../services/tenant.service');
const EmailService = require('../services/email.service');
const ApiResponse = require('../utils/response');
const ErrorHandler = require('../middlewares/errorHandler.middleware');

class TenantController {
  /**
   * Register New School (Tenant)
   * POST /api/tenants/register
   */
  static registerSchool = ErrorHandler.asyncHandler(async (req, res) => {
    const result = await TenantService.createTenant(req.body, req);

    // Send verification email
    if (result.verificationToken) {
      EmailService.sendVerificationEmail(result.admin, result.verificationToken).catch((err) =>
        console.error('Failed to send verification email:', err)
      );
    }

    // Set refresh token
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return ApiResponse.created(res, {
      tenant: result.tenant,
      admin: result.admin,
      accessToken: result.tokens.accessToken,
      expiresIn: result.tokens.expiresIn,
    }, 'School registered successfully');
  });

  /**
   * Get Tenant Details
   * GET /api/tenants/:id
   */
  static getTenant = ErrorHandler.asyncHandler(async (req, res) => {
    const tenant = await TenantService.getTenantDetails(req.params.id);

    return ApiResponse.success(res, tenant);
  });

  /**
   * Update Tenant
   * PUT /api/tenants/:id
   */
  static updateTenant = ErrorHandler.asyncHandler(async (req, res) => {
    const tenant = await TenantService.updateTenant(req.params.id, req.body, req.user.id);

    return ApiResponse.success(res, tenant, 'Tenant updated successfully');
  });

  /**
   * Invite User
   * POST /api/tenants/:id/invite
   */
  static inviteUser = ErrorHandler.asyncHandler(async (req, res) => {
    const result = await TenantService.inviteUser(req.params.id, req.body, req.user.id);

    // Send invitation email
    EmailService.sendInvitationEmail(result.invitation, req.tenant).catch((err) =>
      console.error('Failed to send invitation email:', err)
    );

    return ApiResponse.created(res, {
      invitation: result.invitation,
      invitationLink: result.invitationLink,
    }, 'Invitation sent successfully');
  });

  /**
   * Get Tenant Statistics
   * GET /api/tenants/:id/stats
   */
  static getStats = ErrorHandler.asyncHandler(async (req, res) => {
    const stats = await TenantService.getTenantStats(req.params.id);

    return ApiResponse.success(res, stats);
  });

  /**
   * Complete Onboarding
   * POST /api/tenants/:id/complete-onboarding
   */
  static completeOnboarding = ErrorHandler.asyncHandler(async (req, res) => {
    const result = await TenantService.completeOnboarding(req.params.id, req.user.id);

    return ApiResponse.success(res, result.tenant, result.message);
  });

  /**
   * Check Subdomain Availability
   * GET /api/tenants/check-subdomain/:subdomain
   */
  static checkSubdomain = ErrorHandler.asyncHandler(async (req, res) => {
    const result = await TenantService.checkSubdomainAvailability(req.params.subdomain);

    return ApiResponse.success(res, result);
  });
}

module.exports = TenantController;
