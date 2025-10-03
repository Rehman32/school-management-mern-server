const mongoose = require('mongoose');
const { lowercase } = require('zod');

const SchoolSchema = new mongoose.Schema({
    name:{
        type:String,
        required:[true,'School Name is Required'],
        unique:true,
        trim:true 
    },
    email:{
        type:String,
        required:[true,'School Email is Required'],
        unique:true,
        lowercase:true,
        trim:true
    },
    phone:{
        type:String,
        trim:true
    },
    address:{
        type:String,
        trim:true
    },
    logo:{
        type:String //for URL storing
    },
    subscriptionPlan: {
    type: String,
    enum: ["free", "basic", "premium"],
    default: "free"
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

SchoolSchema.index({name:1,email:1});

const School = mongoose.model("School",SchoolSchema);
module.exports = School;