const Leaderboard = require('../classes/Leaderboard');
const asyncHandler = require('../middlewares/async');
const ErrorResponse = require('../utils/error_response');
const log4js = require('../config/log4js_config');
const logger = log4js.getLogger('leaderboardController'); // Logger for auth controller

// @desc      Get all leaderboards
// @route     GET /api/leaderboards
// @access    Public
const getLeaderboards = asyncHandler(async (req, res, next) => {
  const leaderboards = await Leaderboard.findAll();
  res.status(200).json({
    success: true,
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
    logger.error(`Leaderboard not found with id of ${req.params.id}`);
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
  const leaderboard = await Leaderboard.findByRole(
    req.params.roleId,
    req.query.top
  );

  if (!leaderboard) {
    logger.error(`Leaderboard not found with id of ${req.params.id}`);
    return next(
      new ErrorResponse(
        `Leaderboard not found with the role id of ${req.params.alias}`,
        404
      )
    );
  }

  res.status(200).json({
    success: true,
    data: leaderboard,
  });
});

module.exports = {
  getLeaderboards,
  getLeaderboard,
  getLeaderboardByAlias,
  getLeaderboardByRole,
};
