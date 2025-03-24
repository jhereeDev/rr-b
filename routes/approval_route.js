const express = require('express');
const router = express.Router();
const {
  getApprovalById,
  getApprovalEntry,
  getApprovalEntryManager,
  getApprovalEntryDirector,
  approveEntryManager,
  approveEntryDirector,
} = require('../controllers/approval_controller');
const { authenticated, checkRole } = require('../middlewares/auth');
const {
  IsManagerOfMember,
  IsDirectorOfMember,
} = require('../middlewares/authorized');
const {
  managerCheckEntry,
  directorCheckEntry,
} = require('../middlewares/check_entry');

// Route to get all approval entries of current user
router.get(
  '/me',
  authenticated,
  checkRole([1, 2, 3, 4, 5, 6]),
  getApprovalEntry
);

// Route to get approval entry by id
router.get(
  '/entry/:id',
  authenticated,
  checkRole([1, 2, 3, 4, 5, 6]),
  getApprovalById
);

// Route to get all approval entries of manager
router.get(
  '/manager',
  authenticated,
  checkRole([3, 4, 5, 6]),
  getApprovalEntryManager
);

// Route to get all approval entries of director
router.get(
  '/director',
  authenticated,
  checkRole([3, 4, 5, 6]),
  getApprovalEntryDirector
);

// Route to approve entry by manager
router.put(
  '/manager/:id',
  authenticated,
  checkRole([5]),
  IsManagerOfMember,
  managerCheckEntry('pending'),
  approveEntryManager
);

// Route to approve entry by director
router.put(
  '/director/:id',
  authenticated,
  checkRole([4, 5]),
  IsDirectorOfMember,
  managerCheckEntry('approved'),
  directorCheckEntry('pending'),
  approveEntryDirector
);

module.exports = router;
