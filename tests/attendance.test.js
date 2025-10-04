const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const app = require('../server');
const School = require('../models/school.model');
const Class = require('../models/class.model');
const Student = require('../models/student.model');
const Attendance = require('../models/attendance.model');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), { useNewUrlParser: true, useUnifiedTopology: true });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Attendance endpoints', () => {
  let school, cls, students;
  beforeAll(async () => {
    school = await School.create({ name: 'Test School' });
    cls = await Class.create({ name: 'Class 1', schoolId: school._id });
    students = await Student.insertMany([
      { fullName: 'S1', email: 's1@test.com', rollNumber: 1, className: 'Class 1', schoolId: school._id },
      { fullName: 'S2', email: 's2@test.com', rollNumber: 2, className: 'Class 1', schoolId: school._id },
    ]);
    await Attendance.insertMany([
      { studentId: students[0]._id, classId: cls._id, date: new Date(), status: 'present', schoolId: school._id },
      { studentId: students[1]._id, classId: cls._id, date: new Date(), status: 'absent', schoolId: school._id },
    ]);
  });
  it('should aggregate attendance counts for class', async () => {
    // Replace with your real endpoint
    const res = await request(app)
      .get(`/api/v1/attendance/class/${cls._id}/report`)
      .set('Authorization', 'Bearer testtoken');
    expect(res.status).toBe(200);
    expect(res.body.data.present + res.body.data.absent).toBe(2);
  });
});
