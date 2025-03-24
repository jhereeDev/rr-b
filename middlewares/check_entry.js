const ApprovalEntry = require('../classes/ApprovalEntry');
const ErrorResponse = require('../utils/error_response');

// Check entry manager approval status
const managerCheckEntry = (status) => {
  return async (req, res, next) => {
    try {
      const { resubmitted } = req.body;
      const { id } = req.params;
      const checkEntry = await ApprovalEntry.findById(id);

      if (!resubmitted && checkEntry.manager_approval_status !== status) {
        return next(
          new ErrorResponse('Reward entry has been approved or rejected', 400)
        );
      }
      return next();
    } catch (error) {
      return next(error);
    }
  };
};

// Check entry director approval status
const directorCheckEntry = (status) => {
  return async (req, res, next) => {
    try {
      const { id } = req.params;

      const checkEntry = await ApprovalEntry.findById(id);

      if (checkEntry.director_approval_status !== status) {
        return next(
          new ErrorResponse('Reward entry has been approved or rejected', 400)
        );
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
};

module.exports = { managerCheckEntry, directorCheckEntry };
