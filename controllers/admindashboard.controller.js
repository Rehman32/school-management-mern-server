// ============================================
// DASHBOARD CONTROLLER - SINGLE-TENANT EDITION
// Real-time analytics with MongoDB aggregation
// ============================================

const Student = require('../models/student.model');
const Teacher = require('../models/teacher.model');
const Class = require('../models/class.model');
const Subject = require('../models/subject.model');

// ============================================
// GET DASHBOARD STATISTICS
// ============================================
exports.getStatistics = async (req, res) => {
  try {
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
      Student.countDocuments({ isDeleted: false }),
      Teacher.countDocuments({ isDeleted: false }),
      Class.countDocuments({ isDeleted: false, status: 'active' }),
      Subject.countDocuments({ isDeleted: false, status: 'active' }),
      Student.countDocuments({ isDeleted: false, status: 'active' }),
      Teacher.countDocuments({ isDeleted: false, status: 'Active' }),
      Student.countDocuments({ createdAt: { $lt: lastMonth } }),
      Teacher.countDocuments({ createdAt: { $lt: lastMonth } }),
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
      Student.countDocuments({ gender: 'male', isDeleted: false }),
      Student.countDocuments({ gender: 'female', isDeleted: false }),
    ]);

    // Get class capacity info
    const classCapacity = await Class.aggregate([
      { $match: { isDeleted: false, status: 'active' } },
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
    const limit = parseInt(req.query.limit) || 10;

    // Get recent students (last 7 days)
    const recentStudents = await Student.find({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    })
      .sort({ createdAt: -1 })
      .limit(3)
      .select('fullName createdAt')
      .lean();

    // Get recent teachers (last 7 days)
    const recentTeachers = await Teacher.find({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    })
      .sort({ createdAt: -1 })
      .limit(3)
      .select('fullName createdAt')
      .lean();

    // Get recent classes (last 7 days)
    const recentClasses = await Class.find({
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
    const distribution = await Class.aggregate([
      {
        $match: {
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
    const summary = await Teacher.aggregate([
      {
        $match: {
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

// ============================================
// GET ATTENDANCE OVERVIEW (Today's summary)
// ============================================
exports.getAttendanceOverview = async (req, res) => {
  try {
    const Attendance = require('../models/attendance.model');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Today's attendance stats
    const todayStats = await Attendance.aggregate([
      { $match: { date: { $gte: today, $lte: todayEnd } } },
      { $unwind: '$records' },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ['$records.status', 'present'] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$records.status', 'absent'] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ['$records.status', 'late'] }, 1, 0] } },
        },
      },
    ]);

    // Get last 7 days trend
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weeklyTrend = await Attendance.aggregate([
      { $match: { date: { $gte: weekAgo, $lte: todayEnd } } },
      { $unwind: '$records' },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          total: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ['$records.status', 'present'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date: '$_id',
          total: 1,
          present: 1,
          percentage: {
            $cond: [{ $eq: ['$total', 0] }, 0, { $round: [{ $multiply: [{ $divide: ['$present', '$total'] }, 100] }, 1] }],
          },
        },
      },
    ]);

    const stats = todayStats[0] || { total: 0, present: 0, absent: 0, late: 0 };
    const attendanceRate = stats.total > 0 ? ((stats.present / stats.total) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      data: {
        today: {
          ...stats,
          attendanceRate: parseFloat(attendanceRate),
        },
        weeklyTrend,
      },
    });
  } catch (err) {
    console.error('getAttendanceOverview error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================
// GET FEE COLLECTION STATUS
// ============================================
exports.getFeeStatus = async (req, res) => {
  try {
    const Fee = require('../models/fee.model');
    
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Overall fee statistics
    const feeStats = await Fee.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalCollected: { $sum: '$paidAmount' },
          totalRecords: { $sum: 1 },
          pendingCount: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          paidCount: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
          partialCount: { $sum: { $cond: [{ $eq: ['$status', 'partial'] }, 1, 0] } },
          overdueCount: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] } },
        },
      },
    ]);

    // Monthly collection trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyTrend = await Fee.aggregate([
      { $unwind: { path: '$paymentRecords', preserveNullAndEmptyArrays: false } },
      { $match: { 'paymentRecords.date': { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$paymentRecords.date' } },
          collected: { $sum: '$paymentRecords.amount' },
          transactions: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const stats = feeStats[0] || { totalAmount: 0, totalCollected: 0, pendingCount: 0, paidCount: 0, partialCount: 0, overdueCount: 0 };
    const collectionRate = stats.totalAmount > 0 ? ((stats.totalCollected / stats.totalAmount) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      data: {
        summary: {
          ...stats,
          pendingAmount: stats.totalAmount - stats.totalCollected,
          collectionRate: parseFloat(collectionRate),
        },
        monthlyTrend,
      },
    });
  } catch (err) {
    console.error('getFeeStatus error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================
// GET UPCOMING EXAMS
// ============================================
exports.getUpcomingExams = async (req, res) => {
  try {
    const Exam = require('../models/exam.model');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingExams = await Exam.find({
      date: { $gte: today },
      isDeleted: false,
    })
      .populate('classId', 'name grade section')
      .populate('subjectId', 'name code')
      .sort({ date: 1 })
      .limit(10)
      .lean();

    // Count exams by type
    const examsByType = await Exam.aggregate([
      { $match: { date: { $gte: today }, isDeleted: false } },
      { $group: { _id: '$examType', count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: {
        upcoming: upcomingExams,
        byType: examsByType,
        totalUpcoming: upcomingExams.length,
      },
    });
  } catch (err) {
    console.error('getUpcomingExams error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================
// GET MONTHLY ENROLLMENT TRENDS
// ============================================
exports.getEnrollmentTrends = async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 12;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const studentTrend = await Student.aggregate([
      { $match: { createdAt: { $gte: startDate }, isDeleted: false } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          enrolled: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const teacherTrend = await Teacher.aggregate([
      { $match: { createdAt: { $gte: startDate }, isDeleted: false } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          hired: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      data: {
        students: studentTrend,
        teachers: teacherTrend,
      },
    });
  } catch (err) {
    console.error('getEnrollmentTrends error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
