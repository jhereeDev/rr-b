const express = require('express');
const {
  getLeaderboards,
  getLeaderboard,
  getLeaderboardByAlias,
  getLeaderboardByRole,
} = require('../controllers/leaderboards_controller');
const { authenticated, checkRole } = require('../middlewares/auth');

const router = express.Router();

// Route to get all leaderboards
router.get('/', authenticated, getLeaderboards);

// Route to get a leaderboard by id
router.get('/:id', authenticated, getLeaderboard);

// Route to get a leaderboard by alias
router.get('/alias/:alias', authenticated, getLeaderboardByAlias);

// Route to get a leaderboard by role id
router.get('/role/:roleId', authenticated, getLeaderboardByRole);

module.exports = router;
