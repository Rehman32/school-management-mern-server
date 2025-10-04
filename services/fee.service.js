const BaseService = require('./base.service');
const Fee = require('../models/fee.model');
class FeeService extends BaseService {
  constructor() { super(Fee); }
  // Add custom methods if needed
}
module.exports = new FeeService();
