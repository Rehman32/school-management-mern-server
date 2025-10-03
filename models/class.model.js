const mongoose = require("mongoose");

const classSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "School",
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  grade: {
    type: String,
    required: true,
  },
  section: {
    type: String,
    trim: true,
  },
   isDeleted: {
    type: Boolean,
    default: false,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const ClassModel = mongoose.model("Class", classSchema);
module.exports = ClassModel;
