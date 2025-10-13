// ============================================
// FEE CONTROLLER - MULTI-TENANT (COMPLETE)
// ============================================

const Fee = require("../models/fee.model");
const Student = require("../models/student.model");
const Class = require("../models/class.model");

// Validation helper
const validateAmount = (amount) => {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0;
};

// ============================================
// CREATE FEE
// ============================================
exports.createFee = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.tenantId;
    const userId = req.user?._id;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required"
      });
    }

    let studentId;

    if (!validateAmount(req.body.amount)) {
      return res.status(400).json({ 
        success: false, 
        message: "Amount must be a positive number" 
      });
    }

    if (req.user.role === "student") {
      studentId = req.user._id;
    } else {
      studentId = req.body.student;
      if (!studentId) {
        return res.status(400).json({ 
          success: false, 
          message: "Student is required" 
        });
      }
      
      const studentExists = await Student.findOne({ 
        _id: studentId, 
        tenantId,
        isDeleted: false
      });

      if (!studentExists) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid student for this school" 
        });
      }
    }

    if (req.body.dueDate && new Date(req.body.dueDate) < new Date(new Date().setHours(0, 0, 0, 0))) {
      return res.status(400).json({
        success: false,
        message: "Due date cannot be in the past"
      });
    }

    const payload = {
      ...req.body,
      student: studentId,
      tenantId,
      schoolId: tenantId,
      createdBy: userId,
      updatedBy: userId,
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
// LIST FEES
// ============================================
exports.listFees = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required"
      });
    }

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

    const query = { tenantId };

    if (req.user.role === "student") {
      query.student = req.user._id;
    } else if (student) {
      query.student = student;
    }

    if (status) query.status = status;
    if (feeType) query.feeType = feeType;
    if (month) query.month = month;
    if (academicYear) query.academicYear = academicYear;
    
    if (dateFrom || dateTo) {
      query.dueDate = {};
      if (dateFrom) query.dueDate.$gte = new Date(dateFrom);
      if (dateTo) query.dueDate.$lte = new Date(dateTo);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [fees, total] = await Promise.all([
      Fee.find(query)
        .populate("student", "fullName rollNumber class email")
        .populate("createdBy", "name")
        .populate("updatedBy", "name")
        .sort({ dueDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
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
    const tenantId = req.user?.tenantId || req.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required"
      });
    }

    const filters = {};
    if (req.query.feeType) filters.feeType = req.query.feeType;
    if (req.query.month) filters.month = req.query.month;
    if (req.query.academicYear) filters.academicYear = req.query.academicYear;
    
    const stats = await Fee.getSchoolStats(tenantId, filters);
    
    const statusCounts = await Fee.aggregate([
      { $match: { tenantId, ...filters } },
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
    const tenantId = req.user?.tenantId || req.tenantId;
    const userId = req.user?._id;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required"
      });
    }

    const { id } = req.params;
    
    if (req.body.amount && !validateAmount(req.body.amount)) {
      return res.status(400).json({ 
        success: false, 
        message: "Amount must be a positive number" 
      });
    }
    
    const existing = await Fee.findOne({ _id: id, tenantId });
    if (!existing) {
      return res.status(404).json({ 
        success: false, 
        message: "Fee not found" 
      });
    }
    
    const update = { 
      ...req.body, 
      updatedBy: userId 
    };
    
    delete update.tenantId;
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
    const tenantId = req.user?.tenantId || req.tenantId;
    const userId = req.user?._id;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required"
      });
    }

    const { id } = req.params;
    const { amount, method, transactionId, notes } = req.body;
    
    if (!validateAmount(amount)) {
      return res.status(400).json({ 
        success: false, 
        message: "Payment amount must be positive" 
      });
    }
    
    const fee = await Fee.findOne({ _id: id, tenantId });
    if (!fee) {
      return res.status(404).json({ 
        success: false, 
        message: "Fee not found" 
      });
    }
    
    const balance = fee.amount + fee.lateFee - fee.discount - fee.paidAmount;
    if (parseFloat(amount) > balance) {
      return res.status(400).json({
        success: false,
        message: `Payment amount ($${amount}) exceeds balance ($${balance.toFixed(2)})`
      });
    }
    
    fee.paymentRecords.push({
      amount: parseFloat(amount),
      date: new Date(),
      method: method || "cash",
      transactionId,
      notes,
      receivedBy: userId
    });
    
    fee.updatedBy = userId;
    
    await fee.save();
    
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
    const tenantId = req.user?.tenantId || req.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required"
      });
    }

    const { studentId } = req.params;
    
    if (req.user.role === "student" && req.user._id.toString() !== studentId) {
      return res.status(403).json({
        success: false,
        message: "You can only view your own fees"
      });
    }
    
    const fees = await Fee.getStudentFees(tenantId, studentId);
    
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
// BULK GENERATE FEES (FIXED)
// ============================================
exports.bulkGenerateFees = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.tenantId;
    const userId = req.user?._id;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required"
      });
    }

    const { 
      classId, 
      amount, 
      feeType, 
      dueDate, 
      month, 
      academicYear,
      notes
    } = req.body;
    
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
    
    const classExists = await Class.findOne({ 
      _id: classId, 
      tenantId,
      isDeleted: false 
    });
    
    if (!classExists) {
      return res.status(404).json({
        success: false,
        message: "Class not found"
      });
    }
    
    const students = await Student.find({ 
      tenantId,
      class: classId,
      status: "active",
      isDeleted: false
    });
    
    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No active students found in this class"
      });
    }
    
    const feePromises = students.map(student => 
      Fee.create({
        tenantId,
        schoolId: tenantId,
        student: student._id,
        amount: parseFloat(amount),
        feeType: feeType || "tuition",
        dueDate: new Date(dueDate),
        month,
        academicYear,
        notes,
        createdBy: userId,
        updatedBy: userId
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
// DELETE FEE
// ============================================
exports.deleteFee = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required"
      });
    }

    const { id } = req.params;
    
    const fee = await Fee.findOne({ _id: id, tenantId });
    
    if (!fee) {
      return res.status(404).json({ 
        success: false, 
        message: "Fee not found" 
      });
    }
    
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
    const tenantId = req.user?.tenantId || req.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required"
      });
    }

    const { id, paymentId } = req.params;
    
    const fee = await Fee.findOne({ _id: id, tenantId });
    if (!fee) {
      return res.status(404).json({ 
        success: false, 
        message: "Fee not found" 
      });
    }
    
    fee.paymentRecords = fee.paymentRecords.filter(
      p => p._id.toString() !== paymentId
    );
    
    fee.updatedBy = req.user._id;
    await fee.save();
    
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
