// ============================================
// VALIDATION MIDDLEWARE
// Enhanced with better error formatting
// ============================================

const { ValidationError } = require('../utils/errors');
const ApiResponse = require('../utils/response');

function validate(schema) {
  return (req, res, next) => {
    try {
      // Validate against schema
      const validated = schema.parse({
        body: req.body,
        params: req.params,
        query: req.query,
      });

      // Replace request data with validated data
      req.body = validated.body || req.body;
      req.params = validated.params || req.params;
      req.query = validated.query || req.query;

      next();
    } catch (error) {
      if (error.name === 'ZodError') {
        // Format Zod errors
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        return ApiResponse.validationError(res, errors);
      }

      next(error);
    }
  };
}

module.exports = { validate };
