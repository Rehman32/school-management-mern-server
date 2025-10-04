// /server/middlewares/authorize.js

/**
 * Express middleware factory for permission-based authorization.
 * @param {string|string[]} permissionOrArray - Permission(s) required.
 * @param {Object} [options] - Options object.
 * @param {boolean} [options.requireAll=false] - If true, require all permissions; else, require any.
 */
function authorize(permissionOrArray, options = {}) {
    const requireAll = options.requireAll || false;
    const requiredPermissions = Array.isArray(permissionOrArray)
        ? permissionOrArray
        : [permissionOrArray];

    return (req, res, next) => {
        const user = req.user;

        if (!user) {
            return res.status(403).json({ error: 'User not authenticated.' });
        }

        const { role, permissions = [] } = user;

        // Admins have all permissions
        if (role === 'admin') {
            return next();
        }

        // Wildcard permission
        if (requiredPermissions.includes('*')) {
            return next();
        }

        // User permissions as array
        const userPermissions = Array.isArray(permissions)
            ? permissions
            : typeof permissions === 'string'
                ? [permissions]
                : [];

        // Check permissions
        let hasPermission;
        if (requireAll) {
            hasPermission = requiredPermissions.every(p => userPermissions.includes(p));
        } else {
            hasPermission = requiredPermissions.some(p => userPermissions.includes(p));
        }

        if (!hasPermission) {
            return res.status(403).json({
                error: 'Forbidden: insufficient permissions.',
                required: requiredPermissions,
                userPermissions,
                requireAll,
            });
        }

        next();
    };
}

module.exports = authorize;