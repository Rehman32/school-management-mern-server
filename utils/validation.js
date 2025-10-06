// ============================================
// VALIDATION UTILITY
// server/utils/validation.js
// ============================================

const validator = require('validator');

// Sanitize string inputs
const sanitizeString = (str) => {
  if (!str) return str;
  return validator.escape(validator.trim(str));
};

// Validate email
const isValidEmail = (email) => {
  return validator.isEmail(email);
};

// Validate phone (flexible format)
const isValidPhone = (phone) => {
  if (!phone) return true; // Optional field
  // Allow various phone formats
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
};

// Validate URL
const isValidURL = (url) => {
  if (!url) return true; // Optional field
  return validator.isURL(url, {
    require_protocol: true,
    protocols: ['http', 'https']
  });
};

// Validate school profile update data
const validateSchoolProfile = (data) => {
  const errors = [];

  // Name validation
  if (data.name !== undefined) {
    if (!data.name || data.name.trim().length === 0) {
      errors.push('School name is required');
    } else if (data.name.length < 3) {
      errors.push('School name must be at least 3 characters');
    } else if (data.name.length > 200) {
      errors.push('School name must not exceed 200 characters');
    }
  }

  // Email validation
  if (data.email !== undefined) {
    if (!data.email || data.email.trim().length === 0) {
      errors.push('School email is required');
    } else if (!isValidEmail(data.email)) {
      errors.push('Please provide a valid email address');
    }
  }

  // Phone validation
  if (data.phone && !isValidPhone(data.phone)) {
    errors.push('Please provide a valid phone number');
  }

  if (data.alternatePhone && !isValidPhone(data.alternatePhone)) {
    errors.push('Please provide a valid alternate phone number');
  }

  // Website validation
  if (data.website && !isValidURL(data.website)) {
    errors.push('Please provide a valid website URL (must start with http:// or https://)');
  }

  // Logo URL validation
  if (data.logo && !isValidURL(data.logo)) {
    errors.push('Please provide a valid logo URL');
  }

  // Pincode validation
  if (data.pincode && !/^\d{4,10}$/.test(data.pincode)) {
    errors.push('Please provide a valid pincode (4-10 digits)');
  }

  // Established year validation
  if (data.establishedYear) {
    const year = parseInt(data.establishedYear);
    const currentYear = new Date().getFullYear();
    if (isNaN(year) || year < 1800 || year > currentYear) {
      errors.push(`Established year must be between 1800 and ${currentYear}`);
    }
  }

  // Settings validation
  if (data.settings) {
    if (data.settings.sessionTimeout) {
      const timeout = parseInt(data.settings.sessionTimeout);
      if (isNaN(timeout) || timeout < 5 || timeout > 480) {
        errors.push('Session timeout must be between 5 and 480 minutes');
      }
    }

    if (data.settings.passwordMinLength) {
      const minLen = parseInt(data.settings.passwordMinLength);
      if (isNaN(minLen) || minLen < 6 || minLen > 32) {
        errors.push('Password minimum length must be between 6 and 32');
      }
    }

    if (data.settings.maxLoginAttempts) {
      const maxAttempts = parseInt(data.settings.maxLoginAttempts);
      if (isNaN(maxAttempts) || maxAttempts < 3 || maxAttempts > 10) {
        errors.push('Max login attempts must be between 3 and 10');
      }
    }
  }

  // Passing percentage validation
  if (data.passingPercentage !== undefined) {
    const percentage = parseFloat(data.passingPercentage);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      errors.push('Passing percentage must be between 0 and 100');
    }
  }

  // Attendance percentage validation
  if (data.attendancePercentageRequired !== undefined) {
    const percentage = parseFloat(data.attendancePercentageRequired);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      errors.push('Attendance percentage must be between 0 and 100');
    }
  }

  // Principal email validation
  if (data.principal?.email && !isValidEmail(data.principal.email)) {
    errors.push('Please provide a valid principal email address');
  }

  // Vice-principal email validation
  if (data.vicePrincipal?.email && !isValidEmail(data.vicePrincipal.email)) {
    errors.push('Please provide a valid vice-principal email address');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Sanitize school profile data
const sanitizeSchoolProfile = (data) => {
  const sanitized = { ...data };

  // Sanitize string fields
  const stringFields = ['name', 'address', 'city', 'state', 'country', 'description', 
                        'registrationNumber', 'affiliationNumber', 'affiliatedTo'];
  
  stringFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = sanitizeString(sanitized[field]);
    }
  });

  // Sanitize nested objects
  if (sanitized.principal) {
    if (sanitized.principal.name) sanitized.principal.name = sanitizeString(sanitized.principal.name);
  }

  if (sanitized.vicePrincipal) {
    if (sanitized.vicePrincipal.name) sanitized.vicePrincipal.name = sanitizeString(sanitized.vicePrincipal.name);
  }

  if (sanitized.contactPersons && Array.isArray(sanitized.contactPersons)) {
    sanitized.contactPersons = sanitized.contactPersons.map(contact => ({
      ...contact,
      name: contact.name ? sanitizeString(contact.name) : contact.name,
      designation: contact.designation ? sanitizeString(contact.designation) : contact.designation
    }));
  }

  return sanitized;
};

module.exports = {
  validateSchoolProfile,
  sanitizeSchoolProfile,
  isValidEmail,
  isValidPhone,
  isValidURL
};
