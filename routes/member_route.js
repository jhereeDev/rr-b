const express = require('express');
const router = express.Router();
const MemberController = require('../controllers/member_controller');
const { authenticated, checkRole, checkAdminRole } = require('../middlewares/auth');

/**
 * Member Routes
 * Enhanced CRUD functionality with proper role-based access control
 */

// Create and manage members (Admin/Super Admin only)
router.post('/', authenticated, checkAdminRole, MemberController.createMember);

// Create member by email (Admin/Super Admin only)
router.post('/by-email', authenticated, checkAdminRole, MemberController.createMemberByEmail);

// Get all members (Admin/Super Admin only)
router.get('/', authenticated, checkAdminRole, MemberController.getAllMembers);

// IMPORTANT: Add this lookup endpoint with broader access - allow all authenticated users
router.get('/lookup', authenticated, MemberController.lookupMember);

// Search members in LDAP
router.post('/search', authenticated, checkRole([4, 5]), MemberController.searchMembers);

// Map members hierarchically (Directors -> Managers -> Members)
router.post('/map-hierarchy', authenticated, checkAdminRole, MemberController.mapMembersHierarchy);

// Get members by role ID
router.get('/role/:role_id', authenticated, checkRole([4, 5, 6]), MemberController.getByRoleId);

// Get members managed by current user (Managers only)
router.get('/by-manager', authenticated, checkRole([5]), MemberController.getByCurrentManager);

// Get members directed by current user (Directors only)
router.get('/by-director', authenticated, checkRole([1, 4]), MemberController.getByCurrentDirector);

// Hide popup for current user
router.post('/hide-popup', authenticated, checkRole([4, 5, 6]), MemberController.hidePopup);

// Individual member CRUD operations
router.get(
	'/:id',
	authenticated,
	MemberController.getMemberById // Allow any authenticated user to get member by ID
);

router.put('/:id', authenticated, checkAdminRole, MemberController.updateMember);

router.delete('/:id', authenticated, checkAdminRole, MemberController.deleteMember);

/**
 * Update member status
 * @route   PATCH /api/members/:id/status
 * @access  Private (Admin only)
 */
router.put('/:id/status', authenticated, checkAdminRole, MemberController.updateMemberStatus);

module.exports = router;
