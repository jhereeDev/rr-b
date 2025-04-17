const express = require('express');
const router = express.Router();
const MemberController = require('../controllers/member_controller');
const { authenticated, checkRole } = require('../middlewares/auth');

/**
 * Member Routes
 * Enhanced CRUD functionality with proper role-based access control
 */

// Create and manage members (Admin/Super Admin only)
router.post(
    '/',
    authenticated,
    checkRole([1, 2]),
    MemberController.createMember
);

// Get all members (Admin/Super Admin only)
router.get(
    '/',
    authenticated,
    checkRole([1, 2]),
    MemberController.getAllMembers
);

// Search members in LDAP
router.post(
    '/search',
    authenticated,
    checkRole([1, 2, 3, 4, 5]),
    MemberController.searchMembers
);

// Map members hierarchically (Directors -> Managers -> Members)
router.post(
    '/map-hierarchy',
    authenticated,
    checkRole([1, 2]),
    MemberController.mapMembersHierarchy
);

// Get members by role ID
router.get(
    '/role/:role_id',
    authenticated,
    checkRole([1, 2, 3, 4, 5, 6]),
    MemberController.getByRoleId
);

// Get members managed by current user (Managers only)
router.get(
    '/by-manager',
    authenticated,
    checkRole([1, 5]),
    MemberController.getByCurrentManager
);

// Get members directed by current user (Directors only)
router.get(
    '/by-director',
    authenticated,
    checkRole([1, 4]),
    MemberController.getByCurrentDirector
);

// Hide popup for current user
router.post(
    '/hide-popup',
    authenticated,
    checkRole([1, 2, 3, 4, 5, 6]),
    MemberController.hidePopup
);

// Individual member CRUD operations
router.get(
    '/:id',
    authenticated,
    checkRole([1, 2]),
    MemberController.getMemberById
);

router.put(
    '/:id',
    authenticated,
    checkRole([1, 2]),
    MemberController.updateMember
);

router.delete(
    '/:id',
    authenticated,
    checkRole([1, 2]),
    MemberController.deleteMember
);

module.exports = router;
