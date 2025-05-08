const express = require('express');
const router = express.Router();
const {
  getAllAdmins,
  createAdmin,
  updateAdminStatus,
  resetAdminPassword
} = require('../controllers/admin_controller');
const { authenticated, checkAdminRole } = require('../middlewares/auth');

// All routes require authentication and admin role
router.use(authenticated);
router.use(checkAdminRole);

// Get all admin users
router.get('/users', getAllAdmins);

// Create new admin user
router.post('/users', createAdmin);

// Update admin status
router.put('/users/:id/status', updateAdminStatus);

// Reset admin password
router.put('/users/:id/password', resetAdminPassword);

module.exports = router;