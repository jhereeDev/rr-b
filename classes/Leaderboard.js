const { database } = require("../config/db_config");
const { Criteria } = require("./Criteria");
const RewardPoints = require("./RewardPoints");
const ErrorResponse = require("../utils/error_response");
const moment = require("moment");
const log4js = require("../config/log4js_config");
const logger = log4js.getLogger("leaderboard");

// Define the Leaderboard class
class Leaderboard {
  static tableName = "leaderboards";

  constructor({
    id,
    member_employee_id,
    alias_name,
    fiscal_year,
    total_points,
    approved_points,
    for_approval_points,
    rejected_points,
    role_id,
  }) {
    this.id = id;
    this.member_employee_id = member_employee_id;
    this.alias_name = alias_name;
    this.fiscal_year = fiscal_year;
    this.total_points = total_points;
    this.approved_points = approved_points;
    this.for_approval_points = for_approval_points;
    this.rejected_points = rejected_points;
    this.role_id = role_id;
  }

  static async findAll() {
    try {
      const query = database
        .from(this.tableName)
        .orderBy("total_points", "desc");

      return this.joinWithMembers(query);
    } catch (error) {
      logger.error(`Error finding all leaderboards: ${error.message}`);
      throw new Error(`Error finding all leaderboards: ${error.message}`);
    }
  }

  static async findById(id) {
    try {
      const query = database
        .from(this.tableName)
        .where("leaderboards.id", id)
        .first();

      return this.joinWithMembers(query);
    } catch (error) {
      logger.error(`Error finding leaderboard by ID ${id}: ${error.message}`);
      throw new Error(`Error finding leaderboard by ID: ${error.message}`);
    }
  }

  static async findByEmployeeId(memberEmployeeId) {
    try {
      if (!memberEmployeeId) {
        logger.warn("Invalid member ID provided to findByEmployeeId");
        return null;
      }

      let query = database(this.tableName)
        .where("leaderboards.member_employee_id", memberEmployeeId)
        .first();

      return this.joinWithMembers(query);
    } catch (error) {
      logger.error(
        `Error finding leaderboard by employee ID ${memberEmployeeId}: ${error.message}`
      );
      throw new Error(
        `Error finding leaderboard by employee ID: ${error.message}`
      );
    }
  }

  static async findByRole(roleId, top = 10) {
    try {
      // Validate roleId
      if (!roleId || isNaN(parseInt(roleId))) {
        logger.warn(`Invalid role ID provided: ${roleId}`);
        return [];
      }

      // Convert to integers
      const roleIdInt = parseInt(roleId);
      const topInt = parseInt(top) || 10;

      // Create base query
      const query = database(this.tableName)
        .join(
          "members",
          "leaderboards.member_employee_id",
          "=",
          "members.member_employee_id"
        )
        .where("members.role_id", roleIdInt)
        .where("members.member_status", "ACTIVE") // Only include active members
        .select(
          "leaderboards.*",
          "members.member_firstname",
          "members.member_lastname",
          "members.member_email",
          "members.role_id",
          "members.member_title",
          "members.member_manager_id",
          "members.member_director_id"
        )
        .orderBy("leaderboards.total_points", "desc")
        .limit(topInt);

      logger.info(
        `Executing findByRole query for role_id=${roleIdInt}, limit=${topInt}`
      );

      const results = await query;
      return results;
    } catch (error) {
      logger.error(
        `Error finding leaderboard by role ID ${roleId}: ${error.message}`
      );
      throw new Error(`Error finding leaderboard by role: ${error.message}`);
    }
  }

  static async findByAliasName(aliasName) {
    try {
      const query = database
        .from(this.tableName)
        .where("leaderboards.alias_name", aliasName)
        .first();

      return this.joinWithMembers(query);
    } catch (error) {
      logger.error(
        `Error finding leaderboard by alias ${aliasName}: ${error.message}`
      );
      throw new Error(`Error finding leaderboard by alias: ${error.message}`);
    }
  }

  // Method to get statistics about leaderboards
  static async getStats() {
    try {
      // Get counts by role
      const roleCounts = await database("members")
        .join(
          "leaderboards",
          "members.member_employee_id",
          "leaderboards.member_employee_id"
        )
        .select("members.role_id")
        .count("* as count")
        .whereNotNull("leaderboards.total_points")
        .where("leaderboards.total_points", ">", 0)
        .groupBy("members.role_id");

      // Get top performers by role (e.g., top 3 per role)
      const topPerformers = {};

      // Get roles 5 (managers) and 6 (partners)
      for (const roleId of [5, 6]) {
        const top3 = await database("members")
          .join(
            "leaderboards",
            "members.member_employee_id",
            "leaderboards.member_employee_id"
          )
          .select(
            "leaderboards.id",
            "leaderboards.alias_name",
            "leaderboards.total_points",
            "leaderboards.approved_points",
            "members.member_firstname",
            "members.member_lastname"
          )
          .where("members.role_id", roleId)
          .where("members.member_status", "ACTIVE")
          .orderBy("leaderboards.total_points", "desc")
          .limit(3);

        topPerformers[`role_${roleId}`] = top3;
      }

      // Get total points by role
      const pointsByRole = await database("members")
        .join(
          "leaderboards",
          "members.member_employee_id",
          "leaderboards.member_employee_id"
        )
        .select("members.role_id")
        .sum("leaderboards.total_points as total")
        .sum("leaderboards.approved_points as approved")
        .sum("leaderboards.for_approval_points as pending")
        .sum("leaderboards.rejected_points as rejected")
        .groupBy("members.role_id");

      return {
        roleCounts,
        topPerformers,
        pointsByRole,
      };
    } catch (error) {
      logger.error(`Error getting leaderboard stats: ${error.message}`);
      throw new Error(`Error getting leaderboard statistics: ${error.message}`);
    }
  }

  // Method to create a new leaderboard record
  async create() {
    try {
      const [id] = await database(Leaderboard.tableName).insert({
        member_employee_id: this.member_employee_id,
        alias_name: this.alias_name,
        fiscal_year: this.fiscal_year,
        total_points: this.total_points || 0,
        approved_points: this.approved_points || 0,
        for_approval_points: this.for_approval_points || 0,
        rejected_points: this.rejected_points || 0,
        created_at: moment().format("YYYY-MM-DD HH:mm:ss"),
        updated_at: moment().format("YYYY-MM-DD HH:mm:ss"),
      });

      this.id = id;
      return this;
    } catch (error) {
      logger.error(`Error creating leaderboard: ${error.message}`);
      throw new Error(`Error creating leaderboard: ${error.message}`);
    }
  }

  async update() {
    try {
      return database(Leaderboard.tableName)
        .where("member_employee_id", this.member_employee_id)
        .update({
          alias_name: this.alias_name,
          fiscal_year: this.fiscal_year,
          total_points: this.total_points || 0,
          approved_points: this.approved_points || 0,
          for_approval_points: this.for_approval_points || 0,
          rejected_points: this.rejected_points || 0,
          updated_at: moment().format("YYYY-MM-DD HH:mm:ss"),
        });
    } catch (error) {
      logger.error(`Error updating leaderboard: ${error.message}`);
      throw new Error(`Error updating leaderboard: ${error.message}`);
    }
  }

  async addPoints(criteria_id, role_id) {
    try {
      const existingLeaderboard = await Leaderboard.findByEmployeeId(
        this.member_employee_id
      );
      if (!existingLeaderboard) {
        logger.error(
          `Leaderboard record not found for member_employee_id: ${this.member_employee_id}`
        );
        throw new ErrorResponse("Leaderboard record not found", 404);
      }

      const isManager = role_id === 5;
      const criteria = await Criteria.find(criteria_id, isManager);
      if (!criteria) {
        logger.error(`Criteria not found with id: ${criteria_id}`);
        throw new ErrorResponse(
          `Criteria not found with id of ${criteria_id}`,
          404
        );
      }

      // Ensure points values are initialized with 0 instead of null/undefined
      const forApprovalPoints = existingLeaderboard.for_approval_points || 0;
      const approvedPoints = existingLeaderboard.approved_points || 0;
      const rejectedPoints = existingLeaderboard.rejected_points || 0;

      let newForApprovalPoints = forApprovalPoints;
      let newApprovedPoints = approvedPoints;

      // Special handling for role_id 6
      if (role_id === 6) {
        newForApprovalPoints = forApprovalPoints + criteria.points;
      } else {
        // Original logic for other roles
        if (criteria.director_approval) {
          newForApprovalPoints = forApprovalPoints + criteria.points;
        } else {
          newApprovedPoints = approvedPoints + criteria.points;
        }
      }

      const totalPoints =
        newForApprovalPoints + newApprovedPoints + rejectedPoints;

      return this.updatePoints({
        for_approval_points: newForApprovalPoints,
        approved_points: newApprovedPoints,
        total_points: totalPoints,
      });
    } catch (error) {
      logger.error(`Error adding points: ${error.message}`);
      throw error; // Re-throw to allow the error to be caught by the caller
    }
  }

  async approvePoints(criteria_id, reward_entry_id, status) {
    try {
      const existingLeaderboard = await Leaderboard.findByEmployeeId(
        this.member_employee_id
      );
      if (!existingLeaderboard) {
        logger.error(
          `Leaderboard record not found for member_employee_id: ${this.member_employee_id}`
        );
        throw new ErrorResponse("Leaderboard record not found", 404);
      }

      const rewardEntry = await RewardPoints.findById(reward_entry_id);
      if (!rewardEntry) {
        logger.error(`Reward entry not found with id: ${reward_entry_id}`);
        throw new ErrorResponse(
          `Reward entry not found with id of ${reward_entry_id}`,
          404
        );
      }

      if (rewardEntry.member_employee_id !== this.member_employee_id) {
        logger.error(
          `Reward entry member ID (${rewardEntry.member_employee_id}) does not match leaderboard member ID (${this.member_employee_id})`
        );
        throw new ErrorResponse(
          "Reward entry not eligible for point update",
          400
        );
      }

      const isManager = this.role_id === 5;

      const criteria = await Criteria.find(criteria_id, isManager);
      if (!criteria) {
        logger.error(`Criteria not found with id: ${criteria_id}`);
        throw new ErrorResponse(
          `Criteria not found with id of ${criteria_id}`,
          404
        );
      }

      const rewardPoints = criteria.points;

      // Ensure all point values are initialized to 0 if null/undefined
      let forApprovalPoints = existingLeaderboard.for_approval_points || 0;
      let approvedPoints = existingLeaderboard.approved_points || 0;
      let rejectedPoints = existingLeaderboard.rejected_points || 0;

      // Validate there are enough points to subtract
      if (forApprovalPoints < rewardPoints) {
        // Log the inconsistency but use available points to avoid negative values
        logger.warn(
          `Inconsistent points data: Trying to subtract ${rewardPoints} points from ${forApprovalPoints} for_approval_points for member ${this.member_employee_id}`
        );
        forApprovalPoints = 0;
      } else {
        forApprovalPoints -= rewardPoints;
      }

      if (status === "approved") {
        approvedPoints += rewardPoints;
      } else if (status === "rejected") {
        rejectedPoints += rewardPoints;
      }

      const totalPoints = forApprovalPoints + approvedPoints + rejectedPoints;

      return this.updatePoints({
        for_approval_points: forApprovalPoints,
        approved_points: approvedPoints,
        rejected_points: rejectedPoints,
        total_points: totalPoints,
      });
    } catch (error) {
      logger.error(`Error approving points: ${error.message}`);
      throw error; // Re-throw to allow the error to be caught by the caller
    }
  }

  async resubmitPoints(criteria_id, reward_entry_id) {
    try {
      const existingLeaderboard = await Leaderboard.findByEmployeeId(
        this.member_employee_id
      );
      if (!existingLeaderboard) {
        logger.error(
          `Leaderboard record not found for member_employee_id: ${this.member_employee_id}`
        );
        throw new ErrorResponse("Leaderboard record not found", 404);
      }

      const rewardEntry = await RewardPoints.findById(reward_entry_id);
      if (!rewardEntry) {
        logger.error(`Reward entry not found with id: ${reward_entry_id}`);
        throw new ErrorResponse(
          `Reward entry not found with id of ${reward_entry_id}`,
          404
        );
      }

      if (rewardEntry.member_employee_id !== this.member_employee_id) {
        logger.error(
          `Reward entry member ID does not match leaderboard member ID`
        );
        throw new ErrorResponse(
          "Reward entry not eligible for point update",
          400
        );
      }

      const isManager = this.role_id === 5;

      const criteria = await Criteria.find(criteria_id, isManager);
      if (!criteria) {
        logger.error(`Criteria not found with id: ${criteria_id}`);
        throw new ErrorResponse(
          `Criteria not found with id of ${criteria_id}`,
          404
        );
      }

      const rewardPoints = criteria.points;

      // Ensure all point values are initialized to 0 if null/undefined
      let forApprovalPoints = existingLeaderboard.for_approval_points || 0;
      let approvedPoints = existingLeaderboard.approved_points || 0;
      let rejectedPoints = existingLeaderboard.rejected_points || 0;

      // Validate there are enough rejected points to subtract
      if (rejectedPoints < rewardPoints) {
        // Log the inconsistency but use available points to avoid negative values
        logger.warn(
          `Inconsistent points data: Trying to subtract ${rewardPoints} points from ${rejectedPoints} rejected_points for member ${this.member_employee_id}`
        );
        rejectedPoints = 0;
      } else {
        rejectedPoints -= rewardPoints;
      }

      forApprovalPoints += rewardPoints;
      const totalPoints = forApprovalPoints + approvedPoints + rejectedPoints;

      return this.updatePoints({
        for_approval_points: forApprovalPoints,
        rejected_points: rejectedPoints,
        total_points: totalPoints,
      });
    } catch (error) {
      logger.error(`Error resubmitting points: ${error.message}`);
      throw error; // Re-throw to allow the error to be caught by the caller
    }
  }

  async adminResubmitPoints(
    criteria_id,
    reward_entry_id,
    status,
    isCriteriaChange = false
  ) {
    try {
      const existingLeaderboard = await Leaderboard.findByEmployeeId(
        this.member_employee_id
      );
      if (!existingLeaderboard) {
        logger.error(
          `Leaderboard record not found for member_employee_id: ${this.member_employee_id}`
        );
        throw new ErrorResponse("Leaderboard record not found", 404);
      }

      const rewardEntry = await RewardPoints.findById(reward_entry_id);
      if (!rewardEntry) {
        logger.error(`Reward entry not found with id: ${reward_entry_id}`);
        throw new ErrorResponse(
          `Reward entry not found with id of ${reward_entry_id}`,
          404
        );
      }

      if (rewardEntry.member_employee_id !== this.member_employee_id) {
        logger.error(
          `Reward entry member ID does not match leaderboard member ID`
        );
        throw new ErrorResponse(
          "Reward entry not eligible for point update",
          400
        );
      }

      const isManager = this.role_id === 5;

      // Get the new criteria
      const newCriteria = await Criteria.find(criteria_id, isManager);
      if (!newCriteria) {
        logger.error(`Criteria not found with id: ${criteria_id}`);
        throw new ErrorResponse(
          `Criteria not found with id of ${criteria_id}`,
          404
        );
      }

      const newPoints = newCriteria.points;

      // If this is a criteria change, we need to get the old criteria points
      let oldPoints = 0;
      if (isCriteriaChange) {
        const oldCriteria = await Criteria.find(
          rewardEntry.criteria_id,
          isManager
        );
        if (oldCriteria) {
          oldPoints = oldCriteria.points;
        }
      }

      // Ensure all point values are initialized to 0 if null/undefined
      let forApprovalPoints = existingLeaderboard.for_approval_points || 0;
      let approvedPoints = existingLeaderboard.approved_points || 0;
      let rejectedPoints = existingLeaderboard.rejected_points || 0;

      // If this is a criteria change, remove the old points first
      if (isCriteriaChange && oldPoints > 0) {
        // Remove old points from their current category
        if (forApprovalPoints >= oldPoints) {
          forApprovalPoints -= oldPoints;
        } else if (approvedPoints >= oldPoints) {
          approvedPoints -= oldPoints;
        } else if (rejectedPoints >= oldPoints) {
          rejectedPoints -= oldPoints;
        }
      }

      // Add new points to the appropriate category based on status
      if (status === "approved") {
        approvedPoints += newPoints;
      } else if (status === "rejected") {
        rejectedPoints += newPoints;
      } else {
        forApprovalPoints += newPoints;
      }

      const totalPoints = forApprovalPoints + approvedPoints + rejectedPoints;

      return this.updatePoints({
        for_approval_points: forApprovalPoints,
        approved_points: approvedPoints,
        rejected_points: rejectedPoints,
        total_points: totalPoints,
      });
    } catch (error) {
      logger.error(`Error resubmitting points: ${error.message}`);
      throw error; // Re-throw to allow the error to be caught by the caller
    }
  }

  async updatePoints(updateData) {
    try {
      // Ensure no negative values are saved to the database
      Object.keys(updateData).forEach((key) => {
        if (typeof updateData[key] === "number" && updateData[key] < 0) {
          logger.warn(
            `Attempted to update ${key} with negative value: ${updateData[key]} for member ${this.member_employee_id}. Defaulting to 0.`
          );
          updateData[key] = 0;
        }
      });

      return database(Leaderboard.tableName)
        .where("member_employee_id", this.member_employee_id)
        .update({
          ...updateData,
          updated_at: moment().format("YYYY-MM-DD HH:mm:ss"),
        });
    } catch (error) {
      logger.error(`Error updating points: ${error.message}`);
      throw new Error(`Error updating points: ${error.message}`);
    }
  }

  async removePoints(criteria_id, reward_entry_id) {
    try {
      const existingLeaderboard = await Leaderboard.findByEmployeeId(
        this.member_employee_id
      );
      if (!existingLeaderboard) {
        logger.error(
          `Leaderboard record not found for member_employee_id: ${this.member_employee_id}`
        );
        throw new ErrorResponse("Leaderboard record not found", 404);
      }

      const rewardEntry = await RewardPoints.findById(reward_entry_id);
      if (!rewardEntry) {
        logger.error(`Reward entry not found with id: ${reward_entry_id}`);
        throw new ErrorResponse(
          `Reward entry not found with id of ${reward_entry_id}`,
          404
        );
      }

      if (rewardEntry.member_employee_id !== this.member_employee_id) {
        logger.error(
          `Reward entry member ID does not match leaderboard member ID`
        );
        throw new ErrorResponse(
          "Reward entry not eligible for point update",
          400
        );
      }

      const isManager = this.role_id === 5;
      const criteria = await Criteria.find(criteria_id, isManager);
      if (!criteria) {
        logger.error(`Criteria not found with id: ${criteria_id}`);
        throw new ErrorResponse(
          `Criteria not found with id of ${criteria_id}`,
          404
        );
      }

      const pointsToRemove = criteria.points;

      // Ensure all point values are initialized to 0 if null/undefined
      let forApprovalPoints = existingLeaderboard.for_approval_points || 0;
      let approvedPoints = existingLeaderboard.approved_points || 0;
      let rejectedPoints = existingLeaderboard.rejected_points || 0;

      // Remove points from their current category
      if (forApprovalPoints >= pointsToRemove) {
        forApprovalPoints -= pointsToRemove;
      } else if (approvedPoints >= pointsToRemove) {
        approvedPoints -= pointsToRemove;
      } else if (rejectedPoints >= pointsToRemove) {
        rejectedPoints -= pointsToRemove;
      }

      const totalPoints = forApprovalPoints + approvedPoints + rejectedPoints;

      return this.updatePoints({
        for_approval_points: forApprovalPoints,
        approved_points: approvedPoints,
        rejected_points: rejectedPoints,
        total_points: totalPoints,
      });
    } catch (error) {
      logger.error(`Error removing points: ${error.message}`);
      throw error;
    }
  }

  async adminResubmitPoints(criteria_id, reward_entry_id, status) {
    try {
      const existingLeaderboard = await Leaderboard.findByEmployeeId(
        this.member_employee_id
      );
      if (!existingLeaderboard) {
        logger.error(
          `Leaderboard record not found for member_employee_id: ${this.member_employee_id}`
        );
        throw new ErrorResponse("Leaderboard record not found", 404);
      }

      const rewardEntry = await RewardPoints.findById(reward_entry_id);
      if (!rewardEntry) {
        logger.error(`Reward entry not found with id: ${reward_entry_id}`);
        throw new ErrorResponse(
          `Reward entry not found with id of ${reward_entry_id}`,
          404
        );
      }

      if (rewardEntry.member_employee_id !== this.member_employee_id) {
        logger.error(
          `Reward entry member ID does not match leaderboard member ID`
        );
        throw new ErrorResponse(
          "Reward entry not eligible for point update",
          400
        );
      }

      const isManager = this.role_id === 5;
      const criteria = await Criteria.find(criteria_id, isManager);
      if (!criteria) {
        logger.error(`Criteria not found with id: ${criteria_id}`);
        throw new ErrorResponse(
          `Criteria not found with id of ${criteria_id}`,
          404
        );
      }

      const points = criteria.points;

      // Ensure all point values are initialized to 0 if null/undefined
      let forApprovalPoints = existingLeaderboard.for_approval_points || 0;
      let approvedPoints = existingLeaderboard.approved_points || 0;
      let rejectedPoints = existingLeaderboard.rejected_points || 0;

      // Add points to the appropriate category based on status
      if (status === "approved") {
        approvedPoints += points;
      } else if (status === "rejected") {
        rejectedPoints += points;
      } else {
        forApprovalPoints += points;
      }

      const totalPoints = forApprovalPoints + approvedPoints + rejectedPoints;

      return this.updatePoints({
        for_approval_points: forApprovalPoints,
        approved_points: approvedPoints,
        rejected_points: rejectedPoints,
        total_points: totalPoints,
      });
    } catch (error) {
      logger.error(`Error resubmitting points: ${error.message}`);
      throw error;
    }
  }

  static joinWithMembers(query) {
    try {
      const memberFields = [
        "members.member_employee_id",
        "members.member_firstname",
        "members.member_lastname",
        "members.member_email",
        "members.role_id",
        "members.member_title",
        "members.member_manager_id",
        "members.member_director_id",
        "members.member_status",
        "members.created_at",
        "members.updated_at",
      ];

      return query
        .select("leaderboards.*", ...memberFields)
        .join(
          "members",
          "leaderboards.member_employee_id",
          "=",
          "members.member_employee_id"
        );
    } catch (error) {
      logger.error(`Error joining with members: ${error.message}`);
      throw new Error(`Error joining with members: ${error.message}`);
    }
  }
}

module.exports = Leaderboard;
