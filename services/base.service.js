const mongoose = require("mongoose");

/**
 * BaseService
 * Generic service for Mongoose models with multi-tenant support.
 * All methods accept an options object (e.g., { tenant }) for tenant-aware queries.
 */
class BaseService {
  /**
   * @param {mongoose.Model} Model - The Mongoose model to wrap.
   */
  constructor(Model) {
    if (
      !Model ||
      !(Model.prototype instanceof mongoose.Model || Model.base instanceof mongoose.Mongoose)
    ) {
      throw new Error("A valid Mongoose Model must be provided to BaseService.");
    }
    this.Model = Model;
  }

  /**
   * Create a new document.
   * @param {Object} data - Document data.
   * @param {Object} [opts] - Options (e.g., { tenant, session }).
   * @returns {Promise<Object>} The created document (plain object).
   */
  async create(data, opts = {}) {
    if (!data || typeof data !== "object") {
      throw new Error("Data must be a non-empty object.");
    }
    try {
      if (opts.tenant) data.schoolId = opts.tenant;
      const doc = await this.Model.create([data], opts.session ? { session: opts.session } : {});
      return doc[0].toObject();
    } catch (err) {
      throw new Error(`Create failed: ${err.message}`);
    }
  }

  /**
   * Find documents matching a query.
   * @param {Object} [query] - Mongoose query object.
   * @param {Object} [opts] - Options (e.g., { tenant, projection, sort, limit, skip }).
   * @returns {Promise<Object[]>} Array of plain objects.
   */
  async find(query = {}, opts = {}) {
    if (typeof query !== "object") {
      throw new Error("Query must be an object.");
    }
    try {
      const q = { ...query };
      if (opts.tenant) q.schoolId = opts.tenant;
      let cursor = this.Model.find(q);

      if (opts.projection) cursor = cursor.select(opts.projection);
      if (opts.sort) cursor = cursor.sort(opts.sort);
      if (opts.limit) cursor = cursor.limit(opts.limit);
      if (opts.skip) cursor = cursor.skip(opts.skip);

      return await cursor.lean().exec();
    } catch (err) {
      throw new Error(`Find failed: ${err.message}`);
    }
  }

  /**
   * Find a single document matching a query.
   * @param {Object} [query] - Mongoose query object.
   * @param {Object} [opts] - Options (e.g., { tenant, projection }).
   * @returns {Promise<Object|null>} The found document or null.
   */
  async findOne(query = {}, opts = {}) {
    if (typeof query !== "object") {
      throw new Error("Query must be an object.");
    }
    try {
      const q = { ...query };
      if (opts.tenant) q.schoolId = opts.tenant;
      let cursor = this.Model.findOne(q);
      if (opts.projection) cursor = cursor.select(opts.projection);
      return await cursor.lean().exec();
    } catch (err) {
      throw new Error(`FindOne failed: ${err.message}`);
    }
  }

  /**
   * Find a document by its ID.
   * @param {string|mongoose.Types.ObjectId} id - Document ID.
   * @param {Object} [opts] - Options (e.g., { tenant, projection }).
   * @returns {Promise<Object|null>} The found document or null.
   */
  async findById(id, opts = {}) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("A valid id must be provided.");
    }
    try {
      const q = { _id: id };
      if (opts.tenant) q.schoolId = opts.tenant;
      let cursor = this.Model.findOne(q);
      if (opts.projection) cursor = cursor.select(opts.projection);
      return await cursor.lean().exec();
    } catch (err) {
      throw new Error(`FindById failed: ${err.message}`);
    }
  }

  /**
   * Update a document by its ID.
   * @param {string|mongoose.Types.ObjectId} id - Document ID.
   * @param {Object} data - Update data.
   * @param {Object} [opts] - Options (e.g., { tenant, session }).
   * @returns {Promise<Object>} The updated document (plain object).
   */
  async updateById(id, data, opts = {}) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("A valid id must be provided.");
    }
    if (!data || typeof data !== "object") {
      throw new Error("Data must be a non-empty object.");
    }
    try {
      const q = { _id: id };
      if (opts.tenant) q.schoolId = opts.tenant;
      const doc = await this.Model.findOneAndUpdate(q, data, {
        new: true,
        ...(opts.session && { session: opts.session }),
      }).lean();
      if (!doc) throw new Error("Document not found for update.");
      return doc;
    } catch (err) {
      throw new Error(`UpdateById failed: ${err.message}`);
    }
  }

  /**
   * Delete a document by its ID.
   * @param {string|mongoose.Types.ObjectId} id - Document ID.
   * @param {Object} [opts] - Options (e.g., { tenant, session }).
   * @returns {Promise<Object>} The deleted document (plain object).
   */
  async deleteById(id, opts = {}) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("A valid id must be provided.");
    }
    try {
      const q = { _id: id };
      if (opts.tenant) q.schoolId = opts.tenant;
      const doc = await this.Model.findOneAndDelete(q, opts.session ? { session: opts.session } : {}).lean();
      if (!doc) throw new Error("Document not found for deletion.");
      return doc;
    } catch (err) {
      throw new Error(`DeleteById failed: ${err.message}`);
    }
  }
}

module.exports = BaseService;