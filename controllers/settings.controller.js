const School = require("../models/school.model");

exports.getProfile = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const school = await School.findById(schoolId);
    if (!school) return res.status(404).json({ success:false, message:"School not found" });
    return res.json({ success:true, data: school });
  } catch (err) {
    console.error("getProfile error:", err);
    return res.status(500).json({ success:false, message: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const update = req.body;
    const school = await School.findByIdAndUpdate(schoolId, update, { new: true });
    return res.json({ success: true, data: school });
  } catch (err) {
    console.error("updateProfile error:", err);
    return res.status(500).json({ success:false, message: err.message });
  }
};