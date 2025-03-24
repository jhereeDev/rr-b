const RewardPoints = require('../classes/RewardPoints');
const ErrorResponse = require('../utils/error_response');
const ApprovalEntry = require('../classes/ApprovalEntry');
const { Criteria } = require('../classes/Criteria');
const Leaderboard = require('../classes/Leaderboard');
const Member = require('../classes/Members');
const { Mailer } = require('../classes/Mailer');
const asyncHandler = require('../middlewares/async');
const {
  booleanToStatus,
  generateAlias,
  generateFY,
  getFiscalYearAndQuarter,
  generateSlug,
} = require('../utils/helpers');
const log4js = require('../config/log4js_config');
const logger = log4js.getLogger('rewardPointsController');
const fs = require('fs');
const path = require('path');

// @desc Add a reward points entry
// @route PORT /api/rewards
// @access PRIVATE
const add_reward = asyncHandler(async (req, res, next) => {
  // Destructure the request body to get the necessary fields
  const {
    short_description,
    criteria_id,
    date_accomplished,
    cbps_group,
    project_name,
    notes,
  } = req.body;

  // Destructure the user data to get the member ids
  const { member_employee_id, member_manager_id, member_director_id, role_id } =
    req.userData;
  const isManager = role_id === 5;

  // Find the criteria based on the criteria_id and role
  const criteria = await Criteria.find(criteria_id, isManager);

  // Check if criteria is valid
  if (!criteria) {
    logger.error('Invalid criteria');
    return next(new ErrorResponse('Invalid criteria', 400));
  }

  // Create a new RewardPoints object
  const rewardPointsEntry = new RewardPoints({
    short_description,
    member_employee_id,
    criteria_id,
    date_accomplished,
    race_season: getFiscalYearAndQuarter(),
    cbps_group,
    project_name,
    notes,
    attachments: req.files,
  });

  // Generate alias and fiscal year
  const alias_name = await generateAlias();
  const fiscal_year = generateFY();

  // Create a new Leaderboard object
  const leaderboard = new Leaderboard({
    member_employee_id,
    alias_name,
    fiscal_year,
  });

  // Check if leaderboard exists for the employee
  const leaderboardExist = await Leaderboard.findByEmployeeId(
    member_employee_id
  );

  // If leaderboard does not exist, create a new one
  if (!leaderboardExist) {
    await leaderboard.create();
  }

  try {
    // Add points to the leaderboard and create a new rewards entry
    await leaderboard.addPoints(criteria_id, role_id);
    const { id: rewardId } = await rewardPointsEntry.create();

    let approvalEntryData = {
      rewards_id: rewardId,
      manager_id: role_id === 6 ? member_manager_id : null,
      director_id:
        role_id === 6
          ? member_director_id
          : role_id === 5
          ? member_manager_id
          : null,
    };

    if (role_id === 5) {
      // Director
      approvalEntryData.manager_approval_status = 'approved';
      approvalEntryData.director_approval_status = criteria.director_approval
        ? 'pending'
        : 'approved';
    } else if (role_id === 4) {
      // Manager
      approvalEntryData.manager_approval_status = 'approved';
      approvalEntryData.director_approval_status = criteria.director_approval
        ? 'pending'
        : 'approved';
    } else {
      approvalEntryData.manager_approval_status = 'pending';
      approvalEntryData.director_approval_status = criteria.director_approval
        ? 'pending'
        : 'approved';
    }

    // Create a new ApprovalEntry object
    const approvalEntry = new ApprovalEntry(approvalEntryData);

    await approvalEntry.create();

    // Determine the next approver and send an email to them
    let nextApproverEmail = null;
    let nextApproverRole = null;
    let approvalLink = null;

    if (role_id === 4) {
      // Director
      // No further approval needed
      nextApproverEmail = null;
    } else if (role_id === 5) {
      // Manager
      if (criteria.director_approval) {
        // Send to director
        const director = await Member.findByMemberId(member_manager_id);
        nextApproverEmail = director.member_email;
        nextApproverRole = 'Director';
        approvalLink = `${process.env.CLIENT_URL}/director-approval`;
      } else {
        // No further approval needed if director approval is not required
        nextApproverEmail = null;
      }
    } else if (role_id === 6 || role_id === 1) {
      // Member
      // Send to manager
      const manager = await Member.findByMemberId(member_manager_id);
      nextApproverEmail = manager.member_email;
      nextApproverRole = 'Manager';
      approvalLink = `${process.env.CLIENT_URL}/manager-approval`;
    }

    if (nextApproverEmail) {
      const mailer = new Mailer({
        to: [nextApproverEmail],
        subject: 'New Reward Points Entry Submitted for Approval',
        fullname: `${req.userData.member_firstname} ${req.userData.member_lastname}`,
        role: nextApproverRole,
        purpose: 'submission',
        link: approvalLink,
      });

      await mailer.send();
    }

    // Send a success response
    res.status(201).json({
      success: true,
      message: `Rewards entry submitted successfully`,
    });
  } catch (error) {
    console.log();
    logger.error('Error in add_reward:', error);
    return next(
      new ErrorResponse(`Failed to submit reward entry: ${error}`, 500)
    );
  }
});

// @desc Update a reward points entry
// @route PUT /api/rewards/:id
// @access PRIVATE | MEMBER | MANAGER
const update_reward = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const reward = await RewardPoints.findById(id);

  if (!reward) {
    return next(new ErrorResponse('Reward not found', 404));
  }

  const updatedRewardData = {
    short_description: req.body.short_description,
    cbps_group: req.body.cbps_group,
    project_name: req.body.project_name,
    notes: req.body.notes,
  };

  // Handle file deletions
  if (req.body.deleted_files) {
    const deletedFiles = JSON.parse(req.body.deleted_files);
    for (const filename of deletedFiles) {
      const filePath = path.join(
        __dirname,
        '..',
        reward.attachments.find((a) => a.filename === filename).path
      );
      try {
        await fs.promises.unlink(filePath);
      } catch (error) {
        console.error(`Error deleting file ${filename}:`, error);
      }
    }
  }

  // Handle new file uploads
  let newAttachments = [];
  if (req.files && req.files.length > 0) {
    newAttachments = req.files.map((file) => ({
      filename: file.filename,
      path: file.path.replace(/\\/g, '/'), // Ensure consistent forward slashes
      size: file.size,
    }));
  }

  // Combine existing and new attachments
  let existingAttachments = [];
  if (req.body.existing_files) {
    const existingFilenames = JSON.parse(req.body.existing_files);
    existingAttachments = reward.attachments.filter((a) =>
      existingFilenames.includes(a.filename)
    );
  }

  updatedRewardData.attachments = [...existingAttachments, ...newAttachments];

  const updatedReward = await RewardPoints.update(id, updatedRewardData);

  const key =
    req.userData.role_id === 5
      ? 'director_approval_status'
      : 'manager_approval_status';

  const isManager = req.userData.role_id === 5;

  // Find the criteria based on the criteria_id and role
  const criteria = await Criteria.find(reward.criteria_id, isManager);

  await ApprovalEntry.updateApprovalStatusByRewardsId(
    id,
    key,
    booleanToStatus(1),
    req.userData.role_id,
    criteria
  );

  await Leaderboard.findByEmployeeId(reward.member_employee_id).then(
    (leaderboard) => {
      if (!leaderboard) {
        throw new ErrorResponse('Leaderboard record not found', 404);
      }
      return new Leaderboard(leaderboard).resubmitPoints(
        reward.criteria_id,
        reward.id
      );
    }
  );

  // Get the member manager's emails
  const manager = await Member.findByMemberId(req.userData.member_manager_id);

  // Email the manager if the current user is a member and email the director if the current user is a manager
  const mailer = new Mailer({
    to: [manager.member_email],
    subject: 'Updated Reward Points Entry Submitted',
    fullname: `${req.userData.member_firstname} ${req.userData.member_lastname}`,
    role: req.userData.role_id === 5 ? 'Director' : 'Manager',
    purpose: 'resubmission',
    rewardPoints: reward.project_name,
    link:
      req.userData.role_id === 5
        ? `${process.env.CLIENT_URL}/director-approval`
        : `${process.env.CLIENT_URL}/manager-approval`,
  });

  // Send the email
  await mailer.send();

  res.status(200).json({
    success: true,
    message: 'Reward updated',
  });
});

// @desc Get all reward points entries
// @route GET /api/rewards
// @access PRIVATE
const get_rewards = asyncHandler(async (req, res, next) => {
  const rewards = await RewardPoints.findAll();
  res.status(200).json({ success: true, rewards });
});

// @desc Get reward points entry by ID
// @route GET /api/rewards/:id
// @access PRIVATE
const get_reward = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const reward = await RewardPoints.findById(id);

  if (!reward) {
    logger.error(`Reward not found with this id: ${id}`);
    return next(new ErrorResponse('Reward not found', 404));
  }

  res.status(200).json({ success: true, reward });
});

// @desc Get all reward points entries by employee ID of logged in user
// @route GET /api/rewards/member
// @access PRIVATE || MEMBER
const get_rewards_by_member = asyncHandler(async (req, res, next) => {
  const { member_employee_id } = req.userData;
  const rewards = await RewardPoints.findByEmployeeId(member_employee_id);
  res.status(200).json({ success: true, rewards });
});

// @desc Download reward points entry attachments
// @route GET /api/rewards/download?path=path
// @access PRIVATE
const download_attachment = asyncHandler(async (req, res, next) => {
  try {
    // Debug logging
    logger.debug('Download request query:', req.query);

    const { path: filePath } = req.query;

    // Additional validation
    if (!filePath || typeof filePath !== 'string') {
      logger.error('Invalid or missing file path in query:', req.query);
      return next(new ErrorResponse('Valid file path is required', 400));
    }

    // Log the path construction
    logger.debug('File path from query:', filePath);

    // Construct the full path relative to uploads directory
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    logger.debug('Uploads directory:', uploadsDir);

    const fullPath = path.join(uploadsDir, filePath);
    logger.debug('Full constructed path:', fullPath);

    // Validate that the path is within uploads directory (security measure)
    const normalizedPath = path.normalize(fullPath);
    logger.debug('Normalized path:', normalizedPath);

    if (!normalizedPath.startsWith(uploadsDir)) {
      logger.error('Path traversal attempt detected:', normalizedPath);
      return next(new ErrorResponse('Invalid file path', 403));
    }

    // Check if file exists
    if (!fs.existsSync(normalizedPath)) {
      logger.error(`File not found at path: ${normalizedPath}`);
      return next(new ErrorResponse('File not found', 404));
    }

    // Get the original filename
    const filename = path.basename(normalizedPath);
    logger.debug('Filename for download:', filename);

    // Send the file
    res.download(normalizedPath, filename, (err) => {
      if (err) {
        logger.error('Error during file download:', err);
        return next(new ErrorResponse('Error downloading file', 500));
      }
      logger.info(`File downloaded successfully: ${filename}`);
    });
  } catch (error) {
    logger.error('Unexpected error in download_attachment:', error);
    return next(new ErrorResponse('Error processing download request', 500));
  }
});

module.exports = {
  add_reward,
  update_reward,
  get_rewards,
  get_reward,
  get_rewards_by_member,
  download_attachment,
};
