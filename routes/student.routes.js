// routes/student.routes.js

const express = require('express');
const router = express.Router();
const studentController = require('../controllers/student.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

router.use(protect);
router.use(authorize('admin'));

router.route('/getAllStudents')
.get(studentController.getAllStudents);
router.route('/createStudent')
.post(studentController.createStudent);

router.route('/getStudentById/:id')
.get(studentController.getStudentById);
router.route('/updateStudent/:id')
.put(studentController.updateStudent);
router.route('/deleteStudent/:id')
.delete(studentController.deleteStudent);

module.exports = router ;

