const BaseService = require('./base.service');
const Attendance = require('../models/attendance.model');
class AttendanceService extends BaseService {
  constructor() { super(Attendance); }
  // Add custom methods if needed
}
module.exports = new AttendanceService();