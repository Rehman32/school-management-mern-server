// ============================================
// DASHBOARD CONTROLLER
// server/controllers/dashboard.controller.js
// ============================================

const Student = require('../models/student.model');
const Teacher = require('../models/teacher.model');
const Class = require('../models/class.model');
const Subject = require('../models/subject.model');
const School = require('../models/school.model');
const User = require('../models/user.model');

// ============================================
// GET DASHBOARD STATISTICS
// ============================================
exports.getStatistics = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const currentDate = new Date();
    const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);

    // Get current counts
    const [
      totalStudents,
      totalTeachers,
      totalClasses,
      totalSubjects,
      activeStudents,
      activeTeachers,
      lastMonthStudents,
      lastMonthTeachers,
    ] = await Promise.all([
      Student.countDocuments({ schoolId, isDeleted: false }),
      Teacher.countDocuments({ schoolId, isDeleted: false }),
      Class.countDocuments({ schoolId, isDeleted: false, status: 'active' }),
      Subject.countDocuments({ schoolId, isDeleted: false, status: 'active' }),
      Student.countDocuments({ schoolId, isDeleted: false, status: 'active' }),
      Teacher.countDocuments({ schoolId, isDeleted: false, status: 'Active' }),
      Student.countDocuments({ schoolId, createdAt: { $lt: lastMonth } }),
      Teacher.countDocuments({ schoolId, createdAt: { $lt: lastMonth } }),
    ]);

    // Calculate growth percentages
    const studentGrowth = lastMonthStudents > 0 
      ? (((totalStudents - lastMonthStudents) / lastMonthStudents) * 100).toFixed(1)
      : 0;

    const teacherGrowth = lastMonthTeachers > 0
      ? (((totalTeachers - lastMonthTeachers) / lastMonthTeachers) * 100).toFixed(1)
      : 0;

    // Get gender distribution
    const [maleStudents, femaleStudents] = await Promise.all([
      Student.countDocuments({ schoolId, gender: 'male', isDeleted: false }),
      Student.countDocuments({ schoolId, gender: 'female', isDeleted: false }),
    ]);

    // Get class capacity info
    const classCapacity = await Class.aggregate([
      { $match: { schoolId, isDeleted: false, status: 'active' } },
      {
        $group: {
          _id: null,
          totalCapacity: { $sum: '$maxCapacity' },
          totalEnrolled: { $sum: '$currentEnrollment' },
        },
      },
    ]);

    const capacity = classCapacity[0] || { totalCapacity: 0, totalEnrolled: 0 };

    res.json({
      success: true,
      data: {
        students: {
          total: totalStudents,
          active: activeStudents,
          growth: parseFloat(studentGrowth),
          male: maleStudents,
          female: femaleStudents,
        },
        teachers: {
          total: totalTeachers,
          active: activeTeachers,
          growth: parseFloat(teacherGrowth),
        },
        classes: {
          total: totalClasses,
          capacity: capacity.totalCapacity,
          enrolled: capacity.totalEnrolled,
          available: capacity.totalCapacity - capacity.totalEnrolled,
        },
        subjects: {
          total: totalSubjects,
        },
      },
    });
  } catch (err) {
    console.error('getStatistics error:', err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ============================================
// GET RECENT ACTIVITIES
// ============================================
exports.getRecentActivities = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const limit = parseInt(req.query.limit) || 10;

    // Get recent students (last 7 days)
    const recentStudents = await Student.find({
      schoolId,
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    })
      .sort({ createdAt: -1 })
      .limit(3)
      .select('fullName createdAt')
      .lean();

    // Get recent teachers (last 7 days)
    const recentTeachers = await Teacher.find({
      schoolId,
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    })
      .sort({ createdAt: -1 })
      .limit(3)
      .select('fullName createdAt')
      .lean();

    // Get recent classes (last 7 days)
    const recentClasses = await Class.find({
      schoolId,
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    })
      .sort({ createdAt: -1 })
      .limit(2)
      .select('grade section name createdAt')
      .lean();

    // Format activities
    const activities = [];

    recentStudents.forEach((student) => {
      activities.push({
        type: 'student',
        action: 'New student enrolled',
        user: student.fullName,
        time: student.createdAt,
      });
    });

    recentTeachers.forEach((teacher) => {
      activities.push({
        type: 'teacher',
        action: 'New teacher added',
        user: teacher.fullName,
        time: teacher.createdAt,
      });
    });

    recentClasses.forEach((cls) => {
      activities.push({
        type: 'class',
        action: 'New class created',
        user: `Grade ${cls.grade}${cls.section ? ` - ${cls.section}` : ''}`,
        time: cls.createdAt,
      });
    });

    // Sort by time and limit
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    const limitedActivities = activities.slice(0, limit);

    res.json({
      success: true,
      data: limitedActivities,
    });
  } catch (err) {
    console.error('getRecentActivities error:', err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ============================================
// GET GRADE DISTRIBUTION
// ============================================
exports.getGradeDistribution = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;

    const distribution = await Class.aggregate([
      {
        $match: {
          schoolId,
          isDeleted: false,
          status: 'active',
        },
      },
      {
        $group: {
          _id: '$grade',
          classCount: { $sum: 1 },
          totalCapacity: { $sum: '$maxCapacity' },
          totalEnrolled: { $sum: '$currentEnrollment' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      data: distribution,
    });
  } catch (err) {
    console.error('getGradeDistribution error:', err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ============================================
// GET TEACHER SUMMARY
// ============================================
exports.getTeacherSummary = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;

    const summary = await Teacher.aggregate([
      {
        $match: {
          schoolId,
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      data: summary,
    });
  } catch (err) {
    console.error('getTeacherSummary error:', err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
