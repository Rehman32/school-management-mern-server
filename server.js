const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const schoolRoutes = require('./routes/school.routes');
const classRoutes = require('./routes/class.routes');
const assignmentRoutes = require('./routes/assignment.routes');
const studentRoutes = require('./routes/student.routes');
const teacherRoutes = require('./routes/teacher.routes');
const subjectRoutes = require('./routes/subject.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const feeRoutes = require('./routes/fee.routes');
const examRoutes = require('./routes/exam.routes');
const timetableRoutes = require('./routes/timetable.routes');

const { protect, authorize } = require('./middlewares/auth.middleware');

dotenv.config();
const app = express();
const PORT = 5000;

// Middleware
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:5173',
}));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Register all your routes properly
app.use('/api/auth', authRoutes);
app.use('/api/school', schoolRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/timetable', timetableRoutes);

// (optional) Remove this — it's redundant unless ./routes/index.js combines all routes
// app.use('/api/v1', require('./routes'));

// Default routes
app.get('/', (req, res) => {
  res.send('School Management Backend is running...');
});

app.get('/api/me', protect, (req, res) => {
  res.json({ user: req.user, msg: `You are logged in as a ${req.user.role}` });
});

app.get('/api/admin', protect, authorize('admin'), (req, res) => {
  res.json({ msg: 'Welcome, Admin! This is a protected resource.' });
});

app.get('/api/student', protect, authorize('student'), (req, res) => {
  res.json({ msg: 'Welcome, Student! This is a protected resource.' });
});

app.get('/api/teacher', protect, authorize('teacher'), (req, res) => {
  res.json({ msg: 'Welcome, Teacher! This is a protected resource.' });
});

// Mongo connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Mongo DB connected Successfully"))
  .catch(err => console.log("Mongo DB connection error", err));

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
