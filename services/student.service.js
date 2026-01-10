//student.service.js - SINGLE-TENANT EDITION
import BaseService from '../services/base.service.js';
import Student from '../models/student.model.js';

class StudentService extends BaseService {
    constructor() {
        super(Student);
    }

    async findByClass(classId, options = {}) {
        return this.model.find({ classId, ...options }).lean();
    }

    async createStudent(data, options = {}) {
        const requiredFields = ['firstName', 'lastName', 'classId'];
        for (const field of requiredFields) {
            if (!data[field]) {
                throw new Error(`${field} is required`);
            }
        }
        return this.create(data, options);
    }
}

export default new StudentService();