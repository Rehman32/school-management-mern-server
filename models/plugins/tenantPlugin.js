/**
 * Mongoose plugin to add tenant (school) support.
 * 
 * Usage:
 *   const tenantPlugin = require('./tenantPlugin');
 *   StudentSchema.plugin(tenantPlugin);
 */

function tenantPlugin(schema) {
    // Query helper: .byTenant(tenantId)
    schema.query.byTenant = function(tenantId) {
        return this.where({ schoolId: tenantId });
    };

    // Static helper: setTenant(doc, tenantId)
    schema.statics.setTenant = function(doc, tenantId) {
        if (!doc.schoolId) {
            doc.schoolId = tenantId;
        }
        return doc;
    };
}

module.exports = tenantPlugin;