const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const app = require('../server'); // assumes express app is exported from server.js
const School = require('../models/school.model');
const Student = require('../models/student.model');
const User = require('../models/user.model');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), { useNewUrlParser: true, useUnifiedTopology: true });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Tenant isolation', () => {
  let schoolA, schoolB, tokenA, tokenB, studentA;
  beforeAll(async () => {
    schoolA = await School.create({ name: 'School A' });
    schoolB = await School.create({ name: 'School B' });
    // Create users and get tokens (mock or implement auth as needed)
    const userA = await User.create({ email: 'a@a.com', password: 'pass', schoolId: schoolA._id, role: 'admin' });
    const userB = await User.create({ email: 'b@b.com', password: 'pass', schoolId: schoolB._id, role: 'admin' });
    // You may need to implement a login endpoint or mock JWTs
    tokenA = 'Bearer ' + userA._id; // Replace with real JWT
    tokenB = 'Bearer ' + userB._id;
    studentA = await Student.create({ fullName: 'Student A', email: 'studA@a.com', rollNumber: 1, schoolId: schoolA._id });
  });
  it('should not allow school B to fetch student from school A', async () => {
    const res = await request(app)
      .get(`/api/v1/students/${studentA._id}`)
      .set('Authorization', tokenB);
    expect(res.status).toBe(404);
  });
});
