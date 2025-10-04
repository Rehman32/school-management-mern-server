const BaseService = require('./base.service');
const Exam = require('../models/Exam');
const Grade = require('../models/Grade');
const Student = require('../models/student.model');
const Subject = require('../models/subject.model');
const mongoose = require('mongoose');

class ExamService extends BaseService {
  constructor() {
    super(Exam);
  }

  async createExam(data, options = {}) {
    return this.create(data, options);
  }

  async addGrade(examId, gradeData, options = {}) {
    if (!examId || !mongoose.Types.ObjectId.isValid(examId)) {
      throw new Error('Invalid examId');
    }
    // Ensure exam exists and belongs to tenant
    const exam = await Exam.findOne({ _id: examId, ...(options.tenant && { schoolId: options.tenant }) });
    if (!exam) throw new Error('Exam not found');
    // Attach examId and schoolId to gradeData
    gradeData.examId = examId;
    if (options.tenant) gradeData.schoolId = options.tenant;
    // Upsert grade (unique index on examId, studentId, subjectId, schoolId)
    const filter = {
      examId,
      studentId: gradeData.studentId,
      subjectId: gradeData.subjectId,
      ...(options.tenant && { schoolId: options.tenant })
    };
    const update = { $set: gradeData };
    const opts = { upsert: true, new: true, setDefaultsOnInsert: true };
    const grade = await Grade.findOneAndUpdate(filter, update, opts).lean();
    return grade;
  }

  async getStudentReportCard(studentId, { startDate, endDate } = {}, options = {}) {
    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      throw new Error('Invalid studentId');
    }
    // Find all grades for this student (optionally filter by date range)
    const gradeQuery = {
      studentId: mongoose.Types.ObjectId(studentId),
      ...(options.tenant && { schoolId: options.tenant })
    };
    if (startDate || endDate) {
      gradeQuery.createdAt = {};
      if (startDate) gradeQuery.createdAt.$gte = new Date(startDate);
      if (endDate) gradeQuery.createdAt.$lte = new Date(endDate);
    }
    const grades = await Grade.find(gradeQuery)
      .populate('examId', 'title date totalMarks classId')
      .populate('subjectId', 'name code')
      .lean();
    if (!grades.length) return { studentId, grades: [], summary: null };
    // Group by subject, collate exams, compute totals
    const subjects = {};
    let totalMarksObtained = 0;
    let totalMaxMarks = 0;
    grades.forEach(g => {
      const subjKey = g.subjectId?._id?.toString() || g.subjectId;
      if (!subjects[subjKey]) {
        subjects[subjKey] = {
          subject: g.subjectId,
          exams: [],
          totalObtained: 0,
          totalPossible: 0
        };
      }
      subjects[subjKey].exams.push({
        exam: g.examId,
        marksObtained: g.marksObtained,
        remark: g.remark
      });
      subjects[subjKey].totalObtained += g.marksObtained;
      subjects[subjKey].totalPossible += g.examId?.totalMarks || 0;
      totalMarksObtained += g.marksObtained;
      totalMaxMarks += g.examId?.totalMarks || 0;
    });
    // Per-subject breakdown
    const subjectBreakdown = Object.values(subjects).map(s => ({
      subject: s.subject,
      totalObtained: s.totalObtained,
      totalPossible: s.totalPossible,
      percentage: s.totalPossible ? (s.totalObtained / s.totalPossible) * 100 : null,
      exams: s.exams
    }));
    // Overall summary
    const summary = {
      totalMarksObtained,
      totalMaxMarks,
      overallPercentage: totalMaxMarks ? (totalMarksObtained / totalMaxMarks) * 100 : null,
      subjectBreakdown
    };
    return { studentId, grades, summary };
  }
}

module.exports = new ExamService();
