const { ZodError } = require('zod');

function validate(schema, options = {}) {
    // schema can be a Zod schema or an object { body, params, query }
    return (req, res, next) => {
        let schemas = {};
        if (typeof schema.safeParse === 'function') {
            // Single schema for all
            schemas = { body: schema };
        } else {
            schemas = schema;
        }

        const validated = {};
        const errors = {};

        for (const key of ['body', 'params', 'query']) {
            if (schemas[key]) {
                const result = schemas[key].safeParse(req[key]);
                if (!result.success) {
                    errors[key] = result.error.format();
                } else {
                    validated[key] = result.data;
                }
            } else {
                validated[key] = req[key];
            }
        }

        if (Object.keys(errors).length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors,
            });
        }

        req.validated = validated;
        next();
    };
}

module.exports = { validate };