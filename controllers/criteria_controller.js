const { Criteria, CriteriaTableSchema } = require('../classes/Criteria');
const asyncHandler = require('../middlewares/async');
const ErrorResponse = require('../utils/error_response');
const log4js = require('../config/log4js_config');
const logger = log4js.getLogger('criteriaController'); // Logger for auth controller

// @desc    Add a new criteria
// @route   POST /api/criteria?role=member
// @access  Private
const addCriteria = asyncHandler(async (req, res, next) => {
  const { role } = req.query;

  let mappedData;
  if (role === 'leader') {
    mappedData = await Criteria.addManagerCriterias(req);
  } else if (role === 'partner') {
    mappedData = await Criteria.addCriterias(req);
  } else {
    return next(new ErrorResponse(`Criteria role must be provided`, 404));
  }

  res.json({ success: true, data: mappedData });
});

// @desc    Get all criteria
// @route   GET /api/criteria
// @access  Private
const getAllCriteria = asyncHandler(async (req, res, next) => {
  const { role_id } = req.userData;
  const isManager = role_id === 5;

  const criteria = await Criteria.findAll(isManager);

  res.json({ success: true, data: criteria });
});

// @desc    Get a criteria
// @route   GET /api/criteria/:id
// @access  Private
const getCriteria = asyncHandler(async (req, res, next) => {
  const { role_id } = req.userData;
  const isManager = role_id === 5;

  const criteria = await Criteria.find(req.params.id, isManager);

  if (!criteria) {
    logger.error(`Criteria not found with id of ${req.params.id}`);
    return next(
      new ErrorResponse(`Criteria not found with id of ${req.params.id}`, 404)
    );
  }

  res.json({ success: true, data: criteria });
});

// @desc    Update a criteria
// @route   PUT /api/criteria/:id
// @access  Private
// Not Completed
const updateCriteria = asyncHandler(async (req, res, next) => {
  const criteria = await Criteria.find(req.params.id);

  if (!criteria) {
    logger.error(`Criteria not found with id of ${req.params.id}`);

    return next(
      new ErrorResponse(`Criteria not found with id of ${req.params.id}`, 404)
    );
  }

  const updatedCriteria = new Criteria({ ...criteria, ...req.body });

  const mappedData = await updatedCriteria.update();

  res.json({ success: true, data: mappedData });
});

// @desc    Delete a criteria
// @route   DELETE /api/criteria/:id
// @access  Private
// Not Completed
const deleteCriteria = asyncHandler(async (req, res, next) => {
  const criteria = await Criteria.find(req.params.id);

  if (!criteria) {
    logger.error(`Criteria not found with id of ${req.params.id}`);

    return next(
      new ErrorResponse(`Criteria not found with id of ${req.params.id}`, 404)
    );
  }

  await criteria.delete();

  res.json({ success: true, data: {} });
});

// @desc   Get all criteria by category
// @route  GET /api/criteria/category/:category
// @access Private
const getCriteriaByCategory = asyncHandler(async (req, res, next) => {
  const criteria = await Criteria.findByCategory(req.body.category);

  res.json({ success: true, data: criteria });
});

// @desc   Get all criteria by director approval
// @route  GET /api/criteria/director/:director
// @access Private
const getCriteriaByDirector = asyncHandler(async (req, res, next) => {
  const criteria = await Criteria.findByDirectorApproval(req.params.director);

  res.json({ success: true, data: criteria });
});

module.exports = {
  addCriteria,
  getAllCriteria,
  getCriteria,
  updateCriteria,
  deleteCriteria,
  getCriteriaByCategory,
  getCriteriaByDirector,
};
