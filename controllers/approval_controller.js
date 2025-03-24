const ApprovalEntry = require('../classes/ApprovalEntry');
const asyncHandler = require('../middlewares/async');
const ErrorResponse = require('../utils/error_response');
const Leaderboard = require('../classes/Leaderboard');
const { Mailer } = require('../classes/Mailer');
const Member = require('../classes/Members');
const RewardPoints = require('../classes/RewardPoints');
const { capitalize } = require('../utils/helpers');
const log4js = require('../config/log4js_config');
const logger = log4js.getLogger('approvalController'); // Logger for auth controller

// @desc Get rewards entry for approval of current user
// @route GET /api/approval/me
// @access PRIVATE
const getApprovalEntry = asyncHandler(async (req, res, next) => {
  const { member_employee_id } = req.userData;
  const result = await ApprovalEntry.findByMemberId(member_employee_id);
  res.status(200).json(result);
});

// @desc Get rewards entry for approval by id
// @route GET /approval/entry/:id
// @access PRIVATE
const getApprovalById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  let response = await ApprovalEntry.findById(id);

  if (!response) {
    logger.error(`No data found with this id: ${id}`);
    return next(new ErrorResponse('No data found with this id', 404));
  }

  if (response.manager_id) {
    // Get the member's manager name by response data.manager_id

    const managerData = await Member.findByMemberId(response.manager_id);

    response[
      'manager_name'
    ] = `${managerData.member_firstname} ${managerData.member_lastname}`;
  }

  // Get the member's director name by response data.director_id

  const directorData = await Member.findByMemberId(response.director_id);

  response[
    'director_name'
  ] = `${directorData.member_firstname} ${directorData.member_lastname}`;

  res.status(200).json(response);
});

// @desc Get rewards entry for approval of manager user
// @route GET /api/approval/manager?status=pending&managerId=
// @access PRIVATE
const getApprovalEntryManager = asyncHandler(async (req, res, next) => {
  const { status, managerId } = req.query;
  let id;

  if (managerId) {
    id = managerId;
  } else {
    id = req.userData.member_employee_id;
  }

  const result = await ApprovalEntry.findByManagerId(id, status);

  res.status(200).json(result);
});

// @desc Get rewards entry for approval of director user
// @route GET /api/approval/director?status=pending&directorId=1
// @access PRIVATE
const getApprovalEntryDirector = asyncHandler(async (req, res, next) => {
  const { status } = req.query;
  const { role_id } = req.userData;

  let id;
  let managerId;

  if (role_id === 5) {
    id = req.userData.member_manager_id;
    managerId = req.userData.member_employee_id;
  } else id = req.userData.member_employee_id;

  const result = await ApprovalEntry.findByDirectorId(id, status, managerId);
  res.status(200).json(result);
});

// @desc Approve or reject rewards entry for approval of member user by manager
// @route PUT /api/approval/manager/:id?approve=true
// @access PRIVATE
const approveEntryManager = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { approve } = req.query;
  const { manager_notes } = req.body;
  const managerId = req.userData.member_employee_id;
  const directorId = req.userData.member_manager_id;
  const status = approve === 'true' ? 'approved' : 'rejected';

  const checkEntry = await ApprovalEntry.findById(id);

  const rewardPoints = await RewardPoints.findById(checkEntry.rewards_entry.id);

  // Approve or reject entry
  await ApprovalEntry.managerApproval(id, managerId, status, manager_notes);

  // Send email to director for approval if manager approved the entry
  if (status === 'approved') {
    if (checkEntry.director_approval_status === 'pending') {
      // Get the member manager's email
      const director = await Member.findByMemberId(directorId);
      const mailer = new Mailer({
        to: [director.member_email],
        subject: `Reward Points Entry Approval Request for ${rewardPoints.project_name}`,
        fullname: `${req.userData.member_firstname} ${req.userData.member_lastname}`,
        role: 'Director',
        rewardPoints: rewardPoints.project_name,
        link: `${process.env.CLIENT_URL}/director-approval`,
      });

      await mailer.send();
    } else if (checkEntry.director_approval_status === 'approved') {
      await Leaderboard.findByEmployeeId(
        checkEntry.rewards_entry.member_employee_id
      ).then((leaderboard) => {
        if (!leaderboard) {
          throw new ErrorResponse('Leaderboard record not found', 404);
        }
        return new Leaderboard(leaderboard).approvePoints(
          checkEntry.rewards_entry.criteria_id,
          checkEntry.rewards_entry.id,
          status
        );
      });

      const member = await Member.findByMemberId(
        rewardPoints.member_employee_id
      );
      const mailer = new Mailer({
        to: [member.member_email],
        subject: `Reward Points Entry Approved for ${rewardPoints.project_name}`,
        role: 'Partner',
        status,
        purpose: 'approval',
        link: `${process.env.CLIENT_URL}/my-reward-points`,
      });

      await mailer.send();
    }
  } else {
    await Leaderboard.findByEmployeeId(
      checkEntry.rewards_entry.member_employee_id
    ).then((leaderboard) => {
      if (!leaderboard) {
        throw new ErrorResponse('Leaderboard record not found', 404);
      }
      if (checkEntry.director_approval_status === 'rejected') {
        return;
      } else {
        return new Leaderboard(leaderboard).approvePoints(
          checkEntry.rewards_entry.criteria_id,
          checkEntry.rewards_entry.id,
          status
        );
      }
    });

    const member = await Member.findByMemberId(rewardPoints.member_employee_id);
    const mailer = new Mailer({
      to: [member.member_email],
      subject: `Reward Points Entry Rejected for ${rewardPoints.project_name}`,
      role: 'Partner',
      purpose: 'approval',
      status,
      link: `${process.env.CLIENT_URL}/my-reward-points`,
    });

    await mailer.send();
  }

  res.status(200).json({
    message: "Status for manager's approval has been updated",
  });
});

// @desc Approve or reject rewards entry for approval of member user by director
// @route PUT /api/approval/director/:id?approve=true
// @access PRIVATE
const approveEntryDirector = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { approve } = req.query;
  const { director_notes } = req.body;
  const directorId = req.userData.member_employee_id;
  const status = approve === 'true' ? 'approved' : 'rejected';

  const checkEntry = await ApprovalEntry.findById(id);

  const rewardPoints = await RewardPoints.findById(checkEntry.rewards_entry.id);

  const member = await Member.findByMemberId(rewardPoints.member_employee_id);

  // Approve or reject entry
  await ApprovalEntry.directorApproval(id, directorId, status, director_notes);

  // Determine recipeint and mailer details based on member role and approval status
  const mailerData = {
    subject: `Reward Points Entry ${capitalize(status)} for ${
      rewardPoints.project_name
    }`,
    purpose: 'approval',
    status,
  };

  if (member.role_id === 5) {
    // Check if the member is a manager
    mailerData.to = [member.member_email];
    mailerData.role = 'Manager';

    mailerData.link = `${process.env.CLIENT_URL}/my-reward-points`;
  } else {
    // Check if the member is a member
    const manager = await Member.findByMemberId(member.member_manager_id);

    mailerData.to =
      status === 'approved' ? [member.member_email] : [manager.member_email];

    mailerData.role = status === 'approved' ? 'Partner' : 'Manager';
    if (status === 'approved') mailerData.cc = [manager.member_email];
    else mailerData.cc = [member.member_email];

    mailerData.link =
      status === 'approved'
        ? `${process.env.CLIENT_URL}/my-reward-points`
        : `${process.env.CLIENT_URL}/declined-entries`;
  }

  // Send email notification to the relevant parties
  await new Mailer(mailerData).send();

  await Leaderboard.findByEmployeeId(
    checkEntry.rewards_entry.member_employee_id
  ).then((leaderboard) => {
    if (!leaderboard) {
      throw new ErrorResponse('Leaderboard record not found', 404);
    }
    return new Leaderboard(leaderboard).approvePoints(
      checkEntry.rewards_entry.criteria_id,
      checkEntry.rewards_entry.id,
      status
    );
  });

  res.status(200).json({
    message: "Status for director's approval has been updated",
  });
});

module.exports = {
  getApprovalById,
  getApprovalEntry,
  getApprovalEntryManager,
  getApprovalEntryDirector,
  approveEntryManager,
  approveEntryDirector,
};
