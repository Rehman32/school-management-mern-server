const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  rollNumber : {type:Number,required : true, unique: true},
  className : {type: String},
  phone: String,
  gender : String,
  dob: Date,
  address : String,
  guardianName : String,
  guardianPhoneNumber : String,
  enrolledDate : {type:Date , default: Date.now},
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "School",
    required: true,
    index: true,
  },
});

module.exports = mongoose.model('Student',studentSchema);