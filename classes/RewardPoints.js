const { database } = require("../config/db_config");
const { getFiles, formattedFiles } = require("../utils/file_getter");
const { formattedDate } = require("../utils/helpers");

// Define the RewardPoints class
class RewardPoints {
  constructor({
    id,
    member_employee_id,
    short_description,
    criteria_id,
    date_accomplished,
    race_season,
    cbps_group,
    project_name,
    notes,
    attachments,
  }) {
    // Initialize member properties
    this.id = id;
    this.member_employee_id = member_employee_id;
    this.short_description = short_description;
    this.criteria_id = criteria_id;
    this.date_accomplished = date_accomplished;
    this.race_season = race_season;
    this.cbps_group = cbps_group;
    this.project_name = project_name;
    this.notes = notes;
    this.attachments = attachments;
  }

  static get tableName() {
    return "rewardsentry";
  }

  static get columns() {
    return [
      "id",
      "member_employee_id",
      "short_description",
      "criteria_id",
      "date_accomplished",
      "race_season",
      "cbps_group",
      "project_name",
      "notes",
      "attachments",
    ];
  }

  // Method to submic a reward points in the database
  async create() {
    try {
      const data = { ...this };

      // Remove undefined or null values
      Object.keys(data).forEach(
        (key) =>
          (data[key] === undefined || data[key] === null) && delete data[key]
      );

      // Handle attachments specially
      if (
        (this.files && this.files.length > 0) ||
        (this.attachments && this.attachments.length > 0)
      ) {
        data.attachments = this.attachments
          .map((file) => file.filename)
          .join(";");
      } else {
        delete data.attachments; // Remove attachments if no files
      }

      // Remove 'files' property as it's not a database column
      delete data.files;

      const [id] = await database(RewardPoints.tableName).insert(data);

      this.id = id;
      return this;
    } catch (error) {
      console.error("Error in RewardPoints.create:", error);
      throw new Error(
        `Error in creating reward points entry: ${error.message}`
      );
    }
  }

  // Method to find reward points entry by their employee ID
  static async findByEmployeeId(memberEmployeeId) {
    try {
      const entries = await database(RewardPoints.tableName).where(
        "member_employee_id",
        memberEmployeeId
      );

      // Process attachments for proper display
      let rewardPoints = RewardPoints.processAttachments(entries);

      if (rewardPoints.length > 0) {
        return rewardPoints;
      } else {
        return null;
      }
    } catch (error) {
      console.error(
        "Error in finding reward points entry by employee ID",
        error
      );
      throw new Error(
        `Error in finding reward points entry by employee ID: ${error.message}`
      );
    }
  }

  // Method to find reward points entry by their ID
  static async findById(id) {
    try {
      const entry = await database(RewardPoints.tableName)
        .where("id", id)
        .first();

      return entry ? RewardPoints.processAttachments([entry])[0] : null;
    } catch (error) {
      console.error("Error in finding reward points entry by ID", error);
      throw new Error(
        `Error in finding reward points entry by ID: ${error.message}`
      );
    }
  }

  // Method to find all reward points entries
  static async findAll() {
    try {
      const entries = await database(RewardPoints.tableName);
      return RewardPoints.processAttachments(entries);
    } catch (error) {
      console.error("Error in RewardPoints.findAll:", error);
      throw new Error(`Failed to fetch all reward points: ${error.message}`);
    }
  }

  // Method to update reward points entry by their ID
  static async update(id, data) {
    try {
      const { attachments, ...updateData } = data;

      if (updateData.date_accomplished)
        updateData.date_accomplished = formattedDate(
          updateData.date_accomplished
        );

      // Handle attachments
      if (attachments) {
        const newAttachments = attachments
          .map((file) => file.filename)
          .join(";");
        updateData.attachments = newAttachments;
      }

      // Remove 'files' property as it's not a database column
      delete data.files;

      await database(RewardPoints.tableName).where("id", id).update(updateData);

      return this.findById(id);
    } catch (error) {
      console.error("Error in updating reward points entry", error);
      throw new Error(
        `Error in updating reward points entry: ${error.message}`
      );
    }
  }

  // Method to delete reward points entry by their ID
  static async delete(id) {
    try {
      return await database(RewardPoints.tableName).where("id", id).delete();
    } catch (error) {
      console.error("Error in deleting reward points entry", error);
    }
  }

  // Method to find by race season
  static async findByRaceSeason(raceSeason) {
    const entries = await database(RewardPoints.tableName).where(
      "race_season",
      raceSeason
    );

    return RewardPoints.processAttachments(entries);
  }

  // Method to find by CBPS group
  static async findByCbpsGroup(cbpsGroup) {
    try {
      const entries = await database(RewardPoints.tableName).where(
        "cbps_group",
        cbpsGroup
      );

      return RewardPoints.processAttachments(entries);
    } catch (error) {
      console.error(
        "Error in finding reward points entry by CBPS group",
        error
      );
      throw new Error(
        `Error in finding reward points entry by CBPS group: ${error.message}`
      );
    }
  }

  static processAttachments(entries) {
    return entries.map((entry) => {
      if (entry.attachments) {
        // First save the original string value
        const attachmentsString = entry.attachments;

        // Format files from the string
        entry.files = formattedFiles(attachmentsString);

        // Get file objects with details from the filesystem
        const filesWithDetails = getFiles(entry);

        // Make sure we're setting the attachments directly to the array
        // and not preserving any reference to the original attachments string
        entry.attachments = Array.isArray(filesWithDetails)
          ? filesWithDetails
          : [];
      } else {
        // Consistently set to null instead of deleting the property
        entry.attachments = null;
      }
      return entry;
    });
  }
}

module.exports = RewardPoints;
