//server/server.js
const express=require('express');
const mongoose=require('mongoose');
const dotenv=require('dotenv');
const authRoutes = require('./routes/auth.routes');
const { protect,authorize} = require('./middlewares/auth.middleware');
const schoolRoutes=require('./routes/school.routes');
const teacherRoutes = require('./routes/teacher.routes');
const subjectRoutes = require("./routes/subject.routes");
const path = require('path');
const classRoutes = require("./routes/class.routes");
const cors=require('cors');

dotenv.config();

const app=express();
const PORT=5000;

app.use(express.json());
app.use(cors({
  origin: 'http://localhost:5173', // allow requests from this origin
}));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use('/api/auth',authRoutes);
app.use('/api/school',schoolRoutes);
app.use('/api/students', require('./routes/student.routes'));
app.use('/api/teachers',teacherRoutes);
app.use("/api/schools", schoolRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/assignments", require("./routes/assignment.routes"));


mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("Mongo DB connected Successfully"))
.catch(err => console.log("Mongo DB connection error",err));

app.get('/',(req,res) =>{
    res.send('School Management Backend is running...');
});
app.get('/api/me', protect , (req,res) => {
    res.json({user:req.user ,msg :`You are logged in as a ${req.user.role}` });
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
app.listen(PORT,()=>{
    console.log(`Server running on port ${PORT}`);
});