// ============================================
// SYSTEM CONSTANTS
// ============================================

module.exports = {
  // ===== ROLES =====
  ROLES: {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',
    TEACHER: 'teacher',
    STUDENT: 'student',
    PARENT: 'parent',
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

  // ===== SUBSCRIPTION PLANS =====
  SUBSCRIPTION_PLANS: {
    TRIAL: {
      name: 'trial',
      maxStudents: 50,
      maxTeachers: 10,
      maxClasses: 10,
      maxStorage: 1024, // 1GB
      features: ['basic_features'],
    },
    BASIC: {
      name: 'basic',
      maxStudents: 200,
      maxTeachers: 30,
      maxClasses: 25,
      maxStorage: 5120, // 5GB
      features: ['basic_features', 'attendance', 'grades'],
    },
    PREMIUM: {
      name: 'premium',
      maxStudents: 1000,
      maxTeachers: 100,
      maxClasses: 100,
      maxStorage: 20480, // 20GB
      features: ['basic_features', 'attendance', 'grades', 'fees', 'reports'],
    },
    ENTERPRISE: {
      name: 'enterprise',
      maxStudents: -1, // Unlimited
      maxTeachers: -1,
      maxClasses: -1,
      maxStorage: -1,
      features: ['all_features'],
    },
  },

  // ===== TOKEN EXPIRY =====
  TOKEN_EXPIRY: {
    ACCESS_TOKEN: '15m', // 15 minutes
    REFRESH_TOKEN: '7d', // 7 days
    EMAIL_VERIFICATION: '24h', // 24 hours
    PASSWORD_RESET: '1h', // 1 hour
    INVITATION: '7d', // 7 days
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
    
    // Tenant errors
    TENANT_NOT_FOUND: 'TENANT_NOT_FOUND',
    TENANT_INACTIVE: 'TENANT_INACTIVE',
    SUBSCRIPTION_EXPIRED: 'SUBSCRIPTION_EXPIRED',
    LIMIT_REACHED: 'LIMIT_REACHED',
    
    // Validation errors
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
    
    // Permission errors
    INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  },
};
