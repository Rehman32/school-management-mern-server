 //server/routes/school.routes.js

 const express = require("express");
 const {registerSchool} = require('../controllers/school.controller');
// const Course = require("../models/course.model");
// const ClassModel = require("../models/class.model");
// const { protect, authorize } = require("../middlewares/auth.middleware");

const router = express.Router();

router.post('/register',registerSchool);
// router.post("/courses", protect, authorize("admin"), async (req, res) => {
//   try {
//     const newCourse = new Course(req.body);
//     const course = await newCourse.save();
//     res.status(201).json(course);
//   } catch (err) {
//     console.error(err.message);
//     res.status(500).send("Server Error");
//   }
// });

// router.get("/getCourses", protect, async (req, res) => {
//   try {
//     const courses = await Course.find();
//     res.json(courses);
//   } catch (err) {
//     console.error(err.message);
//     res.status(500).send("Server Error");
//   }
// });

// router.post("/classes", protect, authorize("admin"), async (req, res) => {
//   try {
//     const newClass = new ClassModel(req.body);
//     const createdClass = await newClass.save();
//     res.status(201).json(createdClass);
//   } catch (err) {
//     console.error(err.message);
//     res.status(500).send("Server Error");
//   }
// });

// router.get('/getClasses',protect,async (req,res) => {
//     try {
//         const classes = await ClassModel.find().populate('course','title courseCode').populate('teacher','name email');
//         res.json(classes);
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Server Error');
//     }
// });

module.exports=router;