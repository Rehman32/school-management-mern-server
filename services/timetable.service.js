const BaseService = require('./base.service');
const Timetable = require('../models/Timetable');
class TimetableService extends BaseService { constructor() { super(Timetable); } }
module.exports = new TimetableService();
