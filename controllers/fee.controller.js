const Fee = require("../models/fee.model");

exports.createFee = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const payload = { ...req.body, schoolId, createdBy: req.user._id, updatedBy: req.user._id };
    const fee = await Fee.create(payload);
    return res.status(201).json({ success: true, data: fee });
  } catch (err) {
    console.error("createFee error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.listFees = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const fees = await Fee.find({ schoolId }).populate("student", "fullName rollNumber").sort({ createdAt: -1 });
    return res.json({ success: true, data: fees });
  } catch (err) {
    console.error("listFees error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateFee = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const update = { ...req.body, updatedBy: req.user._id };
    if (update.status === "paid" && !update.paidAt) update.paidAt = new Date();
    const fee = await Fee.findOneAndUpdate({ _id: req.params.id, schoolId }, update, { new: true });
    if (!fee) return res.status(404).json({ success: false, message: "Fee not found" });
    return res.json({ success: true, data: fee });
  } catch (err) {
    console.error("updateFee error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteFee = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const fee = await Fee.findOneAndDelete({ _id: req.params.id, schoolId });
    if (!fee) return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, message: "Deleted", data: { _id: fee._id } });
  } catch (err) {
    console.error("deleteFee error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};