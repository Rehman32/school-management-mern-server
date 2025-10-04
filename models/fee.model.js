const mongoose = require("mongoose");

const PaymentRecordSchema = new mongoose.Schema({
  amount: Number,
  date: Date,
  method: String,
  providerReference: String,
}, { _id: false });

const FeeSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, index: true },
  amount: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  status: { type: String, enum: ["pending","paid","partial"], default: "pending" },
  paymentRecords: { type: [PaymentRecordSchema], default: [] },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

module.exports = mongoose.model("Fee", FeeSchema);
