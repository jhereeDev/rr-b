// controllers/member_controller.js
const MemberService = require("../classes/MemberService");
const asyncHandler = require("../middlewares/async");
const ErrorResponse = require("../utils/error_response");
const log4js = require("../config/log4js_config");
const logger = log4js.getLogger("memberController");
const Member = require("../classes/Members");
const { Ldap } = require("../classes/Ldap");
const { LDAP_Connection } = require("../config/ldap_config");
const RewardPoints = require("../classes/RewardPoints");
const { database } = require("../config/db_config");
const ApprovalEntry = require("../classes/ApprovalEntry");

/**
 * Enhanced Member Controller
 * Handles all member-related routes with improved CRUD functionality
 */
const MemberController = {
  /**
   * @desc    Create a new member from LDAP by email
   * @route   POST /api/members/by-email
   * @access  Private (Admin, Super Admin)
   */
  createMemberByEmail: asyncHandler(async (req, res, next) => {
    const { email, status } = req.body;

    // Validate required fields
    if (!email) {
      return next(new ErrorResponse("Email is required", 400));
    }

    if (!status || !["ACTIVE", "INACTIVE"].includes(status.toUpperCase())) {
      return next(
        new ErrorResponse("Valid status (ACTIVE or INACTIVE) is required", 400)
      );
    }

    try {
      // Check if member already exists by email
      const existingMember = await Member.findByEmail(email);
      if (existingMember) {
        return next(
          new ErrorResponse("Member with this email already exists", 400)
        );
      }

      // Connect to LDAP
      const LDAP_USERNAME = process.env.LDAP_USER;
      const LDAP_PASSWORD = process.env.LDAP_PASSWORD;
      const client = await LDAP_Connection(LDAP_USERNAME, LDAP_PASSWORD);

      if (!client) {
        logger.error("Failed to connect to LDAP server");
        return next(new ErrorResponse("Failed to connect to LDAP server", 500));
      }

      // Search for user in LDAP by email
      const result = await Ldap.searchByEmail(client, email);

      if (
        !result ||
        result === "No Record Found" ||
        result === "Search timeout"
      ) {
        client.unbind();
        logger.error(`No LDAP record found for email: ${email}`);
        return next(
          new ErrorResponse(`No LDAP record found for: ${email}`, 404)
        );
      }

      // Get complete member information including manager and director
      const memberInfo = await Ldap.getMemberInfo(client, result.cn);
      client.unbind();

      if (!memberInfo || !memberInfo.member) {
        logger.error(`Failed to get complete member info for: ${email}`);
        return next(
          new ErrorResponse("Failed to get complete member information", 500)
        );
      }

      // Set status from request
      memberInfo.member.member_status = status.toUpperCase();

      // Create new member in database
      const newMember = new Member(memberInfo.member);
      await newMember.create();

      // Create manager if not exists
      if (memberInfo.manager && memberInfo.manager.member_employee_id) {
        const existingManager = await Member.findByMemberId(
          memberInfo.manager.member_employee_id
        );
        if (!existingManager) {
          const newManager = new Member(memberInfo.manager);
          await newManager.create();
          logger.info(
            `Created manager: ${memberInfo.manager.member_employee_id}`
          );
        }
      }

      // Create director if not exists
      if (memberInfo.director && memberInfo.director.member_employee_id) {
        const existingDirector = await Member.findByMemberId(
          memberInfo.director.member_employee_id
        );
        if (!existingDirector) {
          const newDirector = new Member(memberInfo.director);
          await newDirector.create();
          logger.info(
            `Created director: ${memberInfo.director.member_employee_id}`
          );
        }
      }

      // Respond with success
      res.status(201).json({
        success: true,
        message: `Member ${memberInfo.member.member_firstname} ${memberInfo.member.member_lastname} created successfully`,
        data: newMember,
      });
    } catch (error) {
      logger.error(`Error creating member by email: ${error.message}`, error);
      return next(
        new ErrorResponse(`Failed to create member: ${error.message}`, 500)
      );
    }
  }),

  /**
   * @desc    Create a new member from LDAP
   * @route   POST /api/members
   * @access  Private (Admin, Super Admin)
   */
  createMember: asyncHandler(async (req, res, next) => {
    const { username } = req.body;

    if (!username) {
      return next(new ErrorResponse("Username is required", 400));
    }

    const newMember = await MemberService.createMember(username);

    res.status(201).json({
      success: true,
      data: newMember,
    });
  }),

  /**
   * @desc    Get a member by ID
   * @route   GET /api/members/:id
   * @access  Private
   */
  getMemberById: asyncHandler(async (req, res, next) => {
    const member = await MemberService.getMemberById(req.params.id);

    res.status(200).json({
      success: true,
      data: member,
    });
  }),

  /**
   * @desc    Update a member
   * @route   PUT /api/members/:id
   * @access  Private (Admin only)
   */
  updateMember: asyncHandler(async (req, res, next) => {
    try {
      const { id } = req.params;
      let updateData = req.body;

      logger.info(
        `Updating member ${id} with data: ${JSON.stringify(updateData)}`
      );

      // Check if manager is provided as email and convert to ID if necessary
      if (updateData.manager_email) {
        // If input is an email, find the manager by email
        logger.info(`Looking up manager by email: ${updateData.manager_email}`);
        const manager = await MemberService.findMemberByEmail(
          updateData.manager_email
        );

        if (!manager) {
          logger.error(
            `Manager not found by email: ${updateData.manager_email}`
          );
          return next(new ErrorResponse("Manager not found", 404));
        }

        logger.info(
          `Found manager by email: ${updateData.manager_email} -> ${manager.member_employee_id}`
        );
        updateData.member_manager_id = manager.member_employee_id;
      }

      // Convert fields like jobTitle to member_title
      if (updateData.jobTitle !== undefined) {
        if (updateData.jobTitle.includes("Manager")) {
          updateData.member_title = updateData.jobTitle;
          updateData.role_id = 5;
        } else if (updateData.jobTitle.includes("Director")) {
          updateData.member_title = updateData.jobTitle;
          updateData.role_id = 4;
        } else {
          updateData.member_title = updateData.jobTitle;
          updateData.role_id = 6;
        }
        delete updateData.jobTitle;
      }

      if (updateData.status !== undefined) {
        updateData.member_status = updateData.status;
        delete updateData.status;
      }

      // Update the member using the service
      const updatedMember = await MemberService.updateMember(id, updateData);

      logger.info(`Member ${id} updated successfully`);

      res.status(200).json({
        success: true,
        message: "Member updated successfully",
        data: updatedMember,
      });
    } catch (error) {
      logger.error(`Error updating member ${req.params.id}: ${error.message}`);
      return next(
        new ErrorResponse(`Failed to update member: ${error.message}`, 500)
      );
    }
  }),

  /**
   * @desc    Delete a member (soft delete)
   * @route   DELETE /api/members/:id
   * @access  Private (Admin, Super Admin)
   */
  deleteMember: asyncHandler(async (req, res, next) => {
    await MemberService.deleteMember(req.params.id);

    res.status(200).json({
      success: true,
      message: "Member successfully deactivated",
    });
  }),

  /**
   * @desc    Get all members with optional filtering
   * @route   GET /api/members
   * @access  Private (Admin, Super Admin)
   */
  getAllMembers: asyncHandler(async (req, res, next) => {
    const filters = {
      status: req.query.status,
      role_id: req.query.role_id,
    };

    const members = await MemberService.getAllMembers(filters);

    res.status(200).json({
      success: true,
      count: members.length,
      data: members,
    });
  }),

  /**
   * @desc    Search members in LDAP
   * @route   POST /api/members/search
   * @access  Private
   */
  searchMembers: asyncHandler(async (req, res, next) => {
    const { username } = req.body;

    if (!username) {
      return next(
        new ErrorResponse("Username search pattern is required", 400)
      );
    }

    const results = await MemberService.searchMembers(username);

    res.status(200).json({
      success: true,
      count: results.length,
      data: results,
    });
  }),

  /**
   * @desc    Map all members hierarchically (Directors -> Managers -> Members)
   * @route   POST /api/members/map-hierarchy
   * @access  Private (Admin, Super Admin)
   */
  mapMembersHierarchy: asyncHandler(async (req, res, next) => {
    const result = await MemberService.mapMembersByHierarchy();

    res.status(200).json({
      success: true,
      message: "Hierarchical member mapping completed",
      data: result,
    });
  }),

  /**
   * @desc    Hide popup for user
   * @route   POST /api/members/hide-popup
   * @access  Private
   */
  hidePopup: asyncHandler(async (req, res, next) => {
    const { member_employee_id } = req.userData;

    try {
      await Member.hidePopup(member_employee_id);
      res.status(200).json({
        success: true,
        message: "Popup hidden successfully",
      });
    } catch (error) {
      logger.error(`Error hiding popup: ${error.message}`);
      return next(
        new ErrorResponse(`Failed to hide popup: ${error.message}`, 500)
      );
    }
  }),

  /**
   * @desc    Get members by role ID
   * @route   GET /api/members/role/:role_id
   * @access  Private
   */
  getByRoleId: asyncHandler(async (req, res, next) => {
    const { role_id } = req.params;

    const members = await Member.findByRoleId(role_id);

    res.status(200).json({
      success: true,
      count: members.length,
      data: members,
    });
  }),

  /**
   * @desc    Get members managed by current user
   * @route   GET /api/members/by-manager
   * @access  Private (Managers)
   */
  getByCurrentManager: asyncHandler(async (req, res, next) => {
    const { employee_id } = req.userData;

    const members = await Member.findByManagerId(employee_id);

    res.status(200).json({
      success: true,
      count: members.length,
      data: members,
    });
  }),

  /**
   * @desc    Get members directed by current user
   * @route   GET /api/members/by-director
   * @access  Private (Directors)
   */
  getByCurrentDirector: asyncHandler(async (req, res, next) => {
    const { employee_id } = req.userData;

    const members = await Member.findByDirectorId(employee_id);

    res.status(200).json({
      success: true,
      count: members.length,
      data: members,
    });
  }),

  /**
   * @desc    Update member status
   * @route   PATCH /api/members/:id/status
   * @access  Private (Admin only)
   */
  updateMemberStatus: asyncHandler(async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // Validate status
      if (!status || !["ACTIVE", "INACTIVE"].includes(status)) {
        return next(new ErrorResponse("Invalid status value", 400));
      }

      logger.info(
        `Attempting to update member status: ${id} - Status: ${status}`
      );

      // Check if member exists
      const member = await Member.findById(id);
      if (!member) {
        logger.error(
          `Member not found with id ${id} during status update attempt`
        );
        return next(new ErrorResponse(`Member not found with id ${id}`, 404));
      }

      // Update the member status
      const updatedMember = new Member({
        ...member,
        member_status: status,
      });

      await updatedMember.update();

      logger.info(`Member status updated: ${id} - Status: ${status}`);

      res.status(200).json({
        success: true,
        message: `Member status updated to ${status}`,
        data: {
          id,
          status,
        },
      });
    } catch (error) {
      logger.error(
        `Error updating member status for id ${req.params.id}: ${error.message}`
      );
      return next(
        new ErrorResponse(
          `Failed to update member status: ${error.message}`,
          500
        )
      );
    }
  }),

  /**
   * @desc    Get detailed member information
   * @route   GET /api/members/details/:id
   * @access  Private (Admin only)
   */
  getMemberDetails: asyncHandler(async (req, res, next) => {
    try {
      const { id } = req.params;
      logger.info(`Getting detailed information for member ID: ${id}`);

      // Get the member from the database
      const member = await Member.findByDatabaseId(id);

      if (!member) {
        logger.error(`Member not found with ID: ${id}`);
        return next(new ErrorResponse(`Member not found with ID: ${id}`, 404));
      }

      // Format the member data according to the required structure
      const formattedMember = {
        id: member.member_employee_id,
        firstName: member.member_firstname,
        lastName: member.member_lastname,
        jobTitle: member.member_title,
        email: member.member_email,
        role_id: member.role_id,
        status: member.member_status === "ACTIVE" ? "Active" : "Inactive",
      };

      res.status(200).json({
        success: true,
        data: formattedMember,
      });
    } catch (error) {
      logger.error(
        `Error getting member details for ID ${req.params.id}: ${error.message}`
      );
      return next(
        new ErrorResponse(`Failed to get member details: ${error.message}`, 500)
      );
    }
  }),

  /**
   * @desc    Look up a member by email or ID
   * @route   GET /api/members/lookup
   * @access  Private
   */
  lookupMember: asyncHandler(async (req, res, next) => {
    const { email, username, id } = req.query;
    const log4js = require("../config/log4js_config");
    const logger = log4js.getLogger("memberController");

    try {
      logger.info(
        `Looking up member with: email=${email}, username=${username}, id=${id}`
      );
      let member;

      // Get the database instance
      const { database } = require("../config/db_config");

      // Build the query based on provided parameters
      let query = database("members");

      if (email) {
        query = query.where("member_email", email);
      } else if (username) {
        query = query.where("member_username", username);
      } else if (id) {
        query = query.where("member_employee_id", id);
      } else {
        logger.error("No search parameter provided");
        return next(
          new ErrorResponse("Email, username, or ID parameter is required", 400)
        );
      }

      // Execute the query
      const result = await query.first();

      if (!result) {
        logger.error(
          `Member lookup failed, no match found: email=${email}, username=${username}, id=${id}`
        );
        return next(new ErrorResponse("Member not found", 404));
      }

      logger.info(`Member lookup successful: ${result.member_employee_id}`);

      // If we found the member, also get their manager's info
      let managerInfo = null;
      if (result.member_manager_id) {
        try {
          const managerQuery = await database("members")
            .where("member_employee_id", result.member_manager_id)
            .first();

          if (managerQuery) {
            managerInfo = managerQuery;
            logger.info(`Found manager: ${managerInfo.member_employee_id}`);
          }
        } catch (err) {
          logger.error(
            `Error finding manager for member ${result.member_employee_id}:`,
            err
          );
          // We don't want to fail the whole request if manager lookup fails
        }
      }

      // Include the manager info in the response if available
      res.status(200).json({
        success: true,
        data: {
          ...result,
          manager: managerInfo,
        },
      });
    } catch (error) {
      logger.error(`Error looking up member: ${error.message}`);
      return next(
        new ErrorResponse(`Failed to lookup member: ${error.message}`, 500)
      );
    }
  }),

  /**
   * @desc    Get member reward entries
   * @route   GET /api/members/details/:id/rewards
   * @access  Private (Admin only)
   */
  getMemberRewardEntries: asyncHandler(async (req, res, next) => {
    try {
      const { id } = req.params;
      logger.info(`Getting reward entries for member with database ID: ${id}`);

      // Get the member from the database
      const member = await Member.findByDatabaseId(id);

      if (!member) {
        logger.error(`Member not found with database ID: ${id}`);
        return next(new ErrorResponse(`Member not found with ID: ${id}`, 404));
      }

      // Get the reward entries for this member
      const rewardEntries = await ApprovalEntry.findByMemberId(
        member.member_employee_id
      );

      res.status(200).json({
        success: true,
        data: rewardEntries,
      });
    } catch (error) {
      logger.error(
        `Error getting member reward entries for ID ${req.params.id}: ${error.message}`
      );
      return next(
        new ErrorResponse(
          `Failed to get member reward entries: ${error.message}`,
          500
        )
      );
    }
  }),

  /**
   * @desc    Update a specific reward entry
   * @route   PUT /api/members/details/:id/rewards/:rewardId
   * @access  Private (Admin only)
   */
  updateRewardEntry: asyncHandler(async (req, res, next) => {
    try {
      const { id, rewardId } = req.params;
      const updateData = req.body;

      logger.info(
        `Updating reward entry ${rewardId} for member with database ID: ${id}`
      );

      // Get the member from the database
      const member = await Member.findByDatabaseId(id);

      if (!member) {
        logger.error(`Member not found with database ID: ${id}`);
        return next(new ErrorResponse(`Member not found with ID: ${id}`, 404));
      }

      // Find the reward entry
      const rewardEntry = await database(RewardPoints.tableName)
        .where("id", rewardId)
        .first();

      if (!rewardEntry) {
        logger.error(`Reward entry not found with ID: ${rewardId}`);
        return next(
          new ErrorResponse(`Reward entry not found with ID: ${rewardId}`, 404)
        );
      }

      // Verify the reward entry belongs to the specified member
      if (rewardEntry.member_employee_id !== member.member_employee_id) {
        logger.error(
          `Reward entry ${rewardId} does not belong to member ${id}`
        );
        return next(
          new ErrorResponse(`Reward entry does not belong to this member`, 403)
        );
      }

      // Prepare update data - only allow specific fields to be updated
      const allowedFields = [
        "criteria_id",
        "short_description",
        "notes",
        "date_accomplished",
        "race_season",
        "cbps_group",
        "project_name",
      ];

      const dataToUpdate = {};

      allowedFields.forEach((field) => {
        if (updateData[field] !== undefined) {
          dataToUpdate[field] = updateData[field];
        }
      });

      // Add updated_at timestamp
      dataToUpdate.updated_at = new Date();

      // Update the reward entry
      await database(RewardPoints.tableName)
        .where("id", rewardId)
        .update(dataToUpdate);

      // If criteria_id was updated, we need to handle approval status changes
      if (
        updateData.criteria_id &&
        updateData.criteria_id !== rewardEntry.criteria_id
      ) {
        // Get the criteria details to check if director approval is required
        const criteria = await database("rewardpointscriteria")
          .where("id", updateData.criteria_id)
          .first();

        // Reset approval status based on new criteria
        const approvalUpdateData = {
          manager_approval_status: "pending",
          updated_at: new Date(),
        };

        // If director approval is required for the new criteria, reset director status too
        if (criteria && criteria.director_approval) {
          approvalUpdateData.director_approval_status = "pending";
        }

        // Update the approval entry
        await database("approvalentry")
          .where("rewards_id", rewardId)
          .update(approvalUpdateData);
      }

      logger.info(`Successfully updated reward entry ${rewardId}`);

      res.status(200).json({
        success: true,
        message: "Reward entry updated successfully",
      });
    } catch (error) {
      logger.error(
        `Error updating reward entry ${req.params.rewardId}: ${error.message}`
      );
      return next(
        new ErrorResponse(
          `Failed to update reward entry: ${error.message}`,
          500
        )
      );
    }
  }),
};

module.exports = MemberController;
