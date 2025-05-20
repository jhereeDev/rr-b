const { database } = require("../config/db_config");
const moment = require("moment");
const { getFiles } = require("../utils/file_getter");

// Define the ApprovalEntry class
class ApprovalEntry {
  constructor({
    id,
    rewards_id,
    manager_id,
    director_id,
    manager_approval_status,
    director_approval_status,
    manager_notes,
    director_notes,
  }) {
    this.id = id;
    this.rewards_id = rewards_id;
    this.manager_id = manager_id;
    this.director_id = director_id;
    this.manager_approval_status = manager_approval_status;
    this.director_approval_status = director_approval_status;
    this.manager_notes = manager_notes;
    this.director_notes = director_notes;
  }

  static get tableName() {
    return "approvalentry";
  }

  // Method to create a new ApprovalEntry
  async create() {
    try {
      const result = await database(ApprovalEntry.tableName).insert(this);

      if (!result || !result.length === 0) {
        throw new Error("Insert operation did not return an ID");
      }

      this.id = result[0];
      return this;
    } catch (error) {
      console.error("Error creating approval entry:", error);
      throw new Error(`Error creating approval entry: ${error.message}`);
    }
  }

  // Method to read a single ApprovalEntry by ID
  static async findById(id) {
    try {
      const entry = await this.fetchAndFormatEntries({
        "approvalentry.id": id,
      });
      return entry[0];
    } catch (error) {
      console.error("Error finding approval entry by ID:", error);
      throw new Error(`Error finding approval entry by ID: ${error.message}`);
    }
  }

  // Mathod to read all ApprovalEntry
  static async findAll() {
    try {
      return await this.fetchAndFormatEntries({});
    } catch (error) {
      console.error("Error finding all approval entries:", error);
      throw new Error(`Error finding all approval entries: ${error.message}`);
    }
  }

  // Method to update a single ApprovalEntry by ID
  static async update(id, data) {
    try {
      return await database(ApprovalEntry.tableName)
        .where("id", id)
        .update(data);
    } catch (error) {
      console.error("Error updating approval entry:", error);
      throw new Error(`Error updating approval entry: ${error.message}`);
    }
  }

  // Method to update approval status by rewards id
  static async updateApprovalStatusByRewardsId(
    reward_id,
    key,
    value,
    roleId,
    criteria
  ) {
    let updateData = {
      [key]: value,
      updated_at: moment().format("YYYY-MM-DD HH:mm:ss"),
    };

    if (key === "director_approval_status") {
      updateData["director_notes"] = null;
    } else if (key === "manager_approval_status") {
      updateData["manager_notes"] = null;
    }

    if (roleId === 6 && criteria.director_approval) {
      updateData["director_approval_status"] = "pending";
      updateData["director_notes"] = null;
    }

    try {
      return await database(ApprovalEntry.tableName)
        .where("rewards_id", reward_id)
        .update(updateData);
    } catch (error) {
      console.error("Error updating approval status by rewards id:", error);
      throw new Error(
        `Error updating approval status by rewards id: ${error.message}`
      );
    }
  }

  static async findByRewardId(reward_id) {
    try {
      return await this.fetchAndFormatEntries({
        "approvalentry.rewards_id": reward_id,
      });
    } catch (error) {
      console.error("Error finding approval entry by reward ID:", error);
      throw new Error(
        `Error finding approval entry by reward ID: ${error.message}`
      );
    }
  }

  static async findByManagerId(manager_id, manager_approval_status) {
    try {
      let whereConditions = { manager_id };
      if (manager_approval_status) {
        whereConditions["manager_approval_status"] = manager_approval_status;
      }
      return this.fetchAndFormatEntries(
        whereConditions,
        "rewardsentry.created_at",
        "desc"
      );
    } catch (error) {
      console.error("Error finding approval entry by manager ID:", error);
      throw new Error(
        `Error finding approval entry by manager ID: ${error.message}`
      );
    }
  }

  static async findByDirectorId(director_id, status, manager_id) {
    try {
      let whereConditions = {
        director_id,
        "approvalentry.manager_approval_status": "approved",
      };
      if (status) {
        whereConditions["director_approval_status"] = status;
      }
      if (manager_id) {
        whereConditions["manager_id"] = manager_id;
      }
      return this.fetchAndFormatEntries(
        whereConditions,
        "rewardsentry.created_at",
        "desc"
      );
    } catch (error) {
      console.error("Error finding approval entry by director ID:", error);
      throw new Error(
        `Error finding approval entry by director ID: ${error.message}`
      );
    }
  }

  static async findByMemberId(member_employee_id) {
    try {
      return this.fetchAndFormatEntries({
        "rewardsentry.member_employee_id": member_employee_id,
      });
    } catch (error) {
      console.error("Error finding approval entry by member ID:", error);
      throw new Error(
        `Error finding approval entry by member ID: ${error.message}`
      );
    }
  }

  static async managerApproval(
    id,
    manager_id,
    manager_approval_status,
    manager_notes
  ) {
    try {
      return await database(ApprovalEntry.tableName)
        .where({ id, manager_id })
        .update({
          manager_approval_status,
          manager_notes,
          updated_at: moment().format("YYYY-MM-DD HH:mm:ss"),
        });
    } catch (error) {
      console.error("Error approving entry by manager:", error);
      throw new Error(`Error approving entry by manager: ${error.message}`);
    }
  }

  static async directorApproval(
    id,
    director_id,
    director_approval_status,
    director_notes
  ) {
    try {
      return await database(ApprovalEntry.tableName)
        .where({ id, director_id })
        .update({
          director_approval_status,
          director_notes,
          updated_at: moment().format("YYYY-MM-DD HH:mm:ss"),
        });
    } catch (error) {
      console.error("Error approving entry by director:", error);
      throw new Error(`Error approving entry by director: ${error.message}`);
    }
  }

  static async adminUpdateApproval(id, approvalData) {
    try {
      return await database(ApprovalEntry.tableName)
        .where("id", id)
        .update(approvalData);
    } catch (error) {
      console.error("Error updating approval entry:", error);
      throw new Error(`Error updating approval entry: ${error.message}`);
    }
  }

  // Method to fetch and format entries
  static async fetchAndFormatEntries(
    whereConditions,
    orderBy = null,
    direction = "asc"
  ) {
    const query = database(this.tableName)
      .select(
        "approvalentry.id as approval_entry_id",
        "approvalentry.*",
        "rewardsentry.*",
        "members.member_firstname",
        "members.member_lastname",
        "members.role_id",
        "members.id as member_id",
        "rewardsentry.id AS rewards_entry_id"
      )
      .join("rewardsentry", "approvalentry.rewards_id", "=", "rewardsentry.id")
      .join(
        "members",
        "rewardsentry.member_employee_id",
        "=",
        "members.member_employee_id"
      )
      .where(whereConditions);

    // Add ordering if specified
    if (orderBy) {
      query.orderBy(orderBy, direction);
    }

    const entries = await query;
    const formattedEntries = [];

    // Process each entry with the appropriate criteria table
    for (const entry of entries) {
      // Determine which table to use based on role_id
      const criteriaTable =
        entry.role_id === 5
          ? "managerrewardpointscriteria"
          : "rewardpointscriteria";

      // Fetch criteria from the appropriate table
      const criteria = await database(criteriaTable)
        .where("id", entry.criteria_id)
        .first();

      if (!criteria) continue;

      const formattedEntry = {
        id: entry.approval_entry_id,
        member_firstname: entry.member_firstname,
        member_lastname: entry.member_lastname,
        manager_id: entry.manager_id,
        director_id: entry.director_id,
        manager_approval_status: entry.manager_approval_status,
        director_approval_status: entry.director_approval_status,
        manager_notes: entry.manager_notes,
        director_notes: entry.director_notes,
        member_id: entry.member_id,
        rewards_entry: {
          id: entry.rewards_entry_id,
          member_employee_id: entry.member_employee_id,
          criteria_id: entry.criteria_id,
          date_accomplished: entry.date_accomplished,
          race_season: entry.race_season,
          cbps_group: entry.cbps_group,
          project_name: entry.project_name,
          short_description: entry.short_description,
          notes: entry.notes,
          created_at: entry.created_at,
          updated_at: entry.updated_at,
          attachments: entry.attachments ? getFiles(entry) : null,
        },
        rewards_criteria: {
          id: criteria.id,
          category: criteria.category,
          accomplishment: criteria.accomplishment,
          points: criteria.points,
          guidelines: criteria.guidelines,
          director_approval: criteria.director_approval,
        },
      };

      formattedEntries.push(formattedEntry);
    }

    return formattedEntries;
  }
}

module.exports = ApprovalEntry;
