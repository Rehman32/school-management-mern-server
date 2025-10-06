// ============================================
// AUTH VALIDATORS
// Input validation using Zod
// ============================================

const { z } = require('zod');

const AuthValidator = {
  /**
   * Register Validation
   */
  register: z.object({
    body: z.object({
      name: z
        .string()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name must not exceed 100 characters')
        .trim(),
      email: z
        .string()
        .email('Invalid email address')
        .toLowerCase()
        .trim(),
      password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
          'Password must contain at least one uppercase letter, one lowercase letter, and one number'
        ),
      role: z
        .enum(['admin', 'teacher', 'student', 'parent'])
        .optional()
        .default('student'),
      tenantId: z.string().optional(), // For invitation-based registration
      invitationCode: z.string().optional(),
    }),
  }),

  /**
   * Login Validation
   */
  login: z.object({
    body: z.object({
      email: z
        .string()
        .email('Invalid email address')
        .toLowerCase()
        .trim(),
      password: z.string().min(1, 'Password is required'),
      rememberMe: z.boolean().optional(),
    }),
  }),

  /**
   * Refresh Token Validation
   */
  refreshToken: z.object({
    body: z.object({
      refreshToken: z.string().min(1, 'Refresh token is required'),
    }),
  }),

  /**
   * Email Verification
   */
  verifyEmail: z.object({
    body: z.object({
      token: z.string().min(1, 'Verification token is required'),
    }),
  }),

  /**
   * Forgot Password
   */
  forgotPassword: z.object({
    body: z.object({
      email: z.string().email('Invalid email address').toLowerCase().trim(),
    }),
  }),

  /**
   * Reset Password
   */
  resetPassword: z.object({
    body: z.object({
      token: z.string().min(1, 'Reset token is required'),
      password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
          'Password must contain at least one uppercase letter, one lowercase letter, and one number'
        ),
      confirmPassword: z.string(),
    }).refine((data) => data.password === data.confirmPassword, {
      message: "Passwords don't match",
      path: ['confirmPassword'],
    }),
  }),

  /**
   * Change Password
   */
  changePassword: z.object({
    body: z.object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
          'Password must contain at least one uppercase letter, one lowercase letter, and one number'
        ),
      confirmPassword: z.string(),
    }).refine((data) => data.newPassword === data.confirmPassword, {
      message: "Passwords don't match",
      path: ['confirmPassword'],
    }),
  }),

  /**
   * Update Profile
   */
  updateProfile: z.object({
    body: z.object({
      name: z.string().min(2).max(100).optional(),
      phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/).optional(),
      avatar: z.string().url().optional(),
      dateOfBirth: z.string().datetime().optional(),
      address: z.object({
        street: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        country: z.string().optional(),
        pincode: z.string().optional(),
      }).optional(),
    }),
  }),
};

module.exports = AuthValidator;
