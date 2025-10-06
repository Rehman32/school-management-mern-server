// ============================================
// ENHANCED FEE CONTROLLER
// Fixed and Enhanced for Real School Management
// ============================================

const Fee = require("../models/fee.model");
const Student = require("../models/student.model");
const Class = require("../models/class.model");

// ============================================
// HELPER: Validate Amount
// ============================================
const validateAmount = (amount) => {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0;
};

// ============================================
// CREATE FEE
// ============================================
exports.createFee = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    let studentId;

    // Validate amount
    if (!validateAmount(req.body.amount)) {
      return res.status(400).json({ 
        success: false, 
        message: "Amount must be a positive number" 
      });
    }

    // Student role: use their own _id
    if (req.user.role === "student") {
      studentId = req.user._id;
    } else {
      // Admin/teacher: must provide student in body
      studentId = req.body.student;
      if (!studentId) {
        return res.status(400).json({ 
          success: false, 
          message: "Student is required" 
        });
      }
      
      // Validate student exists and belongs to this school
      const studentExists = await Student.findOne({ _id: studentId, schoolId });
      if (!studentExists) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid student for this school" 
        });
      }
    }

    // Validate due date
    if (req.body.dueDate && new Date(req.body.dueDate) < new Date(new Date().setHours(0, 0, 0, 0))) {
      return res.status(400).json({
        success: false,
        message: "Due date cannot be in the past"
      });
    }

    const payload = {
      ...req.body,
      student: studentId,
      schoolId,
      createdBy: req.user._id,
      updatedBy: req.user._id,
      paidAmount: 0
    };

    const fee = await Fee.create(payload);
    
    await fee.populate([
      { path: "student", select: "fullName rollNumber class" },
      { path: "createdBy", select: "name email" }
    ]);
    
    return res.status(201).json({ 
      success: true, 
      data: fee,
      message: "Fee created successfully"
    });
    
  } catch (err) {
    console.error("createFee error:", err);
    
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", ")
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: err.message || "Server error" 
    });
  }
};

// ============================================
// LIST FEES (with advanced filtering)
// ============================================
exports.listFees = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { 
      status, 
      feeType, 
      student, 
      month, 
      academicYear,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50
    } = req.query;

    // Build query
    const query = { schoolId };

    // Role-based access: students can only see their own fees
    if (req.user.role === "student") {
      query.student = req.user._id;
    } else if (student) {
      query.student = student;
    }

    if (status) query.status = status;
    if (feeType) query.feeType = feeType;
    if (month) query.month = month;
    if (academicYear) query.academicYear = academicYear;
    
    // Date range filter
    if (dateFrom || dateTo) {
      query.dueDate = {};
      if (dateFrom) query.dueDate.$gte = new Date(dateFrom);
      if (dateTo) query.dueDate.$lte = new Date(dateTo);
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [fees, total] = await Promise.all([
      Fee.find(query)
        .populate("student", "fullName rollNumber class email")
        .populate("createdBy", "name")
        .populate("updatedBy", "name")
        .sort({ dueDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Fee.countDocuments(query)
    ]);

    return res.json({ 
      success: true, 
      data: fees,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (err) {
    console.error("listFees error:", err);
    return res.status(500).json({ 
      success: false, 
      message: err.message || "Server error" 
    });
  }
};

// ============================================
// GET STATISTICS
// ============================================
exports.getStatistics = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const filters = {};
    
    // Add filters from query
    if (req.query.feeType) filters.feeType = req.query.feeType;
    if (req.query.month) filters.month = req.query.month;
    if (req.query.academicYear) filters.academicYear = req.query.academicYear;
    
    const stats = await Fee.getSchoolStats(schoolId, filters);
    
    // Get count by status
    const statusCounts = await Fee.aggregate([
      { $match: { schoolId, ...filters } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);
    
    const statusMap = {};
    statusCounts.forEach(item => {
      statusMap[item._id] = item.count;
    });
    
    return res.json({
      success: true,
      data: {
        ...stats,
        statusCounts: statusMap
      }
    });
    
  } catch (err) {
    console.error("getStatistics error:", err);
    return res.status(500).json({ 
      success: false, 
      message: err.message || "Server error" 
    });
  }
};

// ============================================
// UPDATE FEE
// ============================================
exports.updateFee = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { id } = req.params;
    
    // Validate amount if provided
    if (req.body.amount && !validateAmount(req.body.amount)) {
      return res.status(400).json({ 
        success: false, 
        message: "Amount must be a positive number" 
      });
    }
    
    // Find existing fee
    const existing = await Fee.findOne({ _id: id, schoolId });
    if (!existing) {
      return res.status(404).json({ 
        success: false, 
        message: "Fee not found" 
      });
    }
    
    const update = { 
      ...req.body, 
      updatedBy: req.user._id 
    };
    
    // Don't allow updating certain fields
    delete update.schoolId;
    delete update.paymentRecords;
    delete update.paidAmount;
    delete update.createdBy;
    
    const fee = await Fee.findByIdAndUpdate(
      id, 
      update, 
      { new: true, runValidators: true }
    ).populate([
      { path: "student", select: "fullName rollNumber class email" },
      { path: "updatedBy", select: "name" }
    ]);
    
    return res.json({ 
      success: true, 
      data: fee,
      message: "Fee updated successfully"
    });
    
  } catch (err) {
    console.error("updateFee error:", err);
    
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", ")
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: err.message || "Server error" 
    });
  }
};

// ============================================
// RECORD PAYMENT
// ============================================
exports.recordPayment = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { id } = req.params;
    const { amount, method, transactionId, notes } = req.body;
    
    // Validate amount
    if (!validateAmount(amount)) {
      return res.status(400).json({ 
        success: false, 
        message: "Payment amount must be positive" 
      });
    }
    
    // Find fee
    const fee = await Fee.findOne({ _id: id, schoolId });
    if (!fee) {
      return res.status(404).json({ 
        success: false, 
        message: "Fee not found" 
      });
    }
    
    // Check if payment exceeds balance
    const balance = fee.amount + fee.lateFee - fee.discount - fee.paidAmount;
    if (parseFloat(amount) > balance) {
      return res.status(400).json({
        success: false,
        message: `Payment amount ($${amount}) exceeds balance ($${balance.toFixed(2)})`
      });
    }
    
    // Add payment record
    fee.paymentRecords.push({
      amount: parseFloat(amount),
      date: new Date(),
      method: method || "cash",
      transactionId,
      notes,
      receivedBy: req.user._id
    });
    
    fee.updatedBy = req.user._id;
    
    await fee.save(); // This triggers the pre-save middleware to update status
    
    await fee.populate([
      { path: "student", select: "fullName rollNumber class" },
      { path: "paymentRecords.receivedBy", select: "name" }
    ]);
    
    return res.json({
      success: true,
      data: fee,
      message: "Payment recorded successfully"
    });
    
  } catch (err) {
    console.error("recordPayment error:", err);
    return res.status(500).json({ 
      success: false, 
      message: err.message || "Server error" 
    });
  }
};

// ============================================
// GET STUDENT FEES
// ============================================
exports.getStudentFees = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { studentId } = req.params;
    
    // Authorization check
    if (req.user.role === "student" && req.user._id.toString() !== studentId) {
      return res.status(403).json({
        success: false,
        message: "You can only view your own fees"
      });
    }
    
    const fees = await Fee.getStudentFees(schoolId, studentId);
    
    return res.json({
      success: true,
      data: fees
    });
    
  } catch (err) {
    console.error("getStudentFees error:", err);
    return res.status(500).json({ 
      success: false, 
      message: err.message || "Server error" 
    });
  }
};

// ============================================
// BULK GENERATE FEES
// ============================================
exports.bulkGenerateFees = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { 
      classId, 
      amount, 
      feeType, 
      dueDate, 
      month, 
      academicYear,
      notes
    } = req.body;
    
    // Validate required fields
    if (!classId || !amount || !dueDate) {
      return res.status(400).json({
        success: false,
        message: "Class, amount, and due date are required"
      });
    }
    
    if (!validateAmount(amount)) {
      return res.status(400).json({
        success: false,
        message: "Amount must be positive"
      });
    }
    
    // Get all students in the class
    const students = await Student.find({ schoolId, class: classId });
    
    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No students found in this class"
      });
    }
    
    // Create fee records for all students
    const feePromises = students.map(student => 
      Fee.create({
        schoolId,
        student: student._id,
        amount: parseFloat(amount),
        feeType: feeType || "tuition",
        dueDate: new Date(dueDate),
        month,
        academicYear,
        notes,
        createdBy: req.user._id,
        updatedBy: req.user._id
      })
    );
    
    const fees = await Promise.all(feePromises);
    
    return res.status(201).json({
      success: true,
      data: fees,
      message: `${fees.length} fee records created successfully`
    });
    
  } catch (err) {
    console.error("bulkGenerateFees error:", err);
    return res.status(500).json({ 
      success: false, 
      message: err.message || "Server error" 
    });
  }
};

// ============================================
// DELETE FEE
// ============================================
exports.deleteFee = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { id } = req.params;
    
    const fee = await Fee.findOne({ _id: id, schoolId });
    
    if (!fee) {
      return res.status(404).json({ 
        success: false, 
        message: "Fee not found" 
      });
    }
    
    // Don't allow deleting paid fees (for audit trail)
    if (fee.status === "paid" && fee.paymentRecords.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete fee with payment history. Consider marking as waived instead."
      });
    }
    
    await Fee.findByIdAndDelete(id);
    
    return res.json({ 
      success: true, 
      message: "Fee deleted successfully", 
      data: { _id: id } 
    });
    
  } catch (err) {
    console.error("deleteFee error:", err);
    return res.status(500).json({ 
      success: false, 
      message: err.message || "Server error" 
    });
  }
};

// ============================================
// DELETE PAYMENT RECORD
// ============================================
exports.deletePayment = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { id, paymentId } = req.params;
    
    const fee = await Fee.findOne({ _id: id, schoolId });
    if (!fee) {
      return res.status(404).json({ 
        success: false, 
        message: "Fee not found" 
      });
    }
    
    // Remove payment record
    fee.paymentRecords = fee.paymentRecords.filter(
      p => p._id.toString() !== paymentId
    );
    
    fee.updatedBy = req.user._id;
    await fee.save(); // Triggers status recalculation
    
    return res.json({
      success: true,
      data: fee,
      message: "Payment record deleted successfully"
    });
    
  } catch (err) {
    console.error("deletePayment error:", err);
    return res.status(500).json({ 
      success: false, 
      message: err.message || "Server error" 
    });
  }
};
