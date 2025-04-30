const express = require('express');
const {
    getLeaderboards,
    getLeaderboard,
    getLeaderboardByAlias,
    getLeaderboardByRole,
    getLeaderboardStats,
} = require('../controllers/leaderboards_controller');
const { authenticated, checkRole } = require('../middlewares/auth');

const router = express.Router();

// Route to get all leaderboards
router.get('/', authenticated, getLeaderboards);

// Route to get leaderboard statistics (new endpoint)
router.get('/stats', authenticated, getLeaderboardStats);

// Route to get a leaderboard by id
router.get('/:id', authenticated, getLeaderboard);

// Route to get a leaderboard by alias
router.get('/alias/:alias', authenticated, getLeaderboardByAlias);

// Route to get a leaderboard by role id
// Optional query parameter "top" to limit results
router.get('/role/:roleId', authenticated, getLeaderboardByRole);

module.exports = router;
