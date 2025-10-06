// ============================================
// TENANT SERVICE
// School/Tenant management business logic
// ============================================

const Tenant = require('../models/tenant.model');
const User = require('../models/user.model');
const Invitation = require('../models/invitation.model');
const EncryptionService = require('./encryption.service');
const TokenService = require('./token.service');
const {
  ConflictError,
  ValidationError,
  NotFoundError,
  TenantError,
} = require('../utils/errors');
const { SUBSCRIPTION_PLANS } = require('../utils/constants');

class TenantService {
  /**
   
  /**
 * Create New Tenant (School Registration) - FIXED
 */
static async createTenant(tenantData, req) {
  const {
    schoolName,
    schoolEmail,
    phone,
    address,
    adminName,
    adminEmail,
    adminPassword,
    subdomain,
  } = tenantData;

  // Check if school email already exists
  const existingTenant = await Tenant.findOne({ email: schoolEmail.toLowerCase() });
  if (existingTenant) {
    throw new ConflictError('School with this email already exists');
  }

  // Check if subdomain is available
  if (subdomain) {
    const subdomainExists = await Tenant.findOne({ subdomain: subdomain.toLowerCase() });
    if (subdomainExists) {
      throw new ConflictError('Subdomain is already taken');
    }
  }

  // Check if admin email exists
  const existingUser = await User.findOne({ email: adminEmail.toLowerCase() });
  if (existingUser) {
    throw new ConflictError('Admin email is already registered');
  }

  // Validate password
  const passwordValidation = EncryptionService.validatePasswordStrength(adminPassword);
  if (!passwordValidation.isValid) {
    throw new ValidationError('Password does not meet requirements', {
      errors: passwordValidation.errors,
    });
  }

  // Create tenant
  const tenant = await Tenant.create({
    name: schoolName,
    email: schoolEmail.toLowerCase(),
    phone,
    address,
    subdomain: subdomain ? subdomain.toLowerCase() : null,
    subscriptionPlan: 'trial',
    subscriptionStatus: 'active',
    isVerified: false,
    onboardingCompleted: false,
    limits: SUBSCRIPTION_PLANS.TRIAL,
    createdBy: null, // Will be set after admin is created
  });

  // Create admin user
  const adminUser = await User.create({
    name: adminName,
    email: adminEmail.toLowerCase(),
    password: adminPassword,
    role: 'admin',
    tenantId: tenant._id,
    isVerified: false, // Requires email verification
    isActive: true,
  });

  // Update tenant with admin reference
  tenant.adminUserId = adminUser._id;
  tenant.createdBy = adminUser._id;
  tenant.onboardingSteps.adminCreated = true;
  await tenant.save();

  // Generate verification token for ADMIN USER (not tenant)
  const verificationToken = adminUser.generateEmailVerificationToken();
  await adminUser.save();

  // Generate auth tokens for admin
  const tokens = await TokenService.generateTokenPair(
    adminUser,
    req.ip,
    req.get('user-agent')
  );

  return {
    tenant: {
      id: tenant._id,
      name: tenant.name,
      email: tenant.email,
      subdomain: tenant.subdomain,
      subscriptionPlan: tenant.subscriptionPlan,
    },
    admin: {
      id: adminUser._id,
      name: adminUser.name,
      email: adminUser.email,
      role: adminUser.role,
    },
    tokens,
    verificationToken, // This is for the admin user's email
  };
}


  /**
   * Get Tenant Details
   */
  static async getTenantDetails(tenantId) {
    const tenant = await Tenant.findById(tenantId)
      .populate('adminUserId', 'name email')
      .lean();

    if (!tenant) {
      throw new NotFoundError('Tenant');
    }

    return tenant;
  }

  /**
   * Update Tenant Settings
   */
  static async updateTenant(tenantId, updates, userId) {
    const tenant = await Tenant.findById(tenantId);

    if (!tenant) {
      throw new NotFoundError('Tenant');
    }

    // Update allowed fields
    const allowedFields = [
      'name',
      'phone',
      'address',
      'settings',
      'onboardingSteps',
    ];

    Object.keys(updates).forEach((key) => {
      if (allowedFields.includes(key)) {
        if (key === 'settings' || key === 'address') {
          tenant[key] = { ...tenant[key], ...updates[key] };
        } else {
          tenant[key] = updates[key];
        }
      }
    });

    tenant.updatedBy = userId;
    await tenant.save();

    return tenant;
  }

  /**
   * Invite User to Tenant
   */
  static async inviteUser(tenantId, invitationData, invitedBy) {
    const { email, role, metadata } = invitationData;

    // Check tenant limits
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      throw new NotFoundError('Tenant');
    }

    if (role === 'student' && tenant.hasReachedLimit('students')) {
      throw new TenantError('Maximum student limit reached for your plan');
    }

    if (role === 'teacher' && tenant.hasReachedLimit('teachers')) {
      throw new TenantError('Maximum teacher limit reached for your plan');
    }

    // Check if user already exists
    const existingUser = await User.findByEmailAndTenant(email, tenantId);
    if (existingUser) {
      throw new ConflictError('User already exists in this school');
    }

    // Check if invitation already exists
    const existingInvitation = await Invitation.findOne({
      email: email.toLowerCase(),
      tenantId,
      status: 'pending',
    });

    if (existingInvitation) {
      throw new ConflictError('Invitation already sent to this email');
    }

    // Generate invitation token
    const token = TokenService.generateInvitationToken();

    // Create invitation
    const invitation = await Invitation.create({
      tenantId,
      email: email.toLowerCase(),
      role,
      token,
      invitedBy,
      metadata,
    });

    return {
      invitation,
      invitationLink: `${process.env.APP_URL}/register?invitation=${token}`,
    };
  }

  /**
   * Get Tenant Statistics
   */
  static async getTenantStats(tenantId) {
    const tenant = await Tenant.findById(tenantId);

    if (!tenant) {
      throw new NotFoundError('Tenant');
    }

    const [totalUsers, activeUsers, pendingInvitations] = await Promise.all([
      User.countDocuments({ tenantId, isDeleted: false }),
      User.countDocuments({ tenantId, isActive: true, isDeleted: false }),
      Invitation.countDocuments({ tenantId, status: 'pending' }),
    ]);

    return {
      tenant: {
        name: tenant.name,
        subscriptionPlan: tenant.subscriptionPlan,
        subscriptionStatus: tenant.subscriptionStatus,
        trialEndsAt: tenant.trialEndsAt,
      },
      usage: tenant.usage,
      limits: tenant.limits,
      users: {
        total: totalUsers,
        active: activeUsers,
      },
      invitations: {
        pending: pendingInvitations,
      },
      onboardingProgress: {
        completed: tenant.onboardingCompleted,
        steps: tenant.onboardingSteps,
      },
    };
  }

  /**
   * Complete Onboarding
   */
  static async completeOnboarding(tenantId, userId) {
    const tenant = await Tenant.findById(tenantId);

    if (!tenant) {
      throw new NotFoundError('Tenant');
    }

    tenant.onboardingCompleted = true;
    tenant.updatedBy = userId;
    await tenant.save();

    return {
      message: 'Onboarding completed successfully',
      tenant,
    };
  }

  /**
   * Check if subdomain is available
   */
  static async checkSubdomainAvailability(subdomain) {
    const exists = await Tenant.findOne({ subdomain: subdomain.toLowerCase() });
    return {
      available: !exists,
      subdomain,
    };
  }
}

module.exports = TenantService;
