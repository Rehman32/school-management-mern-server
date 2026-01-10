// ============================================
// SETTINGS CONTROLLER - SINGLE-TENANT EDITION
// ============================================

const School = require("../models/school.model");

// Get School Profile
exports.getProfile = async (req, res) => {
  try {
    // Single-tenant: get the only school record
    const school = await School.findOne();
    if (!school) {
      return res.status(404).json({ success: false, message: "School profile not found" });
    }
    return res.json({ success: true, data: school });
  } catch (err) {
    console.error("getProfile error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Update School Profile
exports.updateProfile = async (req, res) => {
  try {
    const update = req.body;
    // Single-tenant: update the only school record (or create if none exists)
    const school = await School.findOneAndUpdate({}, update, { new: true, upsert: true });
    return res.json({ success: true, data: school, message: "Profile updated successfully" });
  } catch (err) {
    console.error("updateProfile error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};