// Enhanced version of Ldap.js with better stability and title formatting

const { Options } = require('./Options');
const { searchObject, searchArray, logger } = require('../config/ldap_config');
const { setRole } = require('../utils/roles');
const { capitalizeEachWord } = require('../utils/helpers');
const Member = require('./Members');

// @desc Ldap class
// @access public
class Ldap extends Member {
	// Define the attributes to be searched in LDAP
	static get searchAttributes() {
		return [
			'cn',
			'sn',
			'givenName',
			'title',
			'department',
			'manager',
			'extensionAttribute2',
			'userPrincipalName',
			'memberOf',
			'extensionAttribute14',
		];
	}

	// Function to search LDAP by username with improved error handling
	static async searchByUsername(client, username) {
		logger.info(`Searching LDAP by username: ${username}`);

		const login_options = new Options(
			`(&(cn=${username})(memberOf=CN=mdl.hr.sbu-asia.bu-assea.${process.env.SUB_BU_CODE}.member,OU=HR Lists,OU=Managed Lists,OU=Groupinfra Servers,DC=groupinfra,DC=com))`,
			'sub',
			this.searchAttributes,
			true,
			50
		);

		try {
			const result = await searchObject(client, login_options);
			logger.info(`LDAP search by username complete: ${username}`);
			return result;
		} catch (error) {
			logger.error(`LDAP search by username failed for ${username}: ${error.message}`);
			throw error;
		}
	}

	// Function to search LDAP by username with bypass for testing
	static async searchByUsernameBypass(client, username) {
		logger.info(`Searching LDAP by username with bypass: ${username}`);

		const login_options = new Options(
			`(&(cn=${username})(memberOf=CN=mdl.hr.sbu-asia.bu-assea.${process.env.SUB_BU_CODE_DEV}.member,OU=HR Lists,OU=Managed Lists,OU=Groupinfra Servers,DC=groupinfra,DC=com))`,
			'sub',
			this.searchAttributes,
			true,
			50
		);

		try {
			const result = await searchObject(client, login_options);
			logger.info(`LDAP bypass search by username complete: ${username}`);
			return result;
		} catch (error) {
			logger.error(`LDAP bypass search by username failed for ${username}: ${error.message}`);
			throw error;
		}
	}

	// Function to search LDAP by email with improved error handling
	static async searchByEmail(client, email) {
		logger.info(`Searching LDAP by email: ${email}`);

		const BU_CODE = process.env.TEST_EMAILS.split(',').includes(email)
			? process.env.SUB_BU_CODE_DEV
			: process.env.SUB_BU_CODE;

		const login_options = new Options(
			`(&(userPrincipalName=${email})(memberOf=CN=mdl.hr.sbu-asia.bu-assea.${BU_CODE}.member,OU=HR Lists,OU=Managed Lists,OU=Groupinfra Servers,DC=groupinfra,DC=com))`,
			'sub',
			this.searchAttributes,
			true,
			50
		);

		try {
			const result = await searchObject(client, login_options);
			logger.info(`LDAP search by email complete: ${email}`);
			return result;
		} catch (error) {
			logger.error(`LDAP search by email failed for ${email}: ${error.message}`);
			throw error;
		}
	}

	// Function to search LDAP by email with bypass for testing
	static async searchByEmailBypass(client, email) {
		logger.info(`Searching LDAP by email with bypass: ${email}`);

		const BU_CODE = process.env.TEST_EMAILS.split(',').includes(email)
			? process.env.SUB_BU_CODE_DEV
			: process.env.SUB_BU_CODE;

		const login_options = new Options(
			`(&(userPrincipalName=${email})(memberOf=CN=mdl.hr.sbu-asia.bu-assea.${BU_CODE}.member,OU=HR Lists,OU=Managed Lists,OU=Groupinfra Servers,DC=groupinfra,DC=com))`,
			'sub',
			this.searchAttributes,
			true,
			50
		);

		try {
			const result = await searchObject(client, login_options);
			logger.info(`LDAP bypass search by email complete: ${email}`);
			return result;
		} catch (error) {
			logger.error(`LDAP bypass search by email failed for ${email}: ${error.message}`);
			throw error;
		}
	}

	// Function to map LDAP members by position with improved error handling
	static async mapMembersByPosition(client, position) {
		logger.info(`Mapping LDAP members by position: ${position}`);

		// Construct the search filter with memberOf
		const filter = `(&(title=*${position}*)(objectClass=person)(memberOf=CN=mdl.hr.sbu-asia.bu-assea.${process.env.SUB_BU_CODE}.member,OU=HR Lists,OU=Managed Lists,OU=Groupinfra Servers,DC=groupinfra,DC=com))`;

		const login_options = new Options(
			filter,
			'sub',
			this.searchAttributes,
			true,
			120 // Increased timeout for larger searches
		);

		try {
			const results = await searchArray(client, login_options);
			logger.info(`LDAP mapping by position complete, found ${results.length} members matching: ${position}`);
			return results;
		} catch (error) {
			logger.error(`LDAP mapping by position failed for ${position}: ${error.message}`);
			throw error;
		}
	}

	// Function to get member info from LDAP with improved error handling and title formatting
	static async getMemberInfo(client, username) {
		logger.info(`Getting LDAP member info for: ${username}`);

		try {
			// Get member info
			const login_options = new Options(`cn=${username}`, 'sub', this.searchAttributes, true, 50);

			const result = await searchObject(client, login_options);
			logger.debug(`Found member: ${username}`);

			if (!result || result === 'No Record Found' || result === 'Search timeout') {
				logger.warn(`No LDAP record found for member: ${username}`);
				throw new Error(`No LDAP record found for: ${username}`);
			}

			// Format member title
			if (result.title) {
				result.title = capitalizeEachWord(result.title);
			}

			// Code to get the member's manager and director info from LDAP
			let manager = { extensionAttribute2: '' };
			let director = { extensionAttribute2: '' };
			let manager1 = { extensionAttribute2: '' };
			let director1 = { extensionAttribute2: '' };

			// Get manager info if available
			if (result.manager) {
				const managerCN = result.manager.split(',')[0].toLowerCase().replace('cn=', '') || '';
				if (managerCN) {
					const manager_options = new Options(`cn=${managerCN}`, 'sub', this.searchAttributes, true, 50);

					// Split the string by commas and then filter out the part containing "CN="
					const dnManager = result.manager.split(',').filter((part) => part.toLowerCase().includes('cn=') === false);

					// Join the remaining parts back together with commas
					const dnManagerOptions = dnManager.join(',');

					manager = await searchObject(client, manager_options, dnManagerOptions);
					logger.debug(`Found manager: ${managerCN}`);

					// Format manager title
					if (manager.title) {
						manager.title = capitalizeEachWord(manager.title);
					}
				}
			}

			// Get director info if manager is available
			if (manager.manager) {
				const directorCN = manager.manager.split(',')[0].toLowerCase().replace('cn=', '') || '';
				if (directorCN) {
					const director_options = new Options(`cn=${directorCN}`, 'sub', this.searchAttributes, true, 50);

					// Split the string by commas and then filter out the part containing "CN="
					const dnDirector = manager.manager.split(',').filter((part) => part.toLowerCase().includes('cn=') === false);

					// Join the remaining parts back together with commas
					const dnDirectorOptions = dnDirector.join(',');

					director = await searchObject(client, director_options, dnDirectorOptions);
					logger.debug(`Found director: ${directorCN}`);

					// Format director title
					if (director.title) {
						director.title = capitalizeEachWord(director.title);
					}
				}
			}

			// Get manager1 if director is available
			if (director.manager) {
				const managerCN1 = director.manager.split(',')[0].toLowerCase().replace('cn=', '') || '';
				if (managerCN1) {
					const manager_options1 = new Options(`cn=${managerCN1}`, 'sub', this.searchAttributes, true, 50);

					// Split the string by commas and then filter out the part containing "CN="
					const dnManager1 = director.manager.split(',').filter((part) => part.toLowerCase().includes('cn=') === false);

					// Join the remaining parts back together with commas
					const dnManagerOptions1 = dnManager1.join(',');

					manager1 = await searchObject(client, manager_options1, dnManagerOptions1);
					logger.debug(`Found higher level manager: ${managerCN1}`);

					// Format manager1 title
					if (manager1.title) {
						manager1.title = capitalizeEachWord(manager1.title);
					}
				}
			}

			// Get director1 if manager1 is available
			if (manager1.manager) {
				const directorCN1 = manager1.manager.split(',')[0].toLowerCase().replace('cn=', '') || '';
				if (directorCN1) {
					const director_options1 = new Options(`cn=${directorCN1}`, 'sub', this.searchAttributes, true, 50);

					// Split the string by commas and then filter out the part containing "CN="
					const dnDirector1 = manager1.manager
						.split(',')
						.filter((part) => part.toLowerCase().includes('cn=') === false);

					// Join the remaining parts back together with commas
					const dnDirectorOptions1 = dnDirector1.join(',');

					director1 = await searchObject(client, director_options1, dnDirectorOptions1);
					logger.debug(`Found higher level director: ${directorCN1}`);

					// Format director1 title
					if (director1.title) {
						director1.title = capitalizeEachWord(director1.title);
					}
				}
			}

			// Prepare member object with properly formatted data
			const managerMember = {
				member_employee_id: manager.extensionAttribute2 || '',
				member_username: manager.cn || '',
				member_firstname: manager.givenName || '',
				member_lastname: manager.sn || '',
				member_email: manager.userPrincipalName || '',
				member_title: manager.title ? capitalizeEachWord(manager.title) : '',
				role_id: setRole(manager.title || ''),
				member_status: manager && manager.cn ? 'ACTIVE' : '',
				member_manager_id: director.extensionAttribute2 || '',
				member_director_id: manager1 ? manager1.extensionAttribute2 || '' : '',
			};

			const directorMember = {
				member_employee_id: director.extensionAttribute2 || '',
				member_username: director.cn || '',
				member_firstname: director.givenName || '',
				member_lastname: director.sn || '',
				member_email: director.userPrincipalName || '',
				member_title: director.title ? capitalizeEachWord(director.title) : '',
				role_id: setRole(director.title || ''),
				member_status: director && director.cn ? 'ACTIVE' : '',
				member_manager_id: manager1.extensionAttribute2 || '',
				member_director_id: director1 ? director1.extensionAttribute2 || '' : '',
			};

			const member = {
				member_employee_id: result.extensionAttribute2 || '',
				member_username: result.cn || '',
				member_firstname: result.givenName || '',
				member_lastname: result.sn || '',
				member_email: result.userPrincipalName || '',
				member_title: result.title ? capitalizeEachWord(result.title) : '',
				member_manager_id: manager.extensionAttribute2 || '',
				member_director_id: director.extensionAttribute2 || '',
				role_id: setRole(result.title || ''),
				member_status: result && result.cn ? 'ACTIVE' : '',
			};

			logger.info(`Successfully got member info for: ${username}`);

			// Return the member info
			return {
				member,
				manager: managerMember,
				director: directorMember,
			};
		} catch (error) {
			logger.error(`Error getting member info for ${username}: ${error.message}`);
			throw error;
		}
	}
}

module.exports = { Ldap };
