// Enhanced version of leaderboards_controller.js
const Leaderboard = require('../classes/Leaderboard');
const asyncHandler = require('../middlewares/async');
const ErrorResponse = require('../utils/error_response');
const log4js = require('../config/log4js_config');
const logger = log4js.getLogger('leaderboardController');

// @desc      Get all leaderboards
// @route     GET /api/leaderboards
// @access    Public
const getLeaderboards = asyncHandler(async (req, res, next) => {
    const leaderboards = await Leaderboard.findAll();
    res.status(200).json({
        success: true,
        count: leaderboards.length,
        data: leaderboards,
    });
});

// @desc      Get leaderboard by ID
// @route     GET /api/leaderboards/:id
// @access    Public
const getLeaderboard = asyncHandler(async (req, res, next) => {
    const leaderboard = await Leaderboard.findById(req.params.id);
    if (!leaderboard) {
        logger.error(`Leaderboard not found with id of ${req.params.id}`);
        return next(
            new ErrorResponse(
                `Leaderboard not found with id of ${req.params.id}`,
                404
            )
        );
    }
    res.status(200).json({
        success: true,
        data: leaderboard,
    });
});

// @desc      Get leaderboard by alias name
// @route     GET /api/leaderboards/alias/:alias
// @access    Public
const getLeaderboardByAlias = asyncHandler(async (req, res, next) => {
    const leaderboard = await Leaderboard.findByAliasName(req.params.alias);
    if (!leaderboard) {
        logger.error(`Leaderboard not found with alias of ${req.params.alias}`);
        return next(
            new ErrorResponse(
                `Leaderboard not found with alias of ${req.params.alias}`,
                404
            )
        );
    }
    res.status(200).json({
        success: true,
        data: leaderboard,
    });
});

// @desc      Get leaderboard by Role
// @route     GET /api/leaderboards/role/:roleId?top=10
// @access    Public
const getLeaderboardByRole = asyncHandler(async (req, res, next) => {
    const { top } = req.query;
    const roleId = req.params.roleId;

    // Validate roleId
    if (!roleId || isNaN(parseInt(roleId))) {
        return next(new ErrorResponse('Please provide a valid role ID', 400));
    }

    // Convert top to number if provided
    const limit = top ? parseInt(top) : undefined;

    try {
        const leaderboard = await Leaderboard.findByRole(roleId, limit);

        if (!leaderboard || leaderboard.length === 0) {
            logger.warn(`No leaderboard found for role ID: ${roleId}`);
            // Return empty array instead of error for empty results
            return res.status(200).json({
                success: true,
                count: 0,
                data: [],
            });
        }

        logger.info(
            `Successfully retrieved leaderboard for role ID: ${roleId}`
        );

        res.status(200).json({
            success: true,
            count: leaderboard.length,
            data: leaderboard,
        });
    } catch (error) {
        logger.error(
            `Error retrieving leaderboard for role ID ${roleId}: ${error.message}`
        );
        return next(
            new ErrorResponse(
                `Error retrieving leaderboard: ${error.message}`,
                500
            )
        );
    }
});

// @desc      Get leaderboard summary statistics
// @route     GET /api/leaderboards/stats
// @access    Public
const getLeaderboardStats = asyncHandler(async (req, res, next) => {
    try {
        // Get count of members with points by role
        const stats = await Leaderboard.getStats();

        res.status(200).json({
            success: true,
            data: stats,
        });
    } catch (error) {
        logger.error(`Error retrieving leaderboard stats: ${error.message}`);
        return next(
            new ErrorResponse(
                `Error retrieving leaderboard statistics: ${error.message}`,
                500
            )
        );
    }
});

module.exports = {
    getLeaderboards,
    getLeaderboard,
    getLeaderboardByAlias,
    getLeaderboardByRole,
    getLeaderboardStats,
};
