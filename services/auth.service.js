// ============================================
// AUTH SERVICE - SINGLE-TENANT EDITION
// Core authentication business logic
// ============================================

const User = require('../models/user.model');
const TokenService = require('./token.service');
const EncryptionService = require('./encryption.service');
const AuditMiddleware = require('../middlewares/audit.middleware');
const {
  AuthenticationError,
  ValidationError,
  NotFoundError,
  ConflictError,
} = require('../utils/errors');
const { ERROR_CODES, ROLES } = require('../utils/constants');

class AuthService {
  /**
   * Register New User (Admin creation)
   */
  static async register(userData, req) {
    const { name, email, password, role = ROLES.ADMIN } = userData;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Only allow admin and teacher roles
    if (role !== ROLES.ADMIN && role !== ROLES.TEACHER) {
      throw new ValidationError('Invalid role. Only admin and teacher roles are allowed.');
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
      role,
      isVerified: false,
      isActive: true,
    });

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
        isVerified: user.isVerified,
      },
      tokens,
      verificationToken,
    };
  }

  /**
   * Login User
   */
  static async login(credentials, req) {
    const { email, password } = credentials;

    // Find user with password field
    const user = await User.findOne({
      email: email.toLowerCase(),
      isDeleted: false,
    }).select('+password');

    if (!user) {
      AuditMiddleware.auditFailedLogin(req, {
        error: 'User not found',
        reason: 'invalid_email',
      });
      throw new AuthenticationError('Invalid email or password');
    }

    // Check if account is locked
    if (user.isAccountLocked && user.isAccountLocked()) {
      AuditMiddleware.auditFailedLogin(req, {
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
      if (user.incrementFailedLogins) {
        await user.incrementFailedLogins();
      }

      AuditMiddleware.auditFailedLogin(req, {
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

    // Only allow admin and teacher roles
    if (user.role !== ROLES.ADMIN && user.role !== ROLES.TEACHER) {
      throw new AuthenticationError(
        'Unauthorized role. Only admin and teacher can login.',
        ERROR_CODES.INSUFFICIENT_PERMISSIONS
      );
    }

    // Reset failed login attempts
    if (user.resetFailedLogins) {
      await user.resetFailedLogins();
    }

    // Update last login
    if (user.updateLastLogin) {
      await user.updateLastLogin();
    }

    // Generate tokens
    const tokens = await TokenService.generateTokenPair(
      user,
      req.ip,
      req.get('user-agent')
    );

    // Audit log
    AuditMiddleware.logAudit({
      userId: user._id,
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
   * Logout User
   */
  static async logout(refreshToken, userId) {
    try {
      if (refreshToken) {
        await TokenService.revokeToken(refreshToken, 'logout');
      }
      return { message: 'Logged out successfully' };
    } catch (error) {
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
      return {
        message: 'If an account exists, a password reset email has been sent',
      };
    }

    const resetToken = user.generatePasswordResetToken();
    await user.save();

    return {
      message: 'Password reset email sent',
      resetToken,
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

    const passwordValidation = EncryptionService.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new ValidationError('Password does not meet requirements', {
        errors: passwordValidation.errors,
      });
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpiry = undefined;
    await user.save();

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

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new AuthenticationError('Current password is incorrect');
    }

    const passwordValidation = EncryptionService.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new ValidationError('Password does not meet requirements', {
        errors: passwordValidation.errors,
      });
    }

    user.password = newPassword;
    await user.save();

    await TokenService.revokeAllUserTokens(user._id, 'password_change');

    return {
      message: 'Password changed successfully',
    };
  }

  /**
   * Get Current User Profile
   */
  static async getCurrentUser(userId) {
    const user = await User.findById(userId).select('-password');

    if (!user) {
      throw new NotFoundError('User');
    }

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        isActive: user.isActive,
        profile: user.profile,
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

    const allowedUpdates = ['name', 'phone', 'avatar', 'dateOfBirth', 'address'];

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
