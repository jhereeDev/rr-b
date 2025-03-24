const ApprovalEntry = require('../classes/ApprovalEntry');
const RewardPoints = require('../classes/RewardPoints');
const Member = require('../classes/Members');
const ErrorResponse = require('../utils/error_response');

// Check if the current user owns or is the manager of the reward points
const IsOwnerOfRewardPoints = async (req, res, next) => {
  const { id } = req.params;
  const employeeId = req.userData.member_employee_id;

  const checkRewardPoints = await RewardPoints.findById(id);

  const member = await Member.findByMemberId(
    checkRewardPoints.member_employee_id
  );

  // Check if the current user is the owner or manager of the reward points
  if (
    checkRewardPoints.member_employee_id !== member.member_employee_id &&
    member.member_manager_id !== employeeId
  ) {
    return next(new ErrorResponse('Unauthorized to this request', 401));
  }

  return next();
};

// Check if the user is the manager of the member
const IsManagerOfMember = async (req, res, next) => {
  const { id } = req.params;
  const managerId = req.userData.member_employee_id;

  const checkEntry = await ApprovalEntry.findById(id);

  if (checkEntry.manager_id !== managerId) {
    return next(new ErrorResponse('Unauthorized to this request', 401));
  }

  return next();
};

// Check if the user is the director of the member
const IsDirectorOfMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const directorId = req.userData.member_employee_id;

    const checkEntry = await ApprovalEntry.findById(id);

    if (checkEntry.director_id !== directorId) {
      return next(new ErrorResponse('Unauthorized to this request', 401));
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  IsManagerOfMember,
  IsDirectorOfMember,
  IsOwnerOfRewardPoints,
};
