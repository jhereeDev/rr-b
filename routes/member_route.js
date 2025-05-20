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

// Get detailed member information (Admin/Super Admin only)
router.get('/details/:id', authenticated, checkAdminRole, MemberController.getMemberDetails);

// Get member reward entries (Admin/Super Admin only)
router.get('/details/:id/rewards', authenticated, checkAdminRole, MemberController.getMemberRewardEntries);

// Update a specific reward entry (Admin/Super Admin only)
router.put('/details/:id/rewards/:rewardId', authenticated, checkAdminRole, MemberController.updateRewardEntry);

// Individual member CRUD operations
router.get(
	'/:id',
	authenticated,
	MemberController.getMemberById
);

router.put('/:id', authenticated, checkAdminRole, MemberController.updateMember);

router.delete('/:id', authenticated, checkAdminRole, MemberController.deleteMember);

// Update member status
router.put('/:id/status', authenticated, checkAdminRole, MemberController.updateMemberStatus);

module.exports = router;