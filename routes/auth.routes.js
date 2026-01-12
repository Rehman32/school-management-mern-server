// ============================================
// ENHANCED AUTH ROUTES
// Complete authentication routing with validation & rate limiting
// ============================================

const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const AuthMiddleware = require('../middlewares/auth.middleware');
const AuditMiddleware = require('../middlewares/audit.middleware');
const RateLimitMiddleware = require('../middlewares/rateLimit.middleware');
const { validate } = require('../middlewares/validate');
const AuthValidator = require('../validators/auth.validator');

// ============================================
// PUBLIC ROUTES (No Authentication Required)
// ============================================

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post(
  '/register',
  RateLimitMiddleware.registerLimiter,
  validate(AuthValidator.register),
  AuditMiddleware.auditAuth('register'),
  AuthController.register
);

/**
 * @route   POST /api/auth/register-school
 * @desc    Register new school with admin (onboarding)
 * @access  Public
 */
router.post(
  '/register-school',
  RateLimitMiddleware.registerLimiter,
  AuditMiddleware.auditAuth('register_school'),
  AuthController.registerSchool
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  RateLimitMiddleware.loginLimiter,
  validate(AuthValidator.login),
  AuditMiddleware.auditAuth('login'),
  AuthController.login
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post(
  '/refresh',
  validate(AuthValidator.refreshToken),
  AuthController.refreshToken
);

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email address
 * @access  Public
 */
router.post(
  '/verify-email',
  validate(AuthValidator.verifyEmail),
  AuditMiddleware.auditAuth('email_verified'),
  AuthController.verifyEmail
);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend verification email
 * @access  Public
 */
router.post(
  '/resend-verification',
  RateLimitMiddleware.emailVerificationLimiter,
  validate(AuthValidator.forgotPassword), // Uses same schema (email only)
  AuthController.resendVerification
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post(
  '/forgot-password',
  RateLimitMiddleware.passwordResetLimiter,
  validate(AuthValidator.forgotPassword),
  AuditMiddleware.auditAuth('password_reset_requested'),
  AuthController.forgotPassword
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post(
  '/reset-password',
  validate(AuthValidator.resetPassword),
  AuditMiddleware.auditAuth('password_reset'),
  AuthController.resetPassword
);

// ============================================
// PROTECTED ROUTES (Authentication Required)
// ============================================

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get(
  '/me',
  AuthMiddleware.protect,
  AuthController.getCurrentUser
);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  '/profile',
  AuthMiddleware.protect,
  validate(AuthValidator.updateProfile),
  AuditMiddleware.audit('update', 'UserProfile'),
  AuthController.updateProfile
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password (when logged in)
 * @access  Private
 */
router.post(
  '/change-password',
  AuthMiddleware.protect,
  validate(AuthValidator.changePassword),
  AuditMiddleware.auditAuth('password_changed'),
  AuthController.changePassword
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout from current device
 * @access  Private
 */
router.post(
  '/logout',
  AuthMiddleware.protect,
  AuditMiddleware.auditAuth('logout'),
  AuthController.logout
);

/**
 * @route   POST /api/auth/logout-all
 * @desc    Logout from all devices
 * @access  Private
 */
router.post(
  '/logout-all',
  AuthMiddleware.protect,
  RateLimitMiddleware.strictLimiter,
  AuditMiddleware.auditAuth('logout_all'),
  AuthController.logoutAll
);

module.exports = router;
