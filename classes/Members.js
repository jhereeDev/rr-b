// Enhanced version of Member.js class with email search functionality

const { database } = require('../config/db_config');
const moment = require('moment');
const { capitalizeEachWord } = require('../utils/helpers');
const log4js = require('../config/log4js_config');
const logger = log4js.getLogger('member');
const { getFiles } = require('../utils/file_getter');

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
		this.member_title = member_title ? capitalizeEachWord(member_title) : ''; // Apply proper capitalization
		this.member_manager_id = member_manager_id;
		this.member_director_id = member_director_id;
		this.role_id = role_id;
		this.member_status = member_status;
	}

	// Method to create a new member in the database
	async create() {
		try {
			logger.info(`Creating new member: ${this.member_employee_id} (${this.member_firstname} ${this.member_lastname})`);

			// Format title with proper capitalization
			if (this.member_title) {
				this.member_title = capitalizeEachWord(this.member_title);
			}

			const result = await database(Member.tableName).insert({
				...this,
				created_at: moment().format('YYYY-MM-DD HH:mm:ss'),
				updated_at: moment().format('YYYY-MM-DD HH:mm:ss'),
			});

			if (!result || !result.length) {
				throw new Error('Error creating member');
			}

			this.id = result[0];
			logger.info(`Successfully created member: ${this.member_employee_id}`);
			return this;
		} catch (error) {
			logger.error(`Error creating member ${this.member_employee_id}: ${error.message}`);
			throw new Error(`Error creating member: ${error.message}`);
		}
	}

	// Add or enhance the update method in your Member class (Members.js)

	/**
	 * Update the member in the database
	 * @returns {Promise<Member>} The updated member
	 */
	async update() {
		try {
			// Get reference to the database
			const { database } = require('../config/db_config');
			const log4js = require('../config/log4js_config');
			const logger = log4js.getLogger('Members');

			logger.info(`Updating member with ID: ${this.member_employee_id}`);

			// Prepare data for update
			const updateData = {
				member_title: this.member_title,
				member_status: this.member_status,
				role_id: this.role_id,
				updated_at: new Date(),
			};

			// Only include fields that are not undefined
			if (this.member_manager_id) {
				updateData.member_manager_id = this.member_manager_id;
			}

			if (this.member_director_id) {
				updateData.member_director_id = this.member_director_id;
			}

			if (this.member_email) {
				updateData.member_email = this.member_email;
			}

			if (this.member_firstname) {
				updateData.member_firstname = this.member_firstname;
			}

			if (this.member_lastname) {
				updateData.member_lastname = this.member_lastname;
			}

			// Update the member in the database
			const result = await database('members').where('member_employee_id', this.member_employee_id).update(updateData);

			logger.info(`Member updated successfully: ${this.member_employee_id}, affected rows: ${result}`);

			// Return the updated member
			return this;
		} catch (error) {
			const log4js = require('../config/log4js_config');
			const logger = log4js.getLogger('Members');
			logger.error(`Error updating member ${this.member_employee_id}:`, error);
			throw error;
		}
	}
	/**
	 * Compare two member objects to check if their data is different
	 * Returns true if there are differences, false if objects are identical
	 */
	static compareMembers(existing, updated) {
		// List of fields to compare
		const fieldsToCompare = [
			'member_username',
			'member_firstname',
			'member_lastname',
			'member_email',
			'member_title',
			'member_manager_id',
			'member_director_id',
			'role_id',
			'member_status',
		];

		// Check each field for differences
		for (const field of fieldsToCompare) {
			if (existing[field] !== updated[field]) {
				logger.debug(`Field '${field}' has changed: '${existing[field]}' -> '${updated[field]}'`);
				return true;
			}
		}

		return false;
	}
	// Method to get all members
	static async findAll() {
		try {
			const members = await database(Member.tableName);

			// Fetch manager and director emails for each member
			for (const member of members) {
				if (member.member_manager_id) {
					const manager = await database(Member.tableName)
						.where('member_employee_id', member.member_manager_id)
						.first();
					if (manager) {
						member.member_manager_email = manager.member_email;
					}
				}

				if (member.member_director_id) {
					const director = await database(Member.tableName)
						.where('member_employee_id', member.member_director_id)
						.first();
					if (director) {
						member.member_director_email = director.member_email;
					}
				}
			}

			return members;
		} catch (error) {
			logger.error(`Error in finding all members: ${error.message}`);
			throw new Error(`Error in finding all members: ${error.message}`);
		}
	}

	// Method to find a member by their employee ID
	static async findByDatabaseId(id) {
		try {
			if (!id) {
				logger.warn('Member ID is required');
				throw new Error('Member ID is required');
			}

			const member = await database(Member.tableName)
				.where({
					id: id,
				})
				.first();

			if (member) {
				await this.getRelatedNames(member);
			}

			return member;
		} catch (error) {
			logger.error(`Error finding member by ID ${memberEmployeeId}: ${error.message}`);
			throw new Error(`Error finding member by ID: ${error.message}`);
		}
	}

	// Method to find a member by their employee ID
	static async findById(id) {
		try {
			if (!id) {
				logger.warn('Member ID is required');
				throw new Error('Member ID is required');
			}

			const member = await database(Member.tableName)
				.where({
					member_employee_id: id,
				})
				.first();

			if (member) {
				await this.getRelatedNames(member);
			}

			return member;
		} catch (error) {
			logger.error(`Error finding member by ID ${memberEmployeeId}: ${error.message}`);
			throw new Error(`Error finding member by ID: ${error.message}`);
		}
	}

	// Method to find a member by their employee ID
	static async findByMemberId(memberEmployeeId) {
		try {
			if (!memberEmployeeId) {
				logger.warn('Member employee ID is required');
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
			logger.error(`Error finding member by ID ${memberEmployeeId}: ${error.message}`);
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
			logger.error(`Error finding member by username ${username}: ${error.message}`);
			throw new Error(`Error finding member by username: ${error.message}`);
		}
	}

	// Method to find a member by their email
	static async findByEmail(email) {
		try {
			if (!email) {
				logger.warn('Email is required');
				throw new Error('Email is required');
			}

			const member = await database(Member.tableName).where('member_email', email).first();

			if (member) {
				await this.getRelatedNames(member);
			}

			return member;
		} catch (error) {
			logger.error(`Error finding member by email ${email}: ${error.message}`);
			throw new Error(`Error finding member by email: ${error.message}`);
		}
	}

	// Method to get all members by role id
	static async findByRoleId(roleId) {
		try {
			const members = await database(Member.tableName).where('role_id', roleId).andWhere('member_status', 'ACTIVE');

			return members;
		} catch (error) {
			logger.error(`Error finding members by role ID ${roleId}: ${error.message}`);
			throw new Error(`Error finding members by role ID: ${error.message}`);
		}
	}

	// Method to get all members by manager id
	static async findByManagerId(managerId) {
		try {
			const members = await database(Member.tableName)
				.where('member_manager_id', managerId)
				.andWhere('member_status', 'ACTIVE');

			return members;
		} catch (error) {
			logger.error(`Error finding members by manager ID ${managerId}: ${error.message}`);
			throw new Error(`Error finding members by manager ID: ${error.message}`);
		}
	}

	// Method to get all members by director id
	static async findByDirectorId(directorId) {
		try {
			const managers = await database(Member.tableName)
				.where('member_manager_id', directorId)
				.andWhere('member_status', 'ACTIVE');

			const members = await database(Member.tableName)
				.where('member_director_id', directorId)
				.andWhere('member_status', 'ACTIVE');

			return { managers, members };
		} catch (error) {
			logger.error(`Error finding members by director ID ${directorId}: ${error.message}`);
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
			logger.error(`Error updating logout time for ${memberEmployeeId}: ${error.message}`);
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
			logger.error(`Error updating login time for ${memberEmployeeId}: ${error.message}`);
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
					.select(database.raw("CONCAT(member_firstname, ' ', member_lastname) as name"))
					.where('member_employee_id', relationId)
					.first();
				member[field.nameField] = relatedData ? relatedData.name : null;
			}
		}
	}

	// Method to set hide popup for a member to true (1)
	static async hidePopup(member_employee_id) {
		try {
			return await database(Member.tableName).where('member_employee_id', member_employee_id).update({
				hidePopup: 1,
			});
		} catch (error) {
			logger.error(`Error updating hide popup for ${member_employee_id}: ${error.message}`);
			throw new Error(`Error updating hide popup: ${error.message}`);
		}
	}
}

module.exports = Member;
