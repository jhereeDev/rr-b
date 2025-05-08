// controllers/admin_controller.js
const asyncHandler = require('../middlewares/async');
const Admin = require('../classes/Admin');
const ErrorResponse = require('../utils/error_response');
const log4js = require('../config/log4js_config');
const logger = log4js.getLogger('adminController');
const { hashPlainPass } = require('../utils/cypher');

// @desc    Get all admin users
// @route   GET /api/admin/users
// @access  Private (Admin only)
const getAllAdmins = asyncHandler(async (req, res, next) => {
  try {
    const adminUsers = await Admin.findAll();
    
    // Map response to omit sensitive data
    const sanitizedAdmins = adminUsers.map(admin => ({
      id: admin.id,
      member_employee_id: admin.member_employee_id,
      username: admin.username,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      status: admin.status,
      last_login: admin.last_login,
      created_at: admin.created_at,
      updated_at: admin.updated_at
    }));
    
    res.status(200).json({
      success: true,
      count: sanitizedAdmins.length,
      data: sanitizedAdmins
    });
  } catch (error) {
    logger.error(`Error getting admin users: ${error.message}`);
    return next(new ErrorResponse('Error retrieving admin users', 500));
  }
});

// @desc    Create new admin user
// @route   POST /api/admin/users
// @access  Private (Admin only)
const createAdmin = asyncHandler(async (req, res, next) => {
  try {
    const { username, password, email, firstName, lastName } = req.body;
    
    // Check if required fields are provided
    if (!username || !password || !email || !firstName || !lastName) {
      return next(new ErrorResponse('Please provide all required fields', 400));
    }
    
    // Check if admin with username already exists
    const existingAdmin = await Admin.findByUsername(username);
    if (existingAdmin) {
      return next(new ErrorResponse('Username already exists', 400));
    }
    
    // Check if admin with email already exists
    const existingEmail = await Admin.findByEmail(email);
    if (existingEmail) {
      return next(new ErrorResponse('Email already exists', 400));
    }

    const adminCount = await Admin.findAll();
    
    // Create new admin
    const newAdmin = new Admin({
      member_employee_id: `admin_${adminCount.length + 1}`,
      username,
      password,
      email,
      firstName,
      lastName,
      status: 'ACTIVE'
    });
    
    await newAdmin.create();
    
    // Remove password from response
    const adminResponse = {
      id: newAdmin.id,
      member_employee_id: newAdmin.member_employee_id,
      username: newAdmin.username,
      email: newAdmin.email,
      firstName: newAdmin.firstName,
      lastName: newAdmin.lastName,
      status: newAdmin.status
    };
    
    res.status(201).json({
      success: true,
      data: adminResponse
    });
  } catch (error) {
    logger.error(`Error creating admin user: ${error.message}`);
    return next(new ErrorResponse('Error creating admin user', 500));
  }
});

// @desc    Update admin status
// @route   PATCH /api/admin/users/:id/status
// @access  Private (Admin only)
const updateAdminStatus = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate status
    if (!status || !['ACTIVE', 'INACTIVE'].includes(status)) {
      return next(new ErrorResponse('Invalid status', 400));
    }
    
    // Get admin by ID
    const admin = await Admin.findById(id);
    if (!admin) {
      return next(new ErrorResponse('Admin not found', 404));
    }
    
    // Update status
    await Admin.updateStatus(id, status);
    
    res.status(200).json({
      success: true,
      data: { id, status }
    });
  } catch (error) {
    logger.error(`Error updating admin status: ${error.message}`);
    return next(new ErrorResponse('Error updating admin status', 500));
  }
});

// @desc    Reset admin password
// @route   PATCH /api/admin/users/:id/password
// @access  Private (Admin only)
const resetAdminPassword = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    
    // Validate password
    if (!password || password.length < 8) {
      return next(new ErrorResponse('Password must be at least 8 characters', 400));
    }
    
    // Get admin by ID
    const admin = await Admin.findById(id);
    if (!admin) {
      return next(new ErrorResponse('Admin not found', 404));
    }
    
    // Update password
    const hashedPassword = hashPlainPass(password);
    await Admin.updatePassword(id, hashedPassword);
    
    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    logger.error(`Error resetting admin password: ${error.message}`);
    return next(new ErrorResponse('Error resetting admin password', 500));
  }
});

module.exports = {
  getAllAdmins,
  createAdmin,
  updateAdminStatus,
  resetAdminPassword
};