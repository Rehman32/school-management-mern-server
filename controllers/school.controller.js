// SCHOOL CONTROLLER

const School = require('../models/school.model');
const { validateSchoolProfile, sanitizeSchoolProfile } = require('../utils/validation');

// ============================================
// GET SCHOOL PROFILE
// ============================================
exports.getProfile = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;

    const school = await School.findById(schoolId)
      .select('-__v') // Exclude version key
      .lean();

    if (!school) {
      return res.status(404).json({ 
        success: false, 
        message: 'School not found' 
      });
    }

    // Check subscription status
    const isSubscriptionActive = school.subscriptionEndDate 
      ? new Date() <= new Date(school.subscriptionEndDate)
      : true;

    return res.json({ 
      success: true, 
      data: {
        ...school,
        isSubscriptionActive
      }
    });
  } catch (err) {
    console.error('getProfile error:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch school profile',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ============================================
// UPDATE SCHOOL PROFILE
// ============================================
exports.updateProfile = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const userId = req.user.id;
    let updateData = req.body;

    // Validate input
    const validation = validateSchoolProfile(updateData);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    // Sanitize input
    updateData = sanitizeSchoolProfile(updateData);

    // Find existing school
    const existingSchool = await School.findById(schoolId);
    if (!existingSchool) {
      return res.status(404).json({ 
        success: false, 
        message: 'School not found' 
      });
    }

    // Check for email uniqueness if email is being changed
    if (updateData.email && updateData.email !== existingSchool.email) {
      const emailExists = await School.findOne({ 
        email: updateData.email, 
        _id: { $ne: schoolId } 
      });
      
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email address is already in use by another school'
        });
      }
    }

    // Add audit trail
    updateData.updatedBy = userId;
    updateData.updatedAt = new Date();

    // Prevent updating sensitive fields
    delete updateData.subscriptionPlan;
    delete updateData.subscriptionStartDate;
    delete updateData.subscriptionEndDate;
    delete updateData.createdAt;
    delete updateData._id;

    // Update school
    const updatedSchool = await School.findByIdAndUpdate(
      schoolId,
      { $set: updateData },
      { 
        new: true, 
        runValidators: true 
      }
    ).select('-__v');

    if (!updatedSchool) {
      return res.status(404).json({ 
        success: false, 
        message: 'School not found' 
      });
    }

    return res.json({ 
      success: true, 
      data: updatedSchool,
      message: 'School profile updated successfully'
    });
  } catch (err) {
    console.error('updateProfile error:', err);

    // Handle Mongoose validation errors
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    // Handle duplicate key errors
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} is already in use`
      });
    }

    return res.status(500).json({ 
      success: false, 
      message: 'Failed to update school profile',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ============================================
// UPDATE ACADEMIC YEAR
// ============================================
exports.updateAcademicYear = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { year, startDate, endDate, isCurrent } = req.body;

    if (!year || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Year, start date, and end date are required'
      });
    }

    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({ 
        success: false, 
        message: 'School not found' 
      });
    }

    // If setting as current, unset all others
    if (isCurrent) {
      school.academicYears.forEach(y => y.isCurrent = false);
      school.currentAcademicYear = year;
    }

    // Check if academic year already exists
    const existingIndex = school.academicYears.findIndex(y => y.year === year);
    
    if (existingIndex !== -1) {
      // Update existing
      school.academicYears[existingIndex] = {
        year,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isCurrent: isCurrent || false
      };
    } else {
      // Add new
      school.academicYears.push({
        year,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isCurrent: isCurrent || false
      });
    }

    school.updatedBy = req.user.id;
    await school.save();

    return res.json({
      success: true,
      data: school,
      message: 'Academic year updated successfully'
    });
  } catch (err) {
    console.error('updateAcademicYear error:', err);
    return res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// ============================================
// UPDATE SCHOOL TIMINGS
// ============================================
exports.updateSchoolTimings = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { timings } = req.body;

    if (!timings || !Array.isArray(timings)) {
      return res.status(400).json({
        success: false,
        message: 'Timings array is required'
      });
    }

    // Validate timings format
    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

    for (const timing of timings) {
      if (!validDays.includes(timing.dayOfWeek)) {
        return res.status(400).json({
          success: false,
          message: `Invalid day: ${timing.dayOfWeek}`
        });
      }
      if (!timeRegex.test(timing.startTime) || !timeRegex.test(timing.endTime)) {
        return res.status(400).json({
          success: false,
          message: 'Time must be in HH:MM format (24-hour)'
        });
      }
    }

    const school = await School.findByIdAndUpdate(
      schoolId,
      { 
        $set: { 
          schoolTimings: timings,
          updatedBy: req.user.id 
        } 
      },
      { new: true, runValidators: true }
    );

    if (!school) {
      return res.status(404).json({ 
        success: false, 
        message: 'School not found' 
      });
    }

    return res.json({
      success: true,
      data: school,
      message: 'School timings updated successfully'
    });
  } catch (err) {
    console.error('updateSchoolTimings error:', err);
    return res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// ============================================
// UPDATE GRADING SYSTEM
// ============================================
exports.updateGradingSystem = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { grades } = req.body;

    if (!grades || !Array.isArray(grades)) {
      return res.status(400).json({
        success: false,
        message: 'Grades array is required'
      });
    }

    // Validate grades
    for (const grade of grades) {
      if (!grade.grade || grade.minPercentage === undefined || grade.maxPercentage === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Each grade must have grade, minPercentage, and maxPercentage'
        });
      }
      if (grade.minPercentage < 0 || grade.minPercentage > 100 ||
          grade.maxPercentage < 0 || grade.maxPercentage > 100) {
        return res.status(400).json({
          success: false,
          message: 'Percentages must be between 0 and 100'
        });
      }
      if (grade.minPercentage > grade.maxPercentage) {
        return res.status(400).json({
          success: false,
          message: 'Min percentage cannot be greater than max percentage'
        });
      }
    }

    const school = await School.findByIdAndUpdate(
      schoolId,
      { 
        $set: { 
          gradingSystem: grades,
          updatedBy: req.user.id 
        } 
      },
      { new: true, runValidators: true }
    );

    if (!school) {
      return res.status(404).json({ 
        success: false, 
        message: 'School not found' 
      });
    }

    return res.json({
      success: true,
      data: school,
      message: 'Grading system updated successfully'
    });
  } catch (err) {
    console.error('updateGradingSystem error:', err);
    return res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// ============================================
// UPDATE SYSTEM SETTINGS
// ============================================
exports.updateSystemSettings = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { settings } = req.body;

    if (!settings) {
      return res.status(400).json({
        success: false,
        message: 'Settings object is required'
      });
    }

    const school = await School.findByIdAndUpdate(
      schoolId,
      { 
        $set: { 
          settings: { ...settings },
          updatedBy: req.user.id 
        } 
      },
      { new: true, runValidators: true }
    );

    if (!school) {
      return res.status(404).json({ 
        success: false, 
        message: 'School not found' 
      });
    }

    return res.json({
      success: true,
      data: school,
      message: 'System settings updated successfully'
    });
  } catch (err) {
    console.error('updateSystemSettings error:', err);
    return res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// ============================================
// GET SCHOOL STATISTICS
// ============================================
exports.getStatistics = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;

    const school = await School.findById(schoolId).lean();
    if (!school) {
      return res.status(404).json({ 
        success: false, 
        message: 'School not found' 
      });
    }

    // Calculate statistics
    const stats = {
      totalAcademicYears: school.academicYears?.length || 0,
      currentAcademicYear: school.currentAcademicYear,
      workingDays: school.schoolTimings?.filter(t => t.isWorkingDay).length || 0,
      totalGrades: school.gradingSystem?.length || 0,
      contactPersons: school.contactPersons?.length || 0,
      subscriptionStatus: school.subscriptionEndDate 
        ? new Date() <= new Date(school.subscriptionEndDate) ? 'active' : 'expired'
        : 'active',
      daysUntilSubscriptionExpiry: school.subscriptionEndDate
        ? Math.ceil((new Date(school.subscriptionEndDate) - new Date()) / (1000 * 60 * 60 * 24))
        : null
    };

    return res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    console.error('getStatistics error:', err);
    return res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// ============================================
// UPLOAD LOGO
// ============================================
exports.uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const schoolId = req.user.schoolId;
    const logoPath = `/uploads/logos/${req.file.filename}`;

    const school = await School.findByIdAndUpdate(
      schoolId,
      { 
        $set: { 
          logo: logoPath,
          updatedBy: req.user.id 
        } 
      },
      { new: true }
    );

    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    return res.json({
      success: true,
      data: {
        logo: logoPath
      },
      message: 'Logo uploaded successfully'
    });
  } catch (err) {
    console.error('uploadLogo error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload logo',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ============================================
// DELETE ACADEMIC YEAR
// ============================================
exports.deleteAcademicYear = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { year } = req.params;

    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    // Don't allow deleting current academic year
    const yearToDelete = school.academicYears.find(y => y.year === year);
    if (yearToDelete && yearToDelete.isCurrent) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the current academic year'
      });
    }

    school.academicYears = school.academicYears.filter(y => y.year !== year);
    school.updatedBy = req.user.id;
    await school.save();

    return res.json({
      success: true,
      message: 'Academic year deleted successfully'
    });
  } catch (err) {
    console.error('deleteAcademicYear error:', err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// ============================================
// ADD CONTACT PERSON
// ============================================
exports.addContactPerson = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { name, designation, email, phone, isPrimary } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required'
      });
    }

    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    // If setting as primary, unset others
    if (isPrimary) {
      school.contactPersons.forEach(cp => cp.isPrimary = false);
    }

    school.contactPersons.push({
      name,
      designation,
      email,
      phone,
      isPrimary: isPrimary || false
    });

    school.updatedBy = req.user.id;
    await school.save();

    return res.json({
      success: true,
      data: school,
      message: 'Contact person added successfully'
    });
  } catch (err) {
    console.error('addContactPerson error:', err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// ============================================
// UPDATE CONTACT PERSON
// ============================================
exports.updateContactPerson = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { id } = req.params;
    const { name, designation, email, phone, isPrimary } = req.body;

    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    const contact = school.contactPersons.id(id);
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact person not found'
      });
    }

    // If setting as primary, unset others
    if (isPrimary) {
      school.contactPersons.forEach(cp => {
        if (cp._id.toString() !== id) {
          cp.isPrimary = false;
        }
      });
    }

    contact.name = name || contact.name;
    contact.designation = designation !== undefined ? designation : contact.designation;
    contact.email = email || contact.email;
    contact.phone = phone !== undefined ? phone : contact.phone;
    contact.isPrimary = isPrimary !== undefined ? isPrimary : contact.isPrimary;

    school.updatedBy = req.user.id;
    await school.save();

    return res.json({
      success: true,
      data: school,
      message: 'Contact person updated successfully'
    });
  } catch (err) {
    console.error('updateContactPerson error:', err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// ============================================
// DELETE CONTACT PERSON
// ============================================
exports.deleteContactPerson = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { id } = req.params;

    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    school.contactPersons = school.contactPersons.filter(
      cp => cp._id.toString() !== id
    );

    school.updatedBy = req.user.id;
    await school.save();

    return res.json({
      success: true,
      message: 'Contact person deleted successfully'
    });
  } catch (err) {
    console.error('deleteContactPerson error:', err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};
