const { database } = require('../config/db_config');
const moment = require('moment');

// Define the Member class
class Member {
  static tableName = 'members';

  // Member constructor
  constructor({
    id,
    member_employee_id,
    member_username,
    member_firstname,
    member_lastname,
    member_email,
    member_title,
    member_manager_id,
    member_director_id,
    role_id,
    member_status,
  }) {
    // Initialize member properties
    this.id = id;
    this.member_employee_id = member_employee_id;
    this.member_username = member_username;
    this.member_firstname = member_firstname;
    this.member_lastname = member_lastname;
    this.member_email = member_email;
    this.member_title = member_title;
    this.member_manager_id = member_manager_id;
    this.member_director_id = member_director_id;
    this.role_id = role_id;
    this.member_status = member_status;
  }

  // Method to create a new member in the database
  async create() {
    try {
      const result = await database(Member.tableName).insert(this);

      if (!result || !result.length) {
        throw new Error('Error creating member');
      }

      this.id = result[0];
      return this;
    } catch (error) {
      console.error('Error creating member: ', error);
      throw new Error(`Error creating member: ${error.message}`);
    }
  }

  // Method to update a member's details
  async update() {
    try {
      const memberEmployeeId = this.member_employee_id;
      const result = await database(Member.tableName)
        .where('member_employee_id', memberEmployeeId)
        .update(this);

      if (!result) {
        throw new Error('Error updating member');
      }

      return this;
    } catch (error) {
      console.error('Error updating member: ', error);
      throw new Error(`Error updating member: ${error.message}`);
    }
  }

  // Method to get all members
  static async findAll() {
    try {
      return await database(Member.tableName);
    } catch (error) {
      console.error('Error in finding all members: ', error);
      throw new Error(`Error in finding all members: ${error.message}`);
    }
  }

  // Method to find a member by their employee ID
  static async findByMemberId(memberEmployeeId) {
    try {
      if (!memberEmployeeId) {
        throw new Error('Member employee ID is required');
      }

      const member = await database(Member.tableName)
        .where({
          member_employee_id: memberEmployeeId,
          member_status: 'ACTIVE',
        })
        .first();

      if (member) {
        await this.getRelatedNames(member);
      }

      return member;
    } catch (error) {
      console.error('Error finding member by ID:', error);
      throw new Error(`Error finding member by ID: ${error.message}`);
    }
  }

  // Method to find a member by their username
  static async findByUsername(username) {
    try {
      const member = await database(Member.tableName)
        .where('member_username', username)
        .andWhere('member_status', '=', 'ACTIVE')
        .first();

      if (member) {
        await this.getRelatedNames(member);
      }

      return member;
    } catch (error) {
      console.error('Error finding member by username: ', error);
      throw new Error(`Error finding member by username: ${error.message}`);
    }
  }

  static async findByEmail(email) {
    try {
      const member = await database(Member.tableName)
        .where('member_email', email)
        .andWhere('member_status', '=', 'ACTIVE')
        .first();

      if (member) {
        await this.getRelatedNames(member);
      }

      return member;
    } catch (error) {
      console.error('Error finding member by email: ', error);
      throw new Error(`Error finding member by email: ${error.message}`);
    }
  }

  // Method to get all members by role id
  static async findByRoleId(roleId) {
    try {
      const members = await database(Member.tableName)
        .where('role_id', roleId)
        .andWhere('member_status', 'LIKE', 'ACTIVE');

      return members;
    } catch (error) {
      console.error('Error finding members by role ID: ', error);
      throw new Error(`Error finding members by role ID: ${error.message}`);
    }
  }

  // Method to get all members by manager id
  static async findByManagerId(managerId) {
    try {
      await database(Member.tableName)
        .where('member_manager_id', managerId)
        .andWhere('member_status', 'LIKE', 'ACTIVE');
    } catch (error) {
      console.error('Error finding members by manager ID: ', error);
      throw new Error(`Error finding members by manager ID: ${error.message}`);
    }
  }

  // Method to get all members by director id
  static async findByDirectorId(directorId) {
    try {
      const managers = await database(Member.tableName)
        .where('member_manager_id', directorId)
        .andWhere('member_status', 'LIKE', 'ACTIVE');

      const members = await database(Member.tableName)
        .where('member_director_id', directorId)
        .andWhere('member_status', 'LIKE', 'ACTIVE');

      return { managers, members };
    } catch (error) {
      console.error('Error finding members by director ID: ', error);
      throw new Error(`Error finding members by director ID: ${error.message}`);
    }
  }

  // Method to update the logout time of a member
  static async updateLogoutTime(memberEmployeeId) {
    try {
      return await database(Member.tableName)
        .where('member_employee_id', memberEmployeeId)
        .update({
          logout_time: moment().format('YYYY-MM-DD HH:mm:ss'),
        });
    } catch (error) {
      console.error('Error updating logout time: ', error);
      throw new Error(`Error updating logout time: ${error.message}`);
    }
  }

  // Method to update the login time of a member
  static async updateLoginTime(memberEmployeeId) {
    try {
      return await database(Member.tableName)
        .where('member_employee_id', memberEmployeeId)
        .update({
          login_time: moment().format('YYYY-MM-DD HH:mm:ss'),
        });
    } catch (error) {
      console.error('Error updating login time: ', error);
      throw new Error(`Error updating login time: ${error.message}`);
    }
  }

  // Method to get the full name of a member by their employee ID
  static async getRelatedNames(member) {
    const relationFields = [
      { idField: 'member_manager_id', nameField: 'manager_name' },
      { idField: 'member_director_id', nameField: 'director_name' },
    ];

    for (const field of relationFields) {
      const relationId = member[field.idField];

      if (relationId) {
        const relatedData = await database(Member.tableName)
          .select(
            database.raw(
              "CONCAT(member_firstname, ' ', member_lastname) as name"
            )
          )
          .where('member_employee_id', relationId)
          .first();
        member[field.nameField] = relatedData ? relatedData.name : null;
      }
    }
  }

  // Method to set hide popup for a member to true (1)
  static async hidePopup(member_employee_id) {
    try {
      return await database(Member.tableName)
        .where('member_employee_id', member_employee_id)
        .update({
          hidePopup: 1,
        });
    } catch (error) {
      console.error('Error updating hide popup: ', error);
      throw new Error(`Error updating hide popup: ${error.message}`);
    }
  }
}

module.exports = Member;
