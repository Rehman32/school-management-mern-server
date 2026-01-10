// ============================================
// SYSTEM CONSTANTS (Single-Tenant Edition)
// ============================================

module.exports = {
  // ===== ROLES =====
  // Simplified for single-tenant: admin runs everything, teacher for future use
  ROLES: {
    ADMIN: 'admin',
    TEACHER: 'teacher',
  },

  // ===== PERMISSIONS =====
  PERMISSIONS: {
    // User management
    USER_CREATE: 'user.create',
    USER_READ: 'user.read',
    USER_UPDATE: 'user.update',
    USER_DELETE: 'user.delete',

    // Student management
    STUDENT_CREATE: 'student.create',
    STUDENT_READ: 'student.read',
    STUDENT_UPDATE: 'student.update',
    STUDENT_DELETE: 'student.delete',

    // Teacher management
    TEACHER_CREATE: 'teacher.create',
    TEACHER_READ: 'teacher.read',
    TEACHER_UPDATE: 'teacher.update',
    TEACHER_DELETE: 'teacher.delete',

    // Class management
    CLASS_CREATE: 'class.create',
    CLASS_READ: 'class.read',
    CLASS_UPDATE: 'class.update',
    CLASS_DELETE: 'class.delete',

    // Attendance
    ATTENDANCE_TAKE: 'attendance.take',
    ATTENDANCE_VIEW: 'attendance.view',

    // Exams
    EXAM_CREATE: 'exam.create',
    EXAM_VIEW: 'exam.view',

    // Fees
    FEE_CREATE: 'fee.create',
    FEE_VIEW: 'fee.view',
    FEE_COLLECT: 'fee.collect',

    // Reports
    REPORT_VIEW: 'report.view',
    REPORT_GENERATE: 'report.generate',
  },

  // ===== TOKEN EXPIRY =====
  TOKEN_EXPIRY: {
    ACCESS_TOKEN: '15m', // 15 minutes
    REFRESH_TOKEN: '7d', // 7 days
    EMAIL_VERIFICATION: '24h', // 24 hours
    PASSWORD_RESET: '1h', // 1 hour
  },

  // ===== SECURITY =====
  SECURITY: {
    MAX_LOGIN_ATTEMPTS: 5,
    ACCOUNT_LOCK_DURATION: 30 * 60 * 1000, // 30 minutes in ms
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
    // At least 1 uppercase, 1 lowercase, 1 number, min 8 chars
  },

  // ===== RATE LIMITING =====
  RATE_LIMIT: {
    LOGIN: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 attempts per window
    },
    REGISTER: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3, // 3 registrations per IP per hour
    },
    API: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // 100 requests per 15 minutes
    },
  },

  // ===== HTTP STATUS CODES =====
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
  },

  // ===== ERROR CODES =====
  ERROR_CODES: {
    // Auth errors
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
    EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    TOKEN_INVALID: 'TOKEN_INVALID',
    
    // Validation errors
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
    
    // Permission errors
    INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

    // Resource errors
    RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
    RESOURCE_IN_USE: 'RESOURCE_IN_USE',
  },
};
