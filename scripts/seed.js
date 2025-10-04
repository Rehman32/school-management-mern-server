require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const faker = require('faker');
const School = require('../models/school.model');
const Class = require('../models/class.model');
const Teacher = require('../models/teacher.model');
const Student = require('../models/student.model');
const Attendance = require('../models/attendance.model');
const Exam = require('../models/Exam');
const Grade = require('../models/Grade');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  await Promise.all([
    School.deleteMany({}),
    Class.deleteMany({}),
    Teacher.deleteMany({}),
    Student.deleteMany({}),
    Attendance.deleteMany({}),
    Exam.deleteMany({}),
    Grade.deleteMany({}),
  ]);

  const schools = await School.insertMany([
    { name: 'School A', address: faker.address.streetAddress() },
    { name: 'School B', address: faker.address.streetAddress() },
  ]);

  for (const school of schools) {
    // Classes
    const classes = await Class.insertMany([
      { name: 'Class 1', schoolId: school._id },
      { name: 'Class 2', schoolId: school._id },
      { name: 'Class 3', schoolId: school._id },
    ]);
    // Teachers
    const teachers = await Teacher.insertMany(
      Array.from({ length: 5 }).map(() => ({
        fullName: faker.name.findName(),
        email: faker.internet.email(),
        schoolId: school._id,
        qualification: ['B.Ed'],
      }))
    );
    // Students
    const students = await Student.insertMany(
      Array.from({ length: 50 }).map((_, i) => ({
        fullName: faker.name.findName(),
        email: faker.internet.email(),
        rollNumber: i + 1,
        className: classes[i % 3].name,
        schoolId: school._id,
      }))
    );
    // Attendance
    const today = new Date();
    for (const cls of classes) {
      for (let d = 0; d < 5; d++) {
        const date = new Date(today);
        date.setDate(today.getDate() - d);
        await Attendance.insertMany(
          students.filter(s => s.className === cls.name).map(s => ({
            studentId: s._id,
            classId: cls._id,
            date,
            status: Math.random() > 0.1 ? 'present' : 'absent',
            schoolId: school._id,
          }))
        );
      }
    }
    // Exams & Grades
    const exams = await Exam.insertMany([
      { schoolId: school._id, classId: classes[0]._id, title: 'Midterm', date: today, totalMarks: 100, createdBy: teachers[0]._id },
      { schoolId: school._id, classId: classes[1]._id, title: 'Final', date: today, totalMarks: 100, createdBy: teachers[1]._id },
    ]);
    for (const exam of exams) {
      const examStudents = students.filter(s => String(s.className) === String(classes.find(c => c._id.equals(exam.classId)).name));
      await Grade.insertMany(
        examStudents.map(s => ({
          schoolId: school._id,
          examId: exam._id,
          studentId: s._id,
          subjectId: null, // You may want to seed subjects and assign here
          marksObtained: Math.floor(Math.random() * 100),
        }))
      );
    }
  }
  console.log('Seed complete.');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
