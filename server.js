const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');

// Load environment variables FIRST
dotenv.config();

// Import configurations
const Database = require('./config/database');
const SecurityConfig = require('./config/security');

// Import middleware
const ErrorHandler = require('./middlewares/errorHandler.middleware');
const AuditMiddleware = require('./middlewares/audit.middleware');

// Import routes (all your existing routes)
const authRoutes = require('./routes/auth.routes');
const tenantRoutes = require('./routes/tenant.routes');
const dashboardRoutes = require('./routes/admindashboard.routes');
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

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// MIDDLEWARE (CORRECT ORDER IS CRITICAL!)
// ============================================

// 1. CORS (MUST BE FIRST!)
app.use(cors(SecurityConfig.getCorsOptions()));

// 2. Security headers
SecurityConfig.applySecurityMiddleware(app);

// 3. Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4. Cookie parser
app.use(cookieParser());

// 5. Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 6. Request logging (development only)
if (process.env.NODE_ENV === 'development') {
  app.use(AuditMiddleware.logRequest);
}

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'School Management API is running',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    database: Database.getConnectionStatus(),
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/dashboard', dashboardRoutes);
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

// OLD ROUTES (Backward compatibility)
const { protect } = require('./middlewares/auth.middleware');
app.get('/api/me', protect, (req, res) => {
  res.json({ user: req.user, msg: `You are logged in as a ${req.user.role}` });
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 Handler
app.use(ErrorHandler.notFound);

// Global Error Handler
app.use(ErrorHandler.handle);

// ============================================
// DATABASE & SERVER START
// ============================================

const startServer = async () => {
  try {
    // Connect to database
    await Database.connect();

    // Start server
    app.listen(PORT, () => {
      console.log('');
      console.log('🚀 ========================================');
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🚀 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🚀 API Base URL: http://localhost:${PORT}/api`);
      console.log(`🚀 CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
      console.log('🚀 ========================================');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  console.log('⚠️  Shutting down server...');
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  console.log('⚠️  Shutting down server...');
  process.exit(1);
});

// Start the server
startServer();

module.exports = app;
