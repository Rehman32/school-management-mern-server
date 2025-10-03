const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/teacher.controller');
const { validate } = require('../middlewares/validate.middleware');
const { createTeacherSchema, updateTeacherSchema } = require('../validators/teacher.validator');
const { protect, authorize } = require('../middlewares/auth.middleware');
const TeacherAssignment = require("../models/teacherAssignment.model");

// All routes require admin role
router.use(protect, authorize('admin'));

// CRUD
router.get('/', ctrl.getAllTeachers);
router.post('/', validate(createTeacherSchema), ctrl.createTeacher);
// add import ctrl earlier
router.get("/minimal", protect, authorize("admin"), ctrl.getTeachersMinimal);
router.get('/:id', ctrl.getTeacherById);
router.put('/:id', validate(updateTeacherSchema), ctrl.updateTeacher);
router.delete('/:id', ctrl.deleteTeacher);

// assignment endpoints
router.post('/:teacherId/assign', ctrl.createAssignment);
router.get('/:teacherId/assignments', ctrl.getAssignments);
router.put('/:teacherId/assign/:assignmentId', ctrl.updateAssignment);
router.delete('/:teacherId/assign/:assignmentId', ctrl.deleteAssignment);



module.exports = router;
