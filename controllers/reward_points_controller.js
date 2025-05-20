const RewardPoints = require("../classes/RewardPoints");
const ErrorResponse = require("../utils/error_response");
const ApprovalEntry = require("../classes/ApprovalEntry");
const { Criteria } = require("../classes/Criteria");
const Leaderboard = require("../classes/Leaderboard");
const Member = require("../classes/Members");
const { Mailer } = require("../classes/Mailer");
const asyncHandler = require("../middlewares/async");
const {
  booleanToStatus,
  generateAlias,
  generateFY,
  getFiscalYearAndQuarter,
  generateSlug,
} = require("../utils/helpers");
const log4js = require("../config/log4js_config");
const logger = log4js.getLogger("rewardPointsController");
const fs = require("fs");
const path = require("path");

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
    logger.error("Invalid criteria");
    return next(new ErrorResponse("Invalid criteria", 400));
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
      approvalEntryData.manager_approval_status = "approved";
      approvalEntryData.director_approval_status = criteria.director_approval
        ? "pending"
        : "approved";
    } else if (role_id === 4) {
      // Manager
      approvalEntryData.manager_approval_status = "approved";
      approvalEntryData.director_approval_status = criteria.director_approval
        ? "pending"
        : "approved";
    } else {
      approvalEntryData.manager_approval_status = "pending";
      approvalEntryData.director_approval_status = criteria.director_approval
        ? "pending"
        : "approved";
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
        nextApproverRole = "Director";
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
      nextApproverRole = "Manager";
      approvalLink = `${process.env.CLIENT_URL}/manager-approval`;
    }

    if (nextApproverEmail) {
      const mailer = new Mailer({
        to: [nextApproverEmail],
        subject: "New Reward Points Entry Submitted for Approval",
        fullname: `${req.userData.member_firstname} ${req.userData.member_lastname}`,
        role: nextApproverRole,
        purpose: "submission",
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
    logger.error("Error in add_reward:", error);
    return next(
      new ErrorResponse(`Failed to submit reward entry: ${error}`, 500)
    );
  }
});

// @desc Update a reward points entry
// @route PUT /api/rewards/:id
// @access PRIVATE | MEMBER | MANAGER
const update_reward = asyncHandler(async (req, res, next) => {
  const reward = req.rewards_entry;

  if (!reward) {
    return next(new ErrorResponse("Reward not found", 404));
  }

  const updatedRewardData = {
    short_description: req.body.short_description,
    cbps_group: req.body.cbps_group,
    project_name: req.body.project_name,
    notes: req.body.notes,
  };

  // Check if project name has changed
  const projectNameChanged = reward.project_name !== req.body.project_name;

  // Generate path slugs
  const oldProjectPath = reward.project_name
    ? generateSlug(reward.project_name)
    : "sample-entry";
  const newProjectPath = req.body.project_name
    ? generateSlug(req.body.project_name)
    : "sample-entry";

  // Create new folder structure if project name changed
  if (projectNameChanged) {
    const newFolderPath = path.join(
      __dirname,
      "..",
      "uploads",
      `${reward.member_employee_id}`,
      newProjectPath
    );

    try {
      if (!fs.existsSync(newFolderPath)) {
        logger.debug(`Creating new folder at: ${newFolderPath}`);
        fs.mkdirSync(newFolderPath, { recursive: true });
        logger.info(`Created new folder at: ${newFolderPath}`);
      }
    } catch (error) {
      logger.error(`Error creating folder at ${newFolderPath}:`, error);
    }
  }

  // Handle file deletions
  let deletedAttachments = [];
  if (req.body.deleted_files) {
    const deletedFiles = JSON.parse(req.body.deleted_files);
    for (const filename of deletedFiles) {
      const attachment = reward.attachments.find(
        (a) => a.filename === filename
      );
      if (!attachment) {
        logger.error(`Attachment with filename ${filename} not found`);
        continue;
      }

      deletedAttachments.push(attachment);

      // Construct the correct file path using the uploads directory
      const filePath = path.join(__dirname, "..", "uploads", attachment.path);

      try {
        logger.debug(`Attempting to delete file at: ${filePath}`);
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
          logger.info(`Successfully deleted file: ${filePath}`);
        } else {
          logger.warn(`File not found at path: ${filePath}`);
        }
      } catch (error) {
        logger.error(`Error deleting file ${filename}:`, error);
      }
    }
  }

  // Handle new file uploads
  let newAttachments = [];
  if (req.files && req.files.length > 0) {
    // If project name changed, move new uploads to the new folder
    if (projectNameChanged) {
      for (const file of req.files) {
        const originalPath = file.path;

        // Create the new path with the new project name
        const relativePath = `${reward.member_employee_id}/${newProjectPath}/${file.filename}`;
        const newFilePath = path.join(__dirname, "..", "uploads", relativePath);

        try {
          const newDir = path.dirname(newFilePath);
          if (!fs.existsSync(newDir)) {
            fs.mkdirSync(newDir, { recursive: true });
            logger.info(`Created directory: ${newDir}`);
          }

          // Move the file from temporary upload location to the correct folder
          if (fs.existsSync(originalPath)) {
            fs.renameSync(originalPath, newFilePath);
            logger.info(
              `Moved uploaded file from ${originalPath} to ${newFilePath}`
            );

            newAttachments.push({
              filename: file.filename,
              path: relativePath.replace(/\\/g, "/"), // Ensure consistent forward slashes
              size: file.size,
            });
          } else {
            logger.error(`Uploaded file not found at: ${originalPath}`);
          }
        } catch (error) {
          logger.error(`Error moving uploaded file ${file.filename}:`, error);
          // Still add the attachment with original path
          newAttachments.push({
            filename: file.filename,
            path: file.path.replace(/\\/g, "/"), // Ensure consistent forward slashes
            size: file.size,
          });
        }
      }
    } else {
      // No project name change, use files as they are
      newAttachments = req.files.map((file) => ({
        filename: file.filename,
        path: file.path.replace(/\\/g, "/"), // Ensure consistent forward slashes
        size: file.size,
      }));
    }
  }

  // Combine existing and new attachments
  let existingAttachments = [];
  if (req.body.existing_files) {
    const existingFilenames = JSON.parse(req.body.existing_files);
    existingAttachments = reward.attachments
      .filter((a) => existingFilenames.includes(a.filename))
      .filter(
        (a) => !deletedAttachments.some((da) => da.filename === a.filename)
      );

    // If project name has changed, update paths for existing attachments
    if (projectNameChanged && existingAttachments.length > 0) {
      // Update file paths in the database
      existingAttachments = existingAttachments.map((attachment) => {
        // Create new attachment object with updated path
        const newAttachment = {
          ...attachment,
          path: attachment.path.replace(
            `${reward.member_employee_id}/${oldProjectPath}/`,
            `${reward.member_employee_id}/${newProjectPath}/`
          ),
        };

        // Move the physical file to the new location
        const oldPath = path.join(__dirname, "..", "uploads", attachment.path);
        const newPath = path.join(
          __dirname,
          "..",
          "uploads",
          newAttachment.path
        );

        // Create directory if it doesn't exist
        const newDir = path.dirname(newPath);
        if (!fs.existsSync(newDir)) {
          fs.mkdirSync(newDir, { recursive: true });
          logger.info(`Created directory: ${newDir}`);
        }

        // Move file if it exists
        if (fs.existsSync(oldPath)) {
          try {
            fs.renameSync(oldPath, newPath);
            logger.info(`File moved from ${oldPath} to ${newPath}`);
          } catch (error) {
            logger.error(`Error moving file ${attachment.filename}:`, error);
          }
        } else {
          logger.warn(`File not found at path when renaming: ${oldPath}`);
        }

        return newAttachment;
      });
    }
  }

  updatedRewardData.attachments = [...existingAttachments, ...newAttachments];

  const updatedReward = await RewardPoints.update(reward.id, updatedRewardData);

  // Clean up empty old directory if project name changed
  if (projectNameChanged) {
    const oldFolderPath = path.join(
      __dirname,
      "..",
      "uploads",
      `${reward.member_employee_id}`,
      oldProjectPath
    );

    try {
      // Check if directory exists and is empty
      if (fs.existsSync(oldFolderPath)) {
        const files = fs.readdirSync(oldFolderPath);
        if (files.length === 0) {
          fs.rmdirSync(oldFolderPath);
          logger.info(`Removed empty folder: ${oldFolderPath}`);
        } else {
          logger.info(
            `Not removing folder ${oldFolderPath} as it still contains ${files.length} files`
          );
        }
      }
    } catch (error) {
      logger.error(`Error cleaning up old folder ${oldFolderPath}:`, error);
    }
  }

  const key =
    req.userData.role_id === 5
      ? "director_approval_status"
      : "manager_approval_status";

  const isManager = req.userData.role_id === 5;

  // Find the criteria based on the criteria_id and role
  const criteria = await Criteria.find(reward.criteria_id, isManager);

  await ApprovalEntry.updateApprovalStatusByRewardsId(
    reward.id,
    key,
    booleanToStatus(1),
    req.userData.role_id,
    criteria
  );

  await Leaderboard.findByEmployeeId(reward.member_employee_id).then(
    (leaderboard) => {
      if (!leaderboard) {
        throw new ErrorResponse("Leaderboard record not found", 404);
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
    subject: "Updated Reward Points Entry Submitted",
    fullname: `${req.userData.member_firstname} ${req.userData.member_lastname}`,
    role: req.userData.role_id === 5 ? "Director" : "Manager",
    purpose: "resubmission",
    rewardPoints: req.body.project_name,
    link:
      req.userData.role_id === 5
        ? `${process.env.CLIENT_URL}/director-approval`
        : `${process.env.CLIENT_URL}/manager-approval`,
  });

  // Send the email
  await mailer.send();

  res.status(200).json({
    success: true,
    message: "Reward updated successfully",
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
    return next(new ErrorResponse("Reward not found", 404));
  }

  res.status(200).json({ success: true, reward });
});

// @desc Get all reward points entries by employee ID of logged in user
// @route GET /api/rewards/member
// @access PRIVATE || MEMBER
const get_rewards_by_member = asyncHandler(async (req, res, next) => {
  const { member_employee_id } = req.userData;
  const rewards = await RewardPoints.findByEmployeeId(member_employee_id);

  // Format rewards for API response
  const formattedRewards = formatRewardsForResponse(rewards);

  res.status(200).json({ success: true, data: formattedRewards });
});

// Helper function to properly format rewards for API responses
const formatRewardsForResponse = (rewards) => {
  if (!rewards || !Array.isArray(rewards)) return [];

  return rewards.map((reward) => {
    // Create a new object with formatted data
    const formattedReward = {
      id: reward.id,
      category: reward.category || "",
      accomplishment: reward.accomplishment || "",
      points: reward.points || 0,
      shortDescription: reward.short_description,
      status: "Pending", // Default status
      date: new Date(reward.created_at).toLocaleString(),
      notes: reward.notes,
      race_season: reward.race_season,
      cbps_group: reward.cbps_group,
      project_name: reward.project_name,
      date_accomplished: reward.date_accomplished,
      criteria_id: reward.criteria_id,
    };

    // Format attachments consistently
    if (reward.attachments) {
      // Already formatted by processAttachments
      if (Array.isArray(reward.attachments)) {
        formattedReward.attachments = reward.attachments.map((attachment) => {
          // Ensure each attachment has the expected fields
          return {
            filename: attachment.filename || "",
            path: attachment.path || "",
            size: attachment.size || 0,
          };
        });
      } else if (typeof reward.attachments === "string") {
        // If it's still a string somehow, convert it
        const filename = reward.attachments;
        formattedReward.attachments = [
          {
            filename: filename,
            path: `${reward.member_employee_id}/sample-entry/${filename}`,
            size: 0,
          },
        ];
      }
    } else {
      formattedReward.attachments = [];
    }

    return formattedReward;
  });
};

// @desc Download reward points entry attachments
// @route GET /api/rewards/download?path=path
// @access PRIVATE
const download_attachment = asyncHandler(async (req, res, next) => {
  try {
    // Debug logging
    logger.debug("Download request query:", req.query);

    const { path: filePath } = req.query;

    // Additional validation
    if (!filePath || typeof filePath !== "string") {
      logger.error("Invalid or missing file path in query:", req.query);
      return next(new ErrorResponse("Valid file path is required", 400));
    }

    // Log the path construction
    logger.debug("File path from query:", filePath);

    // Construct the full path relative to uploads directory
    const uploadsDir = path.join(__dirname, "..", "uploads");
    logger.debug("Uploads directory:", uploadsDir);

    const fullPath = path.join(uploadsDir, filePath);
    logger.debug("Full constructed path:", fullPath);

    // Validate that the path is within uploads directory (security measure)
    const normalizedPath = path.normalize(fullPath);
    logger.debug("Normalized path:", normalizedPath);

    if (!normalizedPath.startsWith(uploadsDir)) {
      logger.error("Path traversal attempt detected:", normalizedPath);
      return next(new ErrorResponse("Invalid file path", 403));
    }

    // Check if file exists
    if (!fs.existsSync(normalizedPath)) {
      logger.error(`File not found at path: ${normalizedPath}`);
      return next(new ErrorResponse("File not found", 404));
    }

    // Get the original filename
    const filename = path.basename(normalizedPath);
    logger.debug("Filename for download:", filename);

    // Send the file
    res.download(normalizedPath, filename, (err) => {
      if (err) {
        logger.error("Error during file download:", err);
        return next(new ErrorResponse("Error downloading file", 500));
      }
      logger.info(`File downloaded successfully: ${filename}`);
    });
  } catch (error) {
    logger.error("Unexpected error in download_attachment:", error);
    return next(new ErrorResponse("Error processing download request", 500));
  }
});

// @desc Admin update a reward points entry
// @route PUT /api/rewards/admin/:id
// @access PRIVATE | ADMIN
const admin_update_reward = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const approvalEntry = await ApprovalEntry.findById(id);

  if (!approvalEntry) {
    return next(new ErrorResponse("Reward not found", 404));
  }

  const reward = approvalEntry.rewards_entry;

  const updatedRewardData = {
    short_description: req.body.shortDescription,
    criteria_id: req.body.criteriaId,
    cbps_group: req.body.cbpsGroup,
    project_name: req.body.projectName,
    notes: req.body.notes,
    race_season: req.body.raceSeason,
    date_accomplished: new Date(req.body.dateAccomplished),
  };

  // Check if project name has changed
  const projectNameChanged = reward.project_name !== req.body.projectName;

  // Generate path slugs
  const oldProjectPath = reward.project_name
    ? generateSlug(reward.project_name)
    : "sample-entry";
  const newProjectPath = req.body.projectName
    ? generateSlug(req.body.projectName)
    : "sample-entry";

  // Create new folder structure if project name changed
  if (projectNameChanged) {
    const newFolderPath = path.join(
      __dirname,
      "..",
      "uploads",
      `${reward.member_employee_id}`,
      newProjectPath
    );

    try {
      if (!fs.existsSync(newFolderPath)) {
        logger.debug(`Creating new folder at: ${newFolderPath}`);
        fs.mkdirSync(newFolderPath, { recursive: true });
        logger.info(`Created new folder at: ${newFolderPath}`);
      }
    } catch (error) {
      logger.error(`Error creating folder at ${newFolderPath}:`, error);
    }
  }

  // Handle file deletions
  let deletedAttachments = [];
  if (req.body.deleted_files) {
    const deletedFiles = JSON.parse(req.body.deleted_files);
    for (const filename of deletedFiles) {
      const attachment = reward.attachments.find(
        (a) => a.filename === filename
      );
      if (!attachment) {
        logger.error(`Attachment with filename ${filename} not found`);
        continue;
      }

      deletedAttachments.push(attachment);

      // Construct the correct file path using the uploads directory
      const filePath = path.join(__dirname, "..", "uploads", attachment.path);

      try {
        logger.debug(`Attempting to delete file at: ${filePath}`);
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
          logger.info(`Successfully deleted file: ${filePath}`);
        } else {
          logger.warn(`File not found at path: ${filePath}`);
        }
      } catch (error) {
        logger.error(`Error deleting file ${filename}:`, error);
      }
    }
  }

  // Handle new file uploads
  let newAttachments = [];
  if (req.files && req.files.length > 0) {
    // If project name changed, move new uploads to the new folder
    if (projectNameChanged) {
      for (const file of req.files) {
        const originalPath = file.path;

        // Create the new path with the new project name
        const relativePath = `${reward.member_employee_id}/${newProjectPath}/${file.filename}`;
        const newFilePath = path.join(__dirname, "..", "uploads", relativePath);

        try {
          const newDir = path.dirname(newFilePath);
          if (!fs.existsSync(newDir)) {
            fs.mkdirSync(newDir, { recursive: true });
            logger.info(`Created directory: ${newDir}`);
          }

          // Move the file from temporary upload location to the correct folder
          if (fs.existsSync(originalPath)) {
            fs.renameSync(originalPath, newFilePath);
            logger.info(
              `Moved uploaded file from ${originalPath} to ${newFilePath}`
            );

            newAttachments.push({
              filename: file.filename,
              path: relativePath.replace(/\\/g, "/"), // Ensure consistent forward slashes
              size: file.size,
            });
          } else {
            logger.error(`Uploaded file not found at: ${originalPath}`);
          }
        } catch (error) {
          logger.error(`Error moving uploaded file ${file.filename}:`, error);
          // Still add the attachment with original path
          newAttachments.push({
            filename: file.filename,
            path: file.path.replace(/\\/g, "/"), // Ensure consistent forward slashes
            size: file.size,
          });
        }
      }
    } else {
      // No project name change, use files as they are
      newAttachments = req.files.map((file) => ({
        filename: file.filename,
        path: file.path.replace(/\\/g, "/"),
        size: file.size,
      }));
    }
  }

  // Combine existing and new attachments
  let existingAttachments = [];
  if (req.body.existing_files) {
    const existingFilenames = JSON.parse(req.body.existing_files);
    existingAttachments = reward.attachments
      .filter((a) => existingFilenames.includes(a.filename))
      .filter(
        (a) => !deletedAttachments.some((da) => da.filename === a.filename)
      );

    // If project name has changed, update paths for existing attachments
    if (projectNameChanged && existingAttachments.length > 0) {
      // Update file paths in the database
      existingAttachments = existingAttachments.map((attachment) => {
        // Create new attachment object with updated path
        const newAttachment = {
          ...attachment,
          path: attachment.path.replace(
            `${reward.member_employee_id}/${oldProjectPath}/`,
            `${reward.member_employee_id}/${newProjectPath}/`
          ),
        };

        // Move the physical file to the new location
        const oldPath = path.join(__dirname, "..", "uploads", attachment.path);
        const newPath = path.join(
          __dirname,
          "..",
          "uploads",
          newAttachment.path
        );

        // Create directory if it doesn't exist
        const newDir = path.dirname(newPath);
        if (!fs.existsSync(newDir)) {
          fs.mkdirSync(newDir, { recursive: true });
          logger.info(`Created directory: ${newDir}`);
        }

        // Move file if it exists
        if (fs.existsSync(oldPath)) {
          try {
            fs.renameSync(oldPath, newPath);
            logger.info(`File moved from ${oldPath} to ${newPath}`);
          } catch (error) {
            logger.error(`Error moving file ${attachment.filename}:`, error);
          }
        } else {
          logger.warn(`File not found at path when renaming: ${oldPath}`);
        }

        return newAttachment;
      });
    }
  }

  updatedRewardData.attachments = [...existingAttachments, ...newAttachments];

  const updatedReward = await RewardPoints.update(reward.id, updatedRewardData);

  // Clean up empty old directory if project name changed
  if (projectNameChanged) {
    const oldFolderPath = path.join(
      __dirname,
      "..",
      "uploads",
      `${reward.member_employee_id}`,
      oldProjectPath
    );

    try {
      // Check if directory exists and is empty
      if (fs.existsSync(oldFolderPath)) {
        const files = fs.readdirSync(oldFolderPath);
        if (files.length === 0) {
          fs.rmdirSync(oldFolderPath);
          logger.info(`Removed empty folder: ${oldFolderPath}`);
        } else {
          logger.info(
            `Not removing folder ${oldFolderPath} as it still contains ${files.length} files`
          );
        }
      }
    } catch (error) {
      logger.error(`Error cleaning up old folder ${oldFolderPath}:`, error);
    }
  }

  // Update approval statuses
  const approvalData = {
    manager_approval_status: req.body.managerApprovalStatus,
    director_approval_status: req.body.directorApprovalStatus,
  };

  await ApprovalEntry.adminUpdateApproval(id, approvalData);

  // Update leaderboard points if criteria changed
  if (reward.criteria_id !== req.body.criteriaId) {
    await Leaderboard.findByEmployeeId(reward.member_employee_id).then(
      async (leaderboard) => {
        if (!leaderboard) {
          throw new ErrorResponse("Leaderboard record not found", 404);
        }

        const member = await Member.findByMemberId(reward.member_employee_id);

        if (!member) {
          throw new ErrorResponse("Member not found", 404);
        }

        // Get both old and new criteria
        const isManager = member.role_id === 5;
        const oldCriteria = await Criteria.find(reward.criteria_id, isManager);
        const newCriteria = await Criteria.find(req.body.criteriaId, isManager);

        if (!oldCriteria || !newCriteria) {
          throw new ErrorResponse("Criteria not found", 404);
        }

        // First remove points from old criteria
        await new Leaderboard(leaderboard).removePoints(
          reward.criteria_id,
          reward.id
        );

        // Determine the approval status to use for points calculation
        let pointsStatus;

        // If new criteria requires director approval
        if (newCriteria.director_approval) {
          if (
            approvalData.manager_approval_status === "approved" &&
            approvalData.director_approval_status === "approved"
          ) {
            pointsStatus = "approved";
          } else if (
            approvalData.manager_approval_status === "rejected" ||
            approvalData.director_approval_status === "rejected"
          ) {
            pointsStatus = "rejected";
          } else {
            pointsStatus = "pending";
          }
        }
        // If new criteria doesn't require director approval
        else {
          if (approvalData.manager_approval_status === "approved") {
            pointsStatus = "approved";
          } else if (approvalData.manager_approval_status === "rejected") {
            pointsStatus = "rejected";
          } else {
            pointsStatus = "pending";
          }
        }

        // Then add points from new criteria
        return new Leaderboard(leaderboard).adminResubmitPoints(
          req.body.criteriaId,
          reward.id,
          pointsStatus
        );
      }
    );
  }

  res.status(200).json({
    success: true,
    message: "Reward updated successfully by admin",
  });
});

module.exports = {
  add_reward,
  update_reward,
  get_rewards,
  get_reward,
  get_rewards_by_member,
  download_attachment,
  admin_update_reward,
};
