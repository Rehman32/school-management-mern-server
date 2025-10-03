//server/auth.routes.js
const express= require('express');
const router = express.Router();
const bcrypt= require('bcryptjs');
const User = require('../models/user.model');
const jwt = require('jsonwebtoken');

router.post('/register',async (req , res)=>{
    try{
        const {name,email,password,role}=req.body;

        //check that user already exists or not
        let user = await User.findOne({email});
        if(user){
            return res.status(400).json({msg :'User with that email alreay exists.'});
        }
        //create new user 
         user = new User(
            {
                name,
                email,
                password,
                role,
            }
        );

        await user.save();
        res.status(200).json({msg: " User Registered successfully."});

    }catch (err){
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

router.post('/login',async (req, res) => {
    try {
            const {email,password}=req.body;

    //check if the user exists or not
    const user = await User.findOne({email}).select('+password');
    if(!user){
        return res.status(400).json({msg:'Invalid Credentials.'})
    }

    const isMatch= await bcrypt.compare(password,user.password);
    if(!isMatch){
        res.status(400).json({msg : 'Invalid Credentials.'})
    }

    const payload={
        user:{
            id : user.id,
            role:user.role,
            schoolId:user.schoolId
        },
    };

    jwt.sign(
        payload,
        process.env.JWT_SECRET,
        {expiresIn: '1h'},
        (err,token) => {
            if (err) throw err;
            res.json({token , role: user.role});
        }
    );
    } catch (error) {
        console.log(error.message);
        res.status(500).send("Server Error");
    }

});

module.exports = router;