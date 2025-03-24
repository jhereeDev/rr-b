const express = require('express');
const {
  search_member,
  map_members,
  add_member,
  get_members,
  get_members_by_role,
  get_members_by_manager,
  get_members_by_director,
  hidePopup,
} = require('../controllers/user_controller');
const { authenticated, checkRole } = require('../middlewares/auth');

const router = express.Router();

// Route to add a new member. Only accessible to users with roles 1, 2, 3, 4, or 5.
router.post('/', add_member);

// Route to search for a member. Only accessible to users with roles 1, 2, 3, 4, or 5.
router.post('/search', search_member);

// Route to map members. Only accessible to users with roles 1, 2, 3, 4, or 5.
router.post('/map', map_members);

// Route to get all members. Only accessible to users with roles 1, 2, 3, 4, or 5.
router.get('/', authenticated, checkRole([1, 2]), get_members);

// Route to get all members by role. Only accessible to users with roles 1, 2
router.get(
  '/role/:role_id',
  authenticated,
  checkRole([1, 2, 3, 4, 5, 6]),
  get_members_by_role
);

// Route to get all members by manager. Only accessible to users with roles 5
router.get(
  '/manager',
  authenticated,
  checkRole([1, 5]),
  get_members_by_manager
);

// Route to get all members by director. Only accessible to users with roles 4
router.get(
  '/director',
  authenticated,
  checkRole([1, 4]),
  get_members_by_director
);

// Route to hide popup. Only accessible to users with roles 1, 2, 3, 4, or 5.
router.post(
  '/hide_popup',
  authenticated,
  checkRole([1, 2, 3, 4, 5, 6]),
  hidePopup
);

module.exports = router;
