const Member = require('./Members');
const { LDAP_Connection } = require('../config/ldap_config');
const { Ldap } = require('./Ldap');
const log4js = require('../config/log4js_config');
const logger = log4js.getLogger('MemberService');
const ErrorResponse = require('../utils/error_response');

/**
 * MemberService - Handles all member-related operations including CRUD functionality
 * and LDAP integration for member management
 */
class MemberService {
    /**
     * Creates a new MemberService instance
     */
    constructor() {
        this.LDAP_USERNAME = process.env.LDAP_USER;
        this.LDAP_PASSWORD = process.env.LDAP_PASSWORD;
        this.BU_CODE = process.env.SUB_BU_CODE;
    }

    /**
     * Create a new member from LDAP information
     * @param {string} username - The username to search in LDAP
     * @returns {Object} The newly created member
     */
    async createMember(username) {
        try {
            // Establish LDAP connection
            const client = await LDAP_Connection(
                this.LDAP_USERNAME,
                this.LDAP_PASSWORD
            );
            if (!client) {
                throw new ErrorResponse(
                    'Failed to connect to LDAP server',
                    500
                );
            }

            // Get member information from LDAP
            const result = await Ldap.getMemberInfo(client, username);
            if (!result || !result.member) {
                throw new ErrorResponse(
                    `No LDAP data found for username: ${username}`,
                    404
                );
            }

            // Create a new member object
            const newMember = new Member(result.member);

            // Check if member already exists
            const existingMember = await Member.findByMemberId(
                newMember.member_employee_id
            );

            if (existingMember) {
                // Update existing member with new information
                const memberToUpdate = { ...existingMember, ...result.member };
                await new Member(memberToUpdate).update();
                logger.info(
                    `Updated existing member: ${username} (${newMember.member_employee_id})`
                );
                client.unbind();
                return memberToUpdate;
            } else {
                // Create new member
                await newMember.create();
                logger.info(
                    `Created new member: ${username} (${newMember.member_employee_id})`
                );
                client.unbind();
                return newMember;
            }
        } catch (error) {
            logger.error(`Error creating member: ${error.message}`);
            throw new ErrorResponse(
                `Failed to create member: ${error.message}`,
                500
            );
        }
    }

    /**
     * Read a member by employee ID
     * @param {string} memberId - The employee ID to look up
     * @returns {Object} The member information
     */
    async getMemberById(memberId) {
        try {
            const member = await Member.findByMemberId(memberId);
            if (!member) {
                throw new ErrorResponse(
                    `Member not found with ID: ${memberId}`,
                    404
                );
            }
            return member;
        } catch (error) {
            logger.error(
                `Error retrieving member ${memberId}: ${error.message}`
            );
            throw new ErrorResponse(
                `Failed to retrieve member: ${error.message}`,
                error.statusCode || 500
            );
        }
    }

    /**
     * Update a member's information
     * @param {string} memberId - The employee ID to update
     * @param {Object} updateData - The data to update
     * @returns {Object} The updated member
     */

    async updateMember(memberId, updateData) {
        try {
            // Check if member exists
            const existingMember = await Member.findByMemberId(memberId);
            if (!existingMember) {
                throw new ErrorResponse(
                    `Member not found with ID: ${memberId}`,
                    404
                );
            }

            // Create updated member object
            const updatedMember = { ...existingMember, ...updateData };
            await new Member(updatedMember).update();

            logger.info(`Updated member: ${memberId}`);
            return updatedMember;
        } catch (error) {
            logger.error(`Error updating member ${memberId}: ${error.message}`);
            throw new ErrorResponse(
                `Failed to update member: ${error.message}`,
                error.statusCode || 500
            );
        }
    }

    /**
     * Delete a member (soft delete by changing status)
     * @param {string} memberId - The employee ID to delete
     * @returns {boolean} Success status
     */
    async deleteMember(memberId) {
        try {
            // Check if member exists
            const existingMember = await Member.findByMemberId(memberId);
            if (!existingMember) {
                throw new ErrorResponse(
                    `Member not found with ID: ${memberId}`,
                    404
                );
            }

            // Soft delete by changing status
            const updatedMember = {
                ...existingMember,
                member_status: 'INACTIVE',
            };
            await new Member(updatedMember).update();

            logger.info(`Deleted (deactivated) member: ${memberId}`);
            return true;
        } catch (error) {
            logger.error(`Error deleting member ${memberId}: ${error.message}`);
            throw new ErrorResponse(
                `Failed to delete member: ${error.message}`,
                error.statusCode || 500
            );
        }
    }

    /**
     * Search for members in LDAP by username pattern
     * @param {string} usernamePattern - Partial username to search for
     * @returns {Array} Array of matching LDAP members
     */
    async searchMembers(usernamePattern) {
        try {
            const client = await LDAP_Connection(
                this.LDAP_USERNAME,
                this.LDAP_PASSWORD
            );
            if (!client) {
                throw new ErrorResponse(
                    'Failed to connect to LDAP server',
                    500
                );
            }

            const results = await Ldap.searchByUsername(
                client,
                usernamePattern
            );
            client.unbind();

            if (!results || Object.keys(results).length === 0) {
                return [];
            }

            return Array.isArray(results) ? results : [results];
        } catch (error) {
            logger.error(`Error searching for members: ${error.message}`);
            throw new ErrorResponse(
                `Failed to search members: ${error.message}`,
                500
            );
        }
    }

    /**
     * Map members hierarchically by title (Director -> Manager -> Members)
     * Processes each title group sequentially to ensure proper hierarchy
     * @returns {Object} Results of the mapping operation
     */
    async mapMembersByHierarchy() {
        try {
            const client = await LDAP_Connection(
                this.LDAP_USERNAME,
                this.LDAP_PASSWORD
            );
            if (!client) {
                throw new ErrorResponse(
                    'Failed to connect to LDAP server',
                    500
                );
            }

            const responses = {
                directors: [],
                managers: [],
                members: [],
                errors: [],
            };

            // Step 1: Map Directors first
            logger.info('Starting mapping of Directors');
            const directorResults = await Ldap.mapMembersByPosition(
                client,
                'Director'
            );

            // Process directors synchronously to ensure they're available for managers
            for (const director of directorResults) {
                try {
                    const directorInfo = await Ldap.getMemberInfo(
                        client,
                        director.cn
                    );
                    await this.processLdapMember(
                        directorInfo,
                        responses.directors
                    );
                } catch (error) {
                    logger.error(
                        `Error processing director ${director.cn}: ${error.message}`
                    );
                    responses.errors.push({
                        type: 'director',
                        cn: director.cn,
                        error: error.message,
                    });
                }
            }

            // Step 2: Map Managers next
            logger.info('Starting mapping of Managers');
            const managerResults = await Ldap.mapMembersByPosition(
                client,
                'Manager'
            );

            // Process managers synchronously
            for (const manager of managerResults) {
                try {
                    const managerInfo = await Ldap.getMemberInfo(
                        client,
                        manager.cn
                    );
                    await this.processLdapMember(
                        managerInfo,
                        responses.managers
                    );
                } catch (error) {
                    logger.error(
                        `Error processing manager ${manager.cn}: ${error.message}`
                    );
                    responses.errors.push({
                        type: 'manager',
                        cn: manager.cn,
                        error: error.message,
                    });
                }
            }

            // Step 3: Map regular members last
            logger.info('Starting mapping of regular Members');
            const memberResults = await Ldap.mapMembersByPosition(
                client,
                'Consultant'
            );

            // Process members synchronously
            for (const member of memberResults) {
                try {
                    const memberInfo = await Ldap.getMemberInfo(
                        client,
                        member.cn
                    );
                    await this.processLdapMember(memberInfo, responses.members);
                } catch (error) {
                    logger.error(
                        `Error processing member ${member.cn}: ${error.message}`
                    );
                    responses.errors.push({
                        type: 'member',
                        cn: member.cn,
                        error: error.message,
                    });
                }
            }

            client.unbind();
            logger.info('Member mapping completed successfully');

            return {
                success: true,
                message: 'Member mapping completed',
                totalDirectors: responses.directors.length,
                totalManagers: responses.managers.length,
                totalMembers: responses.members.length,
                totalErrors: responses.errors.length,
                errors: responses.errors,
            };
        } catch (error) {
            logger.error(
                `Error in hierarchical member mapping: ${error.message}`
            );
            throw new ErrorResponse(
                `Failed to map members: ${error.message}`,
                500
            );
        }
    }

    /**
     * Helper method to process and save/update an LDAP member
     * @param {Object} ldapMemberInfo - The LDAP member information
     * @param {Array} responseArray - Array to track processed members
     */
    async processLdapMember(ldapMemberInfo, responseArray) {
        // Process member
        const memberData = ldapMemberInfo.member;
        await this.processIndividualMember(memberData, responseArray);

        // Process manager if different from member
        if (
            ldapMemberInfo.manager &&
            ldapMemberInfo.manager.member_employee_id !==
                memberData.member_employee_id
        ) {
            await this.processIndividualMember(
                ldapMemberInfo.manager,
                responseArray
            );
        }

        // Process director if different from member and manager
        if (
            ldapMemberInfo.director &&
            ldapMemberInfo.director.member_employee_id !==
                memberData.member_employee_id &&
            ldapMemberInfo.director.member_employee_id !==
                ldapMemberInfo.manager.member_employee_id
        ) {
            await this.processIndividualMember(
                ldapMemberInfo.director,
                responseArray
            );
        }
    }

    /**
     * Helper method to create or update a single member from LDAP
     * @param {Object} memberData - The member data
     * @param {Array} responseArray - Array to track processed members
     */
    async processIndividualMember(memberData, responseArray) {
        try {
            const existingMember = await Member.findByMemberId(
                memberData.member_employee_id
            );
            const member = new Member(memberData);

            if (existingMember) {
                await member.update();
                responseArray.push({
                    member_id: memberData.member_employee_id,
                    action: 'updated',
                });
            } else {
                await member.create();
                responseArray.push({
                    member_id: memberData.member_employee_id,
                    action: 'created',
                });
            }
        } catch (error) {
            logger.error(
                `Error processing individual member ${memberData.member_employee_id}: ${error.message}`
            );
            throw error;
        }
    }

    /**
     * Get all members with optional filtering
     * @param {Object} filters - Optional filters for members
     * @returns {Array} List of members matching filters
     */
    async getAllMembers(filters = {}) {
        try {
            let members = await Member.findAll();

            // Apply filters if provided
            if (filters.status) {
                members = members.filter(
                    (member) => member.member_status === filters.status
                );
            }

            if (filters.role_id) {
                members = members.filter(
                    (member) => member.role_id === parseInt(filters.role_id)
                );
            }

            return members;
        } catch (error) {
            logger.error(`Error getting all members: ${error.message}`);
            throw new ErrorResponse(
                `Failed to get members: ${error.message}`,
                500
            );
        }
    }
}

module.exports = new MemberService();
