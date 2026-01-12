// ============================================
// AUTH CONTROLLER
// Complete authentication endpoints
// ============================================

const AuthService = require('../services/auth.service');
const EmailService = require('../services/email.service');
const ApiResponse = require('../utils/response');
const ErrorHandler = require('../middlewares/errorHandler.middleware');

class AuthController {
  /**
   * Register New User
   * POST /api/auth/register
   */
  static register = ErrorHandler.asyncHandler(async (req, res) => {
    const result = await AuthService.register(req.body, req);

    // Send verification email (don't wait for it)
    if (result.verificationToken) {
      EmailService.sendVerificationEmail(result.user, result.verificationToken).catch((err) =>
        console.error('Failed to send verification email:', err)
      );
    }

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return ApiResponse.created(res, {
      user: result.user,
      accessToken: result.tokens.accessToken,
      expiresIn: result.tokens.expiresIn,
    }, 'Registration successful. Please verify your email.');
  });

  /**
   * Login User
   * POST /api/auth/login
   */
  static login = ErrorHandler.asyncHandler(async (req, res) => {
    const result = await AuthService.login(req.body, req);

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return ApiResponse.success(res, {
      user: result.user,
      accessToken: result.tokens.accessToken,
      expiresIn: result.tokens.expiresIn,
    }, 'Login successful');
  });

  /**
   * Refresh Access Token
   * POST /api/auth/refresh
   */
  static refreshToken = ErrorHandler.asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return ApiResponse.error(res, 'Refresh token required', 401);
    }

    const tokens = await AuthService.refreshToken(refreshToken, req);

    // Set new refresh token
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return ApiResponse.success(res, {
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
    }, 'Token refreshed successfully');
  });

  /**
   * Logout User
   * POST /api/auth/logout
   */
  static logout = ErrorHandler.asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    await AuthService.logout(refreshToken, req.user.id);

    // Clear cookie
    res.clearCookie('refreshToken');

    return ApiResponse.success(res, null, 'Logged out successfully');
  });

  /**
   * Logout from All Devices
   * POST /api/auth/logout-all
   */
  static logoutAll = ErrorHandler.asyncHandler(async (req, res) => {
    await AuthService.logoutAll(req.user.id);

    res.clearCookie('refreshToken');

    return ApiResponse.success(res, null, 'Logged out from all devices');
  });

  /**
   * Verify Email
   * POST /api/auth/verify-email
   */
  static verifyEmail = ErrorHandler.asyncHandler(async (req, res) => {
    const { token } = req.body;

    const result = await AuthService.verifyEmail(token);

    return ApiResponse.success(res, result, 'Email verified successfully');
  });

  /**
   * Resend Verification Email
   * POST /api/auth/resend-verification
   */
  static resendVerification = ErrorHandler.asyncHandler(async (req, res) => {
    const { email } = req.body;

    const result = await AuthService.resendVerificationEmail(email);

    // Send email
    if (result.verificationToken) {
      EmailService.sendVerificationEmail({ email }, result.verificationToken).catch((err) =>
        console.error('Failed to send verification email:', err)
      );
    }

    return ApiResponse.success(res, null, 'Verification email sent');
  });

  /**
   * Forgot Password
   * POST /api/auth/forgot-password
   */
  static forgotPassword = ErrorHandler.asyncHandler(async (req, res) => {
    const { email } = req.body;

    const result = await AuthService.forgotPassword(email);

    // Send reset email
    if (result.resetToken) {
      EmailService.sendPasswordResetEmail({ email }, result.resetToken).catch((err) =>
        console.error('Failed to send reset email:', err)
      );
    }

    return ApiResponse.success(res, null, result.message);
  });

  /**
   * Reset Password
   * POST /api/auth/reset-password
   */
  static resetPassword = ErrorHandler.asyncHandler(async (req, res) => {
    const { token, password } = req.body;

    const result = await AuthService.resetPassword(token, password);

    return ApiResponse.success(res, null, result.message);
  });

  /**
   * Change Password
   * POST /api/auth/change-password
   */
  static changePassword = ErrorHandler.asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    const result = await AuthService.changePassword(req.user.id, currentPassword, newPassword);

    return ApiResponse.success(res, null, result.message);
  });

/**
 * Get Current User (FIXED - Consistent format)
 * GET /api/auth/me
 */
static getCurrentUser = ErrorHandler.asyncHandler(async (req, res) => {
  const result = await AuthService.getCurrentUser(req.user.id);

  // Return in consistent format
  return ApiResponse.success(res, {
    user: result.user,
  });
});


  /**
   * Update Profile
   * PUT /api/auth/profile
   */
  static updateProfile = ErrorHandler.asyncHandler(async (req, res) => {
    const result = await AuthService.updateProfile(req.user.id, req.body);

    return ApiResponse.success(res, result.user, result.message);
  });

  /**
   * Register School (Onboarding)
   * POST /api/auth/register-school
   * Creates school + admin user atomically
   */
  static registerSchool = ErrorHandler.asyncHandler(async (req, res) => {
    const result = await AuthService.registerSchool(req.body, req);

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return ApiResponse.created(res, {
      school: result.school,
      user: result.user,
      accessToken: result.tokens.accessToken,
      expiresIn: result.tokens.expiresIn,
    }, result.message);
  });
}

module.exports = AuthController;
