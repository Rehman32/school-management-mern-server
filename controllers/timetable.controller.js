const Timetable = require("../models/timetable.model");

exports.createEntry = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const payload = { ...req.body, schoolId, createdBy: req.user._id };
    const entry = await Timetable.create(payload);
    return res.status(201).json({ success: true, data: entry });
  } catch (err) {
    console.error("createEntry error:", err);
    return res.status(500).json({ success:false, message: err.message });
  }
};

exports.listByClass = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { classId } = req.params;
    const entries = await Timetable.find({ schoolId, classId }).populate("subjectId", "name").populate("teacherId", "fullName").sort({ day: 1, period: 1 });
    return res.json({ success: true, data: entries });
  } catch (err) {
    console.error("listByClass error:", err);
    return res.status(500).json({ success:false, message: err.message });
  }
};

exports.updateEntry = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const entry = await Timetable.findOneAndUpdate({ _id: req.params.id, schoolId }, req.body, { new: true });
    if (!entry) return res.status(404).json({ success:false, message:"Not found" });
    return res.json({ success:true, data: entry });
  } catch (err) {
    console.error("updateEntry error:", err);
    return res.status(500).json({ success:false, message: err.message });
  }
};

exports.deleteEntry = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const entry = await Timetable.findOneAndDelete({ _id: req.params.id, schoolId });
    if (!entry) return res.status(404).json({ success:false, message:"Not found" });
    return res.json({ success:true, message:"Deleted" });
  } catch (err) {
    console.error("deleteEntry error:", err);
    return res.status(500).json({ success:false, message: err.message });
  }
};
