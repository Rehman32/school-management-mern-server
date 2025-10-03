
//server/user.model.js
const mongoose=require('mongoose');
const bcrypt=require('bcryptjs');

const userSchema= new mongoose.Schema({
    schoolId: {
        type: mongoose.Schema.Types.ObjectId, // Use ObjectId to reference a School document
        ref: 'School', // Assuming you have a School model
        required: [true, "Please provide the school ID"],
        index:true
    },
    name:{
        type:String,
        required:[true,"Please Provide name"],
        trim: true
    },
    email:{
        type:String,
        unique:true,
        required:[true,"Please provide an email"],
        trim:true,
        lowercase:true,
        match:[
             /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 
                'Please provide a valid email address.'
        ],

    },
    password:{
        type:String,
        required:[true,"Please provide a password"],
        minlength:[6,"Passowrd must be atleat 6 characters long"],
        select:false,
    },
    role:{
        type:String,
        enum:['admin','teacher','student'],
        default:'student'
    },
    createdAt:{
        type:Date,
        default:Date.now
    },
});

//hash passowrd
userSchema.pre('save',async function (next) {
    if(!this.isModified('password')) return next();

    //hash password
    const salt=await bcrypt.genSalt(12);
    this.password= await bcrypt.hash(this.password,salt);
    next();
});

const User = mongoose.model('User',userSchema);

module.exports = User;