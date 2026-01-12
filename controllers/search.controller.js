// ============================================
// GLOBAL SEARCH CONTROLLER
// server/controllers/search.controller.js
// Unified search across students, teachers, classes
// ============================================

const Student = require('../models/student.model');
const Teacher = require('../models/teacher.model');
const Class = require('../models/class.model');
const ApiResponse = require('../utils/response');

class SearchController {
  /**
   * Global Search
   * GET /api/search?q=query&type=all|students|teachers|classes
   */
  static async search(req, res) {
    try {
      const { q, type = 'all', limit = 10 } = req.query;

      if (!q || q.length < 2) {
        return ApiResponse.success(res, { results: [], total: 0 }, 'Search query too short');
      }

      const searchRegex = new RegExp(q, 'i');
      const results = [];
      let total = 0;

      // Search Students
      if (type === 'all' || type === 'students') {
        const students = await Student.find({
          $or: [
            { fullName: searchRegex },
            { email: searchRegex },
            { phone: searchRegex },
            { admissionNumber: searchRegex },
            { rollNumber: searchRegex }
          ],
          status: 'active'
        })
          .select('fullName email phone admissionNumber class photo')
          .populate('class', 'name grade section')
          .limit(parseInt(limit))
          .lean();

        students.forEach(student => {
          results.push({
            id: student._id,
            type: 'student',
            icon: '🎓',
            title: student.fullName,
            subtitle: student.class ? `${student.class.name || student.class.grade} - ${student.admissionNumber || ''}` : student.admissionNumber || '',
            url: `/admin/students?id=${student._id}`,
            photo: student.photo
          });
        });
        total += students.length;
      }

      // Search Teachers
      if (type === 'all' || type === 'teachers') {
        const teachers = await Teacher.find({
          $or: [
            { fullName: searchRegex },
            { email: searchRegex },
            { phone: searchRegex },
            { employeeId: searchRegex }
          ],
          status: 'Active'
        })
          .select('fullName email phone employeeId department photo')
          .limit(parseInt(limit))
          .lean();

        teachers.forEach(teacher => {
          results.push({
            id: teacher._id,
            type: 'teacher',
            icon: '👨‍🏫',
            title: teacher.fullName,
            subtitle: teacher.department || teacher.employeeId || 'Teacher',
            url: `/admin/teachers?id=${teacher._id}`,
            photo: teacher.photo
          });
        });
        total += teachers.length;
      }

      // Search Classes
      if (type === 'all' || type === 'classes') {
        const classes = await Class.find({
          $or: [
            { name: searchRegex },
            { grade: searchRegex },
            { section: searchRegex }
          ],
          status: 'active'
        })
          .select('name grade section classTeacher')
          .populate('classTeacher', 'fullName')
          .limit(parseInt(limit))
          .lean();

        classes.forEach(cls => {
          results.push({
            id: cls._id,
            type: 'class',
            icon: '🏫',
            title: cls.name || `${cls.grade} - ${cls.section}`,
            subtitle: cls.classTeacher?.fullName ? `Teacher: ${cls.classTeacher.fullName}` : 'No class teacher',
            url: `/admin/classes?id=${cls._id}`
          });
        });
        total += classes.length;
      }

      // Sort results - prioritize exact matches
      results.sort((a, b) => {
        const aExact = a.title.toLowerCase().startsWith(q.toLowerCase()) ? 0 : 1;
        const bExact = b.title.toLowerCase().startsWith(q.toLowerCase()) ? 0 : 1;
        return aExact - bExact;
      });

      return ApiResponse.success(res, {
        results: results.slice(0, parseInt(limit)),
        total,
        query: q
      }, `Found ${total} results`);

    } catch (err) {
      console.error('Search error:', err);
      return ApiResponse.error(res, 'Search failed', 500);
    }
  }

  /**
   * Quick Stats for Dashboard
   * GET /api/search/quick-stats
   */
  static async quickStats(req, res) {
    try {
      const [studentCount, teacherCount, classCount] = await Promise.all([
        Student.countDocuments({ status: 'active' }),
        Teacher.countDocuments({ status: 'Active' }),
        Class.countDocuments({ status: 'active' })
      ]);

      return ApiResponse.success(res, {
        students: studentCount,
        teachers: teacherCount,
        classes: classCount
      });

    } catch (err) {
      console.error('Quick stats error:', err);
      return ApiResponse.error(res, 'Failed to get stats', 500);
    }
  }
}

module.exports = SearchController;
