const express = require('express');
const router = express.Router();

const studentsRouter = require('./student.routes');
const teachersRouter = require('./teacher.routes');
const attendanceRouter = require('./attendance.routes');
const examsRouter = require('./exam.routes');
const feesRouter = require('./fee.routes');
const timetableRouter = require('./timetable.routes');
const reportsRouter = require('./reports.routes');


const webhookController = require('../controllers/webhook.controller');
// Mount each module under its subpath
router.use('/students', studentsRouter);
router.use('/teachers', teachersRouter);
router.use('/attendance', attendanceRouter);
router.use('/exams', examsRouter);
router.use('/fees', feesRouter);
router.use('/timetable', timetableRouter);
router.use('/reports', reportsRouter);

// Stripe webhook endpoint (raw body required in app.js)
router.post('/webhooks/stripe', webhookController.stripeWebhook);

module.exports = router;