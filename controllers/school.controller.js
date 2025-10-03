const School = require('../models/school.model');
const User = require('../models/user.model');
const jwt = require('jsonwebtoken');

exports.registerSchool =  async (req,res) => {
    try {
        const {schoolName,schoolEmail,phone,address,adminName,adminEmail,adminPassword} = req.body;

        const school = await School.create({
            name: schoolName,
            email: schoolEmail,
            phone ,address
        });

        const adminUser = await User.create({
            schoolId: school._id,
            name : adminName,
            email : adminEmail,
            password: adminPassword,
            role: "admin"

        });

        const payload = {
            user :{
                id:adminUser._id,
                role : adminUser.role,
                schoolId : adminUser.schoolId
            }
        };

        const token = jwt.sign(payload,process.env.JWT_SECRET,{expiresIn: '1d'});

        res.status(201).json({
            message : "School Registed Successfully and admin created ",
            school,
            admin : {
                id : adminUser._id,
                name : adminUser.name,
                email : adminUser.email,
                role : adminUser.role
            },
            token
        });


    } catch (error) {
        console.error("School Registration failed : ",error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};