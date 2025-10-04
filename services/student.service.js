import BaseService from '../services/base.service.js';
import Student from '../models/student.model.js';

class StudentService extends BaseService {
    constructor() {
        super(Student);
    }

    async findByClass(classId, options = {}) {
        const { tenant, ...restOptions } = options;
        if (!tenant) {
            throw new Error('Tenant is required');
        }
        return this.model.find({ classId, ...restOptions })
            .byTenant(tenant)
            .lean();
    }

    async createStudent(data, options = {}) {
        const requiredFields = ['firstName', 'lastName', 'classId', 'schoolId'];
        for (const field of requiredFields) {
            if (!data[field]) {
                throw new Error(`${field} is required`);
            }
        }
        return this.create(data, options);
    }
}

export default new StudentService();