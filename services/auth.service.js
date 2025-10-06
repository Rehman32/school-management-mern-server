// ============================================
// AUTH SERVICE
// Core authentication business logic
// ============================================

const User = require('../models/user.model');
const Tenant = require('../models/tenant.model');
const Invitation = require('../models/invitation.model');
const TokenService = require('./token.service');
const EncryptionService = require('./encryption.service');
const AuditMiddleware = require('../middlewares/audit.middleware');
const {
  AuthenticationError,
  ValidationError,
  NotFoundError,
  ConflictError,
} = require('../utils/errors');
const { ERROR_CODES } = require('../utils/constants');

class AuthService {
  /**
   * Register New User
   */
  static async register(userData, req) {
    const { name, email, password, role, tenantId, invitationCode } = userData;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Validate invitation if provided
    let tenant = null;
    let invitation = null;

    if (invitationCode) {
      invitation = await Invitation.findValidInvitation(invitationCode);
      if (!invitation) {
        throw new ValidationError('Invalid or expired invitation code');
      }
      tenant = invitation.tenantId;
    } else if (tenantId) {
      tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        throw new NotFoundError('Tenant');
      }
    } else {
      throw new ValidationError('Either tenantId or invitationCode is required');
    }

    // Check tenant limits
    if (tenant.hasReachedLimit('students') && role === 'student') {
      throw new ValidationError('School has reached maximum student limit');
    }

    // Validate password strength
    const passwordValidation = EncryptionService.validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw new ValidationError('Password does not meet requirements', {
        errors: passwordValidation.errors,
      });
    }

    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password, // Will be hashed by pre-save hook
      role: invitation ? invitation.role : role,
      tenantId: tenant._id,
      invitedBy: invitation?.invitedBy,
      invitationCode: invitationCode,
      isVerified: false, // Requires email verification
      isActive: true,
    });

    // Accept invitation if provided
    if (invitation) {
      await invitation.accept();
      user.invitationAcceptedAt = new Date();
      await user.save();
    }

    // Update tenant usage
    await tenant.updateUsage(role === 'student' ? 'students' : 'teachers', true);

    // Generate email verification token
    const verificationToken = user.generateEmailVerificationToken();
    await user.save();

    // Generate auth tokens
    const tokens = await TokenService.generateTokenPair(
      user,
      req.ip,
      req.get('user-agent')
    );

    // Audit log
    AuditMiddleware.logAudit({
      userId: user._id,
      tenantId: tenant._id,
      action: 'register',
      resource: 'User',
      method: 'POST',
      endpoint: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'success',
      severity: 'medium',
    });

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        isVerified: user.isVerified,
      },
      tokens,
      verificationToken, // Send via email
    };
  }

 /**
 * Login User (BACKWARD COMPATIBLE)
 */
static async login(credentials, req) {
  const { email, password } = credentials;

  // Find user with password field
  const user = await User.findOne({
    email: email.toLowerCase(),
    isDeleted: false,
  })
    .select('+password')
    .populate('tenantId');

  if (!user) {
    // Audit failed login
    AuditMiddleware.auditFailedLogin(req, {
      error: 'User not found',
      reason: 'invalid_email',
    });
    throw new AuthenticationError('Invalid email or password');
  }

  // BACKWARD COMPATIBILITY: Handle users without tenantId (old users)
  if (!user.tenantId) {
    console.warn('⚠️  User has no tenantId (old data). Please migrate user:', user.email);
    // For now, allow login but log warning
    // In production, you should migrate all users
  }

  // Check if account is locked
  if (user.isAccountLocked && user.isAccountLocked()) {
    AuditMiddleware.auditFailedLogin(req, {
      tenantId: user.tenantId,
      error: 'Account locked',
      reason: 'account_locked',
    });
    throw new AuthenticationError(
      'Account is temporarily locked due to multiple failed login attempts. Please try again later.',
      ERROR_CODES.ACCOUNT_LOCKED
    );
  }

  // Verify password
  const isPasswordMatch = await user.comparePassword(password);

  if (!isPasswordMatch) {
    // Increment failed login attempts (only if method exists)
    if (user.incrementFailedLogins) {
      await user.incrementFailedLogins();
    }

    AuditMiddleware.auditFailedLogin(req, {
      tenantId: user.tenantId,
      error: 'Invalid password',
      reason: 'invalid_password',
    });

    throw new AuthenticationError('Invalid email or password');
  }

  // Check if user is active
  if (user.isActive === false) {
    throw new AuthenticationError(
      'Account is deactivated. Please contact support.',
      ERROR_CODES.ACCOUNT_LOCKED
    );
  }

  // Check tenant status (only if tenant exists)
  if (user.tenantId) {
    const tenant = user.tenantId;
    if (tenant && tenant.subscriptionStatus !== 'active') {
      throw new AuthenticationError(
        'School subscription is inactive. Please contact administration.',
        ERROR_CODES.TENANT_INACTIVE
      );
    }
  }

  // Reset failed login attempts (only if method exists)
  if (user.resetFailedLogins) {
    await user.resetFailedLogins();
  }

  // Update last login (only if method exists)
  if (user.updateLastLogin) {
    await user.updateLastLogin();
  }

  // Generate tokens
  const tokens = await TokenService.generateTokenPair(
    user,
    req.ip,
    req.get('user-agent')
  );

  // Audit log (only if tenantId exists)
  AuditMiddleware.logAudit({
    userId: user._id,
    tenantId: user.tenantId?._id || user.tenantId,
    action: 'login',
    resource: 'User',
    method: 'POST',
    endpoint: req.originalUrl,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    status: 'success',
    severity: 'medium',
  });

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId?._id || user.tenantId,
      isVerified: user.isVerified || false,
      lastLogin: user.lastLogin,
    },
    tokens,
  };
}


  /**
   * Refresh Access Token
   */
  static async refreshToken(refreshToken, req) {
    const tokens = await TokenService.refreshAccessToken(
      refreshToken,
      req.ip,
      req.get('user-agent')
    );

    return tokens;
  }

  /**
 * Logout User (FIXED - Handle missing token)
 */
static async logout(refreshToken, userId) {
  try {
    // Revoke refresh token if provided
    if (refreshToken) {
      await TokenService.revokeToken(refreshToken, 'logout');
    }
    
    return { message: 'Logged out successfully' };
  } catch (error) {
    // Don't throw error on logout - always succeed
    console.error('Logout error (non-critical):', error);
    return { message: 'Logged out successfully' };
  }
}


  /**
   * Logout from All Devices
   */
  static async logoutAll(userId) {
    await TokenService.revokeAllUserTokens(userId, 'logout_all');
    return { message: 'Logged out from all devices' };
  }

  /**
   * Verify Email
   */
  static async verifyEmail(token) {
    const hashedToken = TokenService.hashToken(token);

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpiry: { $gt: Date.now() },
    });

    if (!user) {
      throw new ValidationError('Invalid or expired verification token');
    }

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpiry = undefined;
    await user.save();

    return {
      message: 'Email verified successfully',
      user: {
        id: user._id,
        email: user.email,
        isVerified: true,
      },
    };
  }

  /**
   * Resend Verification Email
   */
  static async resendVerificationEmail(email) {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      throw new NotFoundError('User');
    }

    if (user.isVerified) {
      throw new ValidationError('Email is already verified');
    }

    // Generate new token
    const verificationToken = user.generateEmailVerificationToken();
    await user.save();

    return {
      message: 'Verification email sent',
      verificationToken,
    };
  }

  /**
   * Forgot Password
   */
  static async forgotPassword(email) {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Don't reveal if user exists
      return {
        message: 'If an account exists, a password reset email has been sent',
      };
    }

    // Generate reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save();

    return {
      message: 'Password reset email sent',
      resetToken, // Send via email
    };
  }

  /**
   * Reset Password
   */
  static async resetPassword(token, newPassword) {
    const hashedToken = TokenService.hashToken(token);

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpiry: { $gt: Date.now() },
    });

    if (!user) {
      throw new ValidationError('Invalid or expired reset token');
    }

    // Validate new password
    const passwordValidation = EncryptionService.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new ValidationError('Password does not meet requirements', {
        errors: passwordValidation.errors,
      });
    }

    // Update password
    user.password = newPassword; // Will be hashed by pre-save hook
    user.passwordResetToken = undefined;
    user.passwordResetExpiry = undefined;
    await user.save();

    // Revoke all refresh tokens (force re-login)
    await TokenService.revokeAllUserTokens(user._id, 'password_reset');

    return {
      message: 'Password reset successful',
    };
  }

  /**
   * Change Password
   */
  static async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select('+password');

    if (!user) {
      throw new NotFoundError('User');
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new AuthenticationError('Current password is incorrect');
    }

    // Validate new password
    const passwordValidation = EncryptionService.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new ValidationError('Password does not meet requirements', {
        errors: passwordValidation.errors,
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Revoke all refresh tokens except current
    await TokenService.revokeAllUserTokens(user._id, 'password_change');

    return {
      message: 'Password changed successfully',
    };
  }

  /**
 * Get Current User Profile (FIXED - Return clean data)
 */
static async getCurrentUser(userId) {
  const user = await User.findById(userId)
    .populate('tenantId', 'name logo subscriptionPlan')
    .select('-password');

  if (!user) {
    throw new NotFoundError('User');
  }

  // Return clean user object
  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      isActive: user.isActive,
      profile: user.profile,
      tenant: user.tenantId ? {
        id: user.tenantId._id,
        name: user.tenantId.name,
        logo: user.tenantId.logo,
        subscriptionPlan: user.tenantId.subscriptionPlan,
      } : null,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
    },
  };
}


  /**
   * Update User Profile
   */
  static async updateProfile(userId, updates) {
    const user = await User.findById(userId);

    if (!user) {
      throw new NotFoundError('User');
    }

    // Update allowed fields
    const allowedUpdates = ['name', 'phone', 'avatar', 'dateOfBirth', 'address'];
    const profileUpdates = {};

    Object.keys(updates).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        if (key === 'address') {
          user.profile.address = { ...user.profile.address, ...updates.address };
        } else {
          user.profile[key] = updates[key];
        }
      }
    });

    await user.save();

    return {
      message: 'Profile updated successfully',
      user,
    };
  }
}

module.exports = AuthService;
